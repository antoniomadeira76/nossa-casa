/**
 * A ementa da semana é opcional — de duas maneiras, escolhidas pelo dono da
 * casa em 12/09/2026 ao ver sete linhas de «Sem jantar marcado» (opções A e C
 * de `design/ementa-opcional.dc.html`).
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   A. Uma regra da CASA, `ementa_desligada`, nos dois sítios do servidor e na
 *      tradução das regras. Pela NEGATIVA: um `bool` novo nasce a `false` em
 *      todas as linhas, e `false` tem de ser «ligada». Desligar não apaga
 *      pratos nem jantares. Muda-se na Gestão pela loja.
 *      Desligada, a secção sai das Compras e o «Jantar de hoje» sai da app da
 *      criança.
 *   C. Ligada, a secção mostra só os dias com jantar. Sem nenhum é UMA linha,
 *      «Planear a semana», que abre os sete dias; abertos, dobram-se.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');

jest.mock('../src/pocketbase', () => ({
  estaLigado: () => false,
  auth: { valida: () => false, membro: () => null },
  ler: {},
  google: { disponivel: () => false, porLigar: () => false, verificar: async () => false },
}));

const { StoreProvider, useStore, DEMO, BLANK } = require('../src/store');
const { buildTheme } = require('../src/theme');
const { TODAY_KEY, WD } = require('../src/format');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const Compras = require('../src/screens/Compras').default;
const Gestao = require('../src/screens/Gestao').default;
const KidApp = require('../src/KidApp').default;

const comMargens = (filho) => React.createElement(SafeAreaProvider,
  { initialMetrics: { frame: { x: 0, y: 0, width: 412, height: 915 },
                      insets: { top: 47, left: 0, right: 0, bottom: 34 } } }, filho);
const junta = (n) => {
  if (n === null || n === undefined || n === false) return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(junta).join(' ');
  return junta(n.children || (n.props && n.props.children) || null);
};
const montar = (Ecra, props, patch) => {
  let r = null, api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    r = TestRenderer.create(comMargens(React.createElement(StoreProvider, null,
      React.createElement(React.Fragment, null,
        React.createElement(Sonda),
        React.createElement(Ecra, props)))));
  });
  if (patch) TestRenderer.act(() => { api.set(patch); });
  return { r, loja: () => api, texto: () => junta(r.toJSON()) };
};
const T = buildTheme(1, false);
const compras = (patch) => montar(Compras, { t: T, user: 'Rita', onModoCompras: () => {}, onIda: () => {} }, patch);
const hospedeiro = (r, label) => r.root.findAll(n => typeof n.type === 'string' && n.props && n.props.accessibilityLabel === label).pop();
const tocar = (r, label) => {
  const alvo = hospedeiro(r, label);
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  TestRenderer.act(() => { (alvo.props.onPress || alvo.props.onClick)(); });
};

const FRANGO = { id: 'prato-1', idServidor: null, nome: 'Frango no forno', ingredientes: [{ rotulo: 'Frango inteiro', s: 'Frescos' }] };

describe('⚠ A. o interruptor é uma regra da casa', () => {
  it('⚠ o campo nasce nos dois sítios do servidor, pela NEGATIVA, e a tradução das regras conhece-o', () => {
    // `ementa_desligada`, e não `ementa_ligada`: um `bool` acrescentado a uma
    // coleção com linhas nasce a `false` em todas — a primeira versão desligou
    // a ementa à casa a sério no instante em que o campo chegou ao servidor.
    // Pela negativa, o `false` de nascença é o estado que se quer.
    expect(ler('db/pocketbase/criar-colecoes.mjs')).toMatch(/bool\('ementa_desligada'\)/);
    expect(ler('db/pocketbase/criar-colecoes.mjs')).not.toMatch(/bool\('ementa_ligada'\)/);
    expect(ler('db/pocketbase/acrescentar-campos.mjs')).toMatch(/\['casas', 'ementa_desligada', \{ type: 'bool' \}\]/);
    const sync = ler('src/sync.js');
    expect(sync).toMatch(/ementaDesligada: aCasa\.ementa_desligada === true/);
    expect(sync).toMatch(/ementaDesligada: 'ementa_desligada'/);
  });

  it('ligada por omissão, nos dois arranques — e AUSENTE lê-se como ligada, sem truque', () => {
    expect(DEMO().ementaDesligada).toBe(false);
    expect(BLANK().ementaDesligada).toBe(false);
    const { loja } = compras({ ementaDesligada: undefined });
    expect(loja().ementaNaCasa).toBe(true);
    TestRenderer.act(() => { loja().set({ ementaDesligada: true }); });
    expect(loja().ementaNaCasa).toBe(false);
  });

  it('⚠ desligar não apaga nada: os pratos e os jantares ficam, e voltam ao ligar', () => {
    const { loja, texto } = compras({ pratos: [FRANGO], ementa: { [TODAY_KEY]: 'prato-1' } });
    expect(texto()).toContain('Ementa da Semana');
    TestRenderer.act(() => { loja().mudarRegraDaCasa({ ementaDesligada: true }); });
    expect(texto()).not.toContain('Ementa da Semana');
    expect(texto()).not.toContain('Frango no forno');
    expect(loja().s.pratos).toEqual([FRANGO]);
    expect(loja().s.ementa).toEqual({ [TODAY_KEY]: 'prato-1' });
    TestRenderer.act(() => { loja().mudarRegraDaCasa({ ementaDesligada: false }); });
    expect(texto()).toContain('Frango no forno');
  });

  it('a Gestão tem o interruptor, e a mudança passa pela loja', () => {
    const { r, texto, loja } = montar(Gestao, { t: T, user: 'Rita', onClose: () => {} }, null);
    expect(texto()).toContain('Ementa da semana');
    expect(ler('src/screens/Gestao.jsx')).toMatch(/mudarRegraDaCasa\(\{ ementaDesligada/);
    tocar(r, 'Ementa da semana');
    expect(loja().s.ementaDesligada).toBe(true);
    expect(texto()).toContain('A casa não planeia os jantares na app');
  });

  it('⚠ desligada, a criança deixa de ver o «Jantar de hoje»', () => {
    const props = { kid: 'Léo', kidTab: 'compras', setKidTab: () => {}, onLogout: () => {} };
    const com = montar(KidApp, props, { pratos: [FRANGO], ementa: { [TODAY_KEY]: 'prato-1' } });
    expect(com.texto()).toContain('Jantar de hoje');
    const sem = montar(KidApp, props, { pratos: [FRANGO], ementa: { [TODAY_KEY]: 'prato-1' }, ementaDesligada: true });
    expect(sem.texto()).not.toContain('Jantar de hoje');
  });
});

describe('⚠ C. ligada, a secção é leve', () => {
  it('sem jantares é UMA linha — «Planear» abre os sete dias, e dobram-se outra vez', () => {
    const { r, texto } = compras({ pratos: [FRANGO], ementa: {} });
    expect(texto()).toContain('Sem jantares marcados');
    expect(texto()).not.toContain('Sem jantar marcado');
    for (const dia of WD) expect(hospedeiro(r, `Jantar de ${dia}`)).toBeFalsy();
    tocar(r, 'Planear a semana');
    for (const dia of WD) expect(hospedeiro(r, `Jantar de ${dia}`)).toBeTruthy();
    tocar(r, 'Mostrar só os jantares marcados');
    expect(texto()).toContain('Sem jantares marcados');
  });

  it('com jantares mostra só esses dias; os outros abrem-se a pedido', () => {
    const { r, texto } = compras({ pratos: [FRANGO], ementa: { [TODAY_KEY]: 'prato-1' } });
    expect(texto()).toContain('Frango no forno');
    expect(r.root.findAll(n => typeof n.type === 'string' && /^Jantar de /.test(n.props.accessibilityLabel || '')).length).toBe(1);
    tocar(r, 'Mostrar a semana toda');
    expect(r.root.findAll(n => typeof n.type === 'string' && /^Jantar de /.test(n.props.accessibilityLabel || '')).length).toBe(7);
  });
});
