/**
 * A ordem da lista de tarefas.
 *
 * ── O INVARIANTE #6, e a metade que faltava ──────────────────────────────────
 *
 * «A urgência manda na ordem das tarefas: urgentes primeiro, normais depois,
 * sem pressa no fim.» Isso estava feito, com um `sort` de uma linha.
 *
 * O que não estava era a ordem DENTRO de cada grupo: era a de criação. Duas
 * tarefas normais, uma que acaba hoje às 18:00 e outra na semana que vem —
 * aparecia primeiro a que tinha sido escrita primeiro. O cabeçalho da secção
 * diz «por urgência», e dentro do grupo a ordem não era nada.
 *
 * Agora manda o prazo. E o prazo obriga a duas decisões que se provam aqui,
 * porque nenhuma delas é a única possível:
 *
 *     sem prazo      depois de quem tem — data marcada pesa mais
 *     dia sem hora   depois das que têm hora nesse dia — «para o dia 20»
 *                    acaba ao fim do dia 20
 *
 * ⚠ E a ordem é ESTÁVEL nos empates. Sem isso a lista podia trocar duas
 * tarefas de lugar entre dois desenhos sem nada ter mudado, que é o género de
 * defeito que ninguém consegue reproduzir.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { StoreProvider, useStore, DEMO } = require('../src/store');

const comLoja = (estado) => {
  let api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    TestRenderer.create(React.createElement(StoreProvider, null,
      React.createElement(Sonda)));
  });
  TestRenderer.act(() => { api.set(() => estado); });
  return () => api;
};

// Uma casa sem as tarefas de origem, para a lista ser só a desta prova.
const casa = (tarefas, urg, due) => ({
  ...DEMO(),
  clearedSeeds: true,
  newTasks: tarefas.map(nome => ({ id: nome, title: nome, who: 'Rita', pts: 1 })),
  urg: urg || {},
  due: due || {},
  taskGone: {}, taskEdits: {}, done: {}, pending: {}, rotate: {},
});

const ordem = (loja) => loja().allTasks().map(t => t.id);

describe('a urgência manda nos grupos (INVARIANTE #6)', () => {
  it('urgentes primeiro, normais depois, sem pressa no fim', () => {
    const loja = comLoja(casa(['a', 'b', 'c'], { a: 2, b: 0, c: 1 }));
    expect(ordem(loja)).toEqual(['b', 'c', 'a']);
  });

  it('e a urgência por omissão é normal, não urgente', () => {
    const loja = comLoja(casa(['a', 'b'], { a: 0 }));
    expect(ordem(loja)).toEqual(['a', 'b']);
    expect(loja().allTasks().find(t => t.id === 'b').urgency).toBe(1);
  });
});

describe('⚠ e o prazo manda dentro de cada grupo', () => {
  it('quem acaba primeiro aparece primeiro', () => {
    // Escritas ao contrário do prazo de propósito: se a ordem fosse a de
    // criação, isto sairia ['tarde', 'cedo'].
    const loja = comLoja(casa(['tarde', 'cedo'], {}, {
      tarde: { key: 'd2026-09-10', time: '09:00' },
      cedo: { key: 'd2026-09-03', time: '09:00' },
    }));
    expect(ordem(loja)).toEqual(['cedo', 'tarde']);
  });

  it('no mesmo dia, manda a hora', () => {
    const loja = comLoja(casa(['noite', 'manha'], {}, {
      noite: { key: 'd2026-09-03', time: '21:00' },
      manha: { key: 'd2026-09-03', time: '07:30' },
    }));
    expect(ordem(loja)).toEqual(['manha', 'noite']);
  });

  it('⚠ o prazo NÃO atravessa grupos — uma normal com prazo de hoje não passa uma urgente sem prazo', () => {
    // É a metade do invariante que o prazo não pode comer: a urgência decide o
    // grupo, e o prazo só decide dentro dele.
    const loja = comLoja(casa(['urgenteSemPrazo', 'normalParaHoje'],
      { urgenteSemPrazo: 0, normalParaHoje: 1 },
      { normalParaHoje: { key: 'd2026-09-02', time: '08:00' } }));
    expect(ordem(loja)).toEqual(['urgenteSemPrazo', 'normalParaHoje']);
  });
});

describe('as duas decisões que o prazo obrigou a tomar', () => {
  it('quem não tem prazo vem depois de quem tem', () => {
    const loja = comLoja(casa(['semPrazo', 'comPrazo'], {}, {
      comPrazo: { key: 'd2026-12-31', time: '23:00' },
    }));
    // Mesmo com o prazo no fim do ano, a que tem data vem à frente.
    expect(ordem(loja)).toEqual(['comPrazo', 'semPrazo']);
  });

  it('e um dia sem hora vem depois das horas desse dia', () => {
    const loja = comLoja(casa(['diaTodo', 'asSeis'], {}, {
      diaTodo: { key: 'd2026-09-03' },
      asSeis: { key: 'd2026-09-03', time: '18:00' },
    }));
    expect(ordem(loja)).toEqual(['asSeis', 'diaTodo']);
  });
});

describe('⚠ e a ordem é estável', () => {
  it('empatados, fica a ordem de criação', () => {
    const loja = comLoja(casa(['primeira', 'segunda', 'terceira']));
    expect(ordem(loja)).toEqual(['primeira', 'segunda', 'terceira']);
  });

  it('e chamar duas vezes dá a mesma lista', () => {
    // Um `sort` instável trocava dois empatados entre desenhos, e a lista
    // saltava sozinha sem nada ter mudado.
    const loja = comLoja(casa(['a', 'b', 'c', 'd', 'e'], { c: 0, d: 0 }));
    expect(ordem(loja)).toEqual(ordem(loja));
    expect(ordem(loja)).toEqual(['c', 'd', 'a', 'b', 'e']);
  });

  it('e o `allTasks` não deixa lixo interno nas tarefas', () => {
    // A ordenação estável usa um índice de criação temporário. Se ele
    // escapasse, ia para o estado e para o servidor.
    const loja = comLoja(casa(['a', 'b']));
    for (const t of loja().allTasks()) {
      expect(Object.keys(t)).not.toContain('_criacao');
    }
  });
});
