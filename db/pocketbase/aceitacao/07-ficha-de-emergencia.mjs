// História 7 — A ficha de emergência do Léo, para a escola.
//
// A Rita regista a alergia ao amendoim, grave, com a nota da caneta. O Tomás
// vê-a; o Léo não vê a sua. O documento que sai para a escola tem as quatro
// secções, com a alergia e os contactos dos adultos.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { casaDaHistoria, dado, quando, entao, igual, comId, fim, hoje, chave } from './historia.mjs';

const h = await casaDaHistoria('História 7 · ficha de emergência');
const { sync, leo, ids, como } = h;
const { documentoDeEmergencia } = await import(pathToFileURL(path.resolve(import.meta.dirname, '../../../src/exportar-saude.js')).href);
let amendoim = null;

await quando('a Rita regista no Léo a alergia ao amendoim, grave, com a nota da caneta', async () => {
  const daRita = await como.rita();
  amendoim = (await comId(sync.alergiaDeSaude({ casa: daRita.casa, membro: leo.id, nome: 'Amendoim', gravidade: 'grave',
    nota: 'Caneta de adrenalina na mochila' }), 'alergiaDeSaude')).id;
});

await entao('o Tomás vê a alergia na ficha do Léo', async () => {
  await como.tomas();
  const f = await sync.puxarSaude(ids);
  igual(f.alergias.length, 1);
  igual(f.alergias[0].nome, 'Amendoim');
  igual(f.alergias[0].gravidade, 'grave');
});

await entao('⚠ o Léo não vê a própria alergia', async () => {
  await como.leo();
  const f = await sync.puxarSaude(ids);
  igual(f.alergias.length, 0);
});

await entao('o documento para a escola tem as quatro secções, a alergia e os contactos dos adultos', async () => {
  await como.rita();
  const f = await sync.puxarSaude(ids);
  const c = await sync.puxarCasa();
  const contactos = Object.entries(c.membros).filter(([, m]) => !m.kid).map(([nome, m]) => ({ nome, email: m.email }));
  const html = documentoDeEmergencia({ membro: 'Léo', casa: 'História 7', hoje: chave(hoje), quemImprime: 'Rita',
    ficha: { alergias: f.alergias.map(a => ({ id: a.idServidor, nome: a.nome, gravidade: a.gravidade, nota: a.nota })),
      medicacao: [], medicos: [], contactos } });
  for (const s of ['Alergias', 'Medicação atual', 'Médico', 'Contactos']) igual(html.includes(`<h2>${s}</h2>`), true, s);
  igual(html.includes('<strong>Amendoim</strong> · grave — Caneta de adrenalina na mochila'), true);
  igual(html.includes('<strong>Rita</strong>'), true);
  igual(html.includes('<strong>Tomás</strong>'), true);
  igual(html.includes('Impresso por Rita'), true);
});

await quando('a Rita tira a alergia — afinal era só ao pistácio', async () => {
  await como.rita();
  await sync.apagarAlergiaDeSaude(amendoim);
});

await entao('a ficha do Tomás fica sem alergias', async () => {
  await como.tomas();
  igual((await sync.puxarSaude(ids)).alergias.length, 0);
});

fim();
