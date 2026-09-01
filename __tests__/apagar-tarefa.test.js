/**
 * Apagar uma tarefa.
 *
 * Não havia como. Havia `taskGone` no estado e no filtro do `allTasks` desde
 * sempre, e NADA o escrevia: uma tarefa criada por engano ficava na casa para
 * sempre, e a folha de gestão só oferecia urgência, prazo e responsável.
 *
 * ── ⚠ O que NÃO pode sair com ela ────────────────────────────────────────────
 *
 * Os pontos. O `kidPts` soma sobre `allTasks()`, que filtra as apagadas —
 * apagar uma tarefa já FEITA tirava à criança pontos que ela ganhou. Pior: se
 * já tivessem sido pagos, o `kidPts - paidPts` ficava NEGATIVO e a criança
 * passava a dever pontos à casa por causa de uma arrumação de um adulto.
 *
 * É o INVARIANTE #2 visto pelo lado do apagar: um saldo não muda porque um
 * registo desapareceu. O livro é aditivo — apagar ESCREVE um movimento.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');

jest.mock('../src/pocketbase', () => ({
  estaLigado: () => false,
  auth: { valida: () => false, membro: () => null },
  ler: {},
  google: { disponivel: () => false, porLigar: () => false, verificar: async () => false },
}));

const { StoreProvider, useStore } = require('../src/store');

// Uma casa com um adulto, uma criança, e uma tarefa da criança que vale 5.
const CASA = (extra = {}) => ({
  membros: { 'Rita': { initial: 'R', fem: true }, 'Léo': { initial: 'L', kid: true } },
  roles: { 'Rita': 'admin', 'Léo': 'crianca' },
  clearedSeeds: true,          // sem a semente, para as contas serem só destas
  newTasks: [{ id: 'x1', title: 'Pôr o lixo', who: 'Léo', recur: 'Uma vez', pts: 5 }],
  urg: { x1: 1 },
  due: {},
  done: {},
  paidPts: { 'Léo': 0 },
  ...extra,
});

const montadas = [];
const loja = (casa = CASA()) => {
  const cofre = {};
  const Envolve = () => {
    const st = useStore();
    cofre.st = st;
    React.useMemo(() => st.set(casa), []);
    return null;
  };
  let a = null;
  TestRenderer.act(() => {
    a = TestRenderer.create(
      React.createElement(StoreProvider, null, React.createElement(Envolve)));
  });
  montadas.push(a);
  return cofre;
};

afterEach(() => {
  TestRenderer.act(() => { montadas.forEach(a => a.unmount()); });
  montadas.length = 0;
});

describe('a tarefa sai', () => {
  it('deixa de estar na lista', () => {
    const c = loja();
    expect(c.st.allTasks().map(t => t.id)).toContain('x1');
    TestRenderer.act(() => { c.st.removerTarefa('x1'); });
    expect(c.st.allTasks().map(t => t.id)).not.toContain('x1');
  });

  it('e uma criada na app sai mesmo do `newTasks`, não fica marcada', () => {
    // Marcar em vez de remover deixava a linha lá para sempre, a crescer a
    // cada tarefa apagada.
    const c = loja();
    TestRenderer.act(() => { c.st.removerTarefa('x1'); });
    expect(c.st.s.newTasks.map(t => t.id)).not.toContain('x1');
    expect(c.st.s.taskGone.x1).toBeFalsy();
  });

  it('leva consigo os mapas que só lhe diziam respeito', () => {
    const c = loja(CASA({ urg: { x1: 0 }, due: { x1: { key: 'd2026-09-01', time: '18:00' } },
      taskEdits: { x1: { who: 'Rita' } }, rotate: { x1: true } }));
    TestRenderer.act(() => { c.st.removerTarefa('x1'); });
    for (const m of ['urg', 'due', 'taskEdits', 'rotate', 'done', 'pending']) {
      expect(c.st.s[m].x1).toBeUndefined();
    }
  });

  it('fica escrito no registo da casa, com o nome dela', () => {
    const c = loja();
    TestRenderer.act(() => { c.st.removerTarefa('x1'); });
    expect(c.st.s.registo[0].t).toContain('Pôr o lixo');
    expect(c.st.s.registo[0].t).toContain('apagada');
  });

  it('apagar uma que não existe não faz nada', () => {
    const c = loja();
    const antes = c.st.s.registo.length;
    TestRenderer.act(() => { c.st.removerTarefa('nao-existe'); });
    expect(c.st.s.registo.length).toBe(antes);
    expect(c.st.allTasks().map(t => t.id)).toContain('x1');
  });
});

describe('⚠ os pontos NÃO saem com ela (INVARIANTE #2)', () => {
  it('uma tarefa FEITA deixa os pontos com a criança', () => {
    const c = loja(CASA({ done: { x1: true } }));
    expect(c.st.kidPts['Léo']).toBe(5);
    TestRenderer.act(() => { c.st.removerTarefa('x1'); });
    expect(c.st.kidPts['Léo']).toBe(5);
  });

  it('e escreve um MOVIMENTO, em vez de reescrever a soma', () => {
    const c = loja(CASA({ done: { x1: true } }));
    TestRenderer.act(() => { c.st.removerTarefa('x1'); });
    const l = c.st.s.pontosDeTarefasApagadas;
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ quem: 'Léo', pts: 5, titulo: 'Pôr o lixo' });
  });

  it('⚠ com os pontos JÁ PAGOS, o saldo não fica negativo', () => {
    // Era o pior caso: o `kidPts - paidPts` ia a -5 e a criança passava a
    // dever pontos à casa por causa de uma arrumação de um adulto.
    const c = loja(CASA({ done: { x1: true }, paidPts: { 'Léo': 5 } }));
    expect(c.st.kidPts['Léo'] - c.st.s.paidPts['Léo']).toBe(0);
    TestRenderer.act(() => { c.st.removerTarefa('x1'); });
    expect(c.st.kidPts['Léo'] - c.st.s.paidPts['Léo']).toBe(0);
  });

  it('uma tarefa POR FAZER não deixa pontos nenhuns', () => {
    // Nada foi ganho, nada há a guardar. Um movimento a zero seria uma linha
    // no livro a dizer que não aconteceu nada.
    const c = loja();
    TestRenderer.act(() => { c.st.removerTarefa('x1'); });
    expect(c.st.s.pontosDeTarefasApagadas).toHaveLength(0);
    expect(c.st.kidPts['Léo']).toBe(0);
  });

  it('e uma tarefa de ADULTO também não — os pontos são das crianças', () => {
    const c = loja(CASA({
      newTasks: [{ id: 'x2', title: 'Máquina de roupa', who: 'Rita', pts: 5 }],
      done: { x2: true },
    }));
    TestRenderer.act(() => { c.st.removerTarefa('x2'); });
    expect(c.st.s.pontosDeTarefasApagadas).toHaveLength(0);
  });

  it('apagar duas tarefas feitas guarda as duas', () => {
    const c = loja(CASA({
      newTasks: [{ id: 'x1', title: 'Lixo', who: 'Léo', pts: 5 },
                 { id: 'x2', title: 'Mesa', who: 'Léo', pts: 3 }],
      done: { x1: true, x2: true },
    }));
    expect(c.st.kidPts['Léo']).toBe(8);
    TestRenderer.act(() => { c.st.removerTarefa('x1'); });
    TestRenderer.act(() => { c.st.removerTarefa('x2'); });
    expect(c.st.kidPts['Léo']).toBe(8);
    expect(c.st.s.pontosDeTarefasApagadas).toHaveLength(2);
  });
});

describe('o livro é gravado', () => {
  const fs = require('fs');
  const path = require('path');
  const fonte = fs.readFileSync(path.join(__dirname, '..', 'src', 'store.jsx'), 'utf8');

  it('⚠ `pontosDeTarefasApagadas` está nas DATA_KEYS', () => {
    // Fora dali, o livro morria ao recarregar a app e os pontos guardados
    // desapareciam no arranque seguinte — o defeito de volta, mais tarde e
    // mais difícil de ver.
    const lista = fonte.slice(fonte.indexOf('const DATA_KEYS = ['),
      fonte.indexOf(']', fonte.indexOf('const DATA_KEYS = [')));
    expect(lista).toContain("'pontosDeTarefasApagadas'");
  });

  it('e nasce vazio numa casa nova', () => {
    const { DEMO } = require('../src/store');
    if (DEMO) expect(DEMO().pontosDeTarefasApagadas).toEqual([]);
  });
});

describe('a interface', () => {
  const fs = require('fs');
  const path = require('path');
  const semComentarios = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'screens', 'Tarefas.jsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.replace(/(^|\s)\/\/.*$/, '')).join('\n');

  it('⚠ não apaga ao toque — pergunta primeiro', () => {
    expect(semComentarios).not.toMatch(/onPress=\{\(\) => removerTarefa/);
    expect(semComentarios).toMatch(/setAApagar\(task\.id\)/);
    expect(semComentarios).toMatch(/<Confirm/);
    expect(semComentarios).toMatch(/destructive/);
  });

  it('o botão leva a cor de erro, e não a de ação', () => {
    const i = semComentarios.indexOf('Apagar Tarefa');
    const bloco = semComentarios.slice(Math.max(0, i - 600), i + 100);
    expect(bloco).toMatch(/borderColor: t\.state\.err/);
    expect(bloco).not.toMatch(/borderColor: t\.accent/);
  });

  it('e a pergunta diz o que a tarefa rendeu, quando rendeu', () => {
    // Quem apaga tem de saber ANTES de decidir que os pontos ficam, senão
    // hesita por uma razão que não existe.
    expect(semComentarios).toMatch(/pontosQueFicam/);
    expect(semComentarios).toMatch(/um ponto ganho não se desfaz/);
  });
});
