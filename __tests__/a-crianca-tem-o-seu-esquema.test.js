/**
 * A app da criança segue o esquema de cor DELA — não o primeiro da lista.
 *
 * ── O que se viu ─────────────────────────────────────────────────────────────
 *
 * Em 10/09/2026 tentou-se varrer o modo criança nos seis esquemas: pôs-se o
 * `esquema_cor` do Léo em Cião no servidor, saiu-se e voltou-se a entrar como
 * ele — e o título «As Minhas Tarefas» continuou em Violeta (#722ED1). O
 * `KidApp` fazia `buildTheme(0, dark)`: o ASPETO (claro/escuro) seguia a
 * preferência da criança, o ESQUEMA ficava preso no 0.
 *
 * É a forma de defeito «escrita que não se lê de volta» aplicada ao tema: o
 * servidor guarda o campo, o `puxarCasa` põe-no em `schemeByUser[kid]`, e o
 * ecrã nunca o lia. O protótipo tira o tema de `schemeByUser[s.user]`; na app
 * a criança entra com a conta dela, portanto o `user` é a própria criança.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * Para CADA um dos seis esquemas, o `KidApp` montado com `schemeByUser[kid]`
 * nesse índice desenha o título de secção com o `actFg` desse esquema — e não
 * com o do Violeta. E o aspeto continua a seguir `themeByUser[kid]`.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider, useStore } = require('../src/store');
const { buildTheme, SCHEMES, chromeDaCrianca, corDoMembro, R } = require('../src/theme');

// Um estilo do react-native pode ser objeto, lista ou lista de listas.
const achatar = (style) => [].concat(style || []).flat(Infinity).filter(Boolean)
  .reduce((a, b) => ({ ...a, ...b }), {});

const RAIZ = path.join(__dirname, '..');
const KidApp = require('../src/KidApp').default;

const comMargens = (filho) => React.createElement(SafeAreaProvider,
  { initialMetrics: { frame: { x: 0, y: 0, width: 412, height: 915 },
                      insets: { top: 47, left: 0, right: 0, bottom: 34 } } }, filho);

// Monta a app da criança com a loja num estado escolhido; devolve a árvore.
const kidCom = (patch) => {
  let r = null, api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    r = TestRenderer.create(comMargens(React.createElement(StoreProvider, null,
      React.createElement(React.Fragment, null,
        React.createElement(Sonda),
        React.createElement(KidApp, { kid: 'Léo', kidTab: 'tarefas', setKidTab: () => {}, onLogout: () => {} })))));
  });
  if (patch) TestRenderer.act(() => { api.set(patch); });
  return r;
};

// A cor de texto de um nó de texto com este conteúdo, já com os estilos
// achatados — é o que o ecrã pinta.
const corDoTexto = (r, texto) => {
  const no = r.root.findAll(n => n.type === 'Text' && n.children.length === 1 && n.children[0] === texto)[0];
  if (!no) return null;
  const st = [].concat(no.props.style || []).flat(Infinity).filter(Boolean)
    .reduce((a, b) => ({ ...a, ...b }), {});
  return st.color || null;
};

describe('⚠ a app da criança segue o esquema de cor da criança', () => {
  it('não constrói o tema com um índice fixo', () => {
    const kid = fs.readFileSync(path.join(RAIZ, 'src', 'KidApp.jsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
    expect(kid).not.toMatch(/buildTheme\(\s*\d/);
    expect(kid).toMatch(/buildTheme\(s\.schemeByUser\[kid\] \?\? 0, dark\)/);
  });

  it.each(SCHEMES.map((sc, i) => [sc.name, i]))('%s: o título de secção leva o `actFg` desse esquema', (nome, i) => {
    const r = kidCom({ schemeByUser: { Léo: i } });
    const cor = corDoTexto(r, 'As Minhas Tarefas');
    expect(cor).toBe(buildTheme(i, false).actFg);
    // E não o do Violeta — a menos que ESTE seja o Violeta.
    if (i !== 0) expect(cor).not.toBe(buildTheme(0, false).actFg);
  });

  // ⚠ Segunda descoberta do mesmo dia: o acento seguia o esquema e o CABEÇALHO
  // e o RODAPÉ continuavam na cor do membro — «o cabeçalho e rodapé não estão a
  // mudar quando se escolhe outro esquema». Decisão do dono da casa: seguem o
  // `chrome` do esquema, como nos adultos; a cor do membro fica na bola.
  it.each(SCHEMES.map((sc, i) => [sc.name, i]))('%s: o cabeçalho e o rodapé levam o `chrome` desse esquema, e a bola a cor do membro', (nome, i) => {
    const r = kidCom({ schemeByUser: { Léo: i } });
    const chrome = buildTheme(i, false).chrome;
    const fundos = r.root.findAll(n => n.type === 'View')
      .map(n => achatar(n.props.style).backgroundColor).filter(Boolean);
    // Duas superfícies com o chrome: o cabeçalho e o rodapé.
    expect(fundos.filter(c => c === chrome).length).toBeGreaterThanOrEqual(2);
    // E NENHUMA com a cor do membro escurecida — essa é só a bola, que é um
    // círculo (borderRadius) e não uma faixa.
    const bolas = r.root.findAll(n => n.type === 'View' && achatar(n.props.style).backgroundColor === chromeDaCrianca(corDoMembro('Léo')));
    expect(bolas).toHaveLength(1);
    expect(achatar(bolas[0].props.style).borderRadius).toBe(R.pill);
    // A inicial branca sobre a bola lê-se.
    expect(corDoTexto(r, 'L')).toBe('#FFFFFF');
  });

  it('sem preferência guardada fica no primeiro esquema — o que a app sempre fez', () => {
    const r = kidCom({ schemeByUser: {} });
    expect(corDoTexto(r, 'As Minhas Tarefas')).toBe(buildTheme(0, false).actFg);
  });

  it('e o aspeto continua a seguir a criança: escuro pinta a página do escuro do MESMO esquema', () => {
    const r = kidCom({ schemeByUser: { Léo: 3 }, themeByUser: { Léo: 'escuro' } });
    const raiz = r.root.findAll(n => n.type === 'View')[0];
    const st = [].concat(raiz.props.style || []).flat(Infinity).filter(Boolean)
      .reduce((a, b) => ({ ...a, ...b }), {});
    expect(st.backgroundColor).toBe(buildTheme(3, true).page);
    expect(corDoTexto(r, 'As Minhas Tarefas')).toBe(buildTheme(3, true).actFg);
  });
});
