// História 2 — O objetivo do cofre: «Bicicleta, 120 €».
//
// O Léo escolhe para que junta. A Rita paga-lhe a semanada e um bónus; o que
// está juntado é a soma dos movimentos, e o objetivo mede-se contra ela. A Mia
// não vê o objetivo do irmão.
import { casaDaHistoria, dado, quando, entao, igual, semRecusa, fim, hoje } from './historia.mjs';

const h = await casaDaHistoria('História 2 · objetivo do cofre');
const { sync, leo, rita, como } = h;

await dado('o Léo escolhe o objetivo dele: uma bicicleta de 120 €', async () => {
  const doLeo = await como.leo();
  await sync.definirObjetivoDoCofre({ casa: doLeo.casa, membro: leo.id, nome: 'Bicicleta', alvo: 120 });
});

await quando('a Rita paga a semanada (5 €) e um bónus (2,50 €)', async () => {
  const daRita = await como.rita();
  // Pela FILA, como a app: a resposta é a contagem do que foi enviado.
  await semRecusa(sync.movimentoDeCofre({ casa: daRita.casa, membro: leo.id, tipo: 'semanada', valor: 5, motivo: 'Semanada', data: hoje, autorizadoPor: rita.id, pontos: 50 }), 'movimentoDeCofre');
  await semRecusa(sync.movimentoDeCofre({ casa: daRita.casa, membro: leo.id, tipo: 'bonus', valor: 2.5, motivo: 'Quarto arrumado', data: hoje, autorizadoPor: rita.id, pontos: 0 }), 'movimentoDeCofre');
});

await entao('o Léo vê o objetivo e o cofre com 7,50 € — a soma dos dois movimentos', async () => {
  await como.leo();
  const c = await sync.puxarCasa();
  igual(c.objetivosCofre['Léo'].nome, 'Bicicleta');
  igual(c.objetivosCofre['Léo'].alvo, 120);
  const saldo = c.vaultMoves.filter(m => m.kid === 'Léo').reduce((n, m) => n + m.delta, 0);
  igual(saldo, 7.5);
});

await entao('a Rita vê o mesmo objetivo e o mesmo saldo — e os pontos pagos', async () => {
  await como.rita();
  const c = await sync.puxarCasa();
  igual(c.objetivosCofre['Léo'].alvo, 120);
  igual(c.vaultMoves.filter(m => m.kid === 'Léo').reduce((n, m) => n + m.delta, 0), 7.5);
  igual(c.paidPts['Léo'], 50);
});

await entao('⚠ a Mia não vê o objetivo do irmão', async () => {
  await como.mia();
  const c = await sync.puxarCasa();
  igual(c.objetivosCofre['Léo'], undefined);
});

await quando('o Léo muda de ideias e deixa de ter objetivo', async () => {
  await como.leo();
  const c = await sync.puxarCasa();
  await sync.apagarObjetivoDoCofre(c.objetivosCofre['Léo'].id);
});

await entao('o objetivo sai e o dinheiro fica', async () => {
  await como.rita();
  const c = await sync.puxarCasa();
  igual(c.objetivosCofre['Léo'], undefined);
  igual(c.vaultMoves.filter(m => m.kid === 'Léo').reduce((n, m) => n + m.delta, 0), 7.5);
});

fim();
