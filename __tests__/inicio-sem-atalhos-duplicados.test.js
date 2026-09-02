/**
 * O Início não repete o rodapé.
 *
 * ── A decisão ────────────────────────────────────────────────────────────────
 *
 * O Início abria com dois botões, «Compras» e «Tarefas». O `onPress` deles era
 * `go('compras')` e `go('tarefas')` — o MESMO dos separadores do rodapé, que
 * estão sempre visíveis 580 px abaixo. Sem contagem, sem filtro, sem estado:
 * não levavam a uma vista diferente, levavam à mesma.
 *
 * Ocupavam 76 px (52 de altura mais o espaçamento) no topo do ecrã, ACIMA do
 * «Precisa de Si» — que é a razão de existir do Início. O primeiro ecrã da app
 * abria com dois botões que não diziam nada e empurrava para baixo o que diz
 * tudo. Saíram por decisão do dono da casa, em 02/09/2026.
 *
 * ── Porque é que isto precisa de uma prova ───────────────────────────────────
 *
 * ⚠ Porque a remoção AFASTA-SE DO PROTÓTIPO. As referências 04 e 22 mostram os
 * dois botões, e o CLAUDE.md diz que quando o protótipo e o código discordam o
 * protótipo ganha. Quem vier comparar vai encontrar uma falta e vai querer
 * repô-la — de boa fé, e a seguir a regra.
 *
 * Esta prova é o sítio onde essa boa fé dá de caras com a decisão. Se voltarem,
 * isto falha e o comentário no `Inicio.jsx` explica porquê.
 *
 * Se um dia voltarem, que voltem como AÇÕES — «Nova tarefa», «Acrescentar à
 * lista» — que poupam dois passos. Navegar para onde o rodapé já leva poupa
 * zero, e é isso que esta prova impede.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider } = require('../src/store');
const { buildTheme } = require('../src/theme');
const Inicio = require('../src/screens/Inicio').default;

const desenhar = () => {
  let r = null;
  const t = buildTheme('violet', false);
  TestRenderer.act(() => {
    r = TestRenderer.create(React.createElement(SafeAreaProvider,
      { initialMetrics: { frame: { x: 0, y: 0, width: 412, height: 915 },
                          insets: { top: 47, left: 0, right: 0, bottom: 34 } } },
      React.createElement(StoreProvider, null,
        React.createElement(Inicio, { t, user: 'Rita', go: () => {}, onAbrir: null,
          onSaude: () => {}, onEquip: () => {}, onClose: () => {} }))));
  });
  return r;
};

// Todo o tocável do ecrã, com o rótulo que anuncia.
const tocaveis = (r) => r.root
  .findAll(n => n.props && typeof n.props.onPress === 'function' && n.props.accessibilityLabel)
  .map(n => n.props.accessibilityLabel);

describe('⚠ o Início não repete destinos do rodapé', () => {
  it('não há botão nenhum que se chame «Compras» ou «Tarefas»', () => {
    const repetidos = tocaveis(desenhar()).filter(x => x === 'Compras' || x === 'Tarefas');
    expect(repetidos).toEqual([]);
  });

  it('e a sonda vê os outros tocáveis — senão a prova acima não vale nada', () => {
    // Uma lista vazia de tocáveis faria a primeira prova passar sozinha,
    // qualquer que fosse o ecrã.
    expect(tocaveis(desenhar()).length).toBeGreaterThan(0);
  });

  it('o «Precisa de Si» continua a ser a primeira secção', () => {
    // É o que os 76 px libertados servem. Se alguém puser outra coisa à
    // frente, isto diz-lhe que o lugar já tem dono.
    const junta = (n) => {
      if (n === null || n === undefined || n === false) return '';
      if (typeof n === 'string' || typeof n === 'number') return String(n);
      if (Array.isArray(n)) return n.map(junta).join(' ');
      return junta(n.children || (n.props && n.props.children) || null);
    };
    const texto = junta(desenhar().toJSON());
    expect(texto).toContain('Precisa de Si');
    expect(texto.indexOf('Precisa de Si')).toBeLessThan(texto.indexOf('Agenda de Hoje'));
  });
});
