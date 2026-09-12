/**
 * A troca de tarefas entre irmãos — «o lixo pelas plantas, só hoje».
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 12/09/2026, a oitava das dez funcionalidades. Na app da criança, «Propor uma
 * troca» escolhe uma tarefa sua e uma do irmão; o irmão aceita ou recusa; os
 * adultos veem a troca no Início e anulam nas Tarefas. Vale só para hoje.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. `trocas_tarefas` nasce nos DOIS sítios, com os dois índices únicos, e
 *      as quatro relações têm ataque no guarda.
 *   2. A loja DERIVA a atribuição: aceite, a tarefa fica com quem a troca diz;
 *      a de ontem não muda nada; os pontos são de quem faz.
 *   3. Só quem tem a tarefa propõe, só quem recebe aceita, só um adulto desfaz
 *      uma aceite — e a app sem servidor diz o mesmo que o servidor.
 *   4. Os três ecrãs: a Mia aceita, o Léo propõe pela folha, a Rita vê e anula.
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

const { StoreProvider, useStore } = require('../src/store');
const { buildTheme } = require('../src/theme');
const { TODAY_KEY } = require('../src/format');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const KidApp = require('../src/KidApp').default;
const Inicio = require('../src/screens/Inicio').default;
const Tarefas = require('../src/screens/Tarefas').default;

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
const nada = () => {};
const kidApp = (kid, patch) => montar(KidApp, { kid, kidTab: 'tarefas', setKidTab: nada, onLogout: nada }, patch);
const hospedeiro = (r, label) => r.root.findAll(n => typeof n.type === 'string' && n.props
  && typeof n.props.accessibilityLabel === 'string'
  && (n.props.accessibilityLabel === label || n.props.accessibilityLabel.startsWith(`${label} — `))).pop();
const tocar = (r, label) => {
  const alvo = hospedeiro(r, label);
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  TestRenderer.act(() => { (alvo.props.onPress || alvo.props.onClick)(); });
};

// O Léo propôs o lixo pelas plantas da Mia, hoje. (Sementes: `lixo` é do Léo e
// está por fazer; `plantas` é da Mia e está por fazer; `mesa` é da Mia e já
// está feita.)
const PROPOSTA = { id: 'tr-1', idServidor: null, dia: TODAY_KEY, de: 'lixo', para: 'plantas',
  propostaPor: 'Léo', aceiteEm: null, aceitePor: null };
const ACEITE = { ...PROPOSTA, id: 'tr-2', aceiteEm: '2026-08-20T10:00:00.000Z', aceitePor: 'Mia' };
const ONTEM = { ...ACEITE, id: 'tr-3', dia: 'd2026-08-19' };

describe('⚠ a troca de tarefas: o servidor', () => {
  it('nasce nos dois sítios, com os dois índices únicos, e cada relação tem o seu ataque', () => {
    const cria = ler('db/pocketbase/criar-colecoes.mjs');
    const acresc = ler('db/pocketbase/acrescentar-campos.mjs');
    for (const txt of [cria, acresc]) {
      expect(txt).toMatch(/CREATE UNIQUE INDEX idx_troca_de_por_dia ON trocas_tarefas \(tarefa_de, dia\)/);
      expect(txt).toMatch(/CREATE UNIQUE INDEX idx_troca_para_por_dia ON trocas_tarefas \(tarefa_para, dia\)/);
      expect(txt).toMatch(/@request\.body\.aceite_por = @request\.auth\.id/);
    }
    expect(cria).toMatch(/name: 'trocas_tarefas', type: 'base'/);
    const i = cria.indexOf('const NOSSAS = [');
    expect(cria.slice(i, cria.indexOf('];', i))).toContain("'trocas_tarefas'");
    expect(acresc).toMatch(/nome: 'trocas_tarefas'/);
    const anc = ler('db/pocketbase/provar-relacoes-ancoradas.mjs');
    for (const campo of ['tarefa_de', 'tarefa_para', 'proposta_por', 'aceite_por']) {
      expect(anc).toContain(`['trocas_tarefas', '${campo}',`);
    }
    const sync = semComentarios(ler('src/sync.js'));
    for (const f of ['trocaDeTarefas', 'aceitarTrocaDeTarefas', 'apagarTrocaDeTarefas']) {
      expect(sync).toMatch(new RegExp(`export async function ${f}\\(`));
    }
    expect(sync).toMatch(/casa\.trocas_tarefas/);
    expect(semComentarios(ler('src/pocketbase.js'))).toMatch(/'trocas_tarefas'/);
    expect(ler('src/o-que-sobe.js')).toMatch(/trocas: \['linhas',[^\n]*'trocaDeTarefas'\]/);
    expect(JSON.parse(ler('package.json')).scripts['db:provar']).toMatch(/provar-trocas\.mjs/);
    expect(fs.existsSync(path.join(RAIZ, 'db/pocketbase/provar-trocas.mjs'))).toBe(true);
  });
});

describe('⚠ a troca de tarefas: a loja deriva a atribuição', () => {
  it('aceite, a tarefa fica com quem a troca diz — e só hoje', () => {
    const { loja } = kidApp('Mia', { trocas: [ACEITE, ONTEM] });
    const porId = Object.fromEntries(loja().allTasks().map(t => [t.id, t]));
    expect(porId.lixo.who).toBe('Mia');
    expect(porId.lixo.trocadaCom).toBe('Léo');
    expect(porId.plantas.who).toBe('Léo');
    expect(porId.plantas.trocadaCom).toBe('Mia');
    expect(porId.mochila.who).toBe('Léo');
    // A de hoje é uma; a de ontem não conta para nada.
    expect(loja().trocasDeHoje().map(tr => tr.id)).toEqual(['tr-2']);
  });

  it('por aceitar, nada muda; a de ontem sozinha também não', () => {
    const { loja } = kidApp('Mia', { trocas: [PROPOSTA] });
    expect(loja().allTasks().find(t => t.id === 'lixo').who).toBe('Léo');
    const tr = loja().trocasDeHoje()[0];
    expect(tr).toMatchObject({ quemDe: 'Léo', quemPara: 'Mia', tarefaDe: 'Pôr o lixo na rua', tarefaPara: 'Regar as plantas da varanda' });
    const { loja: l2 } = kidApp('Mia', { trocas: [ONTEM] });
    expect(l2().allTasks().find(t => t.id === 'lixo').who).toBe('Léo');
    expect(l2().trocasDeHoje()).toEqual([]);
  });

  it('os pontos da tarefa trocada são de quem a faz', () => {
    const { loja } = kidApp('Mia', { trocas: [ACEITE] });
    const antes = loja().kidPts.Mia;
    TestRenderer.act(() => { loja().tapTask('lixo', false); });
    expect(loja().kidPts.Mia).toBe(antes + 3);
  });

  it('só quem tem a tarefa propõe, e só a um irmão com uma tarefa por fazer', () => {
    const { loja } = kidApp('Léo', null);
    expect(loja().proporTroca('Léo', 'mesa', 'plantas')).toMatch(/sua/);
    expect(loja().proporTroca('Léo', 'lixo', 'mesa')).toMatch(/feita/);
    expect(loja().proporTroca('Léo', 'lixo', 'roupa')).toMatch(/irmão/);
    expect(loja().proporTroca('Léo', 'lixo', 'mochila')).toMatch(/irmão/);
    expect(loja().proporTroca('Rita', 'lixo', 'plantas')).toMatch(/criança/);
    expect(loja().tarefasParaTrocar('Léo')).toMatchObject({
      minhas: [expect.objectContaining({ id: 'lixo' }), expect.objectContaining({ id: 'mochila' })],
      deles: [expect.objectContaining({ id: 'plantas' })],
    });
    let r;
    TestRenderer.act(() => { r = loja().proporTroca('Léo', 'lixo', 'plantas'); });
    expect(r).toBeNull();
    const tr = loja().trocasDe('Léo')[0];
    expect(tr).toMatchObject({ quemDe: 'Léo', quemPara: 'Mia', aceiteEm: null, dia: TODAY_KEY });
    // Uma tarefa já numa troca não entra noutra.
    expect(loja().proporTroca('Léo', 'mochila', 'plantas')).toMatch(/troca/);
    expect(loja().tarefasParaTrocar('Léo').minhas.map(t => t.id)).toEqual(['mochila']);
    expect(loja().s.registo[0].t).toMatch(/Troca proposta do Léo à Mia/);
  });

  it('só quem recebe aceita; só um adulto desfaz uma aceite', () => {
    const { loja } = kidApp('Mia', { trocas: [PROPOSTA] });
    expect(loja().aceitarTroca('Léo', 'tr-1')).toMatch(/recebe/);
    expect(loja().aceitarTroca('Mia', 'tr-9')).toMatch(/não existe/);
    let r;
    TestRenderer.act(() => { r = loja().aceitarTroca('Mia', 'tr-1'); });
    expect(r).toBeNull();
    expect(loja().trocasDeHoje()[0]).toMatchObject({ aceitePor: 'Mia' });
    expect(loja().trocasDeHoje()[0].aceiteEm).toBeTruthy();
    expect(loja().allTasks().find(t => t.id === 'lixo').who).toBe('Mia');
    expect(loja().aceitarTroca('Mia', 'tr-1')).toMatch(/já foi aceite/);
    expect(loja().desfazerTroca('Léo', 'tr-1')).toMatch(/adulto/);
    expect(loja().desfazerTroca('Mia', 'tr-1')).toMatch(/adulto/);
    TestRenderer.act(() => { r = loja().desfazerTroca('Rita', 'tr-1'); });
    expect(r).toBeNull();
    expect(loja().trocasDeHoje()).toEqual([]);
    expect(loja().allTasks().find(t => t.id === 'lixo').who).toBe('Léo');
    expect(loja().s.registo[0].t).toMatch(/Troca anulada/);
  });

  it('por aceitar, quem recebe recusa e quem propôs retira — mais ninguém', () => {
    const { loja } = kidApp('Mia', { trocas: [PROPOSTA] });
    let r;
    TestRenderer.act(() => { r = loja().desfazerTroca('Tomás', 'tr-1'); });
    expect(r).toBeNull(); // um adulto pode sempre
    const { loja: l2 } = kidApp('Mia', { trocas: [PROPOSTA] });
    TestRenderer.act(() => { l2().desfazerTroca('Mia', 'tr-1'); });
    expect(l2().trocasDeHoje()).toEqual([]);
    expect(l2().s.registo[0].t).toMatch(/Troca recusada/);
    const { loja: l3 } = kidApp('Léo', { trocas: [PROPOSTA] });
    TestRenderer.act(() => { l3().desfazerTroca('Léo', 'tr-1'); });
    expect(l3().s.registo[0].t).toMatch(/retirada/);
  });

  it('nenhum ecrã escreve `trocas` por fora da loja', () => {
    for (const f of ['src/KidApp.jsx', 'src/screens/Tarefas.jsx', 'src/screens/Inicio.jsx', 'src/sheets/ProporTroca.jsx']) {
      expect(semComentarios(ler(f))).not.toMatch(/\btrocas:\s/);
    }
  });
});

describe('⚠ a troca de tarefas: os ecrãs', () => {
  it('a Mia vê a proposta do Léo, aceita, e a tarefa entra na lista dela', () => {
    const { r, texto, loja } = kidApp('Mia', { trocas: [PROPOSTA] });
    let tx = texto();
    expect(tx).toContain('Trocas');
    expect(tx).toContain('Léo propõe: «Pôr o lixo na rua» pela sua «Regar as plantas da varanda»');
    expect(tx).toContain('a aceitar');
    expect(hospedeiro(r, 'Recusar a troca')).toBeTruthy();
    tocar(r, 'Aceitar a troca');
    tx = texto();
    expect(tx).toContain('Trocou com Léo: hoje faz «Pôr o lixo na rua» em vez de «Regar as plantas da varanda»');
    expect(tx).toContain('aceite');
    expect(tx).toContain('Troca com Léo · só hoje');
    expect(hospedeiro(r, 'Aceitar a troca')).toBeFalsy();
    expect(loja().allTasks().find(t => t.id === 'lixo').who).toBe('Mia');
  });

  it('o Léo propõe pela folha, e vê a proposta à espera com «Retirar a proposta»', () => {
    const { r, texto, loja } = kidApp('Léo', null);
    expect(texto()).not.toContain('Trocas');
    tocar(r, 'Propor uma troca');
    let tx = texto();
    expect(tx).toContain('A minha tarefa');
    expect(tx).toContain('Pela tarefa da Mia');
    expect(tx).toContain('Regar as plantas da varanda');
    // A tarefa feita da Mia não está para trocar.
    expect(tx).not.toContain('Levantar a mesa do jantar');
    tocar(r, 'Propor à Mia');
    expect(loja().trocasDe('Léo')).toHaveLength(1);
    tx = texto();
    expect(tx).toContain('Propôs à Mia: «Pôr o lixo na rua» pela «Regar as plantas da varanda»');
    expect(tx).toContain('à espera');
    tocar(r, 'Retirar a proposta');
    expect(loja().trocasDe('Léo')).toEqual([]);
  });

  it('sem irmão com tarefas por fazer, não há botão', () => {
    const { texto } = kidApp('Léo', { done: { lixo: false, mesa: true, mochila: false, roupa: false, plantas: true } });
    expect(texto()).not.toContain('Propor uma troca');
  });

  it('a Rita vê a troca no Início e anula-a nas Tarefas', () => {
    const { texto } = montar(Inicio, { t: T, user: 'Rita', go: nada, onSaude: nada, onEquip: nada, onFicha: nada, onAbrir: nada },
      { trocas: [ACEITE] });
    expect(texto()).toContain('Troca de tarefas · Léo e Mia');
    expect(texto()).toContain('«Pôr o lixo na rua» por «Regar as plantas da varanda» · aceite');

    const { r, texto: tx, loja } = montar(Tarefas, { t: T, user: 'Rita' }, { trocas: [ACEITE] });
    expect(tx()).toContain('Trocas de Hoje');
    expect(tx()).toContain('Léo e Mia: «Pôr o lixo na rua» por «Regar as plantas da varanda»');
    tocar(r, 'Anular a troca');
    expect(loja().trocasDeHoje()).toEqual([]);
    expect(tx()).not.toContain('Trocas de Hoje');
  });
});
