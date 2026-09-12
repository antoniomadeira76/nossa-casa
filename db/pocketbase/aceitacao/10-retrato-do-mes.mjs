// História 10 — O retrato do mês.
//
// A casa vive um mês: abre-o, gasta em dois envelopes, o Léo faz uma tarefa
// que a Rita confirma, fecha-se uma ida às compras. O retrato soma tudo isso.
// A Rita fecha o mês e abre o seguinte: o retrato do mês fechado não muda. O
// Léo não recebe retrato nenhum.
import { casaDaHistoria, dado, quando, entao, igual, comId, semRecusa, fim, hoje, chave } from './historia.mjs';

const h = await casaDaHistoria('História 10 · retrato do mês');
const { sync, rita, leo, como, admin, casa } = h;
const mes = hoje.slice(0, 7);
let mercearia = null;
let lazer = null;
let idMes = null;
let antes = null;

await dado('o mês está aberto, com a Mercearia a 450 € e o Lazer a 120 €', async () => {
  const daRita = await como.rita();
  mercearia = (await comId(sync.criarEnvelope({ casa: daRita.casa, nome: 'Mercearia', limite: 450 }), 'criarEnvelope')).id;
  lazer = (await comId(sync.criarEnvelope({ casa: daRita.casa, nome: 'Lazer', limite: 120 }), 'criarEnvelope')).id;
  idMes = (await comId(sync.abrirMes({ casa: daRita.casa, mes: chave(`${mes}-01`), rendimento: 3000, limites: { Mercearia: 450, Lazer: 120 } }), 'abrirMes')).id;
});

await quando('a casa gasta 100,50 € na Mercearia e 130 € no Lazer, e o Léo faz uma tarefa que a Rita confirma', async () => {
  const daRita = await como.rita();
  await semRecusa(sync.despesa({ casa: daRita.casa, envelope: mercearia, valor: 100.5, pagador: rita.id, descricao: 'Compras', data: hoje, divideMeias: true, idemKey: 'h10-1' }), 'despesa');
  await semRecusa(sync.despesa({ casa: daRita.casa, envelope: lazer, valor: 130, pagador: rita.id, descricao: 'Cinema', data: hoje, divideMeias: false, idemKey: 'h10-2' }), 'despesa');
  const lixo = (await comId(sync.tarefaDaCasa({ casa: daRita.casa, titulo: 'Lixo', atribuidoA: leo.id, recorrencia: 'Todos os dias', pontos: 3, urgencia: 1 }), 'tarefaDaCasa')).id;
  const feita = await sync.marcarTarefaFeita({ casa: daRita.casa, tarefa: lixo, dia: chave(hoje), marcadaPor: rita.id });
  await sync.confirmarTarefaFeita(feita.id, rita.id);
});

await entao('o retrato do mês soma tudo: os envelopes contra o limite, o Lazer acima, o Léo com 1 tarefa e 3 pontos', async () => {
  await como.rita();
  const c = await sync.puxarCasa();
  igual(c.retratos.length, 1);
  const r = c.retratos[0];
  igual(r.aberto, true);
  const env = Object.fromEntries(r.envelopes.map(e => [e.nome, e]));
  igual(env.Mercearia.gasto, 100.5);
  igual(env.Mercearia.limite, 450);
  igual(env.Lazer.gasto, 130);
  igual(env.Lazer.gasto > env.Lazer.limite, true);
  igual(r.gasto, 230.5);
  igual(r.orcamento, 570);
  igual(r.meias, 1);
  igual(r.criancas.find(x => x.nome === 'Léo').feitas, 1);
  igual(r.criancas.find(x => x.nome === 'Léo').pontos, 3);
  antes = JSON.stringify({ ...r, aberto: undefined, fechadoEm: undefined });
});

await quando('a Rita fecha o mês e abre o seguinte, e a casa gasta mais 50 € no novo', async () => {
  const daRita = await como.rita();
  await sync.alterarMes(idMes, { fechadoEm: chave(hoje) });
  const seguinte = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 7);
  await comId(sync.abrirMes({ casa: daRita.casa, mes: chave(`${seguinte}-01`), rendimento: 3000, limites: { Mercearia: 500 } }), 'abrirMes');
  await admin.collection('despesas').create({ casa: casa.id, envelope: mercearia, valor: 50, pagador: rita.id,
    data: `${seguinte}-05`, idem_key: 'h10-3' });
});

await entao('⚠ o retrato do mês fechado não mudou — e o novo começa só com os 50 €', async () => {
  await como.rita();
  const c = await sync.puxarCasa();
  igual(c.retratos.length, 2);
  const fechado = c.retratos.find(r => !r.aberto);
  igual(fechado.fechadoEm, chave(hoje));
  igual(JSON.stringify({ ...fechado, aberto: undefined, fechadoEm: undefined }), antes);
  igual(c.retratos.find(r => r.aberto).gasto, 50);
});

await entao('⚠ o Léo não recebe retrato nenhum — é orçamento', async () => {
  await como.leo();
  igual((await sync.puxarCasa()).retratos.length, 0);
});

fim();
