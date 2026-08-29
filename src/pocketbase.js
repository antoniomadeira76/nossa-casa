// Ligação ao servidor — contra as coleções em db/pocketbase/.
//
// Três coisas que este ficheiro NÃO faz, de propósito:
//
//   1. Não filtra visibilidade. As regras de API das coleções é que decidem o
//      que a consulta devolve (INVARIANTE #3). Se um evento privado de outro
//      membro chegar aqui, o defeito está no servidor, não no filtro.
//   2. Não escreve saldos. O cofre é uma coleção de inserções — não existe
//      regra de update nem de delete, portanto o servidor recusa-os
//      (INVARIANTE #2). Aqui só se acrescentam movimentos.
//   3. Não traz a saúde na leitura em massa. As fichas pedem-se uma a uma,
//      quando se abre a de um membro — ler a saúde de toda a casa a cada
//      arranque seria movê-la sem razão. Ver `ler.saude()`.
//
// Tudo isto está provado a correr, não afirmado:
//   db/pocketbase/provar-regras.mjs   24 provas das regras e das vistas
//   db/pocketbase/provar-hooks.mjs    12 provas dos hooks
//   db/pocketbase/provar-saude.mjs    15 provas da visibilidade das fichas
//   db/pocketbase/provar-cliente.mjs  12 provas deste ficheiro
//
// ⚠ As fichas de saúde funcionam, mas isso não dispensa a conformidade: são
// dados clínicos de menores e há cinco pontos por resolver antes de os pôr num
// servidor a sério. Ver db/README.md.

import AsyncStorage from '@react-native-async-storage/async-storage';
import PocketBase, { AsyncAuthStore } from 'pocketbase';

// O armazenamento é injetável para este módulo poder ser exercitado fora do
// React Native — é assim que db/pocketbase/provar-cliente.mjs o testa a sério,
// contra um servidor, em vez de eu afirmar que funciona.
let guarda = AsyncStorage;
let URL = process.env.EXPO_PUBLIC_PB_URL;

export const configurar = (opts = {}) => {
  if (opts.storage) guarda = opts.storage;
  if (opts.url !== undefined) URL = opts.url;
  cliente = null;                       // força reconstruir com a configuração nova
};

// Sem configuração, a app corre local como sempre correu. Não rebenta.
export const estaLigado = () => Boolean(URL);

let cliente = null;
const obter = () => {
  if (!URL) return null;
  if (!cliente) {
    cliente = new PocketBase(URL, new AsyncAuthStore({
      save: (s) => guarda.setItem('nossa-casa/auth', s),
      initial: guarda.getItem('nossa-casa/auth'),
      clear: () => guarda.removeItem('nossa-casa/auth'),
    }));
  }
  return cliente;
};

// Mantido para quem já lia `ligado`; `estaLigado()` é que reflete uma
// reconfiguração em tempo de execução.
export const ligado = Boolean(URL);
export const pb = new Proxy({}, { get: (_, p) => { const c = obter(); return c ? c[p] : undefined; } });

const semLigacao = () => Promise.reject(new Error('Servidor não configurado.'));

// Token de acesso da Google, só em memória — ver auth.entrarComGoogle.
let tokenGoogle = null;

// ─── Sessão ──────────────────────────────────────────────────────────────────

export const auth = {
  // Os adultos entram por e-mail.
  entrarAdulto: (email, password) => (estaLigado()
    ? pb.collection('membros').authWithPassword(email, password)
    : semLigacao()),

  // As crianças não têm conta nem e-mail (§8). Entram pelo `login`, um
  // identificador interno, com o PIN como palavra-passe — que o PocketBase
  // guarda em bcrypt e verifica no SERVIDOR. O valor correto nunca chega ao
  // dispositivo, que é o que §3.3 exige e nada no cliente substitui.
  entrarCrianca: (login, pin) => (estaLigado()
    ? pb.collection('membros').authWithPassword(login, pin)
    : semLigacao()),

  // Só um adulto autenticado altera o PIN — a regra de update da coleção exige
  // papel admin, e o hook valida a qualidade do PIN.
  definirPin: (membroId, pin) => (estaLigado()
    ? pb.collection('membros').update(membroId, { password: pin, passwordConfirm: pin })
    : semLigacao()),

  // Entrar com Google. O PocketBase abre a janela, troca o código e devolve a
  // sessão — nada disto passa por aqui, e a chave secreta nunca sai do servidor.
  //
  // Não cria conta: `membros` não tem regra de criação, portanto quem não
  // tiver sido acrescentado à casa por um administrador é recusado. Numa app
  // familiar é essa a porta certa.
  //
  // Os scopes do Calendar pedem-se AQUI e não depois: o token que a Google
  // devolve traz as permissões que foram pedidas no momento do consentimento.
  async entrarComGoogle({ calendario = false } = {}) {
    if (!estaLigado()) return semLigacao();
    const r = await pb.collection('membros').authWithOAuth2({
      provider: 'google',
      scopes: calendario
        ? ['https://www.googleapis.com/auth/calendar.readonly']
        : [],
    });
    // O token da Google só vem nesta resposta. Guarda-se em memória, não em
    // disco: é credencial de terceiro e não tem de sobreviver ao fecho da app.
    tokenGoogle = r.meta && r.meta.accessToken ? r.meta.accessToken : null;
    return r;
  },

  sair: () => { if (estaLigado()) { pb.authStore.clear(); tokenGoogle = null; } },
  membro: () => (estaLigado() ? pb.authStore.record : null),
  valida: () => Boolean(estaLigado() && pb.authStore.isValid),
};

// ─── Leitura ─────────────────────────────────────────────────────────────────

// Nenhuma leitura leva filtro por casa: as regras já o impõem, e repeti-lo aqui
// daria a impressão errada de que é o cliente que protege.
const COLECOES = ['casas', 'membros', 'eventos', 'tarefas', 'tarefas_feitas',
  'envelopes', 'despesas', 'cofre_movimentos', 'equipamentos'];

export const ler = {
  async casa() {
    if (!estaLigado()) return semLigacao();
    const res = await Promise.all(COLECOES.map(c =>
      pb.collection(c).getFullList({ batch: 500 }).catch(() => [])));
    return Object.fromEntries(COLECOES.map((c, i) => [c, res[i]]));
  },

  colecao: (nome, opts) => (estaLigado() ? pb.collection(nome).getFullList(opts) : semLigacao()),

  // A ficha de um membro, com os anexos de cada episódio.
  //
  // Não leva filtro de visibilidade. Quem decide se estas linhas existem para
  // quem pergunta são as regras das coleções — a §5 chama-lhes «a regra mais
  // restritiva do sistema». Pedir a ficha de outro adulto devolve vazio, e é
  // assim que tem de ser: não escondido, ausente.
  async saude(membroId) {
    if (!estaLigado()) return semLigacao();
    const filtro = pb.filter('membro = {:m}', { m: membroId });
    const episodios = await pb.collection('episodios_saude').getFullList({ filter: filtro, sort: '-dia' });
    if (!episodios.length) return { episodios: [], anexos: [] };
    const ids = episodios.map(e => `episodio = "${e.id}"`).join(' || ');
    const anexos = await pb.collection('anexos').getFullList({ filter: ids }).catch(() => []);
    return { episodios, anexos };
  },

  // Ficheiros: o URL é assinado pelo servidor, não construído aqui.
  ficheiro: (registo, campo) => (estaLigado() && registo && registo[campo]
    ? pb.files.getURL(registo, registo[campo]) : null),
};

// ─── Google Calendar ─────────────────────────────────────────────────────────
//
// Lê os eventos reais da agenda de quem entrou. Fala diretamente com a API da
// Google usando o token que veio no login — o PocketBase não serve de
// intermediário aqui, e portanto os eventos nunca passam pelo nosso servidor
// enquanto não forem importados de propósito.
//
// ⚠ Só funciona se `entrarComGoogle({ calendario: true })` tiver sido usado:
// o token traz as permissões pedidas no consentimento, não as que se queiram
// mais tarde.

const CAL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export const google = {
  disponivel: () => Boolean(tokenGoogle),

  // Os eventos dos próximos `dias`, já na forma que a app usa.
  async eventos({ dias = 30, max = 50 } = {}) {
    if (!tokenGoogle) throw new Error('Entre com o Google e autorize a agenda.');
    const agora = new Date();
    const ate = new Date(agora.getTime() + dias * 86400000);
    const q = new URLSearchParams({
      timeMin: agora.toISOString(), timeMax: ate.toISOString(),
      singleEvents: 'true', orderBy: 'startTime', maxResults: String(max),
    });
    const r = await fetch(`${CAL}?${q}`, { headers: { Authorization: `Bearer ${tokenGoogle}` } });
    if (!r.ok) {
      // 401 é o token expirado ou sem o scope da agenda — dizer isso, e não
      // «algo correu mal», é a diferença entre o utilizador saber o que fazer.
      if (r.status === 401 || r.status === 403) {
        throw new Error('A autorização da agenda expirou. Entre com o Google outra vez.');
      }
      throw new Error(`A Google respondeu ${r.status}.`);
    }
    const { items = [] } = await r.json();
    return items.filter(e => e.status !== 'cancelled').map(traduzirEvento);
  },
};

// Um evento da Google na forma que os ecrãs esperam. `recorrente` importa: o
// desenho mostra-os na lista mas desmarcados por omissão.
const traduzirEvento = (e) => {
  const inicio = e.start || {};
  const dia = inicio.dateTime ? inicio.dateTime.slice(0, 10) : inicio.date;
  const hora = inicio.dateTime ? inicio.dateTime.slice(11, 16) : null;
  return {
    id: e.id,
    origem: 'google_calendar',
    titulo: e.summary || '(sem título)',
    dia, hora,
    local: e.location || '',
    // recurringEventId aparece nas ocorrências de uma série
    recorrente: Boolean(e.recurringEventId),
  };
};

// ─── Fila de escritas ────────────────────────────────────────────────────────
//
// Offline, as escritas ficam em fila e vão ao reconectar. Por isso as operações
// de dinheiro levam chave de idempotência: um reenvio colide no índice único em
// vez de pagar a semanada duas vezes (§6, e §9 lista aceitar uma sem chave
// entre as coisas que nunca devem acontecer).

const FILA = 'nossa-casa/fila';
const COM_IDEM = new Set(['despesas', 'cofre_movimentos']);

const lerFila = async () => {
  try { return JSON.parse(await guarda.getItem(FILA)) || []; } catch { return []; }
};
const gravarFila = (f) => guarda.setItem(FILA, JSON.stringify(f)).catch(() => {});
const novaChave = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const escrever = {
  async criar(colecao, dados) {
    const linha = COM_IDEM.has(colecao) && !dados.idem_key
      ? { ...dados, idem_key: novaChave() } : dados;
    const fila = await lerFila();
    fila.push({ op: 'criar', colecao, dados: linha });
    await gravarFila(fila);
    return this.esvaziar();
  },

  async atualizar(colecao, id, campos) {
    const fila = await lerFila();
    fila.push({ op: 'atualizar', colecao, id, dados: campos });
    await gravarFila(fila);
    return this.esvaziar();
  },

  // Por ordem, parando na primeira falha para não trocar a sequência. O que
  // falhou fica na fila para a próxima tentativa.
  async esvaziar() {
    if (!estaLigado()) return { enviadas: 0, pendentes: (await lerFila()).length };
    let fila = await lerFila();
    let enviadas = 0;
    while (fila.length) {
      const w = fila[0];
      try {
        if (w.op === 'criar') await pb.collection(w.colecao).create(w.dados);
        else await pb.collection(w.colecao).update(w.id, w.dados);
      } catch (e) {
        // 400 numa escrita com chave de idempotência é o índice único a dizer
        // «já lá está» — o que é sucesso, não erro.
        const jaLa = e.status === 400 && w.dados && w.dados.idem_key;
        if (!jaLa) break;
      }
      fila.shift(); enviadas++;
      await gravarFila(fila);
    }
    return { enviadas, pendentes: fila.length };
  },

  pendentes: async () => (await lerFila()).length,
};

// ─── Tempo real ──────────────────────────────────────────────────────────────
// Só a lista de compras. É a única área onde dois telefones estão na mesma
// coisa ao mesmo tempo — dois adultos na loja. Subscrever tudo gasta bateria e
// não resolve problema nenhum.

export const tempoReal = {
  async compras(aoMudar) {
    if (!estaLigado()) return () => {};
    await pb.collection('artigos').subscribe('*', (ev) => aoMudar('artigos', ev))
      .catch(() => {});
    return () => { pb.collection('artigos').unsubscribe('*').catch(() => {}); };
  },
};
