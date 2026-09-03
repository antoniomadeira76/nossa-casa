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

// O endereço configurado, para quem precise de decidir algo COM base nele — e
// há um caso: a saúde só sobe para um servidor que viva na casa. Ver
// `eEnderecoDeCasa` em `src/sync.js`. Devolve o valor, não o cliente: quem
// pergunta isto quer o endereço, não uma ligação.
export const enderecoDoServidor = () => URL || null;

let cliente = null;
// A promessa da sessão gravada. Guarda-se para se poder ESPERAR por ela.
let sessaoACarregar = null;

const obter = () => {
  if (!URL) return null;
  if (!cliente) {
    sessaoACarregar = Promise.resolve(guarda.getItem('nossa-casa/auth')).catch(() => null);
    cliente = new PocketBase(URL, new AsyncAuthStore({
      save: (s) => guarda.setItem('nossa-casa/auth', s),
      initial: sessaoACarregar,
      clear: () => guarda.removeItem('nossa-casa/auth'),
    }));
  }
  return cliente;
};

// ⚠ Esperar que a sessão gravada esteja aplicada, antes de a dar por ausente.
//
// O `AsyncAuthStore` recebe o `initial` como PROMESSA — o AsyncStorage é
// assíncrono — e aplica-o quando ela resolve. Quem perguntasse
// `authStore.isValid` no instante em que a app monta recebia FALSO, com uma
// sessão válida gravada em disco a dois milissegundos de distância.
//
// O efeito que retoma a sessão fazia exactamente isso, e com dependências
// vazias: perguntava uma vez, no pior momento possível, e nunca voltava a
// tentar. O resultado é uma corrida — às vezes retoma, às vezes manda para o
// ecrã de entrada uma pessoa que já estava dentro. Ganhar ou perder a corrida
// dependia da velocidade do disco naquele arranque.
//
// Esperar pela promessa não basta: o `AsyncAuthStore` aplica-a numa fila
// interna, e não há como saber que ela já drenou. Daí a espera limitada — que
// devolve assim que a sessão aparece, e desiste depois de um segundo e meio
// para nunca prender o arranque.
export const sessaoPronta = async (msMax = 1500) => {
  if (!estaLigado()) return false;
  obter();
  try { await sessaoACarregar; } catch (e) { /* sem sessão gravada */ }
  const fim = Date.now() + msMax;
  while (Date.now() < fim) {
    if (pb.authStore && pb.authStore.isValid) return true;
    await new Promise(r => setTimeout(r, 25));
  }
  return Boolean(pb.authStore && pb.authStore.isValid);
};

// Mantido para quem já lia `ligado`; `estaLigado()` é que reflete uma
// reconfiguração em tempo de execução.
export const ligado = Boolean(URL);
export const pb = new Proxy({}, { get: (_, p) => { const c = obter(); return c ? c[p] : undefined; } });

const semLigacao = () => Promise.reject(new Error('Servidor não configurado.'));

// O token de acesso da Google — em memória, e mais nada.
//
// ── Onde a autorização vive ─────────────────────────────────────────────────
//
// No SERVIDOR. Esta camada nunca vê o refresh token: pede um token de acesso
// de uma hora ao `/api/agenda/token`, guarda-o numa variável, e volta a pedir
// quando caducar. Se a app fechar, perde-se um token que já ia caducar de
// qualquer maneira — e a autorização continua lá, sem pedir nada a ninguém.
//
// Houve duas tentativas antes desta:
//
//   memória só         morria ao recarregar a página, e o interruptor «marcar
//                      também na agenda» DESAPARECIA do ecrã de agendar sem
//                      uma palavra. O evento ficava só na Nossa Casa.
//   sessionStorage     aguentava recarregar, morria com o separador. Numa app
//                      instalada, que abre e fecha o dia todo, pedia a entrada
//                      com o Google a cada sessão.
//
// A terceira não guarda nada porque não precisa: o que tem de durar está no
// servidor, atrás de uma coleção cujas cinco regras são nulas.
//
// Ver `db/pocketbase/pb_hooks/agenda-google.pb.js`.

// O que correu mal ao guardar a fotografia na última entrada, se correu.
// Lê-se com `auth.erroDaFotografia()`.
let erroDaFotografia = null;

let tokenGoogle = null;
let tokenExpiraEm = 0;

// Se a agenda está ligada nesta conta. `null` = ainda não se perguntou.
// A interface lê isto sem esperar, e o `verificarAgenda()` é que o preenche.
let agendaLigada = null;

const esquecerToken = () => { tokenGoogle = null; tokenExpiraEm = 0; };

// Um token válido, pedido ao servidor se for preciso.
//
// A margem de sessenta segundos evita o caso em que o token é válido no
// momento de o ler e já não é quando a Google o vê.
const tokenDaAgenda = async () => {
  if (tokenGoogle && Date.now() < tokenExpiraEm - 60000) return tokenGoogle;
  if (!estaLigado()) throw new Error('Servidor não configurado.');

  const r = await fetch(`${URL.replace(/\/+$/, '')}/api/agenda/token`, {
    method: 'POST',
    headers: { Authorization: pb.authStore.token },
  });
  if (!r.ok) {
    esquecerToken();
    agendaLigada = false;
    const d = await r.json().catch(() => ({}));
    throw new Error(d.message || 'A agenda não está ligada nesta conta.');
  }
  const d = await r.json();
  tokenGoogle = d.access_token;
  tokenExpiraEm = Date.now() + (d.expires_in || 3600) * 1000;
  agendaLigada = true;
  return tokenGoogle;
};

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
  //
  // ⚠ `scopes` SUBSTITUI os que o PocketBase pede por omissão — não acrescenta.
  // Isto passava só `calendar.readonly`, e a entrada partia-se inteira: a troca
  // do token corria bem, e o passo seguinte — ir buscar o nome e o e-mail a
  // `oauth2/v3/userinfo` — respondia 401 «Invalid Credentials», porque o token
  // dava acesso à agenda e a identidade nenhuma.
  //
  // O erro que chega ao ecrã é «Failed to fetch OAuth2 user», que soa a
  // credencial errada e manda quem o vê para a consola da Google à procura de
  // um problema que não existe. Custou duas voltas: o segredo estava certo e o
  // redirecionamento também.
  //
  // A identidade vai SEMPRE. A agenda é que é opcional.
  async entrarComGoogle({ calendario = false } = {}) {
    if (!estaLigado()) return semLigacao();
    const IDENTIDADE = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];
    const r = await pb.collection('membros').authWithOAuth2({
      provider: 'google',
      scopes: calendario
        // `calendar.events` e não `calendar.readonly`: a app passou a criar
        // eventos, não só a lê-los. É um scope MAIS LARGO, e quem já tinha
        // autorizado tem de voltar a autorizar — a Google não alarga uma
        // autorização em silêncio, e ainda bem.
        //
        // `calendar.events` dá acesso aos eventos e não ao resto da conta:
        // não vê contactos, não vê correio, não vê outros calendários.
        ? [...IDENTIDADE, 'https://www.googleapis.com/auth/calendar.events']
        : IDENTIDADE,
    });
    // O token da Google só vem nesta resposta. Guarda-se em memória, não em
    // disco: é credencial de terceiro e não tem de sobreviver ao fecho da app.
    // ⚠ O token que vem aqui NÃO se guarda.
    //
    // Dura uma hora e não é renovável: o PocketBase não pede
    // `access_type=offline` à Google (verificado no binário do 0.40.1), e
    // portanto não há refresh token nenhum atrás dele. Guardá-lo dava uma
    // agenda que funciona durante uma hora e depois falha sem explicação.
    //
    // A autorização da agenda vem do fluxo próprio — `google.ligar()`.
    agendaLigada = null;
    erroDaFotografia = null;

    // A fotografia da conta, guardada no membro.
    //
    // A Google devolve-a em `meta.avatarURL`, e ela muda quando a pessoa a
    // muda na conta — por isso escreve-se a cada entrada, e não só na primeira.
    // Falhar aqui não pode estragar a entrada: quem entra quer entrar, e um
    // avatar é um pormenor. Daí o `catch` vazio, que neste caso é a decisão
    // certa e não um descuido.
    const foto = r.meta && (r.meta.avatarURL || r.meta.avatarUrl);
    if (foto) {
      try { await auth.guardarAspeto({ avatar: foto }); }
      catch (e) {
        // A entrada não se perde por causa de uma fotografia — mas o erro
        // TAMBÉM não se perde.
        //
        // ⚠ Este catch era vazio, e escondeu um defeito a sério: durante duas
        // entradas seguidas o servidor respondeu 404 a esta escrita (a rota
        // ainda não estava carregada) e a app não disse nada. A folha do
        // avatar mostrava «ainda não há fotografia», que é verdade e não é a
        // verdade útil: a fotografia veio e não se conseguiu guardar.
        erroDaFotografia = e && e.message ? e.message : 'A fotografia não foi guardada.';
        if (typeof console !== 'undefined') console.warn('[avatar]', erroDaFotografia);
      }
    }
    return r;
  },

  // Que provedores é que o servidor tem mesmo configurados. Serve para o ecrã
  // de entrada poder DIZER se a Google está configurada em vez de o deduzir da
  // frase do erro — que foi o que o pôs a afirmar «ainda não está configurada»
  // com tudo configurado, porque «Failed to fetch OAuth2 user» também tem a
  // palavra «OAuth» lá dentro.
  // ⚠ Devolve TRÊS estados, e não uma lista.
  //
  // A versão anterior devolvia `[]` tanto quando o servidor respondia «não
  // tenho a Google» como quando não respondia nada. O ecrã de entrada leu
  // aquele `[]` e afirmou «a entrada pela Google ainda não está configurada
  // neste servidor» — com a Google configurada e o servidor simplesmente
  // desligado.
  //
  // É exactamente o defeito que este método existia para corrigir, uma camada
  // mais abaixo: afirmar uma causa que não se apurou. «Não sei» tem de ser
  // uma resposta possível, senão alguém vai à consola da Google procurar um
  // problema que está no processo do servidor.
  provedores: async () => {
    if (!estaLigado()) return { alcancavel: false, semServidor: true, lista: [] };
    try {
      const m = await pb.collection('membros').listAuthMethods();
      return {
        alcancavel: true,
        semServidor: false,
        lista: (m.oauth2?.providers || []).map(p => p.name),
      };
    } catch {
      return { alcancavel: false, semServidor: false, lista: [] };
    }
  },

  // Confirmar a credencial de OUTRA pessoa, sem lhe entrar na sessão.
  //
  // É a peça de que uma acção «precisa de todos os administradores» depende: um
  // adulto passa o telemóvel ao outro, o outro escreve a sua palavra-passe, e a
  // app tem de saber se está certa SEM ficar com a sessão dele.
  //
  // ⚠ Não se pode usar o cliente da app: `authWithPassword` grava a sessão no
  // `authStore`, e quem confirmasse ficava a usar a app em nome do outro. Aqui
  // constrói-se um cliente DESCARTÁVEL, sem armazenamento nenhum — ele nasce,
  // pergunta ao servidor, e desaparece com a resposta.
  //
  // A verificação é do SERVIDOR: as palavras-passe estão em bcrypt e o valor
  // correto nunca chega ao dispositivo. Comparar no cliente seria pedir a quem
  // quisesse passar por cima que abrisse a consola.
  //
  // Devolve o membro quando a credencial está certa, e `null` quando não está.
  // Não distingue «não existe» de «palavra-passe errada»: isso diria a quem
  // tentasse quais os endereços que existem nesta casa.
  async confirmarCredencial(identidade, palavraPasse) {
    if (!estaLigado()) return null;
    try {
      const descartavel = new PocketBase(URL);   // sem AsyncAuthStore, de propósito
      const r = await descartavel.collection('membros').authWithPassword(identidade, palavraPasse);
      const membro = r && r.record ? { id: r.record.id, nome: r.record.nome, papel: r.record.papel } : null;
      descartavel.authStore.clear();
      return membro;
    } catch (e) {
      return null;
    }
  },

  // Apagar os dados da casa no SERVIDOR.
  //
  // O «Começar de Zero» só limpava o `AsyncStorage`: a casa no servidor ficava
  // intacta e voltava na entrada seguinte. O botão prometia mais do que fazia.
  //
  // Ficam a casa, os membros e os papéis — recomeçar a vida da família não é
  // dissolver a família. Quem verifica isso é o servidor, e há nove provas em
  // `db/pocketbase/provar-limpar-casa.mjs`: um adulto não pode, uma criança não
  // pode, e o administrador de outra casa não toca nesta.
  //
  // Devolve o que apagou, coleção a coleção. Uma operação destas não responde
  // «pronto»: quem a pediu tem de poder ver que o que saiu foi o que esperava.
  async limparCasaNoServidor() {
    if (!estaLigado()) throw new Error('Servidor não configurado.');
    const r = await fetch(`${URL.replace(/\/+$/, '')}/api/casa/limpar`, {
      method: 'POST',
      headers: { Authorization: pb.authStore.token },
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || 'O servidor recusou a limpeza.');
    return d;
  },

  // Ir buscar a fotografia da conta Google, SEM terminar a sessão.
  //
  // ── Porque é preciso um pedido só para isto ─────────────────────────────────
  //
  // A fotografia chega no `meta.avatarURL` que a Google devolve NO INSTANTE da
  // entrada, e mais em momento nenhum. Quem já estava dentro quando este campo
  // passou a existir nunca a escreveu — e não há como a ir buscar depois: o
  // token que a app guarda é o da AGENDA, pede `calendar.events` e mais nada.
  // Alargar o âmbito de uma autorização de agenda para apanhar uma fotografia
  // seria pedir mais acesso do que o preciso, e ficaria pedido para sempre.
  //
  // A alternativa era o que a folha dizia: «termine a sessão e volte a entrar».
  // Funciona e é má — obriga a sair de casa para ir buscar uma coisa que está
  // à porta.
  //
  // ⚠ Corre num cliente DESCARTÁVEL, como o `confirmarCredencial`. Sem isso, a
  // entrada substituía a sessão em curso: quem escolhesse outra conta na janela
  // da Google — a do trabalho, a de outra pessoa do mesmo telemóvel — ficava com
  // a app aberta em nome dela sem ter pedido nada disso.
  //
  // E por isso mesmo confirma-se que o membro devolvido é ESTE. Se for outro,
  // não se escreve nada e diz-se porquê: a sessão a sério nunca chegou a ser
  // tocada.
  async trazerFotografiaDaGoogle() {
    if (!estaLigado()) throw new Error('Servidor não configurado.');
    const eu = pb.authStore.record;
    if (!eu) throw new Error('Entre primeiro.');

    const descartavel = new PocketBase(URL);   // sem AsyncAuthStore, de propósito
    let r;
    try {
      r = await descartavel.collection('membros').authWithOAuth2({
        provider: 'google',
        // Só a identidade. Nada de agenda: isto é uma fotografia.
        scopes: ['openid',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'],
      });
    } catch (e) {
      descartavel.authStore.clear();
      throw new Error('A Google não devolveu a fotografia.');
    }

    const outro = !r || !r.record || r.record.id !== eu.id;
    const foto = r && r.meta && (r.meta.avatarURL || r.meta.avatarUrl);
    descartavel.authStore.clear();

    if (outro) throw new Error('Essa é outra conta Google. A sessão não mudou.');
    if (!foto) throw new Error('Esta conta Google não tem fotografia.');

    await auth.guardarAspeto({ avatar: foto });
    return foto;
  },

  // O aspeto do próprio membro — a fotografia e a cor do avatar.
  //
  // Vai por uma rota e não por um `update` da coleção: a regra de update de
  // `membros` exige papel admin, porque quem escreve um membro escreve o PAPEL
  // dele. A rota escreve dois campos, no membro autenticado, e mais nada. Ver
  // `db/pocketbase/pb_hooks/avatar.pb.js`.
  //
  // Os campos são opcionais e independentes: quem manda só a cor não perde a
  // fotografia. Uma cadeia vazia LIMPA — é diferente de não mandar.
  async guardarAspeto({ avatar, cor } = {}) {
    if (!estaLigado()) throw new Error('Servidor não configurado.');
    const corpo = {};
    if (avatar !== undefined) corpo.avatar = String(avatar || '');
    if (cor !== undefined) corpo.cor = String(cor || '');
    if (!Object.keys(corpo).length) return null;

    const r = await fetch(`${URL.replace(/\/+$/, '')}/api/membro/aspeto`, {
      method: 'POST',
      headers: { Authorization: pb.authStore.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || 'Não foi possível guardar o avatar.');
    return d;
  },

  erroDaFotografia: () => erroDaFotografia,

  sair: () => { if (estaLigado()) { pb.authStore.clear(); esquecerToken(); agendaLigada = null; } },
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
// ⚠ Só funciona depois de `google.ligar()`. A entrada com o Google dá
// identidade e mais nada: o token que ela devolve dura uma hora e não é
// renovável, porque o PocketBase não pede `access_type=offline` à Google.
// A autorização da agenda é um consentimento à parte, e a chave de longa
// duração fica no servidor.

const CAL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export const google = {
  // A interface lê isto sem esperar, e por isso não pode ser uma promessa.
  // `verificar()` é que vai ao servidor; até ele responder, `null` quer dizer
  // «ainda não se sabe» — e um ecrã que não sabe não deve afirmar nada.
  disponivel: () => agendaLigada === true,

  // Há sessão, mas a agenda não está ligada — é uma situação a EXPLICAR, e não
  // a esconder. Numa app sem servidor devolve falso: aí não há nada a ligar.
  porLigar: () => Boolean(estaLigado() && pb.authStore && pb.authStore.isValid
    && agendaLigada === false),

  // Perguntar ao servidor, sem incomodar a Google.
  async verificar() {
    if (!estaLigado() || !pb.authStore || !pb.authStore.isValid) {
      agendaLigada = false;
      return false;
    }
    try {
      const r = await fetch(`${URL.replace(/\/+$/, '')}/api/agenda/estado`, {
        headers: { Authorization: pb.authStore.token },
      });
      agendaLigada = r.ok ? Boolean((await r.json()).ligada) : false;
    } catch {
      agendaLigada = false;
    }
    return agendaLigada;
  },

  // Ligar a agenda: pedir o endereço do consentimento e abrir a janela.
  //
  // O endereço vem numa chamada AUTENTICADA, e só depois se abre a janela. Uma
  // janela do navegador não manda cabeçalhos, e a alternativa — pôr a sessão no
  // endereço — deixava-a no histórico do navegador e nos registos de tudo o
  // que estivesse pelo caminho.
  async ligar() {
    if (!estaLigado()) throw new Error('Servidor não configurado.');
    const r = await fetch(`${URL.replace(/\/+$/, '')}/api/agenda/ligar`, {
      method: 'POST',
      headers: { Authorization: pb.authStore.token },
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.message || 'Não foi possível começar a ligação à agenda.');
    }
    const { url } = await r.json();
    if (typeof window === 'undefined' || !window.open) {
      throw new Error('Abra a app num navegador para autorizar a agenda.');
    }
    const janela = window.open(url, 'nossa-casa-agenda', 'width=520,height=680');
    if (!janela) throw new Error('O navegador bloqueou a janela. Permita janelas para este sítio.');

    // A janela fecha-se sozinha no fim. Enquanto ela viver, pergunta-se ao
    // servidor de dois em dois segundos — o servidor é a única fonte fiável:
    // a janela é de outro domínio e não se pode ler de fora.
    return new Promise((resolve) => {
      const fim = Date.now() + 5 * 60 * 1000;
      const relogio = setInterval(async () => {
        const acabou = janela.closed || Date.now() > fim;
        if (await this.verificar()) { clearInterval(relogio); resolve(true); return; }
        if (acabou) { clearInterval(relogio); resolve(false); }
      }, 2000);
    });
  },

  // Os eventos dos próximos `dias`, já na forma que a app usa.
  async eventos({ dias = 30, max = 50 } = {}) {
    const bearer = await tokenDaAgenda();

    // ⚠ A janela começa no INÍCIO DE HOJE, e não no instante em que se pede.
    //
    // Era `timeMin: new Date().toISOString()`, e com isso a app nunca via os
    // eventos de hoje que já tinham começado. Verificado contra a agenda a
    // sério: com `timeMin` no instante, quatro eventos de hoje devolviam ZERO;
    // com `timeMin` de ontem, devolviam os quatro. Um evento de dia inteiro
    // conta como tendo começado à meia-noite, portanto às nove da manhã já
    // estava fora da janela.
    //
    // Para uma casa isso é o contrário do que se quer: a consulta das nove é
    // precisamente a que interessa ter na agenda da família, e o ecrã da
    // Agenda mostra o dia todo. A app e a Google tinham noções diferentes de
    // «hoje», e a importação não oferecia nada sem dizer porquê.
    const agora = new Date();
    const inicioDeHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const ate = new Date(inicioDeHoje.getTime() + dias * 86400000);
    const q = new URLSearchParams({
      timeMin: inicioDeHoje.toISOString(), timeMax: ate.toISOString(),
      singleEvents: 'true', orderBy: 'startTime', maxResults: String(max),
    });
    const r = await fetch(`${CAL}?${q}`, { headers: { Authorization: `Bearer ${bearer}` } });
    if (!r.ok) {
      // 401 é o token expirado ou sem o scope da agenda — dizer isso, e não
      // «algo correu mal», é a diferença entre o utilizador saber o que fazer.
      if (r.status === 401 || r.status === 403) {
        // O token era válido quando saiu daqui e a Google recusou-o. Esquece-se
        // para o próximo pedido ir buscar outro; não se tenta de novo aqui,
        // porque um 403 pode ser falta de âmbito e aí insistir não resolve.
        esquecerToken();
        throw new Error('A autorização da agenda foi recusada. Ligue a agenda outra vez ao agendar.');
      }
      throw new Error(`A Google respondeu ${r.status}.`);
    }
    const { items = [] } = await r.json();
    return items.filter(e => e.status !== 'cancelled').map(traduzirEvento);
  },

  // ── Escrever na agenda ────────────────────────────────────────────────────
  //
  // ⚠ NÃO SE ESCREVE NA AGENDA DE OUTRA PESSOA. Não é uma limitação desta app:
  // a agenda de cada um é dela, e o único token que existe aqui é o de quem
  // entrou. Escrever na agenda do outro adulto exigiria que ELE autorizasse
  // esta aplicação na conta dele, e que essa autorização vivesse num servidor.
  //
  // O que se faz — e é como um calendário funciona — é CONVIDAR: o evento
  // nasce na agenda de quem o cria, com os outros como participantes. A Google
  // põe-no na agenda de cada um deles e manda-lhes um convite por e-mail.
  //
  // Isso quer dizer que criar um evento partilhado MANDA E-MAIL a quem for
  // convidado. Não é um pormenor técnico — é correio que sai em nome de quem
  // carrega no botão, e o ecrã tem de o dizer antes de acontecer.
  async criarEvento({ titulo, dia, hora, duracaoMin = 60, convidados = [], descricao }) {
    const bearer = await tokenDaAgenda();
    const corpo = {
      summary: titulo,
      description: descricao || undefined,
      ...intervalo(dia, hora, duracaoMin),
      ...(convidados.length ? { attendees: convidados.map(email => ({ email })) } : {}),
    };
    // `sendUpdates=all` é o que faz os convites chegarem. Sem isto o evento
    // aparece na agenda dos convidados sem eles saberem porquê.
    const r = await fetch(`${CAL}?sendUpdates=${convidados.length ? 'all' : 'none'}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    if (!r.ok) throw new Error(await erroDaGoogle(r));
    const { id } = await r.json();
    return id;
  },

  async atualizarEvento(idGoogle, { titulo, dia, hora, duracaoMin = 60, convidados = [] }) {
    const bearer = await tokenDaAgenda();
    const r = await fetch(`${CAL}/${encodeURIComponent(idGoogle)}?sendUpdates=${convidados.length ? 'all' : 'none'}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: titulo,
        ...intervalo(dia, hora, duracaoMin),
        ...(convidados.length ? { attendees: convidados.map(email => ({ email })) } : {}),
      }),
    });
    if (!r.ok) throw new Error(await erroDaGoogle(r));
  },

  async apagarEvento(idGoogle) {
    const bearer = await tokenDaAgenda();
    const r = await fetch(`${CAL}/${encodeURIComponent(idGoogle)}?sendUpdates=all`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${bearer}` },
    });
    // 410 é «já lá não está», e isso é o resultado que se queria.
    if (!r.ok && r.status !== 404 && r.status !== 410) throw new Error(await erroDaGoogle(r));
  },
};

// A chave da app é `d2026-08-21`; a Google quer ISO com fuso. Sem hora, é um
// evento de dia inteiro — que é o que faz sentido para uma garantia ou um
// aniversário, e não um evento à meia-noite.
const intervalo = (dia, hora, duracaoMin) => {
  const d = String(dia || '').replace(/^d/, '');
  if (!hora) {
    const seguinte = new Date(`${d}T00:00:00Z`);
    seguinte.setUTCDate(seguinte.getUTCDate() + 1);
    return { start: { date: d }, end: { date: seguinte.toISOString().slice(0, 10) } };
  }
  const inicio = new Date(`${d}T${hora}:00`);
  const fim = new Date(inicio.getTime() + duracaoMin * 60000);
  const local = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}T${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}:00`;
  const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    start: { dateTime: local(inicio), timeZone: fuso },
    end: { dateTime: local(fim), timeZone: fuso },
  };
};

// A Google devolve o motivo dentro de `error.message`. Dizê-lo é a diferença
// entre a pessoa saber o que fazer e ver «algo correu mal».
const erroDaGoogle = async (r) => {
  if (r.status === 401 || r.status === 403) {
    return 'A autorização da agenda expirou ou não chega para escrever. '
      + 'Entre com o Google outra vez.';
  }
  try {
    const j = await r.json();
    return `A Google recusou: ${j.error?.message || r.status}.`;
  } catch (e) { return `A Google respondeu ${r.status}.`; }
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
