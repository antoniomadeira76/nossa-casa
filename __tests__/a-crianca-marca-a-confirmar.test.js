/**
 * A criança marca a tarefa como «a confirmar» — e isso chega ao servidor.
 *
 * ── O que se viu ─────────────────────────────────────────────────────────────
 *
 * 10/09/2026. A `docs/funcionalidades.md` §3.12 promete «marca como *a
 * confirmar*», e a loja sabe fazê-lo (`tapTask(id, true)` põe `pending`). Mas a
 * KidApp escrevia `done` directamente: a criança dava a tarefa por FEITA — e
 * confirmava-se a si própria —, e nada subia ao servidor, porque o `tapTask`
 * só subia quando `done` mudava. A mãe nunca via a marcação.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. Na KidApp tocar numa tarefa vai pela loja como criança: `pending`, não
 *      `done`. A linha diz «A confirmar por um adulto». Tocar outra vez desfaz.
 *   2. Uma tarefa que um adulto já confirmou (`done`) não se toca daí.
 *   3. A leitura do servidor traduz uma linha SEM `confirmada_em` em `pending`,
 *      não em `done` — e a loja aplica-a.
 *   4. A regra do servidor deixa a criança apagar só a SUA linha por confirmar
 *      (provado a correr em `provar-agenda-e-tarefas.mjs`); aqui confere-se que
 *      a regra está escrita assim.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider, useStore } = require('../src/store');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
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

const hospedeiro = (r, label) => r.root.findAll(n => typeof n.type === 'string'
  && n.props && n.props.accessibilityLabel === label).pop();

const tocar = (r, label) => {
  const alvo = hospedeiro(r, label);
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  const f = alvo.props.onPress || alvo.props.onClick;
  if (f) TestRenderer.act(() => { f(); });
  return !!f;
};

// A primeira tarefa do Léo na casa de demonstração.
const tarefaDoLeo = (loja) => loja().allTasks().find(x => x.who === 'Léo');

describe('⚠ a criança marca «a confirmar», não «feita»', () => {
  it('tocar numa tarefa põe-na pendente — e a linha diz que espera um adulto', () => {
    const { r, loja, texto } = kidCom(null);
    const t = tarefaDoLeo(loja);
    expect(texto()).not.toContain('A confirmar por um adulto');
    tocar(r, t.title);
    expect(!!loja().s.pending[t.id]).toBe(true);
    expect(!!loja().s.done[t.id]).toBe(false);
    expect(texto()).toContain('A confirmar por um adulto');
    // E o contador «Por fazer hoje» não a dá por feita.
    const antes = loja().allTasks().filter(x => x.who === 'Léo' && !loja().s.done[x.id]).length;
    expect(antes).toBeGreaterThan(0);
  });

  it('tocar outra vez desfaz a marcação', () => {
    const { r, loja, texto } = kidCom(null);
    const t = tarefaDoLeo(loja);
    tocar(r, t.title);
    tocar(r, t.title);
    expect(!!loja().s.pending[t.id]).toBe(false);
    expect(texto()).not.toContain('A confirmar por um adulto');
  });

  it('⚠ o que um adulto já confirmou não se desfaz daqui', () => {
    const { r, loja } = kidCom(null);
    const t = tarefaDoLeo(loja);
    TestRenderer.act(() => { loja().set(x => ({ done: { ...x.done, [t.id]: true } })); });
    const alvo = hospedeiro(r, t.title);
    expect(alvo.props.accessibilityState).toMatchObject({ disabled: true, checked: true });
    // Sem `onPress`: não há o que tocar.
    expect(alvo.props.onPress).toBeFalsy();
    expect(!!loja().s.done[t.id]).toBe(true);
  });

  it('a KidApp vai pela loja como CRIANÇA, e nunca escreve `done` directamente', () => {
    const kid = semComentarios(ler('src/KidApp.jsx'));
    expect(kid).toMatch(/st\.tapTask\(task\.id, true\)/);
    expect(kid).not.toMatch(/done: \{ \.\.\.s\.done/);
  });

  it('a leitura do servidor traduz «sem confirmação» em `pending`, e a loja aplica-o', () => {
    const sync = semComentarios(ler('src/sync.js'));
    expect(sync).toMatch(/if \(f\.confirmada_em\) done\[f\.tarefa\] = true; else pending\[f\.tarefa\] = true;/);
    expect(sync).toMatch(/^\s+pending,\s*$/m);
    const store = semComentarios(ler('src/store.jsx'));
    expect(store).toMatch(/pending: \{ \.\.\.x\.pending, \.\.\.\(casa\.pending \|\| \{\}\)/);
    // E o `tapTask` sobe a marcação da criança — a linha sem confirmação — e
    // apaga-a quando ela desmarca.
    expect(store).toMatch(/if \(byChild && !mudouDone && mudouPend\)/);
    expect(store).toMatch(/\{ id: r\.id, confirmada: false \}/);
  });

  it('a regra do servidor: a criança apaga só a SUA linha por confirmar', () => {
    const regras = ler('db/pocketbase/criar-colecoes.mjs');
    expect(regras).toMatch(/\(\$\{ADULTO\} \|\| \(marcada_por = @request\.auth\.id && confirmada_em = ""\)\)/);
    // E há prova a correr das três faces: apaga a sua, não a confirmada, não a da irmã.
    const provas = ler('db/pocketbase/provar-agenda-e-tarefas.mjs');
    expect(provas).toMatch(/DESMARCA a sua tarefa enquanto ninguém a confirmou/);
    expect(provas).toMatch(/não desfaz a que um adulto JÁ confirmou/);
    expect(provas).toMatch(/a Mia não apaga a marcação do Léo/);
  });
});
