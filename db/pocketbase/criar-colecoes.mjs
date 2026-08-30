// Cria as coleções da Nossa Casa no PocketBase, traduzindo db/postgres/01-esquema.sql.
import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.PB_URL || 'http://127.0.0.1:8095');
// As credenciais do superutilizador vêm do ambiente. Os valores por omissão
// são os do servidor de desenvolvimento e estão aqui para estes scripts
// correrem sem preparação nenhuma — mas num servidor a sério o administrador é
// outro, e a palavra-passe não deve estar escrita num ficheiro versionado.
//   PB_ADMIN=... PB_ADMIN_PASS=... node <este ficheiro>
const ADMIN = process.env.PB_ADMIN || 'admin@nossacasa.local';
const ADMIN_PASS = process.env.PB_ADMIN_PASS || 'casa-de-testes-123';
await pb.collection('_superusers').authWithPassword(ADMIN, ADMIN_PASS);

const txt = (name, o = {}) => ({ name, type: 'text', ...o });
const num = (name, o = {}) => ({ name, type: 'number', ...o });
const bool = (name, o = {}) => ({ name, type: 'bool', ...o });
const data = (name, o = {}) => ({ name, type: 'date', ...o });
const sel = (name, values, o = {}) => ({ name, type: 'select', values, maxSelect: 1, ...o });
const rel = (name, collectionId, o = {}) => ({ name, type: 'relation', collectionId, maxSelect: 1, cascadeDelete: false, ...o });
const fich = (name, o = {}) => ({ name, type: 'file', maxSelect: 1, maxSize: 8388608, ...o });

const ids = {};

// Recriar do zero é o que torna isto repetível. Apagar pela ordem inversa,
// porque as relações impedem apagar uma coleção que outra ainda refere.
const NOSSAS = [
  // vistas primeiro: dependem das coleções de base
  'v_cofre_saldo', 'v_envelope_gasto', 'v_acerto_saldo', 'v_pontos_por_pagar',
  'anexos', 'episodios_saude', 'especialidades', 'manutencoes', 'categorias_equip',
  'metas', 'acertos', 'transferencias', 'artigos', 'listas_compras', 'lojas',
  'meses', 'preferencias', 'equipamentos', 'cofre_movimentos', 'despesas',
  'envelopes', 'tarefas_feitas', 'tarefas', 'eventos', 'membros', 'casas'];
const existentes = await pb.collections.getFullList();
for (const nome of NOSSAS) {
  const c = existentes.find(x => x.name === nome);
  if (c) await pb.collections.delete(c.id);
}

const criar = async (def) => {
  let c;
  try { c = await pb.collections.create(def); }
  catch (e) {
    console.error(`FALHOU ${def.name}:`, JSON.stringify(e.response?.data || e.message));
    throw e;
  }
  ids[def.name] = c.id;
  return c;
};

// ── A casa ───────────────────────────────────────────────────────────────────
// Sem regras ainda: membros ainda não existe para as poder referir.
await criar({
  name: 'casas', type: 'base',
  fields: [
    txt('nome', { required: true }),
    num('rendimento_mensal', { min: 0 }),
    // §4: o valor do ponto é validado no SERVIDOR, não só no campo.
    num('valor_ponto', { min: 0.01, max: 5 }),
    num('dia_pagamento', { min: 0, max: 6, onlyInt: true }),
    bool('divide_meias'),
  ],
});

// ── Membros ──────────────────────────────────────────────────────────────────
// Coleção de AUTENTICAÇÃO. É a peça central da tradução: o PocketBase já faz
// hash das palavras-passe com bcrypt e verifica-as no servidor, portanto o PIN
// de uma criança é a palavra-passe dela — e §3.2 fica satisfeita sem escrever
// criptografia nenhuma. O valor correto nunca chega ao dispositivo.
await criar({
  name: 'membros', type: 'auth',
  // Os adultos entram por e-mail. As crianças não têm e-mail nem conta própria
  // — §8 pede que assim continue — por isso entram por `login`, um
  // identificador interno «casa_nome». O campo de identidade tem de ser único
  // em toda a coleção, e `nome` não pode ser: duas casas podem ter um Léo.
  passwordAuth: { enabled: true, identityFields: ['email', 'login'] },
  fields: [
    txt('nome', { required: true }),
    txt('login', { required: true }),
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    sel('papel', ['admin', 'adulto', 'crianca'], { required: true }),
    txt('cor'),
    // O género gramatical é uma propriedade da pessoa, não coisa que se
    // adivinhe do nome — a app tinha três sítios a fazer `nome === 'Rita'` e
    // um deles escrevia «Saúde do Mia». Fica ao lado do nome, no servidor,
    // porque é a casa que sabe como cada membro quer ser tratado.
    bool('fem'),
  ],
  indexes: ['CREATE UNIQUE INDEX idx_membro_login ON membros (login)'],
  listRule: 'casa = @request.auth.casa',
  viewRule: 'casa = @request.auth.casa',
  // Um administrador acrescenta membros à SUA casa, e mais ninguém. Estava
  // `null` — só superutilizador —, o que impedia a app de ter um ecrã de
  // membros: quem administra a casa não conseguia acrescentar nem a própria
  // filha. As guardas do que se pode criar continuam nos hooks (qualidade do
  // PIN, palavra-passe de adulto, e-mail só para adultos).
  createRule: '@request.auth.papel = "admin" && casa = @request.auth.casa',
  updateRule: '@request.auth.papel = "admin" && casa = @request.auth.casa',
  deleteRule: '@request.auth.papel = "admin" && casa = @request.auth.casa',
});

// Os campos de sistema da autenticação vêm com `password` a exigir 8 caracteres
// e `email` obrigatório. Um PIN tem quatro dígitos, e uma criança não tem
// e-mail — §8 pede que assim continue. Ajustam-se depois de criar.
{
  const c = (await pb.collections.getFullList()).find(x => x.name === 'membros');
  await pb.collections.update(c.id, {
    fields: c.fields.map(f => {
      if (f.name === 'password') return { ...f, min: 4 };
      if (f.name === 'email') return { ...f, required: false };
      return f;
    }),
  });
}

// ── Entrar com Google ────────────────────────────────────────────────────────
// O PocketBase trata do OAuth2; nós só lhe damos as credenciais. Elas vêm do
// ambiente e nunca do código — ver .env.example e docs/GOOGLE_CALENDAR_SETUP.md.
//
// Repare no que NÃO se ativa: `createRule` de `membros` continua nulo, portanto
// entrar com Google não cria conta. Num app familiar não há inscrição livre —
// um administrador acrescenta o membro com o e-mail, e o Google só confirma que
// é mesmo essa pessoa. Quem chegar sem convite é recusado, e é o que se quer.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const c = (await pb.collections.getFullList()).find(x => x.name === 'membros');
  await pb.collections.update(c.id, {
    oauth2: {
      enabled: true,
      providers: [{
        name: 'google',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }],
      // O nome vem do perfil Google; o resto é da casa e não se deixa mapear.
      mappedFields: { name: 'nome' },
    },
  });
  console.log('OAuth do Google: ativado');
} else {
  console.log('OAuth do Google: sem credenciais no ambiente — fica desativado');
}

await pb.collections.update(ids.casas, {
  listRule: 'id = @request.auth.casa',
  viewRule: 'id = @request.auth.casa',
  updateRule: 'id = @request.auth.casa && @request.auth.papel = "admin"',
});

// Atalhos usados em quase todas as regras.
const DA_CASA = 'casa = @request.auth.casa';
const ADULTO = '@request.auth.papel != "crianca"';
const ADMIN = '@request.auth.papel = "admin"';

// ── Agenda ───────────────────────────────────────────────────────────────────
await criar({
  name: 'eventos', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    data('dia', { required: true }),
    txt('hora'),
    txt('titulo', { required: true }),
    rel('responsavel', ids.membros),
    rel('autor', ids.membros, { required: true }),
    bool('partilhado'),
  ],
  // §5: um evento privado de outro membro NÃO é devolvido. Filtrar no cliente
  // era vazar com atraso.
  listRule: `${DA_CASA} && (partilhado = true || autor = @request.auth.id)`,
  viewRule: `${DA_CASA} && (partilhado = true || autor = @request.auth.id)`,
  createRule: `${DA_CASA} && ${ADULTO} && autor = @request.auth.id`,
  updateRule: `${DA_CASA} && autor = @request.auth.id`,
  deleteRule: `${DA_CASA} && autor = @request.auth.id`,
});

// ── Tarefas ──────────────────────────────────────────────────────────────────
await criar({
  name: 'tarefas', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    txt('titulo', { required: true }),
    rel('atribuido_a', ids.membros),
    sel('recorrencia', ['uma_vez', 'diaria', 'dias_semana']),
    num('pontos', { min: 0, max: 20, onlyInt: true }),
    num('urgencia', { min: 0, max: 2, onlyInt: true }),
    data('prazo'),
  ],
  listRule: DA_CASA, viewRule: DA_CASA,
  createRule: `${DA_CASA} && ${ADULTO}`,
  updateRule: `${DA_CASA} && ${ADULTO}`,
  deleteRule: `${DA_CASA} && ${ADULTO}`,
});

// ADITIVA: uma linha por (tarefa, dia). Os pontos só contam com confirmada_em.
await criar({
  name: 'tarefas_feitas', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('tarefa', ids.tarefas, { required: true, cascadeDelete: true }),
    data('data', { required: true }),
    rel('marcada_por', ids.membros, { required: true }),
    rel('confirmada_por', ids.membros),
    data('confirmada_em'),
  ],
  indexes: ['CREATE UNIQUE INDEX idx_tarefa_dia ON tarefas_feitas (tarefa, data)'],
  listRule: DA_CASA, viewRule: DA_CASA,
  // §4: qualquer membro conclui, mas só a si atribuída.
  createRule: `${DA_CASA} && marcada_por = @request.auth.id && tarefa.atribuido_a = @request.auth.id`,
  // a confirmação que valida os pontos exige adulto
  updateRule: `${DA_CASA} && ${ADULTO}`,
  deleteRule: `${DA_CASA} && ${ADULTO}`,
});

// ── Dinheiro ─────────────────────────────────────────────────────────────────
await criar({
  name: 'envelopes', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    txt('nome', { required: true }),
    num('limite_base', { min: 0 }),
    txt('cor'),
  ],
  // §5: «invisíveis a perfis de criança — AUSENTES DA RESPOSTA».
  listRule: `${DA_CASA} && ${ADULTO}`,
  viewRule: `${DA_CASA} && ${ADULTO}`,
  createRule: `${DA_CASA} && ${ADMIN}`,
  updateRule: `${DA_CASA} && ${ADMIN}`,
  deleteRule: `${DA_CASA} && ${ADMIN}`,
});

await criar({
  name: 'despesas', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('envelope', ids.envelopes, { required: true }),
    num('valor', { required: true }),
    txt('descricao'),
    data('data'),
    rel('pagador', ids.membros, { required: true }),
    bool('divide_meias'),
    // Corrigir é ANULAR e recriar, nunca editar o valor.
    txt('anula_id'),
    // §6: chave de idempotência. Um reenvio colide em vez de duplicar.
    txt('idem_key'),
  ],
  indexes: ['CREATE UNIQUE INDEX idx_despesa_idem ON despesas (casa, idem_key)'],
  listRule: `${DA_CASA} && ${ADULTO}`,
  viewRule: `${DA_CASA} && ${ADULTO}`,
  createRule: `${DA_CASA} && ${ADULTO} && pagador.papel != "crianca"`,
  updateRule: null,     // não se edita uma despesa; anula-se
  deleteRule: null,
});

// INVARIANTE #2: tabela de inserções. Sem updateRule nem deleteRule — não há
// regra que os permita, portanto o servidor recusa-os.
await criar({
  name: 'cofre_movimentos', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('membro', ids.membros, { required: true }),
    sel('tipo', ['semanada', 'bonus', 'retirada'], { required: true }),
    num('valor', { required: true }),
    txt('motivo'),
    rel('autorizado_por', ids.membros),
    data('data'),
    txt('idem_key'),
  ],
  indexes: ['CREATE UNIQUE INDEX idx_cofre_idem ON cofre_movimentos (casa, idem_key)'],
  // Adultos inserem; a criança lê o SEU cofre e mais nada.
  listRule: `${DA_CASA} && (${ADULTO} || membro = @request.auth.id)`,
  viewRule: `${DA_CASA} && (${ADULTO} || membro = @request.auth.id)`,
  createRule: `${DA_CASA} && ${ADULTO} && membro.papel = "crianca"`,
  updateRule: null,
  deleteRule: null,
});

// ── Equipamentos ─────────────────────────────────────────────────────────────
await criar({
  name: 'equipamentos', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    txt('nome', { required: true }),
    txt('categoria'),
    data('comprado_em'),
    txt('loja'),
    num('preco', { min: 0 }),
    data('garantia_ate'),
    txt('manutencao'),
    data('manutencao_ate'),
    fich('fatura'),
    fich('foto'),
  ],
  listRule: `${DA_CASA} && ${ADULTO}`,
  viewRule: `${DA_CASA} && ${ADULTO}`,
  createRule: `${DA_CASA} && ${ADULTO}`,
  updateRule: `${DA_CASA} && ${ADULTO}`,
  deleteRule: `${DA_CASA} && ${ADULTO}`,
});

console.log('criadas:', Object.keys(ids).join(', '));

// ── Preferências ─────────────────────────────────────────────────────────────
// Por membro: a Rita pode ter violeta e o Tomás cião ao mesmo tempo.
await criar({
  name: 'preferencias', type: 'base',
  fields: [
    rel('membro', ids.membros, { required: true, cascadeDelete: true }),
    num('esquema_cor', { min: 0, max: 5, onlyInt: true }),
    sel('aspeto', ['claro', 'escuro', 'sistema']),
    bool('resumo_ativo'),
    txt('resumo_hora'),
    num('aviso_prazo_dias', { min: 0, max: 7, onlyInt: true }),
  ],
  indexes: ['CREATE UNIQUE INDEX idx_pref_membro ON preferencias (membro)'],
  // As preferências são de cada um e de mais ninguém.
  listRule: 'membro = @request.auth.id',
  viewRule: 'membro = @request.auth.id',
  createRule: 'membro = @request.auth.id',
  updateRule: 'membro = @request.auth.id',
  deleteRule: 'membro = @request.auth.id',
});

// ── Compras ──────────────────────────────────────────────────────────────────
await criar({
  name: 'lojas', type: 'base',
  fields: [rel('casa', ids.casas, { required: true, cascadeDelete: true }), txt('nome', { required: true })],
  listRule: DA_CASA, viewRule: DA_CASA,
  createRule: `${DA_CASA} && ${ADULTO}`, updateRule: `${DA_CASA} && ${ADULTO}`, deleteRule: `${DA_CASA} && ${ADULTO}`,
});

await criar({
  name: 'listas_compras', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('loja', ids.lojas), rel('comprador', ids.membros),
    data('planeada_para'), data('fechada_em'),
  ],
  // A lista é de todos: as crianças também pedem artigos.
  listRule: DA_CASA, viewRule: DA_CASA,
  createRule: `${DA_CASA} && ${ADULTO}`, updateRule: `${DA_CASA} && ${ADULTO}`, deleteRule: `${DA_CASA} && ${ADULTO}`,
});

await criar({
  name: 'artigos', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('lista', ids.listas_compras, { required: true, cascadeDelete: true }),
    txt('rotulo', { required: true }),
    num('seccao', { min: 0, max: 3, onlyInt: true }),
    rel('pedido_por', ids.membros),
    sel('estado', ['por_comprar', 'confirmado', 'sem_stock']),
    num('estimativa', { min: 0 }), num('preco_real', { min: 0 }),
    bool('habitual'),
  ],
  // O estado vive na linha do artigo. Se fosse uma lista de identificadores
  // confirmados, dois telefones na mesma loja anulavam-se; assim, fundem-se.
  listRule: DA_CASA, viewRule: DA_CASA,
  createRule: DA_CASA, updateRule: DA_CASA, deleteRule: `${DA_CASA} && ${ADULTO}`,
});

// ── Dinheiro, o resto ────────────────────────────────────────────────────────
await criar({
  name: 'meses', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    data('mes', { required: true }), num('rendimento', { min: 0 }),
    { name: 'limites', type: 'json', maxSize: 20000 },
    data('fechado_em'),
  ],
  listRule: `${DA_CASA} && ${ADULTO}`, viewRule: `${DA_CASA} && ${ADULTO}`,
  createRule: `${DA_CASA} && ${ADMIN}`, updateRule: `${DA_CASA} && ${ADMIN}`, deleteRule: null,
});

// ADITIVA: valor sempre positivo, o sinal vem da direção.
await criar({
  name: 'transferencias', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('de_envelope', ids.envelopes, { required: true }),
    rel('para_envelope', ids.envelopes, { required: true }),
    num('valor', { min: 0.01, required: true }), data('mes'),
    rel('por', ids.membros, { required: true }), txt('idem_key'),
  ],
  indexes: ['CREATE UNIQUE INDEX idx_transf_idem ON transferencias (casa, idem_key)'],
  listRule: `${DA_CASA} && ${ADULTO}`, viewRule: `${DA_CASA} && ${ADULTO}`,
  createRule: `${DA_CASA} && ${ADMIN} && por = @request.auth.id`,
  updateRule: null, deleteRule: null,
});

// ADITIVA: pagamento parcial é permitido, o resto continua em dívida.
await criar({
  name: 'acertos', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('de_membro', ids.membros, { required: true }),
    rel('para_membro', ids.membros, { required: true }),
    num('valor', { min: 0.01, required: true }), data('data'), txt('idem_key'),
  ],
  indexes: ['CREATE UNIQUE INDEX idx_acerto_idem ON acertos (casa, idem_key)'],
  listRule: `${DA_CASA} && ${ADULTO}`, viewRule: `${DA_CASA} && ${ADULTO}`,
  createRule: `${DA_CASA} && ${ADULTO} && de_membro.papel != "crianca" && para_membro.papel != "crianca"`,
  updateRule: null, deleteRule: null,
});

await criar({
  name: 'metas', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    txt('nome', { required: true }), num('alvo', { min: 0 }), num('atual', { min: 0 }), txt('quando'),
  ],
  listRule: `${DA_CASA} && ${ADULTO}`, viewRule: `${DA_CASA} && ${ADULTO}`,
  createRule: `${DA_CASA} && ${ADMIN}`, updateRule: `${DA_CASA} && ${ADMIN}`, deleteRule: `${DA_CASA} && ${ADMIN}`,
});

// ── Listas da casa ───────────────────────────────────────────────────────────
for (const nome of ['categorias_equip', 'especialidades']) {
  await criar({
    name: nome, type: 'base',
    fields: [rel('casa', ids.casas, { required: true, cascadeDelete: true }), txt('nome', { required: true })],
    listRule: `${DA_CASA} && ${ADULTO}`, viewRule: `${DA_CASA} && ${ADULTO}`,
    createRule: `${DA_CASA} && ${ADMIN}`, updateRule: `${DA_CASA} && ${ADMIN}`, deleteRule: `${DA_CASA} && ${ADMIN}`,
  });
}

await criar({
  name: 'manutencoes', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('equipamento', ids.equipamentos, { required: true, cascadeDelete: true }),
    txt('descricao', { required: true }), data('a_fazer_ate'), data('feita_em'),
  ],
  listRule: `${DA_CASA} && ${ADULTO}`, viewRule: `${DA_CASA} && ${ADULTO}`,
  createRule: `${DA_CASA} && ${ADULTO}`, updateRule: `${DA_CASA} && ${ADULTO}`, deleteRule: `${DA_CASA} && ${ADULTO}`,
});

// ── Saúde ────────────────────────────────────────────────────────────────────
//
// §5 chama a esta «a regra mais restritiva do sistema, e a que mais tem de ser
// testada». São duas regras, não uma:
//
//   ficha de ADULTO   → só o próprio. Nem o companheiro, nem a administração.
//   ficha de CRIANÇA  → os adultos da casa; a criança lê a sua.
//
// A condição abaixo diz exatamente isso: ou o registo é meu, ou eu sou adulto
// E o dono é uma criança. Um adulto nunca cai no segundo ramo por outro adulto.
//
// §5 acrescenta que «a transição de papel tem de reavaliar a visibilidade
// retroativamente». Isto fá-lo sem migrar nada: a regra lê `membro.papel` a
// cada consulta, portanto uma criança que passe a adulta deixa de ter a ficha
// visível aos pais no instante seguinte.
//
// ⚠ Isto NÃO dispensa a conformidade. Ver db/README.md: são dados clínicos de
// menores, e há cinco pontos por resolver antes da primeira linha real.
const SAUDE_VISIVEL =
  `${DA_CASA} && (membro = @request.auth.id || (${ADULTO} && membro.papel = "crianca"))`;

await criar({
  name: 'episodios_saude', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('membro', ids.membros, { required: true, cascadeDelete: true }),
    txt('especialidade', { required: true }),
    txt('medico'),
    data('dia', { required: true }),
    txt('hora'),
    txt('notas'),
  ],
  listRule: SAUDE_VISIVEL,
  viewRule: SAUDE_VISIVEL,
  // Escrever é mais apertado do que ler: a criança lê a sua ficha, mas não a
  // escreve. Quem regista consultas são os adultos.
  createRule: `${DA_CASA} && (membro = @request.auth.id && ${ADULTO} || ${ADULTO} && membro.papel = "crianca")`,
  updateRule: `${DA_CASA} && (membro = @request.auth.id && ${ADULTO} || ${ADULTO} && membro.papel = "crianca")`,
  deleteRule: `${DA_CASA} && (membro = @request.auth.id && ${ADULTO} || ${ADULTO} && membro.papel = "crianca")`,
});

// Anexos: exames, receitas e relatórios. Herdam a visibilidade do episódio a
// que pertencem — nunca soltos, para não haver um caminho por onde escapem.
await criar({
  name: 'anexos', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('episodio', ids.episodios_saude, { required: true, cascadeDelete: true }),
    sel('tipo', ['exame', 'receita', 'relatorio']),
    txt('titulo', { required: true }),
    fich('ficheiro'),
  ],
  listRule: `${DA_CASA} && (episodio.membro = @request.auth.id || (${ADULTO} && episodio.membro.papel = "crianca"))`,
  viewRule: `${DA_CASA} && (episodio.membro = @request.auth.id || (${ADULTO} && episodio.membro.papel = "crianca"))`,
  createRule: `${DA_CASA} && ${ADULTO} && (episodio.membro = @request.auth.id || episodio.membro.papel = "crianca")`,
  updateRule: `${DA_CASA} && ${ADULTO} && (episodio.membro = @request.auth.id || episodio.membro.papel = "crianca")`,
  deleteRule: `${DA_CASA} && ${ADULTO} && (episodio.membro = @request.auth.id || episodio.membro.papel = "crianca")`,
});

// ── Vistas: os saldos ────────────────────────────────────────────────────────
// INVARIANTE #2 posto em estrutura. O saldo é uma SOMA calculada pelo servidor,
// não uma coluna que alguém escreve. Uma vista não tem escrita nenhuma, portanto
// não há sequer como a escrever por engano.
const vista = (name, viewQuery, regra) => criar({
  name, type: 'view', fields: [], viewQuery, listRule: regra, viewRule: regra,
});

// O analisador de vistas do PocketBase estropia quebras de linha dentro de
// subconsultas — descobri-o com um erro que substituía o WHERE por
// «__pb_discard__». Por isso cada consulta vai numa linha só, por feia que fique.

// O adulto vê os cofres das crianças; a criança vê o seu.
await vista('v_cofre_saldo',
  "SELECT m.id AS id, m.id AS membro, m.casa AS casa, COALESCE((SELECT SUM(cm.valor) FROM cofre_movimentos cm WHERE cm.membro = m.id), 0) AS saldo FROM membros m WHERE m.papel = 'crianca'",
  `${DA_CASA} && (${ADULTO} || membro = @request.auth.id)`);

// Gasto por envelope, excluindo as despesas anuladas.
await vista('v_envelope_gasto',
  "SELECT e.id AS id, e.id AS envelope, e.casa AS casa, e.nome AS nome, COALESCE((SELECT SUM(d.valor) FROM despesas d WHERE d.envelope = e.id AND (d.anula_id IS NULL OR d.anula_id = '')), 0) AS gasto FROM envelopes e",
  `${DA_CASA} && ${ADULTO}`);

// Positivo = tem a receber. Negativo = deve.
await vista('v_acerto_saldo',
  "SELECT m.id AS id, m.id AS membro, m.casa AS casa, (COALESCE((SELECT SUM(d.valor / 2) FROM despesas d WHERE d.pagador = m.id AND d.divide_meias = TRUE AND (d.anula_id IS NULL OR d.anula_id = '')), 0) + COALESCE((SELECT SUM(a.valor) FROM acertos a WHERE a.de_membro = m.id), 0) - COALESCE((SELECT SUM(a2.valor) FROM acertos a2 WHERE a2.para_membro = m.id), 0)) AS saldo FROM membros m WHERE m.papel != 'crianca'",
  `${DA_CASA} && ${ADULTO}`);

// Pontos confirmados que ainda não entraram numa semanada posterior.
await vista('v_pontos_por_pagar',
  "SELECT m.id AS id, m.id AS membro, m.casa AS casa, COALESCE((SELECT SUM(t.pontos) FROM tarefas_feitas tf JOIN tarefas t ON t.id = tf.tarefa WHERE tf.marcada_por = m.id AND tf.confirmada_em IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cofre_movimentos cm WHERE cm.membro = m.id AND cm.tipo = 'semanada' AND cm.data > tf.confirmada_em)), 0) AS pontos FROM membros m WHERE m.papel = 'crianca'",
  `${DA_CASA} && (${ADULTO} || membro = @request.auth.id)`);
console.log('vistas:', ['v_cofre_saldo','v_envelope_gasto','v_acerto_saldo','v_pontos_por_pagar'].join(', '));
