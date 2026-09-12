// História 8 — A troca de tarefas entre irmãos: «o lixo pelas plantas, só hoje».
//
// O Léo propõe à Mia trocar o lixo pelas plantas. A Mia aceita no telemóvel
// dela. A Rita vê a troca aceite; a atribuição do dia deriva-se dela na app.
// A Rita anula — e cada tarefa volta a quem era.
import { casaDaHistoria, dado, quando, entao, igual, recusado, comId, fim, hoje, chave } from './historia.mjs';

const h = await casaDaHistoria('História 8 · troca de tarefas');
const { sync, leo, mia, como, de } = h;
let lixo = null;
let plantas = null;
let troca = null;

await dado('o Léo tem o lixo e a Mia tem as plantas, todos os dias', async () => {
  const daRita = await como.rita();
  lixo = (await comId(sync.tarefaDaCasa({ casa: daRita.casa, titulo: 'Pôr o lixo na rua', atribuidoA: leo.id, recorrencia: 'Todos os dias', pontos: 3, urgencia: 1 }), 'tarefaDaCasa')).id;
  plantas = (await comId(sync.tarefaDaCasa({ casa: daRita.casa, titulo: 'Regar as plantas', atribuidoA: mia.id, recorrencia: 'Todos os dias', pontos: 2, urgencia: 1 }), 'tarefaDaCasa')).id;
});

await quando('o Léo propõe à Mia: o lixo pelas plantas, só hoje', async () => {
  const doLeo = await como.leo();
  troca = (await comId(sync.trocaDeTarefas({ casa: doLeo.casa, dia: chave(hoje), tarefaDe: lixo, tarefaPara: plantas, propostaPor: doLeo.membro }), 'trocaDeTarefas')).id;
});

await entao('a Mia vê a proposta por aceitar no telemóvel dela', async () => {
  await como.mia();
  const c = await sync.puxarCasa();
  const t = c.trocas.find(x => x.id === troca);
  igual(t.propostaPor, 'Léo');
  igual(t.aceiteEm, null);
  igual(t.de, lixo);
  igual(t.para, plantas);
});

await entao('⚠ o Léo não aceita a própria proposta', async () => {
  await recusado(() => de.leo.collection('trocas_tarefas').update(troca, { aceite_em: new Date().toISOString(), aceite_por: leo.id }));
});

await quando('a Mia aceita', async () => {
  const daMia = await como.mia();
  await sync.aceitarTrocaDeTarefas(troca, daMia.membro);
});

await entao('a Rita vê a troca aceite pela Mia, hoje', async () => {
  await como.rita();
  const c = await sync.puxarCasa();
  const t = c.trocas.find(x => x.id === troca);
  igual(t.aceitePor, 'Mia');
  igual(!!t.aceiteEm, true);
  igual(t.dia, chave(hoje));
});

await entao('⚠ e nem o Léo nem a Mia a desfazem depois de aceite', async () => {
  await recusado(() => de.leo.collection('trocas_tarefas').delete(troca));
  await recusado(() => de.mia.collection('trocas_tarefas').delete(troca));
});

await quando('a Rita anula a troca', async () => {
  await como.rita();
  await sync.apagarTrocaDeTarefas(troca);
});

await entao('não há trocas hoje — cada tarefa volta a quem era', async () => {
  await como.mia();
  igual((await sync.puxarCasa()).trocas.length, 0);
});

fim();
