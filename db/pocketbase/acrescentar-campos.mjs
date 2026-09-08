/**
 * O que nasceu DEPOIS da base — aplicado a um servidor a andar.
 *
 *   node db/pocketbase/acrescentar-campos.mjs
 *
 * ── Porque é que isto existe à parte ─────────────────────────────────────────
 *
 * O `criar-colecoes.mjs` é a verdade de como a base se constrói do zero, e para
 * o ser APAGA tudo e recria. Numa casa que já tem dados, correr esse ficheiro é
 * perder a casa. Portanto um campo novo precisa de dois sítios: a declaração
 * lá, para quem criar a base amanhã, e uma adição aqui, para o servidor que já
 * está a correr hoje.
 *
 * ── Terceira vez, e por isso uma tabela e não um script ──────────────────────
 *
 * Já foram três: o `membros.avatar` e o `membros.figura` (03/09/2026), o
 * `artigos.corredor` (08/09/2026) e agora o `artigos.posto`. Os dois primeiros
 * têm cada um o seu ficheiro — `criar-campo-avatar.mjs` —, e escrever um
 * ficheiro por campo é o padrão que garante que o quarto vai ser esquecido.
 *
 * Aqui ENUMERA-SE: a tabela `CAMPOS` diz o que cada coleção tem de ter, e o
 * script acrescenta o que faltar. Um campo novo é uma linha nesta tabela.
 *
 * ⚠ NÃO muda tipos e não renomeia. Mudar o tipo de um campo com linhas gravadas
 * é pedir ao PocketBase que converta dados a sério, e foi por isso que o
 * `corredor` nasceu ao lado do `seccao` em vez de o substituir.
 *
 * ── E três tabelas, não uma ──────────────────────────────────────────────────
 *
 *   CAMPOS        o que cada coleção tem de TER
 *   COLECOES      as coleções que nasceram depois, com regras e índices
 *   CAMPOS_A_TIRAR  o que uma coleção não pode ter
 *
 * A terceira existe por um caso concreto: o `metas.atual` era um saldo ESCRITO,
 * o INVARIANTE #2 ao contrário. Um campo desses não se deixa lá «por não
 * incomodar» — fica à espera de que alguém lhe escreva. Tirar é destrutivo, e
 * por isso o script **recusa** tirar um campo de uma coleção que tenha linhas:
 * aí a decisão é de quem tem os dados à frente, não de um script.
 *
 * Correr isto duas vezes não faz nada na segunda.
 */
import PocketBase from 'pocketbase';
import { SUPERUTILIZADOR, SUPER_PALAVRA, URL_DO_SERVIDOR } from './ambiente.mjs';

const pb = new PocketBase(URL_DO_SERVIDOR);
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(SUPERUTILIZADOR, SUPER_PALAVRA);

// A tabela. Cada entrada é `[coleção, campo, definição]`, com a definição
// escrita como o `criar-colecoes.mjs` a escreve — para os dois lados dizerem a
// mesma coisa quando se comparam à mão.
//
// A relação precisa do ID da coleção alvo, e esse resolve-se pelo nome, senão
// era um identificador opaco escrito à mão que muda em cada base nova.
const CAMPOS = [
  ['membros', 'avatar', { type: 'text', max: 500 }],
  ['membros', 'figura', { type: 'text', max: 24 }],
  ['artigos', 'corredor', { type: 'relation', alvo: 'seccoes', maxSelect: 1, cascadeDelete: false }],
  ['artigos', 'posto', { type: 'number', min: 0, onlyInt: true }],
];

// As coleções que nasceram depois da base. A definição é a MESMA do
// `criar-colecoes.mjs`, campo a campo e regra a regra — os dois ficheiros têm
// de dizer o mesmo, e há um guarda do Jest a conferi-lo.
const COLECOES = [
  {
    nome: 'meta_movimentos',
    campos: [
      { name: 'casa', type: 'relation', alvo: 'casas', maxSelect: 1, required: true, cascadeDelete: true },
      { name: 'meta', type: 'relation', alvo: 'metas', maxSelect: 1, required: true, cascadeDelete: true },
      { name: 'valor', type: 'number', required: true },
      { name: 'motivo', type: 'text' },
      { name: 'por', type: 'relation', alvo: 'membros', maxSelect: 1, cascadeDelete: false },
      { name: 'data', type: 'date' },
      { name: 'idem_key', type: 'text' },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_meta_mov_idem ON meta_movimentos (casa, idem_key)'],
    regras: {
      listRule: 'casa = @request.auth.casa && @request.auth.papel != "crianca"',
      viewRule: 'casa = @request.auth.casa && @request.auth.papel != "crianca"',
      createRule: 'casa = @request.auth.casa && @request.auth.papel = "admin"'
        + ' && meta.casa = @request.auth.casa && (por = "" || por.casa = @request.auth.casa)',
      updateRule: null,
      deleteRule: null,
    },
  },
];

// ⚠ O que uma coleção NÃO pode ter. `[coleção, campo, porquê]`.
const CAMPOS_A_TIRAR = [
  ['metas', 'atual',
    'era um saldo ESCRITO (INVARIANTE #2). O que está juntado numa meta é a '
    + 'SOMA dos `meta_movimentos` — dois telefones a reforçar a mesma meta '
    + 'escreviam cada um o seu total e o último ganhava.'],
];

const idDaColecao = async (nome) => (await pb.collections.getOne(nome)).id;

// ⚠ «as 1 coleção(ões)» foi o que este script imprimiu na primeira corrida.
// Plural escrito à mão é a classe de defeito que já apareceu em seis sítios
// desta casa, e o `(s)` é a mesma coisa com uma desculpa.
const plural = (n, um, muitos) => `${n} ${n === 1 ? um : muitos}`;

// ── As coleções novas ────────────────────────────────────────────────────────
let colecoesCriadas = 0;
for (const c of COLECOES) {
  const existe = await pb.collections.getOne(c.nome).catch(() => null);
  if (existe) { console.log(`${c.nome}: a coleção já existe.`); continue; }
  const campos = [];
  for (const { alvo, ...f } of c.campos) {
    campos.push({ ...f, ...(alvo ? { collectionId: await idDaColecao(alvo) } : {}) });
  }
  await pb.collections.create({
    name: c.nome, type: 'base', fields: campos, indexes: c.indexes || [], ...c.regras,
  });
  colecoesCriadas++;
  console.log(`${c.nome}: coleção criada, com ${campos.length} campos.`);
}

let criados = 0;
let jaLa = 0;

// Agrupa por coleção: uma só escrita por coleção, e não uma por campo — cada
// `collections.update` reescreve a lista de campos inteira, e duas escritas
// seguidas com listas lidas antes da primeira perdem o campo da primeira.
const porColecao = new Map();
for (const [colecao, campo, def] of CAMPOS) {
  if (!porColecao.has(colecao)) porColecao.set(colecao, []);
  porColecao.get(colecao).push([campo, def]);
}

for (const [nome, lista] of porColecao) {
  const c = await pb.collections.getOne(nome);
  const novos = [];
  for (const [campo, def] of lista) {
    if (c.fields.some(f => f.name === campo)) { jaLa++; continue; }
    const { alvo, ...resto } = def;
    novos.push({
      name: campo, ...resto,
      ...(alvo ? { collectionId: await idDaColecao(alvo) } : {}),
    });
  }
  if (!novos.length) { console.log(`${nome}: nada a acrescentar.`); continue; }
  await pb.collections.update(c.id, { fields: [...c.fields, ...novos] });
  criados += novos.length;
  console.log(`${nome}: acrescentado ${novos.map(f => f.name).join(', ')}.`);
}

// ── E o que não pode lá estar ────────────────────────────────────────────────
//
// ⚠ Recusa-se a tirar um campo de uma coleção que tenha LINHAS. Um campo pode
// estar errado e ter dados que alguém quer ver antes de os perder; essa decisão
// é de quem os tem à frente.
let tirados = 0;
for (const [nome, campo, porque] of CAMPOS_A_TIRAR) {
  const c = await pb.collections.getOne(nome).catch(() => null);
  if (!c) { console.log(`${nome}: a coleção não existe.`); continue; }
  if (!c.fields.some(f => f.name === campo)) { console.log(`${nome}.${campo}: já não existe.`); continue; }

  const linhas = await pb.collection(nome).getList(1, 1).then(r => r.totalItems).catch(() => -1);
  if (linhas !== 0) {
    console.error(`\n✕ ${nome}.${campo} devia sair (${porque})`);
    console.error(`  mas a coleção tem ${plural(linhas, 'linha', 'linhas')}.`
      + ' Trate delas primeiro — este script não apaga dados.');
    process.exit(1);
  }
  await pb.collections.update(c.id, { fields: c.fields.filter(f => f.name !== campo) });
  tirados++;
  console.log(`${nome}: tirado ${campo} — ${porque}`);
}

console.log(`\n${plural(colecoesCriadas, 'coleção criada', 'coleções criadas')}`
  + ` · ${plural(criados, 'campo acrescentado', 'campos acrescentados')}`
  + ` · ${jaLa} já existiam · ${plural(tirados, 'tirado', 'tirados')}.`);

// ── E a prova de que ficaram lá ──────────────────────────────────────────────
//
// Uma adição que não se verifica é uma esperança. O PocketBase aceita um
// `update` e ignora em silêncio o que não entende — foi assim que uma escrita
// de campo desconhecido passou por boa nesta casa uma vez.
const faltam = [];
for (const [nome, lista] of porColecao) {
  const c = await pb.collections.getOne(nome);
  for (const [campo, def] of lista) {
    const f = c.fields.find(x => x.name === campo);
    if (!f) { faltam.push(`${nome}.${campo} não ficou lá`); continue; }
    if (f.type !== def.type) faltam.push(`${nome}.${campo} é ${f.type} e devia ser ${def.type}`);
  }
}
for (const c of COLECOES) {
  const viva = await pb.collections.getOne(c.nome).catch(() => null);
  if (!viva) { faltam.push(`a coleção ${c.nome} não ficou lá`); continue; }
  for (const campo of c.campos) {
    const f = viva.fields.find(x => x.name === campo.name);
    if (!f) faltam.push(`${c.nome}.${campo.name} não ficou lá`);
    else if (f.type !== campo.type) faltam.push(`${c.nome}.${campo.name} é ${f.type} e devia ser ${campo.type}`);
  }
}
for (const [nome, campo] of CAMPOS_A_TIRAR) {
  const viva = await pb.collections.getOne(nome).catch(() => null);
  if (viva && viva.fields.some(f => f.name === campo)) faltam.push(`${nome}.${campo} continua lá`);
}
if (faltam.length) {
  console.error('\n✕ ' + faltam.join('\n✕ '));
  process.exit(1);
}
console.log(`✓ ${plural(CAMPOS.length, 'campo existe', 'campos existem')} com o tipo que a tabela diz,`
  + ` ${plural(COLECOES.length, 'coleção existe', 'coleções existem')},`
  + ` e ${plural(CAMPOS_A_TIRAR.length, 'campo proibido', 'campos proibidos')} já não.`);
