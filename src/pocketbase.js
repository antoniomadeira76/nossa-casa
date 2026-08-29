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
//   3. Não toca na saúde. As fichas ficam fora desta camada até os cinco
//      pontos do db/postgres/README.md estarem resolvidos — são dados
//      clínicos de menores.
//
// As regras estão provadas: db/pocketbase/provar-regras.mjs e provar-hooks.mjs
// correm contra um servidor a sério e testam o que NÃO deve ser possível.

import AsyncStorage from '@react-native-async-storage/async-storage';
import PocketBase, { AsyncAuthStore } from 'pocketbase';

const URL = process.env.EXPO_PUBLIC_PB_URL;

// Sem configuração, a app corre local como sempre correu. Não rebenta.
export const ligado = Boolean(URL);

const guardaAuth = new AsyncAuthStore({
  save: (s) => AsyncStorage.setItem('nossa-casa/auth', s),
  initial: AsyncStorage.getItem('nossa-casa/auth'),
  clear: () => AsyncStorage.removeItem('nossa-casa/auth'),
});

export const pb = ligado ? new PocketBase(URL, guardaAuth) : null;

const semLigacao = () => Promise.reject(new Error('Servidor não configurado.'));

// ─── Sessão ──────────────────────────────────────────────────────────────────

export const auth = {
  // Os adultos entram por e-mail.
  entrarAdulto: (email, password) => (ligado
    ? pb.collection('membros').authWithPassword(email, password)
    : semLigacao()),

  // As crianças não têm conta nem e-mail (§8). Entram pelo `login`, um
  // identificador interno, com o PIN como palavra-passe — que o PocketBase
  // guarda em bcrypt e verifica no SERVIDOR. O valor correto nunca chega ao
  // dispositivo, que é o que §3.3 exige e nada no cliente substitui.
  entrarCrianca: (login, pin) => (ligado
    ? pb.collection('membros').authWithPassword(login, pin)
    : semLigacao()),

  // Só um adulto autenticado altera o PIN — a regra de update da coleção exige
  // papel admin, e o hook valida a qualidade do PIN.
  definirPin: (membroId, pin) => (ligado
    ? pb.collection('membros').update(membroId, { password: pin, passwordConfirm: pin })
    : semLigacao()),

  sair: () => { if (ligado) pb.authStore.clear(); },
  membro: () => (ligado ? pb.authStore.record : null),
  valida: () => Boolean(ligado && pb.authStore.isValid),
};

// ─── Leitura ─────────────────────────────────────────────────────────────────

// Nenhuma leitura leva filtro por casa: as regras já o impõem, e repeti-lo aqui
// daria a impressão errada de que é o cliente que protege.
const COLECOES = ['casas', 'membros', 'eventos', 'tarefas', 'tarefas_feitas',
  'envelopes', 'despesas', 'cofre_movimentos', 'equipamentos'];

export const ler = {
  async casa() {
    if (!ligado) return semLigacao();
    const res = await Promise.all(COLECOES.map(c =>
      pb.collection(c).getFullList({ batch: 500 }).catch(() => [])));
    return Object.fromEntries(COLECOES.map((c, i) => [c, res[i]]));
  },

  colecao: (nome, opts) => (ligado ? pb.collection(nome).getFullList(opts) : semLigacao()),

  // Ficheiros: o URL é assinado pelo servidor, não construído aqui.
  ficheiro: (registo, campo) => (ligado && registo && registo[campo]
    ? pb.files.getURL(registo, registo[campo]) : null),
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
  try { return JSON.parse(await AsyncStorage.getItem(FILA)) || []; } catch { return []; }
};
const gravarFila = (f) => AsyncStorage.setItem(FILA, JSON.stringify(f)).catch(() => {});
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
    if (!ligado) return { enviadas: 0, pendentes: (await lerFila()).length };
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
    if (!ligado) return () => {};
    await pb.collection('artigos').subscribe('*', (ev) => aoMudar('artigos', ev))
      .catch(() => {});
    return () => { pb.collection('artigos').unsubscribe('*').catch(() => {}); };
  },
};
