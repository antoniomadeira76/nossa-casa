// História 3 — A ementa da semana, e o «jantar de hoje» da criança.
//
// A Rita cria um prato com ingredientes e marca-o para o jantar de hoje. O Léo
// vê «Jantar de hoje: Sopa» na app dele. A Rita desliga a ementa na Gestão, e
// a casa inteira deixa de a ver — os pratos ficam guardados.
import { casaDaHistoria, dado, quando, entao, igual, comId, fim, hoje, chave } from './historia.mjs';

const h = await casaDaHistoria('História 3 · ementa');
const { sync, casa, como } = h;
let prato = null;

await dado('a Rita cria o prato «Sopa de legumes», com a cenoura na Mercearia', async () => {
  const daRita = await como.rita();
  prato = (await comId(sync.pratoDaCasa({ casa: daRita.casa, nome: 'Sopa de legumes',
    ingredientes: [{ rotulo: 'Cenoura', s: 'Mercearia' }, { rotulo: 'Alho francês', s: 'Frescos' }] }), 'pratoDaCasa')).id;
});

await quando('a Rita marca a sopa para o jantar de hoje', async () => {
  const daRita = await como.rita();
  await comId(sync.jantarDoDia({ casa: daRita.casa, dia: chave(hoje), prato }), 'jantarDoDia');
});

await entao('a Rita vê a ementa com a sopa em hoje, e o prato com os dois ingredientes', async () => {
  await como.rita();
  const c = await sync.puxarCasa();
  igual(c.ementa[chave(hoje)], prato);
  igual(c.pratos.find(p => p.id === prato).ingredientes.map(i => i.rotulo).join(' | '), 'Cenoura | Alho francês');
  igual(c.regras.ementaDesligada, false);
});

await entao('o Léo vê o jantar de hoje na app dele — é o jantar dele também', async () => {
  await como.leo();
  const c = await sync.puxarCasa();
  igual(c.ementa[chave(hoje)], prato);
  igual(c.pratos.find(p => p.id === prato).nome, 'Sopa de legumes');
});

await quando('a Rita marca outro prato para o mesmo dia — muda, não duplica', async () => {
  const daRita = await como.rita();
  const massa = (await comId(sync.pratoDaCasa({ casa: daRita.casa, nome: 'Massa à bolonhesa', ingredientes: [] }), 'pratoDaCasa')).id;
  await sync.jantarDoDia({ casa: daRita.casa, dia: chave(hoje), prato: massa });
  const c = await sync.puxarCasa();
  igual(c.ementa[chave(hoje)], massa);
  igual((await h.admin.collection('ementa').getFullList({ filter: `casa = "${casa.id}"` })).length, 1);
});

await quando('a Rita desliga a ementa da semana na Gestão da Casa', async () => {
  const daRita = await como.rita();
  await sync.regrasDaCasa(daRita.casa, { ementaDesligada: true });
});

await entao('⚠ a casa inteira lê «ementa desligada» — e os pratos ficam guardados', async () => {
  await como.leo();
  const c = await sync.puxarCasa();
  igual(c.regras.ementaDesligada, true);
  igual(c.pratos.length, 2);
});

fim();
