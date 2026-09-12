// História 1 — As prendas «só os adultos» e as Compras no modo criança.
//
// A Rita põe na lista a prenda de anos do Léo, marcada «só adultos». O Léo abre
// as Compras no telemóvel dele e vê a lista da casa — sem a prenda — e pede um
// artigo, que aparece à Rita com o nome dele.
import { casaDaHistoria, dado, quando, entao, igual, comId, fim } from './historia.mjs';

const h = await casaDaHistoria('História 1 · prendas');
const { sync, casa, rita, leo, como } = h;
let lista = null;

await dado('a casa tem uma loja, um corredor e uma ida às compras aberta', async () => {
  const daRita = await como.rita();
  const loja = await sync.acrescentarNaLista('stores', { casa: daRita.casa, nome: 'Continente' });
  await sync.criarSeccao({ casa: daRita.casa, nome: 'Mercearia', posto: 1 });
  lista = (await comId(sync.listaDeCompras({ casa: daRita.casa, loja: loja.id, comprador: rita.id, planeadaPara: 'd2026-09-20' }), 'listaDeCompras')).id;
});

await quando('a Rita põe na lista o leite e a prenda de anos do Léo, «só adultos»', async () => {
  const daRita = await como.rita();
  await comId(sync.artigoDeCompras({ casa: daRita.casa, lista, rotulo: 'Leite', corredor: null, pedidoPor: rita.id, visibilidade: 'familia' }), 'artigoDeCompras');
  await comId(sync.artigoDeCompras({ casa: daRita.casa, lista, rotulo: 'Prenda de anos do Léo · livro', corredor: null, pedidoPor: rita.id, visibilidade: 'adultos' }), 'artigoDeCompras');
});

await entao('a Rita vê os dois, com a prenda marcada «só adultos»', async () => {
  await como.rita();
  const c = await sync.puxarCasa();
  const rotulos = c.newItems.map(a => a.label).sort();
  igual(rotulos.join(' | '), 'Leite | Prenda de anos do Léo · livro');
  igual(c.newItems.find(a => a.label.startsWith('Prenda')).vis, 'adultos');
});

await entao('⚠ o Léo abre as Compras e a prenda NÃO chega ao telemóvel dele — só o leite', async () => {
  await como.leo();
  const c = await sync.puxarCasa();
  igual(c.newItems.map(a => a.label).join(' | '), 'Leite');
});

await quando('o Léo pede iogurtes', async () => {
  const doLeo = await como.leo();
  await comId(sync.artigoDeCompras({ casa: doLeo.casa, lista, rotulo: 'Iogurtes', corredor: null, pedidoPor: leo.id, visibilidade: 'familia' }), 'artigoDeCompras');
});

await entao('a Rita vê os iogurtes na lista, «Adicionado por Léo»', async () => {
  await como.rita();
  const c = await sync.puxarCasa();
  const iogurtes = c.newItems.find(a => a.label === 'Iogurtes');
  igual(!!iogurtes, true);
  igual(iogurtes.by, 'Adicionado por Léo');
  igual(iogurtes.vis, 'familia');
});

fim();
