// OS CAMPOS BATEM COM A BASE — o que está escrito é o que o servidor tem.
//
//   node db/pocketbase/provar-os-campos-batem-com-a-base.mjs
//
// ── Porque é que isto existe ─────────────────────────────────────────────────
//
// Porque o `db:campos` ACRESCENTA campos e não ALTERA os que já lá estão — e
// isso é um silêncio, não um erro.
//
// Apanhou-se em 28/09/2026, num campo de texto que precisava de crescer de 500
// para 4096 caracteres. Escrevi o valor novo nos dois sítios que a regra desta
// casa manda — o `criar-colecoes.mjs` e o `acrescentar-campos.mjs` —, corri o
// `npm run db:campos`, e ele respondeu:
//
//     0 coleções criadas · 0 campos acrescentados · 15 já existiam
//     ✓ 15 campos existem com o tipo que a tabela diz
//
// Tudo verde. E a base continuava nos 500, porque o campo JÁ EXISTIA e o script
// só confere o TIPO. A verificação dele media a coisa certa pela metade: o tipo
// bate, o limite não, e o limite era o que estava partido.
//
// Foi preciso alargar à mão. Uma correcção à mão que não deixa guarda é uma
// correcção que se vai perder — e o próximo a mexer num limite vai achar, com
// razão, que os dois sítios chegam.
//
// ── O que se prova ───────────────────────────────────────────────────────────
//
// Lê a tabela do `acrescentar-campos.mjs` — que é a declaração do que a base
// DEVE ter — e compara-a, campo a campo, com o que o servidor tem MESMO.
// Enumera as diferenças todas, e não pára na primeira.
import { readFileSync } from 'node:fs';
import { comecar, prova, igual, resumo } from './provas.mjs';

const { pb: admin } = await comecar();

const fonte = readFileSync(new global.URL('./acrescentar-campos.mjs', import.meta.url), 'utf8');

// ── As declarações, lidas do ficheiro ────────────────────────────────────────
//
// ⚠ Lê-se o FICHEIRO e não se importa o módulo: importá-lo corria-o, e ele
// escreve na base. Uma prova que muda a casa para a medir não é uma prova.
const declaracoes = () => {
  const saida = [];

  // As coleções inteiras: `nome: 'x'` seguido de `campos: [ ... ]`.
  for (const m of fonte.matchAll(/nome:\s*'(\w+)',[\s\S]*?campos:\s*\[([\s\S]*?)\n\s*\],/g)) {
    const colecao = m[1];
    for (const c of m[2].matchAll(/\{\s*name:\s*'(\w+)'\s*,\s*type:\s*'(\w+)'([^}]*)\}/g)) {
      const extra = c[3] || '';
      const max = (extra.match(/\bmax:\s*(\d+)/) || [])[1];
      const min = (extra.match(/\bmin:\s*([\d.]+)/) || [])[1];
      saida.push({
        colecao, campo: c[1], tipo: c[2],
        max: max === undefined ? null : Number(max),
        min: min === undefined ? null : Number(min),
        onde: 'COLECOES',
      });
    }
  }

  // E os campos soltos da tabela `CAMPOS`: ['coleção', 'campo', { … }].
  const blocoCampos = (fonte.match(/const CAMPOS = \[([\s\S]*?)\n\];/) || [])[1] || '';
  for (const m of blocoCampos.matchAll(/\[\s*'(\w+)'\s*,\s*'(\w+)'\s*,\s*\{([^}]*)\}/g)) {
    const extra = m[3] || '';
    const tipo = (extra.match(/type:\s*'(\w+)'/) || [])[1];
    if (!tipo) continue;
    const max = (extra.match(/\bmax:\s*(\d+)/) || [])[1];
    const min = (extra.match(/\bmin:\s*([\d.]+)/) || [])[1];
    saida.push({
      colecao: m[1], campo: m[2], tipo,
      max: max === undefined ? null : Number(max),
      min: min === undefined ? null : Number(min),
      onde: 'CAMPOS',
    });
  }
  return saida;
};

const TODAS = declaracoes();

await prova('a leitura funciona — encontrou campos declarados nos dois blocos', async () => {
  // ⚠ Uma prova que não lê nada passa sempre. Foi por não haver esta linha que
  // a verificação do próprio `db:campos` dizia «15 campos existem» sem medir o
  // que interessava.
  if (TODAS.length < 40) throw new Error(`só li ${TODAS.length} campos declarados`);
  const deColecoes = TODAS.filter((d) => d.onde === 'COLECOES').length;
  const deCampos = TODAS.filter((d) => d.onde === 'CAMPOS').length;
  if (!deColecoes || !deCampos) throw new Error(`COLECOES=${deColecoes} CAMPOS=${deCampos}`);
  const comMax = TODAS.filter((d) => d.max !== null).length;
  if (comMax < 5) throw new Error(`só ${comMax} campos declaram um limite — nada para comparar`);
});

await prova('⚠ todos os campos declarados EXISTEM na base', async () => {
  const faltam = [];
  for (const d of TODAS) {
    const col = await admin.collections.getOne(d.colecao).catch(() => null);
    if (!col) { faltam.push(`${d.colecao} (a coleção não existe)`); continue; }
    if (!col.fields.some((f) => f.name === d.campo)) faltam.push(`${d.colecao}.${d.campo}`);
  }
  if (faltam.length) throw new Error(`${faltam.length}:\n      ${faltam.join('\n      ')}`);
});

await prova('⚠ e com o TIPO que a tabela diz', async () => {
  const errados = [];
  for (const d of TODAS) {
    const col = await admin.collections.getOne(d.colecao).catch(() => null);
    if (!col) continue;
    const f = col.fields.find((x) => x.name === d.campo);
    if (f && f.type !== d.tipo) errados.push(`${d.colecao}.${d.campo}: a base diz ${f.type}, a tabela diz ${d.tipo}`);
  }
  if (errados.length) throw new Error(`${errados.length}:\n      ${errados.join('\n      ')}`);
});

await prova('⚠ e com o LIMITE que a tabela diz — o que o `db:campos` não confere', async () => {
  // O buraco de 28/09/2026. O `estado` foi escrito a 4096 nos dois sítios, o
  // `db:campos` disse tudo verde, e a base ficou nos 500.
  const errados = [];
  for (const d of TODAS) {
    if (d.max === null) continue;
    const col = await admin.collections.getOne(d.colecao).catch(() => null);
    if (!col) continue;
    const f = col.fields.find((x) => x.name === d.campo);
    if (!f) continue;
    const naBase = (f.max === undefined || f.max === null) ? 0 : Number(f.max);
    if (naBase !== d.max) {
      errados.push(`${d.colecao}.${d.campo}: a base tem max=${naBase}, a tabela diz ${d.max}`
        + '  (o `db:campos` não altera limites de campos que já existem — corrija à mão)');
    }
  }
  if (errados.length) throw new Error(`${errados.length}:\n      ${errados.join('\n      ')}`);
});

await prova('⚠ e com o MÍNIMO também', async () => {
  const errados = [];
  for (const d of TODAS) {
    if (d.min === null) continue;
    const col = await admin.collections.getOne(d.colecao).catch(() => null);
    if (!col) continue;
    const f = col.fields.find((x) => x.name === d.campo);
    if (!f) continue;
    const naBase = (f.min === undefined || f.min === null) ? 0 : Number(f.min);
    if (naBase !== d.min) errados.push(`${d.colecao}.${d.campo}: a base tem min=${naBase}, a tabela diz ${d.min}`);
  }
  if (errados.length) throw new Error(`${errados.length}:\n      ${errados.join('\n      ')}`);
});

resumo();
