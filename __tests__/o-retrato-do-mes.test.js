/**
 * O retrato do mês — uma página por mês, SOMADA das linhas que já existem.
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 12/09/2026, a décima das dez funcionalidades. Ao fechar o mês, e depois em
 * Documentação › Nesta casa: o gasto por envelope contra o limite, as tarefas
 * e os pontos por criança, as compras, os acertos; exporta em PDF.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. Nenhum campo novo: `retratosDe` soma as linhas do intervalo de cada mês,
 *      e um mês fechado não muda quando o seguinte abre.
 *   2. O documento tem as quatro secções, sempre, e diz de que mês é.
 *   3. O Dinheiro tem a linha; a Documentação lista os meses; fechar o mês abre
 *      o retrato; a app da criança não tem porta nenhuma para ele.
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
const { EUR } = require('../src/format');
const { retratosDe, documentoDoRetrato, nomeDoFicheiroDoRetrato, nomeDoMes } = require('../src/retrato-do-mes');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const Dinheiro = require('../src/screens/Dinheiro').default;
const Documentacao = require('../src/screens/Documentacao').default;
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
const nada = () => {};
const hospedeiro = (r, label) => r.root.findAll(n => typeof n.type === 'string' && n.props
  && typeof n.props.accessibilityLabel === 'string'
  && (n.props.accessibilityLabel === label || n.props.accessibilityLabel.startsWith(`${label} — `))).pop();
const tocar = (r, label) => {
  const alvo = hospedeiro(r, label);
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  TestRenderer.act(() => { (alvo.props.onPress || alvo.props.onClick)(); });
};

// Uma casa crua, como o servidor a devolve: dois meses, despesas dos dois lados
// da fronteira, uma anulada, tarefas confirmadas e por confirmar.
const CASA = {
  membros: [{ id: 'r', nome: 'Rita', papel: 'admin' }, { id: 'l', nome: 'Léo', papel: 'crianca' }, { id: 'm', nome: 'Mia', papel: 'crianca' }],
  envelopes: [{ id: 'e1', nome: 'Mercearia', limite_base: 450 }, { id: 'e2', nome: 'Lazer', limite_base: 120 }],
  meses: [
    { id: 'm9', mes: '2026-09-01 00:00:00.000Z', rendimento: 3000, limites: { Mercearia: 500 } },
    { id: 'm8', mes: '2026-08-01 00:00:00.000Z', rendimento: 3000, fechado_em: '2026-08-31 00:00:00.000Z', limites: { Mercearia: 450, Lazer: 120 } },
  ],
  despesas: [
    { envelope: 'e1', valor: 100.5, data: '2026-08-03 00:00:00.000Z' },
    { envelope: 'e2', valor: 20, data: '2026-08-31 10:00:00.000Z', divide_meias: true },
    { envelope: 'e1', valor: 999, data: '2026-08-15 00:00:00.000Z', anula_id: 'x' },
    { envelope: 'e1', valor: 30.25, data: '2026-09-01 00:00:00.000Z' },
    { envelope: 'e2', valor: 10, data: '2026-09-10 00:00:00.000Z', divide_meias: true },
    { envelope: 'e1', valor: 5, data: 'não é data' },
  ],
  tarefas: [{ id: 't1', atribuido_a: 'l', pontos: 3 }, { id: 't2', atribuido_a: 'm', pontos: 2 }],
  tarefas_feitas: [
    { tarefa: 't1', data: '2026-08-05 00:00:00.000Z', confirmada_em: '2026-08-05 20:00:00.000Z' },
    { tarefa: 't1', data: '2026-08-06 00:00:00.000Z', confirmada_em: '2026-08-06 20:00:00.000Z' },
    { tarefa: 't1', data: '2026-08-07 00:00:00.000Z' },
    { tarefa: 't2', data: '2026-08-05 00:00:00.000Z', confirmada_em: '2026-08-05 20:00:00.000Z' },
    { tarefa: 't1', data: '2026-09-02 00:00:00.000Z', confirmada_em: '2026-09-02 20:00:00.000Z' },
  ],
  listas_compras: [{ fechada_em: '2026-08-20 18:00:00.000Z', total: 87.4 }, { fechada_em: '2026-09-05 18:00:00.000Z', total: 12 }, { total: 5 }],
  acertos: [{ de_membro: 't', para_membro: 'r', valor: 40, data: '2026-08-28 00:00:00.000Z' }],
};
const NOMES = { r: 'Rita', l: 'Léo', m: 'Mia' };

describe('⚠ o retrato do mês: a soma das linhas', () => {
  it('um retrato por mês, do mais recente para o mais antigo, com os intervalos certos', () => {
    const [set, ago] = retratosDe(CASA, NOMES);
    expect(set).toMatchObject({ nome: 'Setembro de 2026', aberto: true, inicio: 'd2026-09-01', fechadoEm: null });
    expect(ago).toMatchObject({ nome: 'Agosto de 2026', aberto: false, inicio: 'd2026-08-01', fechadoEm: 'd2026-08-31' });
    const env = Object.fromEntries(ago.envelopes.map(e => [e.nome, e]));
    // A anulada não conta; o dia do fecho conta; o limite é o do mês.
    expect(env.Mercearia).toEqual({ nome: 'Mercearia', gasto: 100.5, limite: 450 });
    expect(env.Lazer).toEqual({ nome: 'Lazer', gasto: 20, limite: 120 });
    expect(ago).toMatchObject({ gasto: 120.5, orcamento: 570, despesas: 2, meias: 1 });
    // O dia da abertura já é do mês novo; sem limite escrito, vale o de base.
    const envSet = Object.fromEntries(set.envelopes.map(e => [e.nome, e]));
    expect(envSet.Mercearia).toEqual({ nome: 'Mercearia', gasto: 30.25, limite: 500 });
    expect(envSet.Lazer).toEqual({ nome: 'Lazer', gasto: 10, limite: 120 });
    expect(set.gasto).toBe(40.25);
    // Os envelopes com mais gasto primeiro.
    expect(ago.envelopes.map(e => e.nome)).toEqual(['Mercearia', 'Lazer']);
  });

  it('as tarefas são as CONFIRMADAS do mês, por criança; as compras e os acertos são os do mês', () => {
    const [set, ago] = retratosDe(CASA, NOMES);
    expect(ago.criancas).toEqual([{ nome: 'Léo', feitas: 2, pontos: 6 }, { nome: 'Mia', feitas: 1, pontos: 2 }]);
    expect(set.criancas).toEqual([{ nome: 'Léo', feitas: 1, pontos: 3 }, { nome: 'Mia', feitas: 0, pontos: 0 }]);
    expect(ago.compras).toEqual({ idas: 1, total: 87.4 });
    expect(ago.acertos).toEqual({ n: 1, total: 40 });
    expect(set.compras).toEqual({ idas: 1, total: 12 });
    expect(set.acertos).toEqual({ n: 0, total: 0 });
  });

  it('⚠ um mês fechado não muda quando o seguinte cresce ou quando abre outro', () => {
    const antes = retratosDe(CASA, NOMES).find(r => r.nome === 'Agosto de 2026');
    const maior = {
      ...CASA,
      despesas: [...CASA.despesas, { envelope: 'e1', valor: 77, data: '2026-09-20 00:00:00.000Z' }],
      meses: [...CASA.meses.map(m => (m.id === 'm9' ? { ...m, fechado_em: '2026-09-30 00:00:00.000Z' } : m)),
        { id: 'm10', mes: '2026-10-01 00:00:00.000Z', rendimento: 3000, limites: {} }],
    };
    const depois = retratosDe(maior, NOMES);
    expect(depois.map(r => r.nome)).toEqual(['Outubro de 2026', 'Setembro de 2026', 'Agosto de 2026']);
    expect(depois.find(r => r.nome === 'Agosto de 2026')).toEqual(antes);
    expect(depois.find(r => r.nome === 'Setembro de 2026').gasto).toBe(117.25);
    expect(depois.find(r => r.nome === 'Outubro de 2026').gasto).toBe(0);
    // Sem meses não há retratos — é o que a criança recebe.
    expect(retratosDe({ ...CASA, meses: [] }, NOMES)).toEqual([]);
    expect(nomeDoMes('d2026-02-01')).toBe('Fevereiro de 2026');
  });

  it('o documento tem as quatro secções, sempre, e diz de que mês é', () => {
    const [set, ago] = retratosDe(CASA, NOMES);
    const html = documentoDoRetrato({ retrato: ago, casa: 'Bengui', hoje: 'd2026-08-20' });
    // O título da secção pode levar o total à direita (`<span>`), como no ecrã.
    for (const s of ['Dinheiro', 'Tarefas', 'Compras', 'Contas entre nós']) {
      expect(html).toMatch(new RegExp(`<h2>${s}(<span>[^<]*</span>)?</h2>`));
    }
    expect(html).toContain('Retrato de Agosto de 2026');
    expect(html).toContain('mês fechado a 31/08');
    // Pelo `EUR`, e não por literais: o euro leva um espaço inquebrável antes
    // do símbolo (INVARIANTE #4), e um espaço normal escrito à mão não é igual.
    // Os números à direita da linha, como no Dinheiro (molde da app, 12/09/2026).
    expect(html).toContain(`<strong>Mercearia</strong><span class="dir">${EUR(100.5)} de ${EUR(450)}</span>`);
    expect(html).toContain('<strong>Léo</strong><span class="dir">2 tarefas feitas · 6 pontos</span>');
    expect(html).toContain(`1 ida às compras · ${EUR(87.4)}`);
    expect(html).toContain(`1 despesa a meias · 1 acerto · ${EUR(40)}`);
    const vazio = documentoDoRetrato({ retrato: { ...set, envelopes: [], criancas: [], compras: { idas: 0, total: 0 } }, casa: 'B', hoje: 'd2026-08-20' });
    expect(vazio).toContain('Sem despesas neste mês.');
    expect(vazio).toContain('Sem crianças na casa.');
    expect(vazio).toContain('mês em curso');
    const feio = documentoDoRetrato({ retrato: { ...set, envelopes: [{ nome: '<script>', gasto: 1, limite: 2 }] }, casa: 'B', hoje: 'd2026-08-20' });
    expect(feio).not.toContain('<script>');
    expect(nomeDoFicheiroDoRetrato(ago)).toBe('retrato-2026-08.pdf');
  });
});

describe('⚠ o retrato do mês: a leitura e a loja', () => {
  it('o `puxarCasa` devolve `retratos`, a loja lê-os, e nada sobe', () => {
    const sync = semComentarios(ler('src/sync.js'));
    expect(sync).toMatch(/const retratos = retratosDe\(casa, nomeDoMembro\)/);
    expect(sync).toMatch(/^\s{4}retratos,$/m);
    expect(ler('src/o-que-sobe.js')).toMatch(/retratos: \['local',/);
    expect(semComentarios(ler('src/store.jsx'))).toMatch(/retratos: casa\.retratos \|\| \[\]/);
    expect(JSON.parse(ler('package.json')).scripts['db:provar']).toMatch(/provar-retrato\.mjs/);
    expect(fs.existsSync(path.join(RAIZ, 'db/pocketbase/provar-retrato.mjs'))).toBe(true);
    // Nenhum campo novo: as duas listas do servidor não mudaram por isto.
    expect(ler('db/pocketbase/criar-colecoes.mjs')).not.toMatch(/retrato/i);
    expect(ler('db/pocketbase/acrescentar-campos.mjs')).not.toMatch(/retrato/i);
  });

  it('sem servidor há um retrato só, o do mês corrente, feito das somas do Dinheiro', () => {
    const { loja } = montar(Dinheiro, { t: T, user: 'Rita', onEquip: nada }, null);
    const lista = loja().retratosDaCasa();
    expect(lista).toHaveLength(1);
    const r = lista[0];
    expect(r.aberto).toBe(true);
    expect(r.inicio).toBe('d2026-08-01');
    expect(r.nome).toBe('Agosto de 2026');
    expect(r.gasto).toBe(loja().spent);
    expect(r.orcamento).toBe(loja().budget);
    expect(r.envelopes.map(e => e.nome).sort()).toEqual(loja().envelopes.map(e => e.name).sort());
    expect(r.criancas.map(c => c.nome)).toEqual(loja().criancas);
    for (const c of r.criancas) expect(c.pontos).toBe(loja().kidPts[c.nome]);
    // Com servidor, manda o que ele somou.
    const { loja: l2 } = montar(Dinheiro, { t: T, user: 'Rita', onEquip: nada },
      { retratos: retratosDe(CASA, NOMES) });
    expect(l2().retratosDaCasa().map(x => x.nome)).toEqual(['Setembro de 2026', 'Agosto de 2026']);
    expect(l2().retratoDoMesAberto().nome).toBe('Setembro de 2026');
  });
});

describe('⚠ o retrato do mês: os ecrãs', () => {
  it('o Dinheiro tem a linha, que abre a folha com as quatro secções e «Exportar em PDF»', () => {
    const { r, texto } = montar(Dinheiro, { t: T, user: 'Rita', onEquip: nada }, null);
    expect(texto()).toContain('Retrato do Mês');
    expect(texto()).toContain('Retrato de Agosto de 2026');
    tocar(r, 'Retrato de Agosto de 2026');
    const tx = texto();
    for (const s of ['Dinheiro', 'Tarefas', 'Compras', 'Contas entre Nós']) expect(tx).toContain(s);
    expect(tx).toContain('Mês em curso · até hoje');
    expect(tx).toContain('Exportar em PDF');
    expect(tx).toMatch(/Léo · \d+ tarefas? feitas? · \d+ pontos?/);
  });

  it('fechar o mês abre o retrato do mês que fechou', () => {
    const { r, texto, loja } = montar(Dinheiro, { t: T, user: 'Rita', onEquip: nada }, null);
    tocar(r, `Fechar ${loja().s.monthName}`);
    tocar(r, 'Confirmar Encerramento');
    expect(texto()).toContain('Retrato de Agosto de 2026');
    expect(texto()).toContain('Mês fechado a 20/08/2026');
  });

  it('a Documentação › Nesta casa lista os meses, do mais recente para o mais antigo', () => {
    const { r, texto } = montar(Documentacao, { t: T, onIr: nada, podeGerir: true },
      { retratos: retratosDe(CASA, NOMES) });
    tocar(r, 'Nesta casa');
    const tx = texto();
    expect(tx).toContain('Retratos dos Meses');
    expect(tx.indexOf('Setembro de 2026')).toBeLessThan(tx.indexOf('Agosto de 2026'));
    expect(tx).toContain(`${EUR(120.5)} gastos de ${EUR(570)} · fechado`);
    tocar(r, 'Agosto de 2026');
    expect(texto()).toContain('Retrato de Agosto de 2026');
  });

  it('⚠ a app da criança não tem porta para o retrato — é orçamento', () => {
    for (const tab of ['tarefas', 'compras', 'cofre']) {
      const { texto } = montar(KidApp, { kid: 'Léo', kidTab: tab, setKidTab: nada, onLogout: nada },
        { retratos: retratosDe(CASA, NOMES) });
      expect(texto()).not.toMatch(/[Rr]etrato/);
      // O orçamento do mês — o número que só os adultos veem. («Mercearia» é
      // também um corredor das Compras, por isso não serve de sentinela.)
      expect(texto()).not.toContain('570,00 €');
      expect(texto()).not.toContain('de orçamento');
    }
    expect(semComentarios(ler('src/KidApp.jsx'))).not.toMatch(/retrato/i);
  });
});
