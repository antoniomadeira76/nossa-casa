// O mês do orçamento — e um mês fechado que não reabre sozinho.
//
//   node db/pocketbase/provar-o-mes.mjs
//
// ── O defeito, e é um que a sincronização CRIOU ──────────────────────────────
//
// Fechar o mês fazia `registered: 0` e `envMove: {}` — escrever zero por cima
// de duas somas. Enquanto tudo era local funcionava por acidente: o total era
// um campo, e zerá-lo zerava-o.
//
// A partir do momento em que as despesas e as transferências passaram a ser
// LINHAS no servidor (04-05/09/2026), deixou de funcionar. As linhas ficam, e a
// leitura seguinte traz o total todo de volta: o mês fechado REABRIA SOZINHO,
// com o gasto de sempre.
//
// É um defeito que eu introduzi ao ligar as despesas, e que só se vê com o
// servidor a correr — localmente continuava a parecer bem.
//
// ── O modelo certo, que a coleção já previa ──────────────────────────────────
//
// Uma linha por mês em `meses`. O mês ABERTO é o que não tem `fechado_em`, e os
// totais são as somas FILTRADAS por ele. Não há nada a zerar: o mês seguinte
// começa do zero por ser OUTRA soma.
import PocketBase from 'pocketbase';
import { registerHooks } from 'node:module';
import { URL, PREFIXO, comecar } from './casa-de-provas.mjs';

registerHooks({
  resolve(especificador, contexto, seguinte) {
    try { return seguinte(especificador, contexto); }
    catch (e) {
      if (especificador.startsWith('.') && !/\.[cm]?jsx?$/.test(especificador)) {
        return seguinte(especificador + '.js', contexto);
      }
      throw e;
    }
  },
});

const { configurar, auth } = await import('../../src/pocketbase.js');
const sync = await import('../../src/sync.js');

const memoria = new Map();
configurar({
  url: URL,
  storage: {
    getItem: async (k) => (memoria.has(k) ? memoria.get(k) : null),
    setItem: async (k, v) => { memoria.set(k, v); },
    removeItem: async (k) => { memoria.delete(k); },
  },
});

let ok = 0, mau = 0;
const prova = async (n, f) => {
  try { await f(); console.log(`  ✓ ${n}`); ok++; }
  catch (e) { console.log(`  ✕ ${n}\n      ${e.message}`); mau++; }
};

// ⚠ Uma escrita recusada pelo servidor não rebenta — devolve-se. Sem isto, uma
// prova podia passar por a leitura seguinte trazer o valor de OUTRA escrita, e
// a recusa ficava por contar. Foi assim que uma transferência recusada bloqueou
// a fila inteira durante uma tarde sem dizer nada.
const semRecusa = async (o, onde) => {
  const r = await o;
  const rec = (r && r.recusadas) || [];
  if (rec.length) throw new Error(`${onde}: o servidor recusou — ${JSON.stringify(rec)}`);
  if (r && r.presa) throw new Error(`${onde}: fila presa — ${JSON.stringify(r.presa)}`);
  return r;
};
const igual = (a, b, o) => { if (a !== b) throw new Error(`esperava ${b}, veio ${a}${o ? ' · ' + o : ''}`); };
const recusado = async (f) => {
  try { await f(); throw new Error('PASSOU — devia ter sido recusado'); }
  catch (e) { if (/PASSOU/.test(e.message)) throw e; }
};

// ── A casa ───────────────────────────────────────────────────────────────────
const { pb: admin } = await comecar();
const casa = await admin.collection('casas').create({
  nome: PREFIXO + 'Bengui', valor_ponto: 0.1, rendimento_mensal: 3200 });
const mk = (nome, papel, extra) => admin.collection('membros').create({
  nome, login: `${casa.id}_${nome}`, casa: casa.id, papel, verified: true, ...extra });
const s = (p) => ({ password: p, passwordConfirm: p });

const rita = await mk('Rita', 'admin', { email: 'rita@x.pt', ...s('palavra-longa-1') });
const leo  = await mk('Leo',  'crianca', { ...s('1357') });

await auth.entrarAdulto('rita@x.pt', 'palavra-longa-1');
const daRita = sync.sessao();

const telemovel = async (id, senha) => {
  const c = new PocketBase(URL);
  await c.collection('membros').authWithPassword(id, senha);
  return c;
};

const mercearia = (await sync.criarEnvelope({
  casa: daRita.casa, nome: 'Mercearia', limite: 550 })).id;
const lazer = (await sync.criarEnvelope({
  casa: daRita.casa, nome: 'Lazer', limite: 180 })).id;

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── abrir o mês ──');

let agosto = null;

await prova('abrir cria uma linha, com os limites e o rendimento', async () => {
  const r = await sync.abrirMes({
    casa: daRita.casa, mes: 'd2026-08-01', rendimento: 3200,
    limites: { Mercearia: 550, Lazer: 180 } });
  if (!r || !r.id) throw new Error('não devolveu id: ' + JSON.stringify(r));
  agosto = r.id;
  const m = await admin.collection('meses').getOne(agosto);
  igual(String(m.mes).slice(0, 10), '2026-08-01');
  igual(m.rendimento, 3200);
  igual(m.limites.Mercearia, 550);
  igual(!!m.fechado_em, false, 'nasceu fechado');
});

await prova('⚠ e o `puxarCasa` traz o mês aberto e os limites dele', async () => {
  const lida = await sync.puxarCasa();
  if (!lida.mes) throw new Error('não trouxe mês nenhum');
  igual(lida.mes.idServidor, agosto);
  igual(lida.mes.inicio, 'd2026-08-01');
  igual(lida.mes.monthLimits.Mercearia, 550);
});

console.log('\n── e os totais são DESTE mês ──');

await prova('uma despesa de agosto conta', async () => {
  await sync.despesa({
    casa: daRita.casa, envelope: mercearia, valor: 40, pagador: daRita.membro,
    descricao: 'Compras', data: '2026-08-10' });
  const lida = await sync.puxarCasa();
  igual(lida.registered, 40);
});

await prova('⚠ e uma de JULHO, antes de o mês abrir, NÃO conta', async () => {
  // É o que o filtro por mês existe para fazer: sem ele, o total era a soma de
  // sempre e o mês novo começava com o gasto do anterior.
  await sync.despesa({
    casa: daRita.casa, envelope: mercearia, valor: 999, pagador: daRita.membro,
    descricao: 'Compras de julho', data: '2026-07-15' });
  const lida = await sync.puxarCasa();
  igual(lida.registered, 40, 'a despesa de julho entrou no total de agosto');
});

await prova('e o mesmo para as transferências entre envelopes', async () => {
  await semRecusa(sync.transferenciaEntreEnvelopes({
    casa: daRita.casa, de: mercearia, para: lazer, valor: 50,
    mes: '2026-08-01', por: daRita.membro }), 'transferência de agosto');
  await semRecusa(sync.transferenciaEntreEnvelopes({
    casa: daRita.casa, de: mercearia, para: lazer, valor: 30,
    mes: '2026-07-01', por: daRita.membro }), 'transferência de julho');
  const lida = await sync.puxarCasa();
  // Só a de agosto: −50 na Mercearia, +50 no Lazer.
  igual(lida.envMove.Mercearia, -50, JSON.stringify(lida.envMove));
  igual(lida.envMove.Lazer, 50);
});

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── ⚠ e um mês fechado NÃO reabre sozinho ──');

await prova('fechar agosto põe a data', async () => {
  await sync.alterarMes(agosto, { fechadoEm: 'd2026-08-31' });
  const m = await admin.collection('meses').getOne(agosto);
  if (!m.fechado_em) throw new Error('não gravou o fecho');
});

await prova('⚠ e o mês aberto passa a não haver', async () => {
  const lida = await sync.puxarCasa();
  igual(lida.mes, null, 'o mês fechado continua a ser o aberto');
});

let setembro = null;

await prova('⚠ setembro abre, e começa do ZERO — sem ninguém apagar nada', async () => {
  // É a prova que interessa. As despesas de agosto continuam todas lá; o total
  // de setembro é zero porque é OUTRA soma, não porque alguém a zerou.
  setembro = (await sync.abrirMes({
    casa: daRita.casa, mes: 'd2026-09-01', rendimento: 3200,
    limites: { Mercearia: 600, Lazer: 200 } })).id;

  const lida = await sync.puxarCasa();
  igual(lida.mes.idServidor, setembro);
  igual(lida.registered, 0, 'setembro começou com o gasto de agosto');
  igual(Object.keys(lida.envMove).length, 0, JSON.stringify(lida.envMove));
  igual(lida.mes.monthLimits.Mercearia, 600);

  // ⚠ E as despesas de agosto CONTINUAM no servidor. Fechar um mês não apaga o
  // que se gastou nele — apaga-o do total, que é outra coisa.
  const todas = (await admin.collection('despesas').getFullList())
    .filter(d => d.casa === casa.id);
  igual(todas.length, 2, 'as despesas de agosto desapareceram');
});

await prova('uma despesa de setembro conta, e a de agosto continua fora', async () => {
  await semRecusa(sync.despesa({
    casa: daRita.casa, envelope: mercearia, valor: 25, pagador: daRita.membro,
    descricao: 'Compras', data: '2026-09-03' }), 'despesa de setembro');
  const lida = await sync.puxarCasa();
  igual(lida.registered, 25);
});

await prova('alterar os limites do mês altera a LINHA dele', async () => {
  await sync.alterarMes(setembro, { limites: { Mercearia: 700, Lazer: 200 } });
  const lida = await sync.puxarCasa();
  igual(lida.mes.monthLimits.Mercearia, 700);
});

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── e quem pode mexer no mês ──');

await prova('⚠ uma CRIANÇA não vê os meses — é orçamento', async () => {
  const doLeo = await telemovel(leo.login, '1357');
  igual((await doLeo.collection('meses').getFullList()).length, 0);
});

await prova('⚠ um adulto que não administra não abre nem fecha meses', async () => {
  const tomas = await mk('Tomas', 'adulto', { email: 'tomas-mes@x.pt', ...s('palavra-longa-2') });
  const dele = await telemovel('tomas-mes@x.pt', 'palavra-longa-2');
  // Vê, porque é adulto e o orçamento é dos adultos.
  if (!(await dele.collection('meses').getFullList()).length) throw new Error('devia ver');
  // Mas não mexe.
  await recusado(() => dele.collection('meses').create({ casa: casa.id, mes: '2026-10-01' }));
  await recusado(() => dele.collection('meses').update(setembro, { rendimento: 1 }));
});

await prova('⚠ e um mês não se APAGA — o histórico do orçamento não se apaga', async () => {
  // `deleteRule: null`. Fechar um mês é pôr a data; apagá-lo era perder o que
  // a casa gastou nesse mês, e não há botão nenhum que o deva fazer.
  //
  // ⚠ E prova-se pelo telemóvel da Rita, não pelo `admin`: o superutilizador
  // passa por cima de TODAS as regras das coleções, e uma prova que o use está
  // a medir o PocketBase, não a regra. Escrevi-a assim à primeira e ela dizia
  // que o mês se apagava — dizia a verdade sobre o `admin` e nada sobre a casa.
  const daRitaPb = await telemovel('rita@x.pt', 'palavra-longa-1');
  await recusado(() => daRitaPb.collection('meses').delete(agosto));
  // E continua lá.
  await admin.collection('meses').getOne(agosto);
});

console.log(`\n${ok} provas passaram, ${mau} falharam.`);
process.exit(mau ? 1 : 0);
