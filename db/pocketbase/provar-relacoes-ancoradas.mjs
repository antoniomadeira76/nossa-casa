// ⚠ TODA a relação que aponta para dentro da casa tem de estar ancorada à casa.
//
//   node db/pocketbase/provar-relacoes-ancoradas.mjs
//
// ── Porque é que esta prova existe ───────────────────────────────────────────
//
// Entre 04 e 05/09/2026 corrigi o MESMO defeito cinco vezes, uma de cada vez,
// sempre depois de uma prova o apanhar por acaso:
//
//     anexos.episodio                  um exame pendurado na consulta de outra
//                                      família
//     eventos.responsavel              o nome de uma criança de outra casa num
//                                      evento
//     eventos.episodio                 um evento ligado a uma consulta de fora
//     tarefas.atribuido_a              uma tarefa atribuída a uma criança de
//                                      outra casa
//     tarefas_feitas.tarefa            marcar a tarefa de outra família
//     transferencias.de/para_envelope  mover dinheiro entre os envelopes de
//                                      outra casa
//     despesas.envelope                lançar uma despesa contra eles
//
// O dono da casa perguntou o óbvio: «quando verificas isto várias vezes, não
// achas que vale a pena olhar com muito mais atenção e resolver de vez?»
//
// Tinha razão. Corrigir à mão, um de cada vez, é apagar fogos — e o sexto
// aparecia no dia em que alguém acrescentasse uma coleção.
//
// ── A forma do defeito, dita uma vez ─────────────────────────────────────────
//
// O campo `casa` de uma linha é ESCOLHIDO POR QUEM ESCREVE. Uma regra que diga
// apenas `casa = @request.auth.casa` verifica a ETIQUETA que o autor pôs, não o
// dado a que a linha se liga. Quem escreve põe a casa dele na linha e aponta a
// relação para dentro da nossa.
//
// A regra é: **toda a relação que aponta para uma coleção da casa tem de ser
// verificada** — ou pela casa dela (`x.casa = @request.auth.casa`), ou por ser
// o próprio (`x = @request.auth.id`), ou por herdar de outra relação que já o
// esteja (`x.episodio.casa = ...`).
//
// ── O que isto faz, e porque são DUAS provas ─────────────────────────────────
//
// 1. ESTÁTICA — percorre todas as coleções, todos os campos de relação, e exige
//    a âncora nas regras de escrita. É completa: não depende de eu me lembrar
//    de tentar o ataque certo, e apanha a coleção que ainda não existe.
//
// 2. DINÂMICA — monta duas casas e tenta mesmo, coleção a coleção, escrever de
//    fora com a relação apontada para dentro. É a que prova que a regra
//    escrita faz o que diz.
//
// A estática sozinha aceitaria uma regra que menciona a âncora sem a impor. A
// dinâmica sozinha só cobre o que eu me lembrei de tentar. Juntas, fecham.
import PocketBase from 'pocketbase';
import { URL, PREFIXO, comecar } from './casa-de-provas.mjs';

const { pb: admin } = await comecar();

let ok = 0, mau = 0;
const prova = async (n, f) => {
  try { await f(); console.log(`  ✓ ${n}`); ok++; }
  catch (e) { console.log(`  ✕ ${n}\n      ${e.message}`); mau++; }
};
const igual = (a, b, o) => { if (a !== b) throw new Error(`esperava ${b}, veio ${a}${o ? ' · ' + o : ''}`); };

// ═════════════════════════════════════════════════════════════════════════════
// 1. A PROVA ESTÁTICA
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── toda a relação para dentro da casa está ancorada ──');

const colecoes = (await admin.collections.getFullList())
  .filter(c => !c.name.startsWith('_') && c.type === 'base');
const porId = Object.fromEntries(colecoes.map(c => [c.id, c.name]));

// Uma coleção é «da casa» se tiver um campo `casa` — ou for a `casas` ou a
// `membros`, que são a casa e quem lá vive.
const daCasa = new Set(colecoes.filter(c => c.fields.some(f => f.name === 'casa')).map(c => c.name));
daCasa.add('casas');
daCasa.add('membros');

// ── As excepções, cada uma com a razão escrita ──────────────────────────────
//
// ⚠ Uma excepção sem razão é uma porta aberta com autorização. A prova exige
// que cada uma traga a sua, e que a coleção e o campo existam mesmo — uma
// excepção para um campo que já não existe é lixo que esconde o próximo.
const COM_RAZAO = {
  'preferencias.membro':
    'A regra inteira é `membro = @request.auth.id`: as preferências são de '
    + 'cada um e de mais ninguém, e isso é mais apertado do que a casa.',
};

// A âncora pode ter três formas, e todas valem:
//
//   x.casa = @request.auth.casa    a casa da coisa apontada
//   x = @request.auth.id           é o próprio (só faz sentido para `membros`)
//   x.<algo>.casa = @request...    herda de uma relação intermédia
const ancorado = (campo, regras) => (
  new RegExp(`\\b${campo}\\.casa\\s*=\\s*@request\\.auth\\.casa\\b`).test(regras)
  || new RegExp(`\\b${campo}\\s*=\\s*@request\\.auth\\.id\\b`).test(regras)
  || new RegExp(`\\b${campo}\\.\\w+\\.casa\\s*=\\s*@request\\.auth\\.casa\\b`).test(regras)
);

// ⚠ Cada regra é conferida SOZINHA, não as duas juntas.
//
// A primeira versão desta prova juntava a `createRule` e a `updateRule` num
// texto só. Injetei um defeito para a ver morder — tirei a âncora da
// `createRule` do `artigos` — e ela passou: a âncora que ficava na `updateRule`
// salvava a outra. A metade dinâmica apanhou-o; a estática não.
//
// Uma coleção pode ter a âncora ao criar e não ao alterar, e nesse caso escreve
// -se uma linha inócua e altera-se depois para apontar para dentro da casa.
const relacoes = [];
for (const c of colecoes) {
  for (const f of c.fields) {
    if (f.type !== 'relation' || f.name === 'casa') continue;
    const alvo = porId[f.collectionId];
    if (!alvo || !daCasa.has(alvo)) continue;   // aponta para fora da casa
    // Uma regra `null` é «ninguém pode» — mais apertado do que qualquer âncora.
    for (const [qual, regra] of [['criar', c.createRule], ['alterar', c.updateRule]]) {
      if (regra === null || regra === undefined) continue;
      relacoes.push({ colecao: c.name, campo: f.name, alvo, regras: regra, qual });
    }
  }
}

await prova('há relações para conferir — senão isto não prova nada', () => {
  if (relacoes.length < 10) throw new Error(`só ${relacoes.length} relações`);
  const distintas = new Set(relacoes.map(r => `${r.colecao}.${r.campo}`)).size;
  console.log(`      (${distintas} relações, ${relacoes.length} regras de escrita, `
    + `em ${colecoes.length} coleções)`);
});

await prova('⚠ nenhuma relação para dentro da casa fica por ancorar', () => {
  const soltas = relacoes
    .filter(r => !COM_RAZAO[`${r.colecao}.${r.campo}`])
    .filter(r => !ancorado(r.campo, r.regras))
    .map(r => `${r.colecao}.${r.campo} → ${r.alvo}  (ao ${r.qual})`);
  if (soltas.length) {
    throw new Error(`${soltas.length} soltas:\n        ` + soltas.join('\n        '));
  }
});

await prova('⚠ e cada excepção tem razão escrita, e o campo existe mesmo', () => {
  for (const [chave, razao] of Object.entries(COM_RAZAO)) {
    const [colecao, campo] = chave.split('.');
    const c = colecoes.find(x => x.name === colecao);
    if (!c) throw new Error(`a excepção ${chave} é de uma coleção que não existe`);
    if (!c.fields.some(f => f.name === campo)) {
      throw new Error(`a excepção ${chave} é de um campo que não existe`);
    }
    if (!razao || razao.length < 40) throw new Error(`a excepção ${chave} não traz razão`);
  }
});

// ⚠ E as coleções ADITIVAS não se alteram nem se apagam. Uma linha aditiva que
// se possa editar deixa de o ser — é o INVARIANTE #2 pela porta do lado.
await prova('⚠ as coleções aditivas não têm regra de alteração nem de apagamento', () => {
  const ADITIVAS = ['despesas', 'transferencias', 'cofre_movimentos', 'acertos'];
  const maus = [];
  for (const nome of ADITIVAS) {
    const c = colecoes.find(x => x.name === nome);
    if (!c) { maus.push(`${nome}: não existe`); continue; }
    if (c.updateRule !== null) maus.push(`${nome}: tem updateRule`);
    if (c.deleteRule !== null) maus.push(`${nome}: tem deleteRule`);
  }
  if (maus.length) throw new Error(maus.join(' · '));
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. A PROVA DINÂMICA — tentar mesmo, de fora
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── e de outra casa não se escreve para dentro desta ──');

const s = (p) => ({ password: p, passwordConfirm: p });
const casa = await admin.collection('casas').create({ nome: PREFIXO + 'Nossa', valor_ponto: 0.1 });
const outra = await admin.collection('casas').create({ nome: PREFIXO + 'Deles', valor_ponto: 0.1 });

const mk = (c, nome, papel, extra) => admin.collection('membros').create({
  nome, login: `${c.id}_${nome}`, casa: c.id, papel, verified: true, ...extra });

const rita = await mk(casa, 'Rita', 'admin', { email: 'rita-anc@x.pt', ...s('palavra-longa-1') });
const leo  = await mk(casa, 'Leo',  'crianca', { ...s('1357') });
const nela = await mk(outra, 'Vizinha', 'admin', { email: 'viz-anc@x.pt', ...s('palavra-longa-9') });

const cVizinha = new PocketBase(URL);
await cVizinha.collection('membros').authWithPassword('viz-anc@x.pt', 'palavra-longa-9');

// As nossas linhas, para ela tentar apontar-lhes.
const nosso = {};
nosso.envelope = await admin.collection('envelopes').create({ casa: casa.id, nome: 'Mercearia', limite_base: 500 });
nosso.episodio = await admin.collection('episodios_saude').create({
  casa: casa.id, membro: leo.id, especialidade: 'Pediatria', dia: '2026-09-20' });
nosso.tarefa = await admin.collection('tarefas').create({
  casa: casa.id, titulo: 'Pôr a mesa', atribuido_a: leo.id, pontos: 1 });
nosso.loja = await admin.collection('lojas').create({ casa: casa.id, nome: 'Continente' });
nosso.lista = await admin.collection('listas_compras').create({ casa: casa.id, loja: nosso.loja.id });
nosso.equipamento = await admin.collection('equipamentos').create({
  casa: casa.id, nome: 'Máquina de lavar' });

// E uma linha DELA, para os ataques que precisam de uma ponta legítima — sem
// isso, a transferência era recusada por ter as duas pontas de fora e a prova
// passava sem provar a ponta que interessa.
const deles = {};
deles.envelope = await admin.collection('envelopes').create({
  casa: outra.id, nome: 'Mercearia deles', limite_base: 100 });

// Uma tentativa por relação: os campos mínimos, com a relação a apontar para
// DENTRO desta casa e o `casa` da linha na casa DELA.
const ATAQUES = [
  ['eventos', 'responsavel', { dia: '2026-09-20', titulo: 'X', autor: '@eu', visibilidade: 'familia', responsavel: () => leo.id }],
  ['eventos', 'episodio', { dia: '2026-09-20', titulo: 'X', autor: '@eu', visibilidade: 'familia', episodio: () => nosso.episodio.id }],
  ['tarefas', 'atribuido_a', { titulo: 'X', pontos: 1, atribuido_a: () => leo.id }],
  ['tarefas_feitas', 'tarefa', { data: '2026-09-20', marcada_por: '@eu', tarefa: () => nosso.tarefa.id }],
  ['despesas', 'envelope', { valor: 9, pagador: '@eu', idem_key: 'anc-1', envelope: () => nosso.envelope.id }],
  // ⚠ As DUAS pontas da transferência, uma de cada vez. A prova «há um ataque
  // por relação» apanhou-me a esquecer o `para_envelope` — que é exactamente
  // o género de omissão que ela existe para apanhar, e que me escapou cinco
  // vezes antes de haver guarda nenhum.
  ['transferencias', 'de_envelope', { valor: 9, por: '@eu', idem_key: 'anc-2', de_envelope: () => nosso.envelope.id, para_envelope: () => deles.envelope.id }],
  ['transferencias', 'para_envelope', { valor: 9, por: '@eu', idem_key: 'anc-3', de_envelope: () => deles.envelope.id, para_envelope: () => nosso.envelope.id }],
  ['anexos', 'episodio', { titulo: 'X', tipo: 'exame', episodio: () => nosso.episodio.id }],
  ['notas_saude', 'episodio', { texto: 'X', autor: '@eu', episodio: () => nosso.episodio.id }],
  ['receitas_saude', 'episodio', { nome: 'X', episodio: () => nosso.episodio.id }],
  ['decisoes_saude', 'episodio', { estado: 'pendente', episodio: () => nosso.episodio.id }],
  ['listas_compras', 'loja', { loja: () => nosso.loja.id }],
  ['artigos', 'lista', { rotulo: 'X', lista: () => nosso.lista.id }],
  ['manutencoes', 'equipamento', { equipamento: () => nosso.equipamento.id }],
];

await prova('⚠ há um ataque por relação — nenhuma fica sem ser tentada', () => {
  const tentadas = new Set(ATAQUES.map(([c, f]) => `${c}.${f}`));
  const porTentar = [...new Set(relacoes
    .filter(r => !COM_RAZAO[`${r.colecao}.${r.campo}`])
    .map(r => `${r.colecao}.${r.campo}`))]
    .filter(x => !tentadas.has(x));
  if (porTentar.length) {
    throw new Error('sem ataque: ' + porTentar.join(', '));
  }
});

for (const [colecao, campo, base] of ATAQUES) {
  await prova(`⚠ a vizinha não escreve em \`${colecao}\` apontando o \`${campo}\` para cá`, async () => {
    const linha = { casa: outra.id };
    for (const [k, v] of Object.entries(base)) {
      linha[k] = v === '@eu' ? nela.id : (typeof v === 'function' ? v() : v);
    }
    let criada = null;
    try { criada = await cVizinha.collection(colecao).create(linha); } catch (e) { /* recusado, que é o que se quer */ }
    if (criada) {
      // Limpa-se, para não deixar lixo numa casa que não é dela.
      await admin.collection(colecao).delete(criada.id).catch(() => {});
      throw new Error('PASSOU — a linha foi criada');
    }
  });
}

console.log(`\n${ok} provas passaram, ${mau} falharam.`);
process.exit(mau ? 1 : 0);
