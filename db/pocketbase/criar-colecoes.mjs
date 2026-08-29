// Cria as coleções da Nossa Casa no PocketBase, traduzindo db/postgres/01-esquema.sql.
import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.PB_URL || 'http://127.0.0.1:8095');
await pb.collection('_superusers').authWithPassword('admin@nossacasa.local', 'casa-de-testes-123');

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
const NOSSAS = ['equipamentos', 'cofre_movimentos', 'despesas', 'envelopes',
  'tarefas_feitas', 'tarefas', 'eventos', 'membros', 'casas'];
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
  ],
  indexes: ['CREATE UNIQUE INDEX idx_membro_login ON membros (login)'],
  listRule: 'casa = @request.auth.casa',
  viewRule: 'casa = @request.auth.casa',
  createRule: null,                                   // só superuser/admin por hook
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
