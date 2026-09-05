/**
 * Arrastar uma tarefa: a mão manda DENTRO do grupo de urgência.
 *
 * ── O que se prova aqui, e o que não ─────────────────────────────────────────
 *
 * O gesto em si — a pressão longa a armar, o dedo a mover, o `PanResponder` a
 * tomar conta do toque — só se verifica a arrastar num navegador, e foi lá que
 * se verificou. Duas coisas que só aparecem a arrastar, e que estão escritas no
 * `ListaArrastavel.jsx` onde a correção vive:
 *
 *   a captura     `onMoveShouldSetPanResponder` sozinho não chegava. A pressão
 *                 longa armava — a borda do cartão mudava para o acento — e o
 *                 arrasto não fazia nada, porque quando o dedo desce é o
 *                 `Pressable` do cartão que fica responsável, e a pergunta de
 *                 subida só é feita a quem NÃO é responsável. A captura é o
 *                 único sítio onde um ascendente tira o dedo a um descendente.
 *   o fecho velho o `PanResponder` é criado UMA vez e fechava sobre os `itens`
 *                 do primeiro desenho — vazios numa casa sem tarefas. Arrastar
 *                 a quinta linha ia buscar `itens[4]` a um array de zero:
 *                 «Cannot read properties of undefined (reading 'urgency')».
 *                 O cartão movia-se (isso é só o `Animated.Value`) e ao largar
 *                 não acontecia nada — parecia que a ordem não se guardava.
 *
 * O que se prova aqui é a parte que é aritmética: as fronteiras, o salto, a
 * ordem que sai, e o que a loja grava. Essa não precisa de um dedo.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { StoreProvider, useStore, DEMO } = require('../src/store');
const {
  limitesDoGrupo, destinoDoArrasto, grupoReordenado,
} = require('../src/ListaArrastavel');

// Uma lista com três grupos, como a das Tarefas: urgentes, normais, sem pressa.
const LISTA = [
  { id: 'u1', urg: 0 }, { id: 'u2', urg: 0 },
  { id: 'n1', urg: 1 }, { id: 'n2', urg: 1 }, { id: 'n3', urg: 1 },
  { id: 's1', urg: 2 },
];
const grupoDe = (x) => x.urg;

describe('as fronteiras do grupo', () => {
  it('um índice no meio do grupo dá o primeiro e o último dele', () => {
    expect(limitesDoGrupo(LISTA, 3, grupoDe)).toEqual([2, 4]);
  });

  it('o primeiro da lista não procura para trás do zero', () => {
    expect(limitesDoGrupo(LISTA, 0, grupoDe)).toEqual([0, 1]);
  });

  it('o último não procura para além do fim', () => {
    expect(limitesDoGrupo(LISTA, 5, grupoDe)).toEqual([5, 5]);
  });

  it('⚠ e uma lista vazia não rebenta — devolve o próprio índice', () => {
    // É a rede do defeito do fecho velho: o responsável chegou a ser chamado
    // com um índice de uma lista que já não era aquela.
    expect(limitesDoGrupo([], 4, grupoDe)).toEqual([4, 4]);
    expect(limitesDoGrupo(undefined, 2, grupoDe)).toEqual([2, 2]);
  });
});

describe('⚠ o destino está preso ao grupo', () => {
  const PASSO = 92;   // altura do cartão mais o espaçamento

  it('um passo para cima anda um lugar', () => {
    expect(destinoDoArrasto(4, -PASSO, PASSO, 2, 4)).toBe(3);
  });

  it('e meio passo não anda nenhum', () => {
    expect(destinoDoArrasto(4, -PASSO * 0.4, PASSO, 2, 4)).toBe(4);
  });

  it('⚠ empurrar uma normal MUITO para cima pára no topo das normais', () => {
    // Medido no navegador: a «Máquina de roupa» com 400 px de arrasto para
    // cima ficou na 3.ª, que é o primeiro lugar do grupo dela. Não passou as
    // duas urgentes.
    expect(destinoDoArrasto(4, -400, PASSO, 2, 4)).toBe(2);
    expect(destinoDoArrasto(4, -99999, PASSO, 2, 4)).toBe(2);
  });

  it('⚠ e empurrar uma urgente MUITO para baixo pára no fim das urgentes', () => {
    expect(destinoDoArrasto(0, 400, PASSO, 0, 1)).toBe(1);
  });

  it('um passo de zero não divide por zero', () => {
    expect(Number.isFinite(destinoDoArrasto(1, 50, 0, 0, 3))).toBe(true);
  });
});

describe('a ordem que sai do gesto', () => {
  it('subir a última do grupo põe-na à frente das outras', () => {
    expect(grupoReordenado(LISTA, 4, 2, grupoDe)).toEqual(['n3', 'n1', 'n2']);
  });

  it('descer a primeira do grupo põe-na no fim', () => {
    expect(grupoReordenado(LISTA, 2, 4, grupoDe)).toEqual(['n2', 'n3', 'n1']);
  });

  it('e só saem os identificadores do grupo — nunca os dos outros', () => {
    for (const i of [0, 1, 2, 3, 4, 5]) {
      const [min, max] = limitesDoGrupo(LISTA, i, grupoDe);
      const ids = grupoReordenado(LISTA, i, min, grupoDe);
      const doGrupo = new Set(LISTA.slice(min, max + 1).map(x => x.id));
      expect(ids.every(id => doGrupo.has(id))).toBe(true);
      expect(ids.length).toBe(doGrupo.size);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠ o que a loja grava', () => {
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

  const casa = (nomes, urg) => ({
    ...DEMO(),
    clearedSeeds: true,
    newTasks: nomes.map(n => ({ id: n, title: n, who: 'Rita', pts: 1 })),
    urg: urg || {}, due: {}, taskOrder: {},
    taskGone: {}, taskEdits: {}, done: {}, pending: {}, rotate: {},
  });

  const ordem = (loja) => loja().allTasks().map(t => t.id);
  const chamar = (loja, ids) => {
    let r;
    TestRenderer.act(() => { r = loja().reordenarTarefas(ids); });
    return r;
  };

  it('reordenar um grupo muda a lista, e só esse grupo', () => {
    const loja = comLoja(casa(['u1', 'u2', 'n1', 'n2', 'n3'],
      { u1: 0, u2: 0, n1: 1, n2: 1, n3: 1 }));
    expect(ordem(loja)).toEqual(['u1', 'u2', 'n1', 'n2', 'n3']);
    expect(chamar(loja, ['n3', 'n1', 'n2'])).toBeNull();
    expect(ordem(loja)).toEqual(['u1', 'u2', 'n3', 'n1', 'n2']);
  });

  it('e fica gravado por grupo — os postos recomeçam em cada um', () => {
    const loja = comLoja(casa(['u1', 'u2', 'n1', 'n2'], { u1: 0, u2: 0, n1: 1, n2: 1 }));
    chamar(loja, ['u2', 'u1']);
    chamar(loja, ['n2', 'n1']);
    // ⚠ Contam de UM, e não de zero. Não é uma preferência: o `posto` da linha
    // da tarefa é um `number` do PocketBase, que não é anulável — escrever
    // `null` guarda 0, e uma tarefa nunca arrastada também nasce a 0. Com
    // postos a contar de zero, o grupo inteiro lia-se empatado em primeiro
    // lugar e a lista saía por ordem qualquer.
    //
    // A loja conta como o servidor de propósito: com um lado a contar de zero e
    // o outro de um, a lista mudava de ordem na primeira leitura.
    expect(loja().s.taskOrder).toEqual({ u2: 1, u1: 2, n2: 1, n1: 2 });
  });

  it('⚠ recusa atravessar grupos, e diz porquê', () => {
    const loja = comLoja(casa(['u1', 'n1'], { u1: 0, n1: 1 }));
    expect(chamar(loja, ['n1', 'u1']))
      .toBe('A ordem só se muda dentro do mesmo grupo de urgência.');
    expect(loja().s.taskOrder).toEqual({});
  });

  it('e recusa uma tarefa que não existe, ou repetida', () => {
    const loja = comLoja(casa(['n1', 'n2'], {}));
    expect(chamar(loja, ['n1', 'fantasma'])).toBe('Essa tarefa não existe nesta casa.');
    expect(chamar(loja, ['n1', 'n1'])).toBe('A mesma tarefa aparece duas vezes na ordem.');
  });

  it('uma lista de uma só não é erro — é não haver nada a fazer', () => {
    const loja = comLoja(casa(['n1', 'n2'], {}));
    expect(chamar(loja, ['n1'])).toBeNull();
    expect(loja().s.taskOrder).toEqual({});
  });

  it('⚠ arrastar na página 1 não desarruma a página 2', () => {
    // É a razão de não haver página para virar. `reordenarTarefas` recebe só o
    // que estava à vista e percorre o grupo INTEIRO, pondo as arrastadas nos
    // lugares que eram delas. As de fora ficam onde estavam.
    const loja = comLoja(casa(['n1', 'n2', 'n3', 'n4', 'n5', 'n6'], {}));
    expect(ordem(loja)).toEqual(['n1', 'n2', 'n3', 'n4', 'n5', 'n6']);
    // A «página 1» são as cinco primeiras; troca-se lá dentro.
    expect(chamar(loja, ['n5', 'n1', 'n2', 'n3', 'n4'])).toBeNull();
    const depois = ordem(loja);
    expect(depois.slice(0, 5)).toEqual(['n5', 'n1', 'n2', 'n3', 'n4']);
    expect(depois[5]).toBe('n6');          // a da página 2 nem se mexeu
  });

  it('⚠ e reordenar uma vista FILTRADA não estraga quem não está à vista', () => {
    // Com o filtro num membro, `ids` é um subconjunto do grupo. Escrever
    // postos só ao subconjunto deixava o resto sem posto — e sem posto vai
    // para o fim do grupo, portanto metade da lista saltava ao tirar o filtro.
    const loja = comLoja({
      ...DEMO(), clearedSeeds: true,
      newTasks: [
        { id: 'r1', title: 'r1', who: 'Rita', pts: 1 },
        { id: 't1', title: 't1', who: 'Tomás', pts: 1 },
        { id: 'r2', title: 'r2', who: 'Rita', pts: 1 },
        { id: 't2', title: 't2', who: 'Tomás', pts: 1 },
      ],
      urg: {}, due: {}, taskOrder: {},
      taskGone: {}, taskEdits: {}, done: {}, pending: {}, rotate: {},
    });
    expect(ordem(loja)).toEqual(['r1', 't1', 'r2', 't2']);
    // A vista da Rita mostra r1 e r2; trocam-se.
    expect(chamar(loja, ['r2', 'r1'])).toBeNull();
    // Os lugares da Rita eram o 1.º e o 3.º, e é lá que ela fica trocada.
    // O Tomás não se mexeu de nenhum dos seus.
    expect(ordem(loja)).toEqual(['r2', 't1', 'r1', 't2']);
  });

  it('e o posto da mão ganha ao prazo, que é o que «a mão manda» quer dizer', () => {
    const loja = comLoja({
      ...DEMO(), clearedSeeds: true,
      newTasks: [{ id: 'cedo', title: 'cedo', who: 'Rita', pts: 1 },
                 { id: 'tarde', title: 'tarde', who: 'Rita', pts: 1 }],
      urg: {}, taskOrder: {},
      due: { cedo: { key: 'd2026-09-03', time: '09:00' },
             tarde: { key: 'd2026-09-30', time: '09:00' } },
      taskGone: {}, taskEdits: {}, done: {}, pending: {}, rotate: {},
    });
    expect(ordem(loja)).toEqual(['cedo', 'tarde']);      // pelo prazo
    chamar(loja, ['tarde', 'cedo']);
    expect(ordem(loja)).toEqual(['tarde', 'cedo']);      // pela mão
  });

  it('⚠ e apagar uma tarefa leva o posto dela', () => {
    // Um posto órfão ficava no disco a apontar para uma tarefa que já não
    // existe, e uma nova com o mesmo id herdava-o.
    const loja = comLoja(casa(['n1', 'n2'], {}));
    chamar(loja, ['n2', 'n1']);
    expect(Object.keys(loja().s.taskOrder).sort()).toEqual(['n1', 'n2']);
    TestRenderer.act(() => { loja().removerTarefa('n1'); });
    expect(Object.keys(loja().s.taskOrder)).toEqual(['n2']);
  });
});
