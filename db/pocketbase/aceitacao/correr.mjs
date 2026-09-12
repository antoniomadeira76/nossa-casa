// Corre as histórias de aceitação, uma a uma, e soma.
//
//   npm run aceitacao
//   node db/pocketbase/aceitacao/correr.mjs [filtro]
//
// Cada história é um ficheiro `NN-*.mjs` desta pasta, com a sua casa, o seu
// «Dado / Quando / Então», e o seu resumo. Aqui só se corre pela ordem, se
// mostra o que cada uma disse, e se conta: sai com erro se alguma falhar.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const pasta = import.meta.dirname;
const filtro = process.argv[2] || '';
const historias = fs.readdirSync(pasta)
  .filter(f => /^\d\d-.*\.mjs$/.test(f) && f.includes(filtro))
  .sort();

let ok = 0;
let mau = 0;
const falhadas = [];
for (const f of historias) {
  const r = spawnSync(process.execPath, [path.join(pasta, f)], { encoding: 'utf8' });
  const saida = (r.stdout || '') + (r.stderr || '');
  const linhas = saida.split(/\r?\n/).filter(l => /^\s+[✓✕]|^[✓✕] \d+ provas/.test(l));
  console.log(`\n═══ ${f} ═══`);
  for (const l of linhas) console.log(l);
  const m = saida.match(/[✓✕] (\d+) provas passaram, (\d+) falharam/);
  if (m) { ok += Number(m[1]); mau += Number(m[2]); }
  if (!m || Number(m[2]) > 0 || r.status !== 0) {
    falhadas.push(f);
    if (!m) console.log(saida.split(/\r?\n/).filter(l => !/Warning|Reparsing|eliminate|trace-warnings/.test(l)).slice(-12).join('\n'));
  }
}

console.log(`\n${falhadas.length ? '✕' : '✓'} ${historias.length} histórias · ${ok} passos passaram, ${mau} falharam`
  + (falhadas.length ? ` · com falhas: ${falhadas.join(', ')}` : ''));
process.exit(falhadas.length ? 1 : 0);
