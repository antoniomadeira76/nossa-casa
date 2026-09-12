/**
 * O que a revisão de 13/09/2026 apanhou — e não pode voltar.
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * «Testa o código, procura por bugs no código e na app.» Três leituras (lógica,
 * servidor, ecrãs) sobre o que se escreveu de 11 a 13/09 deram vinte achados;
 * os que eram defeitos ficam aqui, um por `it`, para que a correção não se
 * perca na próxima vez que alguém mexer no ficheiro.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. Os pontos de uma tarefa trocada são de quem a tem NO DIA: a troca de
 *      hoje não muda o histórico do mês.
 *   2. O limite de um envelope no retrato do mês conta as transferências do
 *      mês, como o Dinheiro.
 *   3. A folha «Mover Dinheiro» abre numa casa com dois envelopes — e com um.
 *   4. A urgência e o prazo passam pela loja (e sobem); «Sem prazo» liga.
 *   5. A aceitação de uma troca tranca a `casa` e exige a data, nos dois sítios.
 *   6. A página pública da lista não indexa nem se guarda, e um corredor
 *      chamado «constructor» não a deita abaixo.
 *   7. Textos honestos: sem «A Rita ou o Tomás» à mão, sem botão «Repetir
 *      compra» morto, sem «Envelope Mercearia 0,00 €» numa casa sem ele.
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
const { retratosDe } = require('../src/retrato-do-mes');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const KidApp = require('../src/KidApp').default;
const Dinheiro = require('../src/screens/Dinheiro').default;
const Compras = require('../src/screens/Compras').default;

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
const dinheiro = (patch) => montar(Dinheiro, { t: T, user: 'Rita', go: nada, onEquip: nada }, patch);
const compras = (patch) => montar(Compras, { t: T, user: 'Rita', onModoCompras: nada, onIda: nada }, patch);
const hospedeiro = (r, label) => r.root.findAll(n => typeof n.type === 'string' && n.props
  && typeof n.props.accessibilityLabel === 'string'
  && (n.props.accessibilityLabel === label || n.props.accessibilityLabel.startsWith(`${label} — `))).pop();
const tocar = (r, label) => {
  const alvo = hospedeiro(r, label);
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  TestRenderer.act(() => { (alvo.props.onPress || alvo.props.onClick)(); });
};

// O Léo deu o lixo à Mia pelas plantas, hoje, e ela aceitou.
const ACEITE = { id: 'tr-2', idServidor: null, dia: TODAY_KEY, de: 'lixo', para: 'plantas',
  propostaPor: 'Léo', aceiteEm: '2026-09-13T10:00:00.000Z', aceitePor: 'Mia' };
const HOJE_ISO = TODAY_KEY.slice(1);

describe('⚠ 1. os pontos de uma tarefa trocada são de quem a tem no dia', () => {
  it('a troca de hoje não passa o histórico do mês de um irmão para o outro', () => {
    // Dois lixos confirmados em dias passados (do Léo), umas plantas de ontem (da
    // Mia), e o lixo de HOJE, feito pela Mia por causa da troca.
    const feitas = {
      'lixo|2026-09-01': { id: 'f1', confirmada: true },
      'lixo|2026-09-02': { id: 'f2', confirmada: true },
      'plantas|2026-09-02': { id: 'f3', confirmada: true },
      [`lixo|${HOJE_ISO}`]: { id: 'f4', confirmada: true },
    };
    const { loja: semTroca } = kidApp('Mia', { feitas });
    const { loja: comTroca } = kidApp('Mia', { feitas, trocas: [ACEITE] });
    const porId = Object.fromEntries(comTroca().allTasks().map(t => [t.id, t]));
    expect(porId.lixo.who).toBe('Mia');
    const lixo = porId.lixo.pts;
    // Sem troca: o Léo tem os três lixos; com troca: os dois de antes ficam com
    // ele, e o de hoje passa para a Mia. Nem mais, nem menos.
    expect(semTroca().kidPts.Léo - comTroca().kidPts.Léo).toBe(lixo);
    expect(comTroca().kidPts.Mia - semTroca().kidPts.Mia).toBe(lixo);
  });
});

describe('⚠ 2. o retrato do mês conta as transferências entre envelopes', () => {
  const CASA = {
    membros: [{ id: 'r', nome: 'Rita', papel: 'admin' }],
    envelopes: [{ id: 'e1', nome: 'Mercearia', limite_base: 450 }, { id: 'e2', nome: 'Lazer', limite_base: 120 }],
    meses: [
      { id: 'm9', mes: '2026-09-01 00:00:00.000Z', rendimento: 3000, limites: { Mercearia: 500 } },
      { id: 'm8', mes: '2026-08-01 00:00:00.000Z', rendimento: 3000, fechado_em: '2026-08-31 00:00:00.000Z', limites: { Mercearia: 450, Lazer: 120 } },
    ],
    despesas: [{ envelope: 'e1', valor: 520, data: '2026-09-10 00:00:00.000Z' }],
    transferencias: [
      { de_envelope: 'e2', para_envelope: 'e1', valor: 50, mes: '2026-09-01 00:00:00.000Z' },
      { de_envelope: 'e1', para_envelope: 'e2', valor: 20, mes: '2026-08-01 00:00:00.000Z' },
    ],
  };
  it('o limite do envelope é o do mês MAIS o que se moveu nesse mês — e o total não muda', () => {
    const [set, ago] = retratosDe(CASA, { r: 'Rita' });
    const envSet = Object.fromEntries(set.envelopes.map(e => [e.nome, e]));
    expect(envSet.Mercearia).toEqual({ nome: 'Mercearia', gasto: 520, limite: 550 });
    expect(envSet.Lazer).toEqual({ nome: 'Lazer', gasto: 0, limite: 70 });
    expect(set.orcamento).toBe(620);
    // Setembro moveu 50 € para a Mercearia: 520 € gastos NÃO estão acima de 550.
    expect(envSet.Mercearia.gasto > envSet.Mercearia.limite).toBe(false);
    const envAgo = Object.fromEntries(ago.envelopes.map(e => [e.nome, e]));
    expect(envAgo.Mercearia.limite).toBe(430);
    expect(envAgo.Lazer.limite).toBe(140);
    expect(ago.orcamento).toBe(570);
  });
});

describe('⚠ 3. «Mover Dinheiro» abre numa casa com poucos envelopes', () => {
  const dois = [{ id: 'a', name: 'Mercearia', limit: 500, color: null }, { id: 'b', name: 'Lazer', limit: 100, color: null }];
  it('com dois envelopes a folha diz de qual para qual — não rebenta em `envelopes[3]`', () => {
    const { r, texto } = dinheiro({ envelopesDaCasa: dois });
    tocar(r, 'mover dinheiro entre envelopes');
    expect(texto()).toMatch(/O limite de Mercearia passa a/);
    expect(texto()).toMatch(/e o de Lazer a/);
  });
  it('com um envelope só, também não rebenta', () => {
    const { r, texto } = dinheiro({ envelopesDaCasa: dois.slice(0, 1) });
    tocar(r, 'mover dinheiro entre envelopes');
    expect(texto()).toMatch(/Mover Dinheiro/);
  });
});

describe('⚠ 4. a urgência e o prazo passam pela loja', () => {
  it('o ecrã das Tarefas não escreve `urg` nem `due` por fora da loja', () => {
    const tarefas = semComentarios(ler('src/screens/Tarefas.jsx'));
    expect(tarefas).not.toMatch(/set\(x => \(\{ urg:/);
    expect(tarefas).not.toMatch(/due: \{ \.\.\.x\.due/);
    expect(tarefas).toMatch(/mudarUrgencia\(task\.id, v\)/);
    expect(tarefas).toMatch(/mudarPrazo\(task\.id, task\.dueKey \? null : \{ key: TODAY_KEY/);
  });
  it('a loja sobe a urgência e o prazo pelo `alterarTarefa`', () => {
    const loja = semComentarios(ler('src/store.jsx'));
    expect(loja).toMatch(/sync\.alterarTarefa\(noServidor, \{ urgencia: n \}\)/);
    expect(loja).toMatch(/sync\.alterarTarefa\(noServidor, \{ prazo: /);
  });
  it('«Sem prazo» LIGA — para hoje às 18:00 — e desliga', () => {
    const { loja } = kidApp('Léo', null);
    TestRenderer.act(() => { loja().mudarPrazo('lixo', null); });
    expect(loja().allTasks().find(t => t.id === 'lixo').dueKey).toBeFalsy();
    TestRenderer.act(() => { loja().mudarPrazo('lixo', { key: TODAY_KEY, time: '18:00' }); });
    expect(loja().allTasks().find(t => t.id === 'lixo')).toMatchObject({ dueKey: TODAY_KEY, dueTime: '18:00' });
    TestRenderer.act(() => { loja().mudarPrazo('lixo', null); });
    expect(loja().allTasks().find(t => t.id === 'lixo').dueKey).toBeFalsy();
    TestRenderer.act(() => { loja().mudarUrgencia('lixo', 0); });
    expect(loja().allTasks().find(t => t.id === 'lixo').urgency).toBe(0);
  });
  it('uma tarefa que alterna entre as crianças não entra numa troca — o servidor recusava-a', () => {
    const { loja } = kidApp('Léo', { rotate: { lixo: true } });
    expect(loja().tarefasParaTrocar('Léo').minhas.map(t => t.id)).not.toContain('lixo');
    expect(loja().tarefasParaTrocar('Mia').deles.map(t => t.id)).not.toContain('lixo');
  });
});

describe('⚠ 5. e 6. o servidor: a aceitação tranca a casa; a página pública não se guarda', () => {
  it('a `updateRule` das trocas exige a data e tranca a `casa`, nos dois sítios', () => {
    for (const f of ['db/pocketbase/criar-colecoes.mjs', 'db/pocketbase/acrescentar-campos.mjs']) {
      const txt = ler(f);
      // A definição da coleção, não a lista de nomes: o índice único só está lá.
      const i = txt.indexOf('idx_troca_para_por_dia');
      expect(i).toBeGreaterThan(0);
      const bloco = txt.slice(i, i + 3000);
      expect(bloco).toMatch(/@request\.body\.aceite_em != ""/);
      expect(bloco).toMatch(/@request\.body\.casa:isset = false/);
    }
    const prova = ler('db/pocketbase/provar-trocas.mjs');
    expect(prova).toMatch(/não muda a troca de casa/);
    expect(prova).toMatch(/nem assina sem datar/);
  });
  it('a rota `/lista/{sinal}` responde `no-store`, `noindex`, e agrupa num `Map`', () => {
    const hook = semComentarios(ler('db/pocketbase/pb_hooks/partilha-lista.pb.js'));
    expect(hook).toMatch(/set\('Cache-Control', 'no-store'\)/);
    expect(hook).toMatch(/set\('X-Robots-Tag', 'noindex'\)/);
    expect(hook).toMatch(/const porCorredor = new Map\(\)/);
    expect(hook).not.toMatch(/porCorredor\[/);
    const prova = ler('db/pocketbase/provar-partilha.mjs');
    expect(prova).toMatch(/constructor/);
    expect(prova).toMatch(/&lt;script&gt;/);
    expect(prova).toMatch(/cache-control/);
  });
});

describe('⚠ 7. textos honestos', () => {
  it('a app da criança nomeia os adultos DESTA casa, e a folha vazia usa `hint`', () => {
    const kid = semComentarios(ler('src/KidApp.jsx'));
    expect(kid).not.toMatch(/A Rita ou o Tomás/);
    expect(kid).not.toMatch(/<Empty[^>]*\bsub=/);
    expect(kid).toMatch(/SCHEMES\[s\.schemeByUser\[kid\]\] \? s\.schemeByUser\[kid\] : 0/);
  });
  it('as Compras não têm o botão «Repetir compra» morto, nem a Mercearia inventada', () => {
    const src = semComentarios(ler('src/screens/Compras.jsx'));
    expect(src).not.toMatch(/Repetir compra/);
    expect(src).toMatch(/s\.stores\.includes\(comparacao\.loja\)/);
    const { texto } = compras({ envelopesDaCasa: [{ id: 'a', name: 'Casa', limit: 100, color: null }] });
    expect(texto()).not.toMatch(/Envelope Mercearia/);
    expect(compras(null).texto()).toMatch(/Envelope Mercearia/);
  });
  it('o Início não diz «às » sem hora; a partilha não se diz desfeita sem servidor', () => {
    expect(ler('src/screens/Inicio.jsx')).toMatch(/\$\{c\.time \? ` às \$\{c\.time\}` : ''\}/);
    const loja = semComentarios(ler('src/store.jsx'));
    expect(loja).toMatch(/if \(r && r\.pendente\) return 'Só com o servidor ligado se desfaz a partilha/);
    expect(semComentarios(ler('src/sheets/ExportarSaude.jsx'))).not.toMatch(/ficam na aplicação/);
    expect(semComentarios(ler('src/ler-imagem.js'))).toMatch(/Platform\.OS === 'web' \|\| \/\^https\?:/);
  });
});
