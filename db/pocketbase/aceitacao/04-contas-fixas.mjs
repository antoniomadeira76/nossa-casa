// História 4 — As contas fixas com prazo: a renda paga com um toque.
//
// A Rita define a renda, 850 € no dia 1, no envelope «Casa». Marca-a como paga:
// nasce a despesa do mês. O Tomás, no telemóvel dele, marca-a paga outra vez —
// e a segunda não entra. O Léo não recebe as contas: é orçamento.
import { casaDaHistoria, dado, quando, entao, igual, comId, semRecusa, fim, hoje, chave } from './historia.mjs';

const h = await casaDaHistoria('História 4 · contas fixas');
const { sync, rita, tomas, como, de } = h;
let envelope = null;
let renda = null;
const mes = hoje.slice(0, 7);

await dado('a casa tem o envelope «Casa» com 1 000 € e o mês aberto', async () => {
  const daRita = await como.rita();
  envelope = (await comId(sync.criarEnvelope({ casa: daRita.casa, nome: 'Casa', limite: 1000 }), 'criarEnvelope')).id;
  await comId(sync.abrirMes({ casa: daRita.casa, mes: chave(`${mes}-01`), rendimento: 3000, limites: { Casa: 1000 } }), 'abrirMes');
});

await quando('a Rita define a renda: 850 €, dia 1, no envelope «Casa», paga por ela', async () => {
  const daRita = await como.rita();
  renda = (await comId(sync.contaFixaDaCasa({ casa: daRita.casa, nome: 'Renda', valor: 850, dia: 1, envelope, quemPaga: rita.id }), 'contaFixaDaCasa')).id;
});

await entao('a Rita vê a renda por pagar este mês', async () => {
  await como.rita();
  const c = await sync.puxarCasa();
  igual(c.contasFixas.map(x => x.nome).join(), 'Renda');
  igual(c.contasFixas[0].envelope, 'Casa');
  igual(c.contasFixas[0].quemPaga, 'Rita');
  igual(c.contasPagas.filter(p => p.conta === renda && p.mes === mes).length, 0);
});

await quando('a Rita marca a renda como paga', async () => {
  const daRita = await como.rita();
  await semRecusa(sync.despesa({ casa: daRita.casa, envelope, valor: 850, pagador: rita.id, descricao: 'Renda',
    data: hoje, divideMeias: false, contaFixa: renda, idemKey: `conta-fixa:${renda}:${mes}` }), 'despesa');
});

await entao('a renda está paga este mês, e o gasto do envelope «Casa» é 850 €', async () => {
  await como.rita();
  const c = await sync.puxarCasa();
  igual(c.contasPagas.filter(p => p.conta === renda && p.mes === mes).length, 1);
  igual(c.gastoPorEnvelope['Casa'], 850);
});

await quando('o Tomás, no telemóvel dele, marca a mesma renda como paga outra vez', async () => {
  // A mesma chave `conta-fixa:<id>:<mês>`: o servidor colide, e a fila trata a
  // colisão como «já lá está» — não como recusa.
  await de.tomas.collection('despesas').create({ casa: h.casa.id, envelope, valor: 850, pagador: tomas.id,
    data: hoje, conta_fixa: renda, idem_key: `conta-fixa:${renda}:${mes}` }).catch(() => null);
});

await entao('⚠ a renda continua paga UMA vez — 850 € gastos, não 1 700 €', async () => {
  await como.rita();
  const c = await sync.puxarCasa();
  igual(c.contasPagas.filter(p => p.conta === renda && p.mes === mes).length, 1);
  igual(c.gastoPorEnvelope['Casa'], 850);
});

await entao('⚠ o Léo não recebe as contas fixas — é orçamento', async () => {
  await como.leo();
  const c = await sync.puxarCasa();
  igual(c.contasFixas.length, 0);
  igual(c.contasPagas.length, 0);
});

fim();
