// História 10 — O extracto do mês.
//
// A casa vive um mês: abre-o, gasta em dois envelopes, o Léo faz uma tarefa que
// a Rita confirma. O extracto traz cada movimento por ordem do tempo, com quem
// o fez e o saldo a seguir a ele. A Rita fecha o mês e abre o seguinte: o
// extracto do mês fechado não muda — é o arquivo a funcionar. O Léo não recebe
// extracto nenhum.
//
// 17/09/2026 — substituiu a história do retrato do mês, que somava as mesmas
// linhas em vez de as mostrar.
import { casaDaHistoria, dado, quando, entao, igual, comId, semRecusa, fim, hoje, chave } from './historia.mjs';

const h = await casaDaHistoria('História 10 · extracto do mês');
const { sync, rita, leo, como, admin, casa } = h;
const mes = hoje.slice(0, 7);
let mercearia = null;
let lazer = null;
let idMes = null;
let antes = null;

await dado('o mês está aberto, com 3 000 € de rendimento e dois envelopes', async () => {
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

await entao('o extracto traz as duas despesas e a abertura, com quem pagou e o saldo a seguir a cada uma', async () => {
  await como.rita();
  const c = await sync.puxarCasa();
  igual(c.extractos.length, 1);
  const e = c.extractos[0];
  igual(e.aberto, true);

  // Do mais recente para o mais antigo, e a abertura no fim.
  igual(e.movimentos.length, 3);
  igual(e.movimentos[e.movimentos.length - 1].especie, 'rendimento');

  const compras = e.movimentos.find(m => m.titulo === 'Compras');
  igual(compras.quem, 'Rita');
  igual(compras.detalhe, 'Mercearia');
  igual(compras.valor, -100.5);
  const cinema = e.movimentos.find(m => m.titulo === 'Cinema');
  igual(cinema.detalhe, 'Lazer');
  igual(cinema.valor, -130);

  // Os três números do cabeçalho são a soma da lista que se mostra.
  igual(e.entrou, 3000);
  igual(e.saiu, 230.5);
  igual(e.sobrou, 2769.5);
  // E o saldo da última saída é o «sobrou».
  igual(Math.min(...e.movimentos.filter(m => !m.neutro).map(m => m.saldo)), 2769.5);

  antes = JSON.stringify({ ...e, aberto: undefined, fechadoEm: undefined });
});

await quando('a Rita fecha o mês e abre o seguinte, e a casa gasta mais 50 € no novo', async () => {
  const daRita = await como.rita();
  await sync.alterarMes(idMes, { fechadoEm: chave(hoje) });
  const seguinte = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 7);
  await comId(sync.abrirMes({ casa: daRita.casa, mes: chave(`${seguinte}-01`), rendimento: 3000, limites: { Mercearia: 500 } }), 'abrirMes');
  await admin.collection('despesas').create({ casa: casa.id, envelope: mercearia, valor: 50, pagador: rita.id,
    data: `${seguinte}-05`, descricao: 'Do mês novo', idem_key: 'h10-3' });
});

await entao('⚠ o extracto do mês fechado não mudou — e o novo começa só com os 50 €', async () => {
  await como.rita();
  const c = await sync.puxarCasa();
  igual(c.extractos.length, 2);
  const fechado = c.extractos.find(e => !e.aberto);
  igual(fechado.fechadoEm, chave(hoje));
  // Nem uma vírgula: as linhas dele ficaram onde estavam (INVARIANTE #2).
  igual(JSON.stringify({ ...fechado, aberto: undefined, fechadoEm: undefined }), antes);
  const novo = c.extractos.find(e => e.aberto);
  igual(novo.saiu, 50);
  igual(novo.movimentos.filter(m => m.especie === 'despesa').length, 1);
});

await entao('⚠ o Léo não recebe extracto nenhum — é o dinheiro da casa', async () => {
  await como.leo();
  igual((await sync.puxarCasa()).extractos.length, 0);
});

fim();
