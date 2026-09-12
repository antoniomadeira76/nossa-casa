// História 5 — Os contratos e as renovações.
//
// A Rita regista o seguro do carro, que renova daqui a 20 dias e é o Tomás que
// trata. O Tomás vê-o no telemóvel dele, com o nome dele em «quem trata». O
// Léo não recebe contratos. A Rita muda a data e depois apaga.
import { casaDaHistoria, dado, quando, entao, igual, comId, fim, diaDaqui, dmy } from './historia.mjs';

const h = await casaDaHistoria('História 5 · contratos');
const { sync, tomas, como } = h;
let seguro = null;
const renova = diaDaqui(20);

await quando('a Rita regista o seguro do carro: Fidelidade, renova daqui a 20 dias, o Tomás trata', async () => {
  const daRita = await como.rita();
  seguro = (await comId(sync.contratoDaCasa({ casa: daRita.casa, nome: 'Seguro do carro', fornecedor: 'Fidelidade',
    // As datas dos contratos falam «dd/mm/aaaa», a forma do formulário.
    renovaEm: dmy(renova), fidelizacaoAte: dmy(diaDaqui(200)), responsavel: tomas.id }), 'contratoDaCasa')).id;
});

await entao('o Tomás vê o contrato no telemóvel dele, com o nome dele em «quem trata»', async () => {
  await como.tomas();
  const c = await sync.puxarCasa();
  const s = c.contratos.find(x => x.id === seguro);
  igual(s.nome, 'Seguro do carro');
  igual(s.fornecedor, 'Fidelidade');
  igual(s.responsavel, 'Tomás');
  igual(s.renovaEm, dmy(renova));
});

await entao('⚠ o Léo não recebe contratos', async () => {
  await como.leo();
  const c = await sync.puxarCasa();
  igual(c.contratos.length, 0);
});

await quando('a Rita muda a renovação para daqui a 40 dias', async () => {
  await como.rita();
  await sync.alterarContrato(seguro, { renovaEm: dmy(diaDaqui(40)) });
});

await entao('o Tomás vê a data nova', async () => {
  await como.tomas();
  const c = await sync.puxarCasa();
  igual(c.contratos.find(x => x.id === seguro).renovaEm, dmy(diaDaqui(40)));
});

await quando('a Rita apaga o contrato', async () => {
  await como.rita();
  await sync.apagarContrato(seguro);
});

await entao('desaparece dos dois telemóveis', async () => {
  await como.tomas();
  igual((await sync.puxarCasa()).contratos.length, 0);
});

fim();
