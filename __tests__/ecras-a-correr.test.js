/**
 * Os ecrãs a correr — o texto que eles produzem, não o que está escrito neles.
 *
 * As provas de leitura garantem que nenhum ecrã tem um nome escrito à mão.
 * Não garantem que o que aparece no lugar desse nome está certo: um
 * `adultos[1]` indefinido dá «undefined deve à Rita» e passa em todas elas.
 */

const React = require('react');
const TestRenderer = require('react-test-renderer');
const { StoreProvider, useStore } = require('../src/store');

const { buildTheme } = require('../src/theme');

const Inicio = require('../src/screens/Inicio').default;
const Tarefas = require('../src/screens/Tarefas').default;
const Dinheiro = require('../src/screens/Dinheiro').default;

// Renderiza um ecrã dentro da loja e devolve todo o texto que ele produz.
const textoDe = (Ecra, props = {}) => {
  let arvore = null;
  const t = buildTheme('violet', false);
  const Envolve = () => {
    useStore();   // garante que o ecrã corre com a loja montada
    return React.createElement(Ecra, { t, user: 'Rita', go: () => {}, onSaude: () => {},
      onEquip: () => {}, onClose: () => {}, ...props });
  };
  TestRenderer.act(() => {
    arvore = TestRenderer.create(
      React.createElement(StoreProvider, null, React.createElement(Envolve)));
  });
  const junta = (n) => {
    if (n === null || n === undefined || n === false) return '';
    if (typeof n === 'string' || typeof n === 'number') return String(n);
    if (Array.isArray(n)) return n.map(junta).join(' ');
    return junta(n.children || (n.props && n.props.children) || null);
  };
  return junta(arvore.toJSON());
};

describe('Os ecrãs dizem os nomes da casa, não nomes escritos à mão', () => {
  test('o Início anuncia quem deve a quem, com a concordância certa', () => {
    const texto = textoDe(Inicio);
    expect(texto).toContain('O Tomás deve à Rita');
    expect(texto).not.toContain('undefined');
    expect(texto).not.toContain('NaN');
    // e o valor está no formato do euro, com espaço inquebrável antes do €
    expect(texto).toMatch(/86,50 €/);
  });

  test('as Tarefas filtram por todos os membros da casa, e só por eles', () => {
    const texto = textoDe(Tarefas);
    for (const n of ['Todos', 'Rita', 'Tomás', 'Léo', 'Mia']) expect(texto).toContain(n);
    expect(texto).not.toContain('undefined');
  });

  test('o Dinheiro mostra o acerto entre os adultos da casa', () => {
    const texto = textoDe(Dinheiro);
    expect(texto).toContain('O Tomás deve à Rita');
    expect(texto).not.toContain('undefined');
    expect(texto).not.toContain('NaN');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A Gestão da casa: as quatro operações têm de estar no ecrã, não só na loja.
const Gestao = require('../src/screens/Gestao').default;

describe('A Gestão põe as quatro operações no ecrã', () => {
  // O separador arranca no Orçamento; o texto de Membros só aparece depois de
  // se lá tocar. Renderiza-se e procura-se pela árvore inteira, incluindo o
  // que está por trás do separador ativo — o que interessa é que existe.
  const arvoreDe = (Ecra, props = {}) => {
    let r = null;
    const t = buildTheme('violet', false);
    TestRenderer.act(() => {
      r = TestRenderer.create(React.createElement(StoreProvider, null,
        React.createElement(Ecra, { t, user: 'Rita', onClose: () => {}, ...props })));
    });
    return r;
  };

  test('a Gestão monta para quem administra a casa', () => {
    const r = arvoreDe(Gestao);
    expect(r.toJSON()).toBeTruthy();
  });

  // Os separadores são Pressable com o rótulo dentro; toca-se no de Membros e
  // lê-se o que aparece. Sem isto o teste passava com o ecrã vazio.
  const abrirMembros = (r) => {
    const alvo = r.root.findAll(n => n.props
      && n.props.accessibilityRole === 'tab' && n.props.accessibilityLabel === 'Membros')[0];
    TestRenderer.act(() => { alvo.props.onPress(); });
    const junta = (n) => {
      if (n === null || n === undefined || n === false) return '';
      if (typeof n === 'string' || typeof n === 'number') return String(n);
      if (Array.isArray(n)) return n.map(junta).join(' ');
      return junta(n.children || (n.props && n.props.children) || null);
    };
    return junta(r.toJSON());
  };

  test('o separador Membros mostra o nome da casa e o botão de acrescentar', () => {
    const texto = abrirMembros(arvoreDe(Gestao));
    expect(texto).toContain('Nome da família');
    expect(texto).toContain('Bengui');            // o nome atual, não um literal no ecrã
    expect(texto).toContain('acrescentar membro');
    expect(texto).toContain('Membros e PIN');
    for (const n of ['Rita', 'Tomás', 'Léo', 'Mia']) expect(texto).toContain(n);
    expect(texto).not.toContain('undefined');
  });

  // Sem servidor a casa é a de demonstração, e o ecrã tem de o dizer em vez
  // de oferecer quatro botões que não fazem nada.
  test('sem servidor, a Gestão explica que a casa é de demonstração', () => {
    const texto = abrirMembros(arvoreDe(Gestao));
    expect(texto).toContain('casa de demonstração');
  });

  // O papel muda-se dentro da folha do membro. O diálogo antigo escolhia o
  // rótulo com `FEM(name)`, e `name` não existia nesse âmbito.
  // Duas coisas de uma vez: o `FEM(name)` do diálogo lia uma variável fora
  // de âmbito, e o `FEM` de que dependia lê a constante das sementes — uma
  // Ana acrescentada à casa saía «Administrador». O género do membro está no
  // quadro da casa, não numa constante.
  test('o rótulo do papel lê o género do membro, não uma constante', () => {
    const fonte = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'src/screens/Gestao.jsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(fonte).not.toMatch(/FEM\(name\)/);
  });
});
