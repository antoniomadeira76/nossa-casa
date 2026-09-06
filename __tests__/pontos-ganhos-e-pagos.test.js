/**
 * ⚠ Os pontos ganhos e os pontos pagos falam da MESMA janela.
 *
 * ── O defeito ────────────────────────────────────────────────────────────────
 *
 * O que a app mostra por pagar é `kidPts − paidPts`. Eram duas coisas
 * diferentes subtraídas uma à outra:
 *
 *   `kidPts`   somava `s.done[t.id]` — as tarefas feitas HOJE, que o
 *              `recurringReset` limpa à meia-noite.
 *   `paidPts`  soma o campo `pontos` de TODOS os movimentos de cofre, de
 *              sempre.
 *
 * Bastava uma semanada ter sido paga ontem para o «por pagar» de hoje nascer
 * NEGATIVO, e ficar negativo até a criança fazer tarefas que cobrissem tudo o
 * que já lhe foi pago na vida. Foi assim que se viu: «Pagar Semanada · −1,00 €».
 *
 * E havia um segundo, ao lado: contava uma tarefa marcada, confirmada ou não. O
 * ecrã da Documentação promete o contrário, em letras — «Uma criança marca a
 * tarefa como feita e um adulto confirma; os pontos só contam depois disso».
 *
 * ── O modelo certo ───────────────────────────────────────────────────────────
 *
 * O INVARIANTE #2, como em todo o resto: uma SOMA sobre as linhas. As linhas
 * são as `tarefas_feitas` — uma por (tarefa, dia), com índice único no
 * servidor —, e conta-se o ponto de cada uma CONFIRMADA. As duas metades
 * passam a falar de sempre.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { StoreProvider, useStore } = require('../src/store');

const loja = () => {
  let api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
  });
  return () => api;
};

// Uma casa com servidor: `feitas` cheio, como o `puxarCasa` o devolve.
const comServidor = (ler, linhas) => {
  const tarefas = [
    { id: 't-lixo', idServidor: 't-lixo', title: 'Levar o lixo', who: 'Léo', pts: 2, recur: 'Todos os dias' },
    { id: 't-mesa', idServidor: 't-mesa', title: 'Pôr a mesa', who: 'Mia', pts: 1, recur: 'Todos os dias' },
  ];
  TestRenderer.act(() => {
    ler().set({ clearedSeeds: true, newTasks: tarefas, feitas: linhas, done: {}, pending: {},
      vaultMoves: [], paidPts: {} });
  });
};

describe('⚠ os pontos ganhos contam o histórico, não só hoje', () => {
  it('três dias de uma tarefa confirmada valem os três', () => {
    const l = loja();
    comServidor(l, {
      't-lixo|2026-09-05': { id: 'a', confirmada: true },
      't-lixo|2026-09-06': { id: 'b', confirmada: true },
      't-lixo|2026-09-07': { id: 'c', confirmada: true },
    });
    expect(l().kidPts['Léo']).toBe(6);
  });

  it('⚠ e uma marcação POR CONFIRMAR não conta', () => {
    // A regra que o ecrã promete: a criança marca, o adulto confirma, e só
    // então os pontos contam.
    const l = loja();
    comServidor(l, {
      't-lixo|2026-09-05': { id: 'a', confirmada: true },
      't-lixo|2026-09-06': { id: 'b', confirmada: false },
    });
    expect(l().kidPts['Léo']).toBe(2);
  });

  it('cada criança conta a sua', () => {
    const l = loja();
    comServidor(l, {
      't-lixo|2026-09-05': { id: 'a', confirmada: true },
      't-mesa|2026-09-05': { id: 'b', confirmada: true },
      't-mesa|2026-09-06': { id: 'c', confirmada: true },
    });
    expect(l().kidPts['Léo']).toBe(2);
    expect(l().kidPts['Mia']).toBe(2);
  });

  it('⚠ e o `done` com restos de ontem não soma por cima', () => {
    // A leitura do servidor FUNDE o `done` em vez de o substituir, e o
    // `recurringReset` só limpa quando a app abre: «Levar o lixo» de ontem
    // continuava lá hoje. A primeira correcção somava-o outra vez, e dava
    // 0,40 € onde a conta é 0,20 €.
    const l = loja();
    comServidor(l, { 't-lixo|2026-09-05': { id: 'a', confirmada: true } });
    TestRenderer.act(() => { l().set({ done: { 't-lixo': true } }); });
    expect(l().kidPts['Léo']).toBe(2);
  });
});

describe('e sem servidor a casa continua a contar', () => {
  // O `feitas` só se escreve quando há linha do outro lado. Numa casa local
  // ficava a zero para sempre — trocar um defeito por outro pior.
  it('conta o que está feito hoje', () => {
    const l = loja();
    TestRenderer.act(() => {
      l().set({ clearedSeeds: true, feitas: {}, pending: {}, vaultMoves: [], paidPts: {},
        newTasks: [{ id: 'x', title: 'Levar o lixo', who: 'Léo', pts: 2, recur: 'Todos os dias' }],
        done: { x: true } });
    });
    expect(l().kidPts['Léo']).toBe(2);
  });

  it('⚠ e não conta o que a criança marcou à espera de confirmação', () => {
    const l = loja();
    TestRenderer.act(() => {
      l().set({ clearedSeeds: true, feitas: {}, vaultMoves: [], paidPts: {},
        newTasks: [{ id: 'x', title: 'Levar o lixo', who: 'Léo', pts: 2, recur: 'Todos os dias' }],
        done: { x: true }, pending: { x: true } });
    });
    expect(l().kidPts['Léo']).toBe(0);
  });
});

describe('⚠ e o que fica por pagar nunca é um número impossível', () => {
  it('ganhos menos pagos, e as duas metades são de sempre', () => {
    const l = loja();
    comServidor(l, {
      't-lixo|2026-09-05': { id: 'a', confirmada: true },
      't-lixo|2026-09-06': { id: 'b', confirmada: true },
    });
    TestRenderer.act(() => { l().set({ paidPts: { 'Léo': 2 } }); });
    // 4 ganhos − 2 pagos = 2 por pagar.
    expect(l().kidPts['Léo'] - (l().s.paidPts['Léo'] || 0)).toBe(2);
  });

  it('e o ecrã não mostra um valor negativo quando não há nada a pagar', () => {
    const fs = require('fs');
    const path = require('path');
    const cofre = fs.readFileSync(path.join(__dirname, '..', 'src', 'sheets', 'Cofre.jsx'), 'utf8');
    // Uma confirmação retirada DEPOIS de a semanada sair deixa o valor
    // negativo, e é um caso real. O botão diz «Nada por pagar» em vez de
    // «Pagar Semanada · −1,00 €».
    expect(cofre).toMatch(/porPagar > 0 \? `Pagar Semanada · \$\{EUR\(porPagar\)\}` : 'Nada por pagar'/);
  });
});
