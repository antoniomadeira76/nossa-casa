/**
 * A ficha de emergência da criança — alergias, medicação em curso, médico,
 * contactos, e o PDF para a escola.
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 12/09/2026, a sétima das dez funcionalidades. Uma folha na ficha da criança
 * com alergias, medicação em curso (das receitas), médico e contactos;
 * «Exportar» usa o PDF que a Saúde já tem.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. `alergias_saude` nasce nos DOIS sítios, do membro, com as regras da ficha
 *      (a criança não lê a sua), índice único (membro, nome), e dentro do travão.
 *   2. A loja: quem não vê a ficha não vê a ficha de emergência; criar valida
 *      e recusa repetidas; a medicação em curso vem das receitas com plano.
 *   3. O documento tem as quatro secções, sempre, e diz de quem é.
 *   4. A ficha da criança tem a linha; a de um adulto não; a criança não a vê.
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
const { documentoDeEmergencia, nomeDoFicheiroDeEmergencia, GRAVIDADES } = require('../src/exportar-saude');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const FichaSaude = require('../src/screens/FichaSaude').default;
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
const ficha = (member, user, patch) => montar(FichaSaude, { t: T, member, user, onBack: () => {} }, patch);
const hospedeiro = (r, label) => r.root.findAll(n => typeof n.type === 'string' && n.props
  && typeof n.props.accessibilityLabel === 'string'
  && (n.props.accessibilityLabel === label || n.props.accessibilityLabel.startsWith(`${label} — `))).pop();
const tocar = (r, label) => {
  const alvo = hospedeiro(r, label);
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  TestRenderer.act(() => { (alvo.props.onPress || alvo.props.onClick)(); });
};

const AMENDOIM = { id: 'alg-1', idServidor: null, nome: 'Amendoim', gravidade: 'grave', nota: 'Caneta na mochila' };
// A consulta-semente h2 do Léo é de há 12 dias; um plano de 14 dias está em curso.
const FERRO = { id: 'rx-ferro', name: 'Ferro 30 mg', dosage: '1 comprimido', expiresAt: '31/12/2026', frequency: 1, durationDays: 14, boxSize: 20 };
const ANTIGA = { id: 'rx-velha', name: 'Xarope', dosage: '5 ml', expiresAt: '01/01/2026', frequency: 0, durationDays: 0, boxSize: 0 };

describe('⚠ a ficha de emergência: o servidor', () => {
  it('as alergias nascem nos dois sítios, do membro, com as regras da ficha e dentro do travão', () => {
    const cria = ler('db/pocketbase/criar-colecoes.mjs');
    const acresc = ler('db/pocketbase/acrescentar-campos.mjs');
    for (const txt of [cria, acresc]) {
      expect(txt).toMatch(/CREATE UNIQUE INDEX idx_alergia_por_membro ON alergias_saude \(membro, nome\)/);
    }
    expect(cria).toMatch(/name: 'alergias_saude', type: 'base'/);
    expect(cria).toMatch(/sel\('gravidade', \['leve', 'moderada', 'grave'\]\)/);
    const i = cria.indexOf("name: 'alergias_saude'");
    expect(cria.slice(i, i + 900)).toMatch(/listRule: SAUDE_VISIVEL/);
    expect(acresc).toMatch(/nome: 'alergias_saude'/);
    const sync = ler('src/sync.js');
    const j = sync.indexOf('const SAUDE = [');
    expect(sync.slice(j, sync.indexOf(']', j))).toContain("'alergias_saude'");
    expect(semComentarios(sync)).toMatch(/export async function alergiaDeSaude\(/);
    expect(semComentarios(sync)).toMatch(/for \(const \w+ of ficha\.alergias \|\| \[\]\)/);
    expect(semComentarios(ler('src/pocketbase.js'))).toMatch(/collection\('alergias_saude'\)/);
    expect(ler('src/o-que-sobe.js')).toMatch(/healthAlergias: \['linhas',[^\n]*'alergiaDeSaude'\]/);
    expect(JSON.parse(ler('package.json')).scripts['db:provar']).toMatch(/provar-emergencia\.mjs/);
    expect(fs.existsSync(path.join(RAIZ, 'db/pocketbase/provar-emergencia.mjs'))).toBe(true);
  });
});

describe('⚠ a ficha de emergência: a loja', () => {
  it('quem não vê a ficha não vê a de emergência — a criança não vê a sua, um adulto não vê a do outro', () => {
    const { loja } = ficha('Léo', 'Rita', { healthAlergias: { 'Léo': [AMENDOIM] } });
    expect(loja().fichaDeEmergencia('Léo', 'Rita')).not.toBeNull();
    expect(loja().fichaDeEmergencia('Léo', 'Léo')).toBeNull();
    expect(loja().fichaDeEmergencia('Tomás', 'Rita')).toBeNull();
    expect(loja().alergiasDe('Léo', 'Léo')).toEqual([]);
    expect(loja().criarAlergia('Léo', 'Léo', { nome: 'Ovo' })).toMatch(/Não pode/);
  });

  it('criar valida, recusa a repetida, e ordena as graves primeiro', () => {
    const { loja } = ficha('Léo', 'Rita', { healthAlergias: {} });
    expect(loja().criarAlergia('Léo', 'Rita', { nome: '' })).toMatch(/alergia/);
    let r;
    TestRenderer.act(() => { r = loja().criarAlergia('Léo', 'Rita', { nome: 'Pólen', gravidade: 'leve' }); });
    expect(r).toMatchObject({ id: expect.any(String) });
    TestRenderer.act(() => { loja().criarAlergia('Léo', 'Rita', { nome: 'Amendoim', gravidade: 'grave', nota: 'Caneta' }); });
    TestRenderer.act(() => { loja().criarAlergia('Léo', 'Rita', { nome: 'Gatos', gravidade: 'inventada' }); });
    expect(loja().criarAlergia('Léo', 'Rita', { nome: ' amendoim ' })).toMatch(/já está/);
    const lista = loja().alergiasDe('Léo', 'Rita');
    expect(lista.map(a => a.nome)).toEqual(['Amendoim', 'Gatos', 'Pólen']);
    expect(lista[1].gravidade).toBe('moderada');
    TestRenderer.act(() => { r = loja().apagarAlergia('Léo', 'Rita', lista[0].id); });
    expect(r).toBeNull();
    expect(loja().alergiasDe('Léo', 'Rita').map(a => a.nome)).toEqual(['Gatos', 'Pólen']);
  });

  it('a medicação em curso vem das receitas com plano a decorrer ou válidas; o médico das consultas; os contactos dos adultos', () => {
    const { loja } = ficha('Léo', 'Rita', { healthRecipes: { h2: [FERRO, ANTIGA] } });
    const f = loja().fichaDeEmergencia('Léo', 'Rita');
    expect(f.medicacao.map(m => m.nome)).toEqual(['Ferro 30 mg']);
    expect(f.medicacao[0]).toMatchObject({ dose: '1 comprimido', plano: '1 toma por dia · 14 dias · caixa de 20' });
    expect(f.medicos).toContain('Dr.ª Neves');
    expect(f.contactos.map(c => c.nome).sort()).toEqual(['Rita', 'Tomás']);
  });

  it('nenhum ecrã escreve healthAlergias por fora da loja', () => {
    for (const f of ['src/screens/FichaSaude.jsx', 'src/sheets/FichaEmergencia.jsx', 'src/screens/Saude.jsx']) {
      expect(semComentarios(ler(f))).not.toMatch(/\bhealthAlergias:\s/);
    }
  });
});

describe('⚠ o documento', () => {
  it('tem as quatro secções, sempre, e diz de quem é', () => {
    const vazio = documentoDeEmergencia({ membro: 'Léo', casa: 'Bengui', hoje: 'd2026-08-20',
      ficha: { alergias: [], medicacao: [], medicos: [], contactos: [] } });
    for (const s of ['Alergias', 'Medicação atual', 'Médico', 'Contactos']) expect(vazio).toContain(`<h2>${s}</h2>`);
    expect(vazio).toContain('Ficha de emergência · Léo');
    expect(vazio).toContain('Casa Bengui');
    expect(vazio).toContain('Nenhuma alergia conhecida.');
    expect(vazio).toContain('Sem medicação em curso.');
    const cheio = documentoDeEmergencia({ membro: 'Léo', casa: 'Bengui', hoje: 'd2026-08-20',
      ficha: { alergias: [AMENDOIM], medicacao: [{ id: 'x', nome: 'Ferro 30 mg', dose: '1 comp.', plano: '1 toma por dia · 14 dias', ate: 'd2026-08-21' }],
        medicos: ['Dr.ª Neves'], contactos: [{ nome: 'Rita', email: 'rita@x.pt' }] } });
    expect(cheio).toContain('<strong>Amendoim</strong> · grave — Caneta na mochila');
    expect(cheio).toContain('<strong>Ferro 30 mg</strong> · 1 comp. · 1 toma por dia · 14 dias · até');
    expect(cheio).toContain('Dr.ª Neves');
    expect(cheio).toContain('<strong>Rita</strong> · rita@x.pt');
    // E nada por escapar: um nome com «<» não abre uma etiqueta.
    const feio = documentoDeEmergencia({ membro: 'Léo', casa: 'B', hoje: 'd2026-08-20',
      ficha: { alergias: [{ id: 'a', nome: '<script>', gravidade: 'leve', nota: '' }], medicacao: [], medicos: [], contactos: [] } });
    expect(feio).not.toContain('<script>');
    expect(nomeDoFicheiroDeEmergencia({ membro: 'Léo', dia: 'd2026-08-20' })).toBe('emergencia-leo-2026-08-20.pdf');
    expect(GRAVIDADES.map(g => g.chave)).toEqual(['grave', 'moderada', 'leve']);
  });
});

describe('⚠ a ficha de emergência: os ecrãs', () => {
  it('a ficha da criança tem a linha, que abre a folha com as quatro secções e o botão do PDF', () => {
    const { r, texto } = ficha('Léo', 'Rita', { healthAlergias: { 'Léo': [AMENDOIM] } });
    expect(texto()).toContain('Ficha de emergência');
    expect(texto()).toContain('1 alergia · exportar em PDF para a escola');
    tocar(r, 'Ficha de emergência');
    const tx = texto();
    for (const s of ['Alergias', 'Medicação atual', 'Médico', 'Contactos']) expect(tx).toContain(s);
    expect(tx).toContain('Amendoim');
    expect(tx).toContain('grave');
    expect(tx).toContain('Exportar em PDF para a escola');
    expect(hospedeiro(r, 'Tirar a alergia Amendoim')).toBeTruthy();
  });

  it('acrescentar uma alergia pela folha vai pela loja e aparece na lista', () => {
    const { r, texto, loja } = ficha('Léo', 'Rita', { healthAlergias: {} });
    tocar(r, 'Ficha de emergência');
    const campo = r.root.findAll(n => typeof n.type === 'string' && n.props.accessibilityLabel === 'Alergia a')[0];
    TestRenderer.act(() => { campo.props.onChangeText('Penicilina'); });
    tocar(r, 'Grave');
    tocar(r, 'Acrescentar a alergia à ficha');
    expect(loja().alergiasDe('Léo', 'Rita')).toEqual([expect.objectContaining({ nome: 'Penicilina', gravidade: 'grave' })]);
    expect(texto()).toContain('Penicilina');
  });

  it('a ficha de um adulto não tem a linha — é a ficha completa que ele exporta', () => {
    const { texto } = ficha('Rita', 'Rita', null);
    expect(texto()).not.toContain('Ficha de emergência');
  });

  it('⚠ a criança não vê alergias em lado nenhum da app dela', () => {
    for (const tab of ['tarefas', 'compras', 'cofre']) {
      const { texto } = montar(KidApp, { kid: 'Léo', kidTab: tab, setKidTab: () => {}, onLogout: () => {} },
        { healthAlergias: { 'Léo': [AMENDOIM] } });
      expect(texto()).not.toContain('Amendoim');
      expect(texto()).not.toContain('alergia');
    }
  });
});
