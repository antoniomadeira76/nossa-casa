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

// ── Os artigos da lista de compras ──────────────────────────────────────────
//
// O mesmo andaime sem obra: `itemGone` estava no estado e no filtro do
// `allItems` desde sempre, e nada o escrevia. Um artigo posto por engano ficava
// na lista até alguém fechar a conta com ele dentro.
//
// (Os EQUIPAMENTOS já tinham — «Remover Equipamento» na ficha, com confirmação
// e ligado ao `removeEquip`. Não precisaram de nada.)

describe('apagar um artigo de compras', () => {
  const CASA_C = (extra = {}) => ({
    membros: { 'Rita': { initial: 'R', fem: true } },
    roles: { 'Rita': 'admin' },
    clearedSeeds: true,
    newItems: [{ id: 'a1', s: 0, label: 'Maçã reineta · 1,5 kg', est: 3.4, by: 'Adicionado por Rita' }],
    status: {}, precoPago: {},
    ...extra,
  });

  it('sai da lista', () => {
    const c = loja(CASA_C());
    expect(c.st.allItems().map(i => i.id)).toContain('a1');
    TestRenderer.act(() => { c.st.removerArtigo('a1'); });
    expect(c.st.allItems().map(i => i.id)).not.toContain('a1');
  });

  it('um criado na app sai mesmo do `newItems`', () => {
    const c = loja(CASA_C());
    TestRenderer.act(() => { c.st.removerArtigo('a1'); });
    expect(c.st.s.newItems).toHaveLength(0);
    expect(c.st.s.itemGone.a1).toBeFalsy();
  });

  it('leva os rascunhos desta ida às compras', () => {
    const c = loja(CASA_C({ status: { a1: 'done' }, precoPago: { a1: 3.29 } }));
    TestRenderer.act(() => { c.st.removerArtigo('a1'); });
    expect(c.st.s.status.a1).toBeUndefined();
    expect(c.st.s.precoPago.a1).toBeUndefined();
  });

  it('⚠ mas o histórico de PREÇOS fica', () => {
    // É o que a casa aprendeu sobre quanto custa uma coisa e onde — o mesmo
    // princípio dos pontos de uma tarefa apagada. Aqui é grátis: o `precos` é
    // indexado pelo RÓTULO e não pelo id, portanto apagar por id nunca lhe
    // toca. A prova está aqui para que continue assim.
    const precos = [{ artigo: 'maca-reineta', loja: 'Pingo Doce', valor: 3.29, dia: 'd2026-08-30' }];
    const c = loja(CASA_C({ precos }));
    TestRenderer.act(() => { c.st.removerArtigo('a1'); });
    expect(c.st.s.precos).toEqual(precos);
  });

  it('fica escrito no registo da casa', () => {
    const c = loja(CASA_C());
    TestRenderer.act(() => { c.st.removerArtigo('a1'); });
    expect(c.st.s.registo[0].t).toContain('Maçã reineta');
  });

  it('apagar um que não existe não faz nada', () => {
    const c = loja(CASA_C());
    const antes = c.st.s.registo.length;
    TestRenderer.act(() => { c.st.removerArtigo('nao-existe'); });
    expect(c.st.s.registo.length).toBe(antes);
  });

  describe('a interface', () => {
    const fs = require('fs');
    const path = require('path');
    const semComentarios = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'screens', 'Compras.jsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').map(l => l.replace(/(^|\s)\/\/.*$/, '')).join('\n');

    it('⚠ pergunta antes de apagar', () => {
      expect(semComentarios).not.toMatch(/onPress=\{\(\) => removerArtigo/);
      expect(semComentarios).toMatch(/setAApagar\(i\.id\)/);
      expect(semComentarios).toMatch(/<Confirm/);
      expect(semComentarios).toMatch(/destructive/);
    });

    it('a linha continua a alternar apanhado/por apanhar', () => {
      // O caixote é um alvo À PARTE, na borda. Se a linha passasse a apagar,
      // a lista deixava de servir para o que serve.
      expect(semComentarios).toMatch(/onPress=\{\(\) => toggle\(i\.id\)\}/);
    });

    it('e a pergunta diz que os preços ficam', () => {
      expect(semComentarios).toMatch(/a comparação entre lojas não se perde/);
    });
  });
});

describe('os equipamentos já tinham — e continuam a ter', () => {
  const fs = require('fs');
  const path = require('path');
  const ficha = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'sheets', 'FichaEquipamento.jsx'), 'utf8');

  it('há um «Remover Equipamento», com confirmação', () => {
    expect(ficha).toMatch(/label="Remover Equipamento"/);
    expect(ficha).toMatch(/<Confirm/);
    expect(ficha).toMatch(/removeEquip\(equip\.id\)/);
  });
});
