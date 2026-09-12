/**
 * A medicação a partir da receita — o plano de tomas, a Agenda, e cada toma
 * com quem e quando.
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 12/09/2026, a sexta das dez funcionalidades. Na receita: dose, frequência,
 * duração, tamanho da caixa. «Pôr na Agenda» cria os eventos «só adultos»;
 * cada toma marca-se e fica com quem e quando. Aviso quando a caixa acaba antes
 * da receita. As tomas sobem pelo travão de casa, por decisão do dono da casa.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. A receita ganha três campos nos DOIS sítios; `tomas_saude` nasce nos
 *      dois, aditiva, com índice (receita, quando), regra pela receita, e
 *      dentro do travão `SAUDE`. A leitura da ficha traz as tomas.
 *   2. O plano é puro: fim, doses, a caixa que acaba antes.
 *   3. Marcar acrescenta uma linha; a mesma no mesmo minuto recusa-se; só
 *      quem marcou desmarca; «quantas» é a contagem (INVARIANTE #2).
 *   4. Pôr na Agenda cria um evento «adultos» por dia do plano, de hoje em
 *      diante, sem duplicar; a criança não vê nada disto.
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
const { TODAY_KEY, chaveRelativa } = require('../src/format');
const { planoDaReceita, chaveDaReceita, tomasDoDia, diaDoInstante } = require('../src/medicacao');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const Saude = require('../src/screens/Saude').default;
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
const saude = (patch) => montar(Saude, { t: T, user: 'Rita', onClose: () => {}, onAbrirFicha: () => {} }, patch);
const hospedeiro = (r, label) => r.root.findAll(n => typeof n.type === 'string' && n.props
  && typeof n.props.accessibilityLabel === 'string'
  && (n.props.accessibilityLabel === label || n.props.accessibilityLabel.startsWith(`${label} — `))).pop();
const tocar = (r, label) => {
  const alvo = hospedeiro(r, label);
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  TestRenderer.act(() => { (alvo.props.onPress || alvo.props.onClick)(); });
};

// A consulta-semente do Léo (h2, há 12 dias) leva a receita de prova.
const H = 'h2';
const FERRO = { id: 'rx-ferro', name: 'Ferro 30 mg', dosage: '1 comprimido', quantity: '', unit: '', expiresAt: '31/12/2026', decision: null,
  frequency: 1, durationDays: 14, boxSize: 20 };
const COM_RECEITA = { healthRecipes: { [H]: [FERRO] }, healthTomas: {} };

describe('⚠ a medicação: o servidor', () => {
  it('a receita ganha o plano nos dois sítios; as tomas nascem nos dois, aditivas e pela receita', () => {
    const cria = ler('db/pocketbase/criar-colecoes.mjs');
    const acresc = ler('db/pocketbase/acrescentar-campos.mjs');
    for (const campo of ['frequencia', 'duracao_dias', 'caixa']) {
      expect(cria).toMatch(new RegExp(`num\\('${campo}', \\{ min: 0, onlyInt: true \\}\\)`));
      expect(acresc).toMatch(new RegExp(`\\['receitas_saude', '${campo}', \\{ type: 'number', min: 0, onlyInt: true \\}\\]`));
    }
    for (const txt of [cria, acresc]) {
      expect(txt).toMatch(/CREATE UNIQUE INDEX idx_toma_por_instante ON tomas_saude \(receita, quando\)/);
      expect(txt).toMatch(/receita\.episodio\.casa = @request\.auth\.casa/);
      expect(txt).toMatch(/por = @request\.auth\.id/);
      expect(txt).toMatch(/updateRule: null/);
    }
    expect(cria).toMatch(/name: 'tomas_saude', type: 'base'/);
    expect(JSON.parse(ler('package.json')).scripts['db:provar']).toMatch(/provar-medicacao\.mjs/);
    expect(fs.existsSync(path.join(RAIZ, 'db/pocketbase/provar-medicacao.mjs'))).toBe(true);
  });

  it('⚠ as tomas estão dentro do travão de casa, e a ficha desce com elas', () => {
    const sync = ler('src/sync.js');
    const i = sync.indexOf('const SAUDE = [');
    expect(sync.slice(i, sync.indexOf(']', i))).toContain("'tomas_saude'");
    expect(semComentarios(sync)).toMatch(/export async function tomaDeSaude\(/);
    expect(semComentarios(sync)).toMatch(/for \(const \w+ of ficha\.tomas \|\| \[\]\)/);
    expect(semComentarios(ler('src/pocketbase.js'))).toMatch(/collection\('tomas_saude'\)/);
    expect(ler('src/o-que-sobe.js')).toMatch(/healthTomas: \['linhas',[^\n]*'tomaDeSaude'\]/);
  });
});

describe('⚠ a medicação: o plano é puro', () => {
  it('fim, doses, e a caixa que chega ou não', () => {
    const p = planoDaReceita(FERRO, 'd2026-09-09');
    expect(p).toMatchObject({ frequencia: 1, duracao: 14, caixa: 20, doses: 14, inicio: 'd2026-09-09', fim: 'd2026-09-22', caixaChega: true, caixaAcabaEm: null, aviso: null });
    expect(p.dias.length).toBe(14);
    expect(p.descricao).toBe('1 toma por dia · 14 dias · caixa de 20');
    const curta = planoDaReceita({ ...FERRO, frequency: 2, boxSize: 20 }, 'd2026-09-09');
    expect(curta.doses).toBe(28);
    expect(curta.caixaChega).toBe(false);
    expect(curta.caixaAcabaEm).toBe('d2026-09-18');
    expect(curta.aviso).toBe('A caixa acaba a 18/09/2026, antes de a receita terminar (22/09/2026).');
    expect(planoDaReceita({ ...FERRO, frequency: 0 }, 'd2026-09-09')).toBeNull();
    expect(planoDaReceita(FERRO, 'hoje')).toBeNull();
  });

  it('a chave da receita é a do servidor mal exista; o dia da toma é o de quem olha', () => {
    expect(chaveDaReceita({ id: 'rx-1' })).toBe('rx-1');
    expect(chaveDaReceita({ id: 'rx-1', idServidor: 'abc' })).toBe('srv-abc');
    const d = new Date(2026, 7, 20, 23, 30);
    expect(diaDoInstante(d.toISOString())).toBe('d2026-08-20');
    expect(tomasDoDia([{ quando: d.toISOString() }, { quando: new Date(2026, 7, 19, 8).toISOString() }], 'd2026-08-20').length).toBe(1);
  });
});

describe('⚠ a medicação: a loja', () => {
  it('a receita nasce com o plano, e o plano define-se depois com validação', () => {
    const { loja } = saude(null);
    TestRenderer.act(() => { loja().addRecipe(H, 'Ferro', '1 comp.', '', '', '31/12/2026', { frequency: '2', durationDays: '10', boxSize: '20' }); });
    const rx = loja().s.healthRecipes[H][0];
    expect(rx).toMatchObject({ frequency: 2, durationDays: 10, boxSize: 20 });
    expect(loja().definirTomas(H, rx.id, { frequency: 0, durationDays: 5 })).toMatch(/por dia/);
    expect(loja().definirTomas(H, rx.id, { frequency: 1, durationDays: 0 })).toMatch(/dias/);
    expect(loja().definirTomas(H, 'rx-x', { frequency: 1, durationDays: 1 })).toMatch(/não existe/);
    let r;
    TestRenderer.act(() => { r = loja().definirTomas(H, rx.id, { frequency: 1, durationDays: 14, boxSize: 0 }); });
    expect(r).toBeNull();
    expect(loja().s.healthRecipes[H][0]).toMatchObject({ frequency: 1, durationDays: 14, boxSize: 0 });
  });

  it('⚠ marcar acrescenta uma LINHA; a mesma no mesmo minuto recusa-se; só quem marcou desmarca', () => {
    const { loja } = saude(COM_RECEITA);
    const agora = new Date(2026, 7, 20, 8, 10).toISOString();
    let r;
    TestRenderer.act(() => { r = loja().marcarToma(H, 'rx-ferro', 'Rita', agora); });
    expect(r).toBeNull();
    expect(loja().tomasDaReceita(H, 'rx-ferro')).toHaveLength(1);
    expect(loja().tomasDaReceita(H, 'rx-ferro')[0]).toMatchObject({ por: 'Rita', quando: agora });
    expect(loja().marcarToma(H, 'rx-ferro', 'Rita', agora)).toMatch(/já está marcada/);
    expect(loja().marcarToma(H, 'rx-ferro', 'Léo', agora)).toMatch(/adulto/);
    TestRenderer.act(() => { loja().marcarToma(H, 'rx-ferro', 'Tomás', new Date(2026, 7, 20, 20, 0).toISOString()); });
    expect(loja().tomasDaReceita(H, 'rx-ferro')).toHaveLength(2);
    // Quantas hoje é a CONTAGEM.
    expect(tomasDoDia(loja().tomasDaReceita(H, 'rx-ferro'), TODAY_KEY)).toHaveLength(2);
    const daRita = loja().tomasDaReceita(H, 'rx-ferro').find(tm => tm.por === 'Rita');
    expect(loja().desmarcarToma(H, 'rx-ferro', daRita.id, 'Tomás')).toMatch(/Só Rita/);
    TestRenderer.act(() => { r = loja().desmarcarToma(H, 'rx-ferro', daRita.id, 'Rita'); });
    expect(r).toBeNull();
    expect(loja().tomasDaReceita(H, 'rx-ferro')).toHaveLength(1);
  });

  it('⚠ pôr na Agenda cria um evento «adultos» por dia do plano, de hoje em diante, sem duplicar', () => {
    // A consulta h2 foi há 12 dias; 14 dias de plano deixam 2 dias de hoje em diante.
    const { loja } = saude(COM_RECEITA);
    expect(loja().agendaTemTomas(H, 'rx-ferro')).toBe(false);
    let n;
    TestRenderer.act(() => { n = loja().porTomasNaAgenda(H, 'rx-ferro', 'Rita'); });
    expect(n).toBe(2);
    const eventos = loja().allEvents().filter(e => e.tag === 'Medicação');
    expect(eventos).toHaveLength(2);
    expect(eventos.map(e => e.day).sort()).toEqual([TODAY_KEY, chaveRelativa(1)]);
    expect(eventos[0]).toMatchObject({ title: 'Ferro 30 mg · 1 toma', visibilidade: 'adultos', healthId: H, owner: 'Rita' });
    expect(loja().agendaTemTomas(H, 'rx-ferro')).toBe(true);
    // Segunda vez: nada entra.
    TestRenderer.act(() => { n = loja().porTomasNaAgenda(H, 'rx-ferro', 'Rita'); });
    expect(n).toBe(0);
    expect(loja().allEvents().filter(e => e.tag === 'Medicação')).toHaveLength(2);
    // E sem plano, a frase.
    TestRenderer.act(() => { loja().set({ healthRecipes: { [H]: [{ ...FERRO, frequency: 0 }] } }); });
    expect(loja().porTomasNaAgenda(H, 'rx-ferro', 'Rita')).toMatch(/Defina primeiro/);
    // ⚠ E a criança não vê o evento: é «adultos».
    expect(loja().podeVerEvento(eventos[0], 'Léo')).toBe(false);
  });

  it('apagar a consulta leva as tomas das receitas dela', () => {
    const { loja } = saude(COM_RECEITA);
    TestRenderer.act(() => { loja().marcarToma(H, 'rx-ferro', 'Rita'); });
    expect(Object.keys(loja().s.healthTomas)).toEqual(['rx-ferro']);
    TestRenderer.act(() => { loja().apagarConsulta(H, 'Rita'); });
    expect(loja().s.healthTomas).toEqual({});
  });

  it('nenhum ecrã escreve healthTomas por fora da loja', () => {
    for (const f of ['src/screens/Saude.jsx', 'src/sheets/TomasDaReceita.jsx', 'src/screens/FichaSaude.jsx']) {
      expect(semComentarios(ler(f))).not.toMatch(/\bhealthTomas:\s/);
    }
  });
});

describe('⚠ a medicação: os ecrãs', () => {
  it('a receita mostra o plano e abre a folha das tomas; marcar conta', () => {
    const { r, texto } = saude(COM_RECEITA);
    tocar(r, 'Pediatria, Léo · precisa de ação');
    expect(texto()).toContain('1 toma por dia · 14 dias · caixa de 20');
    tocar(r, 'Tomas de Ferro 30 mg');
    let tx = texto();
    expect(tx).toContain('Plano de tomas');
    expect(tx).toContain('Pôr as tomas na Agenda');
    expect(tx).toContain('Ainda nenhuma toma marcada hoje');
    tocar(r, 'Tomado agora');
    tx = texto();
    expect(tx).toContain('tomado');
    expect(tx).toContain('Rita');
    expect(tx).toContain('Hoje · 1 toma de 1');
  });

  it('a folha avisa quando a caixa acaba antes da receita', () => {
    const { r, texto } = saude({ healthRecipes: { [H]: [{ ...FERRO, frequency: 2 }] }, healthTomas: {} });
    tocar(r, 'Pediatria, Léo · precisa de ação');
    expect(texto()).toMatch(/A caixa acaba a \d{2}\/\d{2}\/\d{4}, antes de a receita terminar/);
  });

  it('⚠ a criança não vê tomas nem medicação em lado nenhum da app dela', () => {
    for (const tab of ['tarefas', 'compras', 'cofre']) {
      const { texto } = montar(KidApp, { kid: 'Léo', kidTab: tab, setKidTab: () => {}, onLogout: () => {} },
        { ...COM_RECEITA, healthTomas: { 'rx-ferro': [{ id: 't1', quando: new Date().toISOString(), por: 'Rita' }] } });
      expect(texto()).not.toContain('Ferro 30 mg');
      expect(texto()).not.toContain('toma');
    }
  });
});
