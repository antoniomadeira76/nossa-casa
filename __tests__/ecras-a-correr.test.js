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
