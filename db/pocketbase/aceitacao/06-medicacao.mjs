// História 6 — A medicação a partir da receita.
//
// A Rita marca uma consulta ao Léo e escreve a receita: ferro, duas tomas por
// dia, cinco dias, caixa de 10. Marca a toma da manhã. O Tomás vê a receita e
// a toma, mas não pode desmarcar a toma da Rita. O Léo não recebe nada disto.
// (O servidor vive em casa — é o único sítio para onde a saúde sobe.)
import { casaDaHistoria, dado, quando, entao, igual, recusado, comId, fim, hoje } from './historia.mjs';

const h = await casaDaHistoria('História 6 · medicação');
const { sync, rita, leo, ids, como, de } = h;
let episodio = null;
let receita = null;
let toma = null;

await dado('a Rita marca uma consulta de Pediatria ao Léo, hoje', async () => {
  const daRita = await como.rita();
  igual(sync.saudeSincroniza(), true, 'o servidor tem de viver em casa para a saúde subir');
  // O `dia` vai já sem o «d» — é a loja que o tira antes de chamar (`day.replace(/^d/, '')`).
  episodio = (await comId(sync.episodioDeSaude({ casa: daRita.casa, membro: leo.id, especialidade: 'Pediatria',
    medico: 'Dr.ª Neves', dia: hoje, hora: '10:00', notas: '' }), 'episodioDeSaude')).id;
});

await quando('a Rita escreve a receita: Ferro, 2 tomas por dia, 5 dias, caixa de 10', async () => {
  const daRita = await como.rita();
  receita = (await comId(sync.receitaDeSaude({ casa: daRita.casa, episodio, nome: 'Ferro 30 mg', dose: '1 comprimido',
    frequencia: 2, duracaoDias: 5, caixa: 10 }), 'receitaDeSaude')).id;
});

await quando('a Rita marca a toma da manhã', async () => {
  const daRita = await como.rita();
  toma = (await comId(sync.tomaDeSaude({ casa: daRita.casa, receita, quando: `${hoje}T08:30:00.000Z`, por: rita.id }), 'tomaDeSaude')).id;
});

await entao('o Tomás vê a receita com o plano, e a toma marcada pela Rita', async () => {
  await como.tomas();
  const f = await sync.puxarSaude(ids);
  const r = f.receitas.find(x => x.idServidor === receita);
  igual(r.name, 'Ferro 30 mg');
  igual(r.frequency, 2);
  igual(r.durationDays, 5);
  igual(r.boxSize, 10);
  igual(f.tomas.length, 1);
  igual(f.tomas[0].por, 'Rita');
});

await entao('⚠ mas o Tomás não desmarca a toma da Rita — só quem marcou desmarca', async () => {
  await recusado(() => de.tomas.collection('tomas_saude').delete(toma));
});

await entao('⚠ o Léo não recebe a receita nem a toma — a ficha não é para a criança', async () => {
  await como.leo();
  const f = await sync.puxarSaude(ids);
  igual(f.receitas.length, 0);
  igual(f.tomas.length, 0);
  igual(f.episodios.length, 0);
});

await quando('a Rita desmarca a toma que marcou por engano', async () => {
  await como.rita();
  await sync.apagarTomaDeSaude(toma);
});

await entao('a toma sai, e a receita fica', async () => {
  await como.rita();
  const f = await sync.puxarSaude(ids);
  igual(f.tomas.length, 0);
  igual(f.receitas.length, 1);
});

fim();
