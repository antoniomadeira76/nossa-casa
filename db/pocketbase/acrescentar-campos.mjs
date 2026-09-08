/**
 * Os campos que nasceram DEPOIS da base — acrescentados a um servidor a andar.
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
 * ⚠ Só ACRESCENTA. Não muda tipos, não apaga, não renomeia. Mudar o tipo de um
 * campo com linhas gravadas é pedir ao PocketBase que converta dados a sério, e
 * foi por isso que o `corredor` nasceu ao lado do `seccao` em vez de o
 * substituir. Correr isto duas vezes não faz nada na segunda.
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

const idDaColecao = async (nome) => (await pb.collections.getOne(nome)).id;

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

console.log(`\n${criados} campo(s) acrescentado(s) · ${jaLa} já existiam.`);

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
if (faltam.length) {
  console.error('\n✕ ' + faltam.join('\n✕ '));
  process.exit(1);
}
console.log(`✓ os ${CAMPOS.length} campos existem, com o tipo que a tabela diz.`);
