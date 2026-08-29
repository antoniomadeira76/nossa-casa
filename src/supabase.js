// Ligação ao servidor — contra o esquema em db/01-esquema.sql.
//
// Três coisas que este ficheiro NÃO faz, de propósito:
//
//   1. Não filtra visibilidade. As políticas em db/01-esquema.sql é que
//      decidem o que a consulta devolve (INVARIANTE #3). Se um evento privado
//      de outro membro chegar aqui, o defeito é no servidor, não no filtro.
//   2. Não escreve saldos. Cofre, envelopes e acertos são vistas que somam
//      movimentos (INVARIANTE #2). Aqui só se inserem movimentos.
//   3. Não toca na saúde. `episodios_saude` e `anexos` existem no esquema mas
//      estão fora desta camada até os cinco pontos do db/README.md estarem
//      resolvidos — são dados clínicos de menores.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Sem configuração, a app corre local como sempre correu. Não rebenta.
export const ligado = Boolean(URL && ANON);

export const supabase = ligado
  ? createClient(URL, ANON, {
      auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true,
              detectSessionInUrl: false },
    })
  : null;

const semLigacao = () => ({ data: null, error: new Error('Servidor não configurado.') });

// ─── Sessão ──────────────────────────────────────────────────────────────────

export const auth = {
  // Adultos entram por conta. As crianças não têm conta — ver entrarCrianca.
  entrarAdulto: (email, password) => ligado
    ? supabase.auth.signInWithPassword({ email, password })
    : semLigacao(),

  // O PIN é verificado no SERVIDOR. verificar_pin() usa crypt() e conta as
  // tentativas na linha do membro; o valor correto nunca chega ao dispositivo.
  // É isto que corrige a falha de origem, e nada no cliente a substitui.
  entrarCrianca: async (membroId, pin) => {
    if (!ligado) return semLigacao();
    const { data, error } = await supabase.rpc('verificar_pin', {
      p_membro: membroId, p_pin: pin,
    });
    if (error) return { data: null, error };
    return { data: { valido: data === true }, error: null };
  },

  // Só um adulto autenticado define um PIN — definir_pin() recusa o resto.
  definirPin: (membroId, pin) => ligado
    ? supabase.rpc('definir_pin', { p_membro: membroId, p_pin: pin })
    : semLigacao(),

  sair: () => (ligado ? supabase.auth.signOut() : semLigacao()),
  sessao: () => (ligado ? supabase.auth.getSession() : semLigacao()),
};

// ─── Leitura ─────────────────────────────────────────────────────────────────

// As tabelas que a app lê ao abrir. A saúde não está aqui — ver o cabeçalho.
// Nenhuma leva filtro por casa: minha_casa_id() já o impõe nas políticas, e
// repeti-lo aqui daria a impressão errada de que é o cliente que protege.
const TABELAS = [
  'casas', 'membros', 'preferencias', 'eventos', 'tarefas', 'tarefas_feitas',
  'lojas', 'listas_compras', 'artigos', 'meses', 'envelopes', 'transferencias',
  'despesas', 'acertos', 'cofre_movimentos', 'metas', 'categorias_equip',
  'equipamentos', 'manutencoes', 'especialidades',
];

// Os saldos vêm somados do servidor, não calculados aqui.
const VISTAS = [
  'v_cofre_saldo', 'v_envelope_limite', 'v_envelope_gasto',
  'v_acerto_saldo', 'v_pontos_por_pagar',
];

export const ler = {
  casa: async () => {
    if (!ligado) return semLigacao();
    const nomes = [...TABELAS, ...VISTAS];
    const res = await Promise.all(nomes.map(n => supabase.from(n).select('*')));
    const erro = res.find(r => r.error);
    if (erro) return { data: null, error: erro.error };
    return { data: Object.fromEntries(nomes.map((n, i) => [n, res[i].data])), error: null };
  },

  tabela: (nome) => (ligado ? supabase.from(nome).select('*') : semLigacao()),
};

// ─── Fila de escritas ────────────────────────────────────────────────────────
//
// Offline, as escritas ficam em fila e vão ao reconectar. Por isso as
// operações de dinheiro levam chave de idempotência (db/04-idempotencia.sql):
// um reenvio colide no índice em vez de pagar a semanada duas vezes.

const FILA = 'nossa-casa/fila';
const COM_IDEM = new Set(['despesas', 'acertos', 'cofre_movimentos', 'transferencias']);

const lerFila = async () => {
  try { return JSON.parse(await AsyncStorage.getItem(FILA)) || []; }
  catch { return []; }
};
const gravarFila = (f) => AsyncStorage.setItem(FILA, JSON.stringify(f)).catch(() => {});

// A chave é gerada aqui, no cliente, e viaja com a escrita — é o que permite
// reconhecer o reenvio como sendo a mesma operação.
const novaChave = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const escrever = {
  // Enfileirar em vez de escrever direto: a app continua a funcionar sem rede.
  async inserir(tabela, linha) {
    const dados = COM_IDEM.has(tabela) && !linha.idem_key
      ? { ...linha, idem_key: novaChave() }
      : linha;
    const fila = await lerFila();
    fila.push({ op: 'insert', tabela, dados, em: Date.now() });
    await gravarFila(fila);
    return this.esvaziar();
  },

  async atualizar(tabela, id, campos) {
    const fila = await lerFila();
    fila.push({ op: 'update', tabela, id, dados: campos, em: Date.now() });
    await gravarFila(fila);
    return this.esvaziar();
  },

  // Envia por ordem e para na primeira falha, para não trocar a sequência.
  // O que falhou fica na fila para a tentativa seguinte.
  async esvaziar() {
    if (!ligado) return { enviadas: 0, pendentes: (await lerFila()).length };
    let fila = await lerFila();
    let enviadas = 0;
    while (fila.length) {
      const w = fila[0];
      const q = w.op === 'insert'
        ? supabase.from(w.tabela).insert(w.dados)
        : supabase.from(w.tabela).update(w.dados).eq('id', w.id);
      const { error } = await q;
      // 23505 = violação de unicidade. Numa escrita com chave de idempotência
      // isso significa «já lá está», que é sucesso e não erro.
      if (error && !(error.code === '23505' && w.dados && w.dados.idem_key)) break;
      fila.shift();
      enviadas++;
      await gravarFila(fila);
    }
    return { enviadas, pendentes: fila.length };
  },

  pendentes: async () => (await lerFila()).length,
};

// ─── Tempo real ──────────────────────────────────────────────────────────────
//
// Só a lista de compras. É a única área onde dois telefones estão na mesma
// coisa ao mesmo tempo — dois adultos na loja. Subscrever tudo gasta bateria e
// não resolve problema nenhum. A publicação está em db/01-esquema.sql:733.

export const tempoReal = {
  compras(aoMudar) {
    if (!ligado) return () => {};
    const canal = supabase.channel('compras')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artigos' },
          p => aoMudar('artigos', p))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listas_compras' },
          p => aoMudar('listas_compras', p))
      .subscribe();
    return () => supabase.removeChannel(canal);
  },
};

// ─── Políticas, para quem lê este ficheiro ───────────────────────────────────
// A tabela completa está em db/01-esquema.sql, imposta em SQL. Isto é um mapa,
// não a regra — e a regra é a única que conta.
export const RLS_RULES = {
  casas: 'Leitura: a casa do membro. Escrita: administração.',
  membros: 'Leitura: a casa. Papéis e PIN: administração.',
  eventos: 'Leitura: partilhado, ou o autor é quem pede.',
  tarefas: 'Adultos definem; qualquer membro conclui a sua.',
  artigos: 'Todos os membros da casa.',
  envelopes: 'Adultos. Ausentes da resposta a um perfil de criança.',
  despesas: 'Adultos. Corrigir é anular e recriar, nunca editar o valor.',
  cofre_movimentos: 'Adultos inserem; a criança lê o seu. Saldo é v_cofre_saldo.',
  equipamentos: 'Adultos.',
  episodios_saude: 'FORA desta camada — ver o cabeçalho do ficheiro.',
};
