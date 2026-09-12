// O retrato do mês — somado das linhas, na leitura.
//
//   node db/pocketbase/provar-retrato.mjs
//
// Nenhum campo novo no servidor: o retrato é o que o `puxarCasa` soma das
// `despesas`, `tarefas_feitas`, `listas_compras` e `acertos` de cada linha de
// `meses`. Prova-se que a soma é a das linhas do mês, que um mês fechado não
// muda quando o seguinte abre, e que a criança não recebe retrato nenhum.
// 12/09/2026 — a décima das dez funcionalidades.
import { URL, PREFIXO, comecar, prova, igual, resumo, memoriaDeTelemovel } from './provas.mjs';

const { configurar, auth } = await import('../../src/pocketbase.js');
const sync = await import('../../src/sync.js');
configurar({ url: URL, storage: memoriaDeTelemovel() });

const { pb: admin } = await comecar();
const casa = await admin.collection('casas').create({ nome: PREFIXO + 'Retrato', valor_ponto: 0.1 });
const mk = (nome, papel, extra) => admin.collection('membros').create({
  nome, login: `${casa.id}_${nome}`, casa: casa.id, papel, verified: true, ...extra });
const s = (p) => ({ password: p, passwordConfirm: p });

const rita = await mk('Rita', 'admin', { email: 'rita-rt@x.pt', ...s('palavra-longa-1') });
const tomas = await mk('Tomás', 'adulto', { email: 'tomas-rt@x.pt', ...s('palavra-longa-2') });
const leo = await mk('Leo', 'crianca', { ...s('1357') });
const mia = await mk('Mia', 'crianca', { ...s('2468') });

const mercearia = await admin.collection('envelopes').create({ casa: casa.id, nome: 'Mercearia', limite_base: 450 });
const lazer = await admin.collection('envelopes').create({ casa: casa.id, nome: 'Lazer', limite_base: 120 });

// Agosto fechado a 31/08; Setembro aberto a 01/09, com o limite da Mercearia mexido.
const agosto = await admin.collection('meses').create({ casa: casa.id, mes: '2026-08-01', rendimento: 3000, fechado_em: '2026-08-31',
  limites: { Mercearia: 450, Lazer: 120 } });
const setembro = await admin.collection('meses').create({ casa: casa.id, mes: '2026-09-01', rendimento: 3000,
  limites: { Mercearia: 500, Lazer: 120 } });

const despesa = (data, valor, envelope, extra = {}) => admin.collection('despesas').create({
  casa: casa.id, envelope: envelope.id, valor, data, pagador: rita.id, idem_key: `rt-${data}-${valor}-${envelope.nome}`, ...extra });
await despesa('2026-08-03', 100.5, mercearia);
await despesa('2026-08-31', 20, lazer, { divide_meias: true });        // o dia do fecho conta em Agosto
await despesa('2026-08-15', 999, mercearia, { anula_id: 'x' });         // anulada: não conta
await despesa('2026-09-01', 30.25, mercearia);                          // o dia da abertura é já Setembro
await despesa('2026-09-10', 10, lazer, { divide_meias: true });

const tarefa = (titulo, quem, pontos) => admin.collection('tarefas').create({
  casa: casa.id, titulo, atribuido_a: quem.id, pontos, recorrencia: 'diaria' });
const lixo = await tarefa('Lixo', leo, 3);
const mesa = await tarefa('Mesa', mia, 2);
const feita = (t, data, confirmada) => admin.collection('tarefas_feitas').create({
  casa: casa.id, tarefa: t.id, data, marcada_por: rita.id,
  ...(confirmada ? { confirmada_por: rita.id, confirmada_em: `${data} 20:00:00.000Z` } : {}) });
await feita(lixo, '2026-08-05', true);
await feita(lixo, '2026-08-06', true);
await feita(lixo, '2026-08-07', false);     // por confirmar: não conta
await feita(mesa, '2026-08-05', true);
await feita(lixo, '2026-09-02', true);

const loja = await admin.collection('lojas').create({ casa: casa.id, nome: 'Continente' });
await admin.collection('listas_compras').create({ casa: casa.id, loja: loja.id, comprador: rita.id, fechada_em: '2026-08-20 18:00:00.000Z', total: 87.4 });
await admin.collection('listas_compras').create({ casa: casa.id, loja: loja.id, comprador: rita.id, fechada_em: '2026-09-05 18:00:00.000Z', total: 12 });
await admin.collection('acertos').create({ casa: casa.id, de_membro: tomas.id, para_membro: rita.id, valor: 40, data: '2026-08-28', idem_key: 'rt-ac1' });

await auth.entrarAdulto('rita-rt@x.pt', 'palavra-longa-1');

console.log('\n── a soma é a das linhas do mês ──');

let retratos = null;
await prova('o `puxarCasa` traz um retrato por mês, do mais recente para o mais antigo', async () => {
  retratos = (await sync.puxarCasa()).retratos;
  igual(retratos.length, 2);
  igual(retratos[0].nome, 'Setembro de 2026');
  igual(retratos[0].aberto, true);
  igual(retratos[1].nome, 'Agosto de 2026');
  igual(retratos[1].aberto, false);
  igual(retratos[1].fechadoEm, 'd2026-08-31');
});

await prova('Agosto: o gasto por envelope é a soma das despesas não anuladas do intervalo — o dia do fecho conta', () => {
  const a = retratos[1];
  const env = Object.fromEntries(a.envelopes.map(e => [e.nome, e]));
  igual(env.Mercearia.gasto, 100.5);
  igual(env.Mercearia.limite, 450);
  igual(env.Lazer.gasto, 20);
  igual(a.gasto, 120.5);
  igual(a.orcamento, 570);
  igual(a.despesas, 2);
  igual(a.meias, 1);
});

await prova('Setembro: o dia da abertura já é do mês novo, e o limite é o do mês', () => {
  const st = retratos[0];
  const env = Object.fromEntries(st.envelopes.map(e => [e.nome, e]));
  igual(env.Mercearia.gasto, 30.25);
  igual(env.Mercearia.limite, 500);
  igual(env.Lazer.gasto, 10);
  igual(st.gasto, 40.25);
});

await prova('as tarefas são as CONFIRMADAS do mês, por criança, com os pontos delas', () => {
  const a = Object.fromEntries(retratos[1].criancas.map(c => [c.nome, c]));
  igual(a.Leo.feitas, 2);
  igual(a.Leo.pontos, 6);
  igual(a.Mia.feitas, 1);
  igual(a.Mia.pontos, 2);
  const st = Object.fromEntries(retratos[0].criancas.map(c => [c.nome, c]));
  igual(st.Leo.feitas, 1);
  igual(st.Mia.feitas, 0);
});

await prova('as compras e os acertos são os do mês', () => {
  igual(retratos[1].compras.idas, 1);
  igual(retratos[1].compras.total, 87.4);
  igual(retratos[1].acertos.n, 1);
  igual(retratos[1].acertos.total, 40);
  igual(retratos[0].compras.total, 12);
  igual(retratos[0].acertos.n, 0);
});

console.log('\n── o que está fechado não muda ──');

await prova('⚠ o retrato de Agosto não muda quando Setembro cresce nem quando Outubro abre', async () => {
  const antes = JSON.stringify(retratos[1]);
  await despesa('2026-09-20', 77, mercearia);
  await admin.collection('meses').update(setembro.id, { fechado_em: '2026-09-30' });
  await admin.collection('meses').create({ casa: casa.id, mes: '2026-10-01', rendimento: 3000, limites: {} });
  const depois = (await sync.puxarCasa()).retratos;
  igual(depois.length, 3);
  igual(JSON.stringify(depois.find(r => r.nome === 'Agosto de 2026')), antes);
  igual(depois.find(r => r.nome === 'Setembro de 2026').gasto, 117.25);
  igual(depois.find(r => r.nome === 'Outubro de 2026').gasto, 0);
});

console.log('\n── só adultos ──');

await prova('⚠ a criança não recebe retrato nenhum — é orçamento', async () => {
  await auth.entrarCrianca(`${casa.id}_Leo`, '1357');
  igual((await sync.puxarCasa()).retratos.length, 0);
});

resumo();
