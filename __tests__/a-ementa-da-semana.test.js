/**
 * A ementa da semana — sete jantares, e os ingredientes que faltam entram na lista.
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 11/09/2026, a terceira das dez funcionalidades. Um prato é um MOLDE (nome e
 * ingredientes com corredor); a ementa é um jantar por dia; «Pôr o que falta na
 * lista» acrescenta só o que a lista aberta ainda não tem, como artigos
 * normais, com o nome de quem pôs.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. As duas coleções nascem nos DOIS sítios do servidor, iguais; a `ementa`
 *      tem um jantar por dia e prende o prato à casa.
 *   2. A leitura traduz por chave de dia e para a forma da loja; a escrita
 *      define-ou-altera o dia; o `o-que-sobe.js` diz quem chama.
 *   3. Pôr o que falta não duplica e vai pelo `criarArtigo` (nunca `newItems`
 *      por fora da loja — classe 37).
 *   4. As Compras têm a secção com os sete dias; a criança vê o jantar de hoje.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider, useStore } = require('../src/store');
const { buildTheme } = require('../src/theme');
const { TODAY, TODAY_KEY, WD } = require('../src/format');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const Compras = require('../src/screens/Compras').default;
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
const compras = (patch) => montar(Compras, { t: buildTheme(1, false), user: 'Rita', onModoCompras: () => {}, onIda: () => {} }, patch);
const hospedeiro = (r, label) => r.root.findAll(n => typeof n.type === 'string' && n.props && n.props.accessibilityLabel === label).pop();
const tocar = (r, label) => {
  const alvo = hospedeiro(r, label);
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  TestRenderer.act(() => { (alvo.props.onPress || alvo.props.onClick)(); });
};

const FRANGO = { id: 'prato-1', idServidor: null, nome: 'Frango no forno',
  ingredientes: [{ rotulo: 'Frango inteiro', s: 'Frescos' }, { rotulo: 'Leite meio-gordo · 6 un.', s: 'Frescos' }] };

describe('⚠ a ementa: o servidor', () => {
  it('as duas coleções nascem nos dois sítios, e a ementa é um jantar por dia preso à casa', () => {
    const cria = ler('db/pocketbase/criar-colecoes.mjs');
    const acresc = ler('db/pocketbase/acrescentar-campos.mjs');
    for (const txt of [cria, acresc]) {
      expect(txt).toMatch(/CREATE UNIQUE INDEX idx_prato_por_casa ON pratos \(casa, nome\)/);
      expect(txt).toMatch(/CREATE UNIQUE INDEX idx_ementa_por_dia ON ementa \(casa, dia\)/);
      expect(txt).toMatch(/prato\.casa = @request\.auth\.casa/);
    }
    expect(cria).toMatch(/json\('ingredientes'\)/);
    expect(acresc).toMatch(/\{ name: 'ingredientes', type: 'json', maxSize: 20000 \}/);
    expect(ler('src/pocketbase.js')).toMatch(/'pratos', 'ementa'\]/);
    expect(JSON.parse(ler('package.json')).scripts['db:provar']).toMatch(/provar-ementa\.mjs/);
    expect(fs.existsSync(path.join(RAIZ, 'db/pocketbase/provar-ementa.mjs'))).toBe(true);
  });

  it('a leitura traduz por chave de dia e a escrita define-ou-altera; o o-que-sobe diz quem chama', () => {
    const sync = semComentarios(ler('src/sync.js'));
    expect(sync).toMatch(/ementa\[`d\$\{dia\}`\] = e\.prato;/);
    expect(sync).toMatch(/export async function jantarDoDia\(/);
    expect(sync).toMatch(/export async function pratoDaCasa\(/);
    const sobe = ler('src/o-que-sobe.js');
    expect(sobe).toMatch(/pratos: \['linhas',[^\n]*'pratoDaCasa'\]/);
    expect(sobe).toMatch(/ementa: \['linhas',[^\n]*'jantarDoDia'\]/);
  });
});

describe('⚠ a ementa: a loja', () => {
  it('criar um prato exige nome e um ingrediente, e recusa o nome repetido', () => {
    const { loja } = compras(null);
    expect(loja().criarPrato('', [{ rotulo: 'X' }])).toMatch(/nome/);
    expect(loja().criarPrato('Sopa', [])).toMatch(/ingrediente/);
    let r;
    TestRenderer.act(() => { r = loja().criarPrato('Sopa', [{ rotulo: 'Cenoura · 1 kg', s: 'Frutas & Legumes' }]); });
    expect(r).toMatchObject({ id: expect.any(String) });
    expect(loja().criarPrato('sopa', [{ rotulo: 'Y' }])).toMatch(/Já existe/);
  });

  it('⚠ pôr o que falta não duplica o que a lista já tem, e vai pelo criarArtigo com o nome de quem pôs', () => {
    const { loja } = compras({ pratos: [FRANGO], ementa: {} });
    const antes = loja().allItems().length;
    const falta = loja().oQueFalta('prato-1');
    expect(falta.map(i => i.jaNaLista)).toEqual([false, true]);
    let n;
    TestRenderer.act(() => { n = loja().porOQueFaltaNaLista('prato-1', 'Rita'); });
    expect(n).toBe(1);
    const novos = loja().allItems();
    expect(novos.length).toBe(antes + 1);
    const frango = novos.find(i => i.label === 'Frango inteiro');
    expect(frango).toMatchObject({ s: 'Frescos', by: 'Rita', vis: 'familia' });
    // Segunda vez: nada entra.
    expect(loja().porOQueFaltaNaLista('prato-1', 'Rita')).toBe(0);
    expect(loja().allItems().length).toBe(antes + 1);
  });

  it('marcar o jantar guarda por chave de dia; sem prato o dia sai; apagar o prato limpa os dias', () => {
    const { loja } = compras({ pratos: [FRANGO], ementa: {} });
    expect(loja().marcarJantar('hoje', 'prato-1')).toMatch(/data/);
    expect(loja().marcarJantar(TODAY_KEY, 'prato-x')).toMatch(/prato/);
    let r;
    TestRenderer.act(() => { r = loja().marcarJantar(TODAY_KEY, 'prato-1'); });
    expect(r).toBeNull();
    expect(loja().s.ementa[TODAY_KEY]).toBe('prato-1');
    TestRenderer.act(() => { loja().marcarJantar(TODAY_KEY, null); });
    expect(loja().s.ementa[TODAY_KEY]).toBeUndefined();
    TestRenderer.act(() => { loja().marcarJantar(TODAY_KEY, 'prato-1'); });
    TestRenderer.act(() => { loja().apagarPrato('prato-1'); });
    expect(loja().s.pratos).toEqual([]);
    expect(loja().s.ementa[TODAY_KEY]).toBeUndefined();
  });

  it('nenhum ecrã escreve pratos, ementa ou newItems por fora da loja', () => {
    for (const f of ['src/screens/Compras.jsx', 'src/sheets/JantarDoDia.jsx', 'src/sheets/NovoPrato.jsx', 'src/KidApp.jsx']) {
      const txt = semComentarios(ler(f));
      expect(txt).not.toMatch(/\b(pratos|ementa|newItems):\s/);
    }
  });
});

describe('⚠ a ementa: os ecrãs', () => {
  it('as Compras têm a secção com os sete dias, e o dia com prato diz o nome', () => {
    const { r, texto } = compras({ pratos: [FRANGO], ementa: { [TODAY_KEY]: 'prato-1' } });
    const tx = texto();
    expect(tx).toContain('Ementa da Semana');
    expect(tx).toContain('Frango no forno');
    expect(tx).toContain('Sem jantar marcado');
    for (const dia of WD) expect(hospedeiro(r, `Jantar de ${dia}`)).toBeTruthy();
  });

  it('a linha do dia abre a folha com os pratos, o que falta, e «Pôr o que falta na lista»', () => {
    const { r, texto, loja } = compras({ pratos: [FRANGO], ementa: { [TODAY_KEY]: 'prato-1' } });
    // O «hoje» dos testes é o do `format` (pode estar fixado), não o relógio.
    const idx = (new Date(TODAY.y, TODAY.m, TODAY.d).getDay() + 6) % 7;
    tocar(r, `Jantar de ${WD[idx]}`);
    const tx = texto();
    expect(tx).toContain('Sem jantar');
    expect(tx).toContain('já na lista');
    expect(tx).toContain('entra na lista');
    expect(tx).toContain('Pôr o que falta na lista (1)');
    tocar(r, 'Pôr o que falta na lista (1)');
    expect(loja().allItems().some(i => i.label === 'Frango inteiro')).toBe(true);
    expect(texto()).toContain('Já está tudo na lista');
  });

  it('a criança vê o jantar de hoje na lista dela — e só se houver', () => {
    const sem = montar(KidApp, { kid: 'Léo', kidTab: 'compras', setKidTab: () => {}, onLogout: () => {} }, { pratos: [FRANGO], ementa: {} });
    expect(sem.texto()).not.toContain('Jantar de hoje');
    const com = montar(KidApp, { kid: 'Léo', kidTab: 'compras', setKidTab: () => {}, onLogout: () => {} }, { pratos: [FRANGO], ementa: { [TODAY_KEY]: 'prato-1' } });
    expect(com.texto()).toContain('Jantar de hoje');
    expect(com.texto()).toContain('Frango no forno');
  });
});
