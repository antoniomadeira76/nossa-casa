/**
 * As secções deixam de ser um índice e passam a ser uma linha da casa.
 *
 * ── Porquê ───────────────────────────────────────────────────────────────────
 *
 * A secção de um artigo estava guardada como ÍNDICE — `seccao: 0..3` — e os
 * quatro nomes viviam numa constante do `data.js` que a casa não podia tocar.
 * Enquanto os nomes fossem fixos, o índice era inofensivo. A partir do momento
 * em que a família os pode reordenar ou apagar, um índice passa a apontar para
 * outra coisa: apagar «Frescos» faz a mercearia toda mudar de corredor, em
 * silêncio.
 *
 * É o mesmo defeito que já apareceu duas vezes nesta casa — a grelha de
 * envelopes a mostrar uma lista e a confirmação a aplicar outra, e a loja do
 * plano guardada por índice.
 *
 * ── O que este script faz ────────────────────────────────────────────────────
 *
 *   1. cria as quatro secções em cada casa que ainda não as tenha, com o
 *      `posto` a contar de UM
 *   2. preenche o `corredor` de cada artigo a partir do `seccao` numérico
 *
 * ⚠ Não apaga o `seccao`. Uma migração que apaga a coluna de onde leu não se
 * pode correr duas vezes, e não deixa como voltar atrás se algo correr mal. A
 * coluna fica, por ler, até isto ter corrido em todo o lado.
 *
 * ⚠ E é IDEMPOTENTE: correr duas vezes não cria secções a dobrar nem mexe num
 * artigo que já tenha corredor. Uma migração que só se pode correr uma vez é
 * uma migração que se tem medo de correr.
 *
 *   node db/pocketbase/migrar-seccoes.mjs
 */
import PocketBase from 'pocketbase';
import { SUPERUTILIZADOR, SUPER_PALAVRA, URL_DO_SERVIDOR } from './ambiente.mjs';

// Os quatro nomes que estavam no `data.js`, pela ordem em que lá estavam — que
// é a ordem do corredor, e o que os índices 0..3 significavam.
const SEMENTE = ['Frutas & Legumes', 'Frescos', 'Mercearia', 'Casa'];

const pb = new PocketBase(URL_DO_SERVIDOR);
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(SUPERUTILIZADOR, SUPER_PALAVRA);

const casas = await pb.collection('casas').getFullList();
console.log(`${casas.length} casa(s).`);

let criadas = 0;
let ligados = 0;
let jaTinham = 0;

for (const casa of casas) {
  // ── 1 · As secções desta casa ──────────────────────────────────────────────
  let seccoes = await pb.collection('seccoes').getFullList({ filter: `casa = "${casa.id}"` });

  if (seccoes.length === 0) {
    for (let i = 0; i < SEMENTE.length; i++) {
      // ⚠ O posto conta de UM. Um `number` do PocketBase não é anulável, e um
      // campo novo nasce a zero em todas as linhas que já existem — com o posto
      // a contar de zero, a lista inteira lia-se empatada em primeiro e saía
      // por ordem qualquer. Foi o que aconteceu às tarefas.
      await pb.collection('seccoes').create({ casa: casa.id, nome: SEMENTE[i], posto: i + 1 });
      criadas++;
    }
    seccoes = await pb.collection('seccoes').getFullList({ filter: `casa = "${casa.id}"` });
    console.log(`  ${casa.nome}: ${SEMENTE.length} secções criadas.`);
  } else {
    console.log(`  ${casa.nome}: já tinha ${seccoes.length} secções.`);
  }

  // Pelo POSTO, que é a ordem — e não pela ordem em que o servidor devolveu.
  const porPosto = [...seccoes].sort((a, b) => (a.posto || 0) - (b.posto || 0));

  // ── 2 · Os artigos ────────────────────────────────────────────────────────
  const artigos = await pb.collection('artigos').getFullList({ filter: `casa = "${casa.id}"` });
  for (const a of artigos) {
    if (a.corredor) { jaTinham++; continue; }          // idempotente
    const i = Number(a.seccao) || 0;
    const alvo = porPosto[i];
    if (!alvo) {
      console.log(`  ⚠ «${a.rotulo}» tem seccao ${i} e não há secção nesse lugar — fica sem corredor.`);
      continue;
    }
    await pb.collection('artigos').update(a.id, { corredor: alvo.id });
    ligados++;
  }
}

console.log(`\n${criadas} secções criadas · ${ligados} artigos ligados · ${jaTinham} já tinham corredor.`);

// ── E a prova de que ficou certo ─────────────────────────────────────────────
//
// Uma migração que não se verifica a si própria é uma esperança.
const todos = await pb.collection('artigos').getFullList();
const semCorredor = todos.filter(a => !a.corredor);
if (semCorredor.length) {
  console.error(`\n✕ ${semCorredor.length} artigo(s) ficaram sem corredor:`,
    semCorredor.map(a => a.rotulo).join(', '));
  process.exit(1);
}

// E que o corredor de cada um é o que o índice dizia.
const seccoesTodas = await pb.collection('seccoes').getFullList();
const porId = new Map(seccoesTodas.map(s => [s.id, s]));
let trocados = 0;
for (const a of todos) {
  const s = porId.get(a.corredor);
  if (!s) { trocados++; continue; }
  if ((s.posto || 0) - 1 !== (Number(a.seccao) || 0)) {
    console.error(`  ✕ «${a.rotulo}»: seccao ${a.seccao} mas corredor «${s.nome}» (posto ${s.posto})`);
    trocados++;
  }
}
if (trocados) { console.error(`\n✕ ${trocados} artigo(s) no corredor errado.`); process.exit(1); }

console.log(`✓ ${todos.length} artigos, todos no corredor que o índice dizia.`);
