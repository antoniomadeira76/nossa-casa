/**
 * A criança escolhe o avatar e o esquema de cor — e as escolhas chegam ao servidor.
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 10/09/2026 — o dono da casa: «as crianças também podem escolher esquema de
 * cor e avatar». Até aí a bola do cabeçalho da criança abria só «O meu PIN»;
 * passa a abrir «O meu perfil», com três coisas: o avatar, a cor do perfil (o
 * esquema) e o PIN.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * As escolhas são AS MESMAS dos adultos — a mesma folha de avatar, as mesmas
 * seis bolas (`EsquemaDeCor.jsx`, partilhado) — e sobem pelos mesmos caminhos.
 * Tocar num esquema muda o tema da criança no próprio ecrã: cabeçalho, rodapé
 * e título. E a fotografia da conta Google não é oferecida a quem não tem conta.
 *
 * ── O que se apanhou pelo caminho ────────────────────────────────────────────
 *
 * A `figura` do avatar NUNCA chegava ao servidor: o `definirAvatar` mandava-a,
 * a rota `/api/membro/aspeto` aceitava-a, e o `guardarAspeto` do cliente
 * deitava-a fora. Ficava só no aparelho onde se escolheu.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider, useStore } = require('../src/store');
const { buildTheme, SCHEMES } = require('../src/theme');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const KidApp = require('../src/KidApp').default;

const comMargens = (filho) => React.createElement(SafeAreaProvider,
  { initialMetrics: { frame: { x: 0, y: 0, width: 412, height: 915 },
                      insets: { top: 47, left: 0, right: 0, bottom: 34 } } }, filho);

const achatar = (style) => [].concat(style || []).flat(Infinity).filter(Boolean)
  .reduce((a, b) => ({ ...a, ...b }), {});

const junta = (n) => {
  if (n === null || n === undefined || n === false) return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(junta).join(' ');
  return junta(n.children || (n.props && n.props.children) || null);
};

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
  return { r, loja: () => api, texto: () => junta(r.toJSON()) };
};

// Só os nós HOSPEDEIROS (`type` é uma cadeia): o `findAll` devolve também o
// `Pressable` e o que ele embrulha, e o mesmo botão contava três vezes.
const hospedeiros = (r, label) => r.root.findAll(n => typeof n.type === 'string'
  && n.props && n.props.accessibilityLabel === label);

const tocar = (r, label) => {
  const alvo = hospedeiros(r, label).filter(n => n.props.onPress || n.props.onClick).pop();
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  TestRenderer.act(() => { (alvo.props.onPress || alvo.props.onClick)(); });
};

const fundos = (r) => r.root.findAll(n => n.type === 'View')
  .map(n => achatar(n.props.style).backgroundColor).filter(Boolean);

describe('⚠ a criança escolhe o avatar e o esquema de cor', () => {
  it('a bola do cabeçalho abre «O meu perfil», com avatar, cor do perfil e PIN', () => {
    const { r, texto } = kidCom({ schemeByUser: { Léo: 0 } });
    expect(texto()).not.toContain('Cor do perfil');
    tocar(r, 'O meu perfil');
    const tx = texto();
    expect(tx).toContain('O meu perfil');
    expect(tx).toContain('Avatar');
    expect(tx).toContain('Cor do perfil');
    expect(tx).toContain('O meu PIN');
    // As seis bolas, com o nome de cada esquema no rótulo em voz.
    for (const sc of SCHEMES) expect(hospedeiros(r, `Esquema ${sc.name}`)).toHaveLength(1);
  });

  it('tocar num esquema muda o cabeçalho, o rodapé e o título da própria criança', () => {
    const { r, loja } = kidCom({ schemeByUser: { Léo: 0 } });
    tocar(r, 'O meu perfil');
    tocar(r, 'Esquema Rosa');
    expect(loja().s.schemeByUser['Léo']).toBe(3);
    // Fecha-se a folha: as seis bolas do seletor têm os seis `chrome`, e
    // confundiam a contagem do cabeçalho.
    tocar(r, 'Fechar');
    const chrome = buildTheme(3, false).chrome;
    expect(fundos(r).filter(c => c === chrome).length).toBeGreaterThanOrEqual(2);
    // E o Violeta saiu do cabeçalho.
    expect(fundos(r)).not.toContain(buildTheme(0, false).chrome);
  });

  it('a linha «O meu PIN» abre a folha do PIN por cima', () => {
    const { r, texto } = kidCom(null);
    tocar(r, 'O meu perfil');
    tocar(r, 'O meu PIN');
    expect(texto()).toContain('PIN atual');
    expect(texto()).toContain('PIN novo, outra vez');
  });

  it('a linha «Avatar» abre a folha de avatar dos adultos — SEM a fotografia da conta', () => {
    const { r, texto } = kidCom(null);
    tocar(r, 'O meu perfil');
    tocar(r, 'Avatar');
    const tx = texto();
    expect(tx).toContain('A minha inicial');
    expect(tx).toContain('A cor');
    // A criança não tem conta Google: nem a secção, nem o botão de trazer.
    expect(tx).not.toContain('Fotografia da conta');
    expect(tx).not.toMatch(/fotografia/i);
  });

  it('as bolas do esquema são UM componente, usado pelo Perfil e pela KidApp', () => {
    const perfil = ler('src/screens/Perfil.jsx');
    const kid = ler('src/KidApp.jsx');
    expect(perfil).toMatch(/import EscolhaDeEsquema from '\.\.\/EsquemaDeCor'/);
    expect(kid).toMatch(/import EscolhaDeEsquema from '\.\/EsquemaDeCor'/);
    // E a geometria do risco diagonal só existe no componente.
    expect(perfil).not.toMatch(/const RECUO = /);
    expect(kid).not.toMatch(/const RECUO = /);
    expect(ler('src/EsquemaDeCor.jsx')).toMatch(/const RECUO = BOLA \/ 2 \+ \(CORTE \/ 2\) \* \(Math\.SQRT1_2 - 1\)/);
  });

  it('⚠ a figura do avatar SOBE ao servidor — o cliente deitava-a fora', () => {
    const pb = ler('src/pocketbase.js');
    expect(pb).toMatch(/async guardarAspeto\(\{ avatar, cor, figura \} = \{\}\)/);
    expect(pb).toMatch(/if \(figura !== undefined\) corpo\.figura = String\(figura \|\| ''\)/);
    // A rota do servidor já a aceitava — é o cliente que faltava.
    expect(ler('db/pocketbase/pb_hooks/avatar.pb.js')).toMatch(/membro\.set\('figura', v\)/);
  });
});
