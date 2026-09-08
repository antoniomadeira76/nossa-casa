/**
 * No Modo Compras, os separadores por corredor ficam por cima da lista.
 *
 * ── O que se viu ─────────────────────────────────────────────────────────────
 *
 * Todas as vistas de ecrã inteiro eram filhas do ScrollView único do `App.jsx`.
 * No Modo Compras isso punha a linha da loja e a barra dos corredores a rolar
 * COM a lista: a sonda do varrimento de 08/09/2026 encontrou os cinco
 * separadores 564 px acima do ecrã, e para mudar de corredor era voltar ao
 * topo. No protótipo (bloco «isLoja») a barra é `flex:none` por cima de uma
 * área `overflow:auto` — fica parada, a lista rola por baixo.
 *
 * ── A forma ──────────────────────────────────────────────────────────────────
 *
 * A vista `loja` do registo do `App.jsx` tem `coluna: true`, e para essas o
 * App desenha a vista EM VEZ do ScrollView. O `ModoCompras` é dono da sua
 * coluna: a loja e os separadores em `flex: 0`, e um ScrollView próprio para o
 * carrinho, os artigos, o paginador e o botão. O cabeçalho e o rodapé ficam
 * onde estão — o INVARIANTE #1 não muda, e a prova do rodapé continua a valer.
 *
 * ⚠ O react-test-renderer não mede geometria; o que se prova aqui é a
 * ESTRUTURA — que os separadores não descendem do ScrollView — e a medição
 * fez-se no navegador, com a lista rolada até ao fim.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { ScrollView } = require('react-native');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider } = require('../src/store');
const { buildTheme } = require('../src/theme');
const ModoCompras = require('../src/screens/ModoCompras').default;

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const soCodigo = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .split('\n').map(l => (/^\s*(\/\/|\*)/.test(l) ? '' : l)).join('\n');

const montar = () => {
  let arvore = null;
  TestRenderer.act(() => {
    arvore = TestRenderer.create(
      React.createElement(SafeAreaProvider, {
        initialMetrics: { frame: { x: 0, y: 0, width: 402, height: 874 },
                          insets: { top: 47, left: 0, right: 0, bottom: 34 } },
      }, React.createElement(StoreProvider, null,
        React.createElement(ModoCompras, { t: buildTheme(0, false), user: 'Rita', onClose: () => {} }))));
  });
  return arvore;
};

// Um nó descende de outro?
const descendeDe = (no, antepassado) => {
  let p = no.parent;
  while (p) { if (p === antepassado) return true; p = p.parent; }
  return false;
};

describe('⚠ os separadores por corredor não rolam com a lista', () => {
  it('o Modo Compras tem um ScrollView próprio', () => {
    const arvore = montar();
    expect(arvore.root.findAllByType(ScrollView).length).toBe(1);
  });

  it('⚠ e os separadores (role tab) ficam FORA dele', () => {
    const arvore = montar();
    const [rola] = arvore.root.findAllByType(ScrollView);
    const separadores = arvore.root.findAll(n => n.props && n.props.accessibilityRole === 'tab');
    // Há separadores para conferir — senão isto não prova nada.
    expect(separadores.length).toBeGreaterThan(2);
    for (const sep of separadores) expect(descendeDe(sep, rola)).toBe(false);
  });

  it('e o carrinho e os artigos ficam DENTRO dele — é o que rola', () => {
    const arvore = montar();
    const [rola] = arvore.root.findAllByType(ScrollView);
    const artigos = arvore.root.findAll(n => n.props
      && typeof n.props.accessibilityLabel === 'string'
      && /^(Confirmar|Desfazer|Marcar|Sem stock)/.test(n.props.accessibilityLabel));
    expect(artigos.length).toBeGreaterThan(0);
    for (const a of artigos) expect(descendeDe(a, rola)).toBe(true);
  });

  it('cada separador mantém os 44 de alvo', () => {
    const arvore = montar();
    for (const sep of arvore.root.findAll(n => n.props && n.props.accessibilityRole === 'tab')) {
      const estilo = [].concat(sep.props.style).filter(Boolean)
        .reduce((a, s) => ({ ...a, ...(typeof s === 'function' ? s({ pressed: false }) : s) }), {});
      expect(estilo.minHeight).toBeGreaterThanOrEqual(44);
    }
  });
});

describe('⚠ e o App.jsx desenha a vista em vez do seu ScrollView', () => {
  const app = soCodigo(ler('App.jsx'));

  it('a vista `loja` declara `coluna: true`', () => {
    const i = app.indexOf('    loja: {');
    expect(i).toBeGreaterThan(0);
    const bloco = app.slice(i, app.indexOf('\n    },', i));
    expect(bloco).toMatch(/coluna: true/);
  });

  it('⚠ e é a ÚNICA — as outras continuam no ScrollView único', () => {
    // Uma segunda vista em coluna é uma decisão, não um acidente: tem de
    // passar por esta prova.
    expect((app.match(/coluna: true/g) || []).length).toBe(1);
  });

  it('e o App escolhe entre a vista e o ScrollView pela bandeira', () => {
    expect(app).toMatch(/V && V\.coluna \? V\.render\(\) : \(/);
  });

  it('⚠ o rodapé continua a ser o último filho da raiz (INVARIANTE #1)', () => {
    // A mudança mexe no MEIO da coluna; as pontas não podem ter mexido. O
    // rodapé vem DEPOIS do fecho da área de conteúdo — lê-se do código, e a
    // etiqueta que o nomeia é um comentário, por isso lê-se do ficheiro cru
    // (o `soCodigo` apaga-a, e a primeira versão desta prova procurava-a lá).
    const cru = ler('App.jsx');
    const rodape = cru.indexOf('rodapé — último filho da raiz, sempre');
    const escolha = cru.indexOf('V && V.coluna ? V.render() : (');
    expect(escolha).toBeGreaterThan(0);
    expect(rodape).toBeGreaterThan(escolha);
  });
});
