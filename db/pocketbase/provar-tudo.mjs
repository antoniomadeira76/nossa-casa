// Corre TODAS as provas do servidor, conta-as, e não deixa nenhuma escapar.
//
//   npm run db:provar
//   node db/pocketbase/provar-tudo.mjs [filtro]
//
// ── Porque é que isto existe ─────────────────────────────────────────────────
//
// O `db:provar` era uma cadeia de trinta e três `node …` ligados por `&&` no
// `package.json`. Um `&&` pára ao primeiro que devolva um código diferente de
// zero — e é isso que se quer de uma prova que FALHA.
//
// ⚠ Mas não é só isso que acontece. Em 27/09/2026 a cadeia parou aos trinta
// ficheiros com o código 127, no `provar-extracto.mjs`, **sem uma única prova
// falhada**: todas as linhas eram `✓`, e o que se via na consola era uma
// corrida que parecia ter acabado bem. Corrido sozinho, o mesmo ficheiro passa
// com 0. Não reproduziu, e continuo sem saber a causa.
//
// O que se sabe é o feitio: uma cadeia de `&&` **pára a meio com tudo verde por
// cima**, e ninguém conta os ficheiros. Foi preciso eu somar à mão para dar por
// ela. É a mesma família do defeito que ocupou o dia — o `process.exit` depois
// de falar com o servidor, que devolve 127 em vez do código pedido (ver
// `sair.mjs`) — e a defesa contra essa família não é adivinhar a causa: é
// CONTAR.
//
// Por isso este corredor:
//
//  1. enumera os ficheiros **do disco**, e não de uma lista escrita à mão — uma
//     prova nova entra na bateria sem ninguém se lembrar dela;
//  2. corre-os TODOS, mesmo depois de um falhar, para se ver o estrago inteiro
//     e não só a primeira pedra;
//  3. exige de cada um a linha do resumo. Um ficheiro que não a imprima é uma
//     falha, mesmo que não tenha dito `✕` nenhum;
//  4. confere o CÓDIGO DE SAÍDA contra o que o resumo diz. Zero provas falhadas
//     e código diferente de zero é a assinatura do rebentamento, e é o caso que
//     escapava;
//  5. e diz, no fim, quantos ficheiros correu — para o número ser verificável
//     sem ninguém somar à mão.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const pasta = import.meta.dirname;
const filtro = process.argv[2] || '';

// ⚠ Do disco, e não de uma lista. O `provar-tudo.mjs` é este ficheiro e não se
// corre a si próprio; o `provas.mjs` e o `casa-de-provas.mjs` são andaimes e
// não começam por `provar-`.
const ficheiros = fs.readdirSync(pasta)
  .filter(f => /^provar-.*\.mjs$/.test(f) && f !== 'provar-tudo.mjs' && f.includes(filtro))
  .sort();

if (!ficheiros.length) {
  console.error(`Não encontrei provas nenhumas em ${pasta}` + (filtro ? ` com «${filtro}»` : '.'));
  process.exit(1);
}

// A assinatura do rebentamento no Windows: 127 na consola, 3221226505
// (`0xC0000409`) quando é o `spawn` do Node a contar. Ver `sair.mjs`.
const rebentou = (codigo, saida) => codigo === 127 || codigo === 3221226505
  || /Assertion failed|UV_HANDLE/.test(saida);

const correr = (f) => {
  const r = spawnSync(process.execPath, [path.join(pasta, f)], { encoding: 'utf8' });
  const saida = (r.stdout || '') + (r.stderr || '');
  return { codigo: r.status, saida, resumo: saida.match(/[✓✕] (\d+) provas passaram, (\d+) falharam/) };
};

let ok = 0;
let mau = 0;
const problemas = [];
const tremulos = [];

for (const f of ficheiros) {
  let { codigo, saida, resumo } = correr(f);

  // ⚠ Uma corrida que REBENTA não é uma prova falhada, e repete-se UMA vez.
  //
  // Isto não é indulgência: é a diferença entre «o código está mal» e «o Node
  // foi abaixo». Medido em 27/09/2026, o `provar-equipamentos.mjs` morreu com
  // 127 a meio do ficheiro, depois de duas provas verdes, sem mensagem nenhuma
  // — e passou nas duas corridas seguintes. Uma em três. Nada no ficheiro é
  // exótico: são leituras.
  //
  // Com a cadeia de `&&` que isto substituiu, um destes parava a bateria aos
  // trinta ficheiros com todas as linhas a verde, e só se dava por ela somando
  // os ficheiros à mão.
  //
  // A repetição não esconde nada: quem repetir aparece na lista dos tremulos
  // no fim, com o nome. Uma prova que falhe a sério falha nas duas.
  if ((!resumo || rebentou(codigo, saida)) && (!resumo || Number(resumo[2]) === 0)) {
    const outra = correr(f);
    if (outra.resumo && Number(outra.resumo[2]) === 0 && !rebentou(outra.codigo, outra.saida)) {
      tremulos.push(`${f} — rebentou à primeira (código ${codigo}), passou à segunda`);
      ({ codigo, saida, resumo } = outra);
    }
  }

  console.log(`\n═══ ${f} ═══`);
  for (const l of saida.split(/\r?\n/).filter(l => /^\s+[✓✕]|^──|^[✓✕] \d+ provas/.test(l))) {
    console.log(l);
  }

  if (resumo) { ok += Number(resumo[1]); mau += Number(resumo[2]); }

  // As quatro maneiras de um ficheiro estar mal, e são mesmo quatro.
  let porque = null;
  if (!resumo) porque = 'não imprimiu o resumo — foi abaixo antes do fim';
  else if (Number(resumo[2]) > 0) porque = `${resumo[2]} prova(s) falhada(s)`;
  else if (rebentou(codigo, saida)) porque = `REBENTOU: código ${codigo} com zero provas falhadas`;
  else if (codigo !== 0) porque = `saiu com ${codigo} e nenhuma prova falhada`;

  if (porque) {
    problemas.push(`${f} — ${porque}`);
    // O fim da saída, sem os avisos do Node, para se ver o que ele disse.
    const cauda = saida.split(/\r?\n/)
      .filter(l => !/Warning|Reparsing|eliminate|trace-warnings/.test(l))
      .filter(Boolean).slice(-12);
    console.log('  ↳ ' + porque + '\n' + cauda.map(l => '    ' + l).join('\n'));
  }
}

console.log(`\n${problemas.length ? '✕' : '✓'} ${ficheiros.length} ficheiros · ${ok} provas passaram, ${mau} falharam`);
if (problemas.length) {
  console.log('\nO que correu mal:');
  for (const p of problemas) console.log('  ✕ ' + p);
}
// ⚠ Os que rebentaram e passaram à segunda dizem-se SEMPRE, mesmo com a
// bateria verde. Uma repetição calada é uma bateria que mente devagar.
if (tremulos.length) {
  console.log('\n⚠ Rebentaram à primeira e passaram à segunda — não é o código, é o Node:');
  for (const t of tremulos) console.log('  ~ ' + t);
}

// ⚠ Este ficheiro não fala com o servidor — só lança filhos —, por isso pode
// sair com `process.exit`. Um guião que FALE com o servidor não pode: ver o
// `db/pocketbase/sair.mjs` e o guarda
// `__tests__/um-guiao-que-fala-com-o-servidor-nao-sai-a-martelo.test.js`.
process.exit(problemas.length ? 1 : 0);
