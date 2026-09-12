// História 9 — A lista partilhada com quem não tem a app.
//
// A avó vai ao supermercado. A Rita pede o endereço só de leitura e manda-o. A
// avó abre-o sem entrar: vê os rótulos por corredor, riscados os já comprados,
// sem a prenda «só adultos», sem preços, sem nomes. A Rita desfaz a partilha e
// o endereço morre.
import { casaDaHistoria, dado, quando, entao, igual, comId, fim, URL } from './historia.mjs';

const h = await casaDaHistoria('História 9 · lista partilhada');
const { sync, rita, como } = h;
let lista = null;
let partilha = null;
const abrir = (url) => fetch(url).then(async r => ({ status: r.status, texto: await r.text() }));

await dado('a lista da casa tem leite (comprado), ovos, e a prenda do Léo «só adultos»', async () => {
  const daRita = await como.rita();
  const loja = await sync.acrescentarNaLista('stores', { casa: daRita.casa, nome: 'Pingo Doce' });
  const frescos = await sync.criarSeccao({ casa: daRita.casa, nome: 'Frescos', posto: 1 });
  lista = (await comId(sync.listaDeCompras({ casa: daRita.casa, loja: loja.id, comprador: rita.id, planeadaPara: 'd2026-09-20' }), 'listaDeCompras')).id;
  const leite = (await comId(sync.artigoDeCompras({ casa: daRita.casa, lista, rotulo: 'Leite', corredor: frescos.id, pedidoPor: rita.id, estimativa: 1.2, visibilidade: 'familia' }), 'artigoDeCompras')).id;
  await comId(sync.artigoDeCompras({ casa: daRita.casa, lista, rotulo: 'Ovos', corredor: frescos.id, pedidoPor: rita.id, estimativa: 2.5, visibilidade: 'familia' }), 'artigoDeCompras');
  await comId(sync.artigoDeCompras({ casa: daRita.casa, lista, rotulo: 'Prenda do Léo', corredor: frescos.id, pedidoPor: rita.id, estimativa: 30, visibilidade: 'adultos' }), 'artigoDeCompras');
  await sync.marcarArtigo(leite, 'done', 1.19);
});

await quando('a Rita pede o endereço para a avó', async () => {
  const daRita = await como.rita();
  partilha = await sync.partilharLista({ casa: daRita.casa, lista, criadaPor: daRita.membro });
  igual(/\/lista\/[A-Za-z0-9]{24}$/.test(partilha.url), true);
});

await entao('a avó abre o endereço sem entrar e vê a lista por corredor, com o leite riscado', async () => {
  const r = await abrir(partilha.url);
  igual(r.status, 200);
  igual(r.texto.includes('<h2>Frescos</h2>'), true);
  igual(/<li class="feito">Leite<\/li>/.test(r.texto), true);
  igual(r.texto.includes('<li>Ovos</li>'), true);
  igual(r.texto.includes('Pingo Doce'), true);
});

await entao('⚠ e não vê a prenda, os preços, nem quem pediu — e não há nada em que tocar', async () => {
  const r = await abrir(partilha.url);
  igual(r.texto.includes('Prenda'), false);
  igual(r.texto.includes('1,19'), false);
  igual(r.texto.includes('2,5'), false);
  igual(r.texto.includes('Rita'), false);
  igual(r.texto.includes('<form'), false);
  igual(r.texto.includes('<script'), false);
});

await quando('a Rita desfaz a partilha', async () => {
  await como.rita();
  await sync.apagarPartilhaDaLista(partilha.id);
});

await entao('o endereço deixa de abrir na hora', async () => {
  igual((await abrir(partilha.url)).status, 404);
});

fim();
