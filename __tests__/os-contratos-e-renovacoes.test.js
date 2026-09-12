/**
 * Os contratos e as renovações — o seguro, a internet, a inspeção, ao lado dos
 * equipamentos, com aviso 30 dias antes e o documento anexo.
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 12/09/2026, a quinta das dez funcionalidades. Segunda secção no ecrã dos
 * Equipamentos, com a mesma linha e a mesma ficha (datas, quem trata,
 * documento). Os avisos entram no «Precisa de Si» como as garantias.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. A coleção nasce nos DOIS sítios do servidor, ancorada a quem trata; a
 *      criança não a lê.
 *   2. A leitura traduz datas e nomes; a escrita da definição vai pela fila e
 *      a do documento à parte, com ficheiro — o `o-que-sobe.js` diz quem chama.
 *   3. A loja valida, ordena pelo dia, avisa a 30 dias e guarda o documento
 *      «por subir» até ele subir.
 *   4. Os Equipamentos têm a secção; o Início avisa; a ficha abre pela linha e
 *      pelo aviso; nenhum ecrã escreve `contratos` por fora da loja.
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
const { dmyRelativo } = require('../src/format');
const { estadoDoContrato, linhaDoContrato, mesEAno } = require('../src/contratos');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const Equipamentos = require('../src/screens/Equipamentos').default;
const Inicio = require('../src/screens/Inicio').default;
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
const equipamentos = (patch, props = {}) => montar(Equipamentos, { t: T, user: 'Rita', ...props }, patch);
const hospedeiro = (r, label) => r.root.findAll(n => typeof n.type === 'string' && n.props
  && typeof n.props.accessibilityLabel === 'string'
  && (n.props.accessibilityLabel === label || n.props.accessibilityLabel.startsWith(`${label} — `))).pop();
const tocar = (r, label) => {
  const alvo = hospedeiro(r, label);
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  TestRenderer.act(() => { (alvo.props.onPress || alvo.props.onClick)(); });
};

// O «hoje» das provas é 20/08/2026 (jest.setup.js). As datas são deslocamentos.
const contrato = (id, nome, extra = {}) => ({ id, idServidor: null, nome, fornecedor: '', renovaEm: '', fidelizacaoAte: '', responsavel: null, ficheiro: null, ...extra });
const SEGURO = contrato('ct-seguro', 'Seguro do carro', { fornecedor: 'Fidelidade', renovaEm: dmyRelativo(23) });
const NET = contrato('ct-net', 'Internet', { fornecedor: 'MEO', fidelizacaoAte: '31/03/2027', responsavel: 'Tomás' });
const INSPECAO = contrato('ct-insp', 'Inspeção do carro', { renovaEm: dmyRelativo(-4) });

describe('⚠ os contratos: o servidor', () => {
  it('a coleção nasce nos dois sítios, ancorada a quem trata, e a criança não a lê', () => {
    const cria = ler('db/pocketbase/criar-colecoes.mjs');
    const acresc = ler('db/pocketbase/acrescentar-campos.mjs');
    for (const txt of [cria, acresc]) {
      expect(txt).toMatch(/\(responsavel = "" \|\| responsavel\.casa = @request\.auth\.casa\)/);
    }
    expect(cria).toMatch(/name: 'contratos', type: 'base'/);
    expect(cria).toMatch(/fich\('ficheiro'\)/);
    const i = cria.indexOf("name: 'contratos'");
    expect(cria.slice(i, i + 900)).toMatch(/listRule: `\$\{DA_CASA\} && \$\{ADULTO\}`/);
    expect(acresc).toMatch(/nome: 'contratos'/);
    expect(acresc).toMatch(/\{ name: 'ficheiro', type: 'file', maxSelect: 1, maxSize: 8388608 \}/);
    expect(ler('src/pocketbase.js')).toMatch(/'contratos',/);
    expect(JSON.parse(ler('package.json')).scripts['db:provar']).toMatch(/provar-contratos\.mjs/);
    expect(fs.existsSync(path.join(RAIZ, 'db/pocketbase/provar-contratos.mjs'))).toBe(true);
  });

  it('a definição vai pela fila e o documento à parte, com ficheiro; o o-que-sobe diz quem chama', () => {
    const sync = semComentarios(ler('src/sync.js'));
    expect(sync).toMatch(/export async function contratoDaCasa\(/);
    expect(sync).toMatch(/export async function documentoDoContrato\(/);
    expect(sync).toMatch(/atualizarComFicheiro\('contratos'/);
    expect(sync).toMatch(/ficheiro: servidor\.ler\.ficheiro\(c, 'ficheiro'\)/);
    expect(semComentarios(ler('src/pocketbase.js'))).toMatch(/async atualizarComFicheiro\(colecao, id, ficheiro\)/);
    expect(ler('src/o-que-sobe.js')).toMatch(/contratos: \['linhas',[^\n]*'contratoDaCasa'\]/);
  });
});

describe('⚠ os contratos: a loja', () => {
  it('criar exige nome, datas que sejam datas e um adulto da casa a tratar', () => {
    const { loja } = equipamentos(null);
    expect(loja().criarContrato({ nome: '' })).toMatch(/nome/);
    expect(loja().criarContrato({ nome: 'Seguro', renovaEm: 'amanhã' })).toMatch(/renovação/);
    expect(loja().criarContrato({ nome: 'Seguro', fidelizacaoAte: '2027' })).toMatch(/fidelização/);
    expect(loja().criarContrato({ nome: 'Seguro', responsavel: 'Léo' })).toMatch(/adulto/);
    let r;
    TestRenderer.act(() => { r = loja().criarContrato({ nome: ' Seguro do carro ', fornecedor: 'Fidelidade', renovaEm: '05/10/2026', responsavel: 'Tomás' }); });
    expect(r).toMatchObject({ id: expect.any(String) });
    expect(loja().s.contratos[0]).toMatchObject({ nome: 'Seguro do carro', fornecedor: 'Fidelidade', renovaEm: '05/10/2026', fidelizacaoAte: '', responsavel: 'Tomás', ficheiro: null });
    expect(loja().s.contratos[0].porSubir).toBeUndefined();
  });

  it('com data primeiro, do mais próximo para o mais longe; sem data no fim — e o aviso é a 30 dias', () => {
    const { loja } = equipamentos({ contratos: [NET, SEGURO, INSPECAO, contrato('ct-longe', 'Alarme', { renovaEm: dmyRelativo(200) })] });
    const lista = loja().contratosDaCasa();
    expect(lista.map(c => c.id)).toEqual(['ct-insp', 'ct-seguro', 'ct-longe', 'ct-net']);
    expect(lista[0].dias).toBe(-4);
    expect(lista[1].dias).toBe(23);
    expect(lista[3].dias).toBeNull();
    expect(loja().contratosARenovar(30).map(c => c.id)).toEqual(['ct-insp', 'ct-seguro']);
    expect(estadoDoContrato(lista[0])).toEqual({ texto: 'passou há 4 dias', tom: 'err' });
    expect(estadoDoContrato(lista[1])).toEqual({ texto: 'renova em 23 dias', tom: 'warn' });
    expect(estadoDoContrato(lista[2])).toBeNull();
    expect(estadoDoContrato(lista[3])).toBeNull();
    expect(linhaDoContrato(lista[3])).toBe('fidelização até 03/2027 · Tomás');
    expect(mesEAno('31/03/2027')).toBe('03/2027');
  });

  it('⚠ o documento fica no dispositivo primeiro, «por subir»; alterar os campos não lhe toca; apagar leva tudo', () => {
    const { loja } = equipamentos({ contratos: [SEGURO] });
    let r;
    TestRenderer.act(() => { r = loja().alterarContrato('ct-seguro', { ficheiro: 'blob:apolice' }); });
    expect(r).toBeNull();
    expect(loja().s.contratos[0]).toMatchObject({ ficheiroLocal: 'blob:apolice', porSubir: true, nome: 'Seguro do carro' });
    TestRenderer.act(() => { r = loja().alterarContrato('ct-seguro', { renovaEm: '01/01/2027', responsavel: 'Rita' }); });
    expect(r).toBeNull();
    expect(loja().s.contratos[0]).toMatchObject({ renovaEm: '01/01/2027', responsavel: 'Rita', ficheiroLocal: 'blob:apolice', porSubir: true });
    expect(loja().alterarContrato('ct-seguro', { renovaEm: 'x' })).toMatch(/renovação/);
    expect(loja().alterarContrato('ct-x', { nome: 'Y' })).toMatch(/não existe/);
    TestRenderer.act(() => { loja().apagarContrato('ct-seguro'); });
    expect(loja().s.contratos).toEqual([]);
  });

  it('nenhum ecrã escreve contratos por fora da loja', () => {
    for (const f of ['src/screens/Equipamentos.jsx', 'src/screens/Inicio.jsx', 'src/sheets/NovoContrato.jsx',
      'src/sheets/FichaContrato.jsx', 'src/sheets/CamposContrato.jsx', 'App.jsx']) {
      expect(semComentarios(ler(f))).not.toMatch(/\bcontratos:\s/);
    }
  });
});

describe('⚠ os contratos: os ecrãs', () => {
  it('os Equipamentos têm a secção, com o aviso de vazio e a contagem a renovar', () => {
    const vazio = equipamentos({ contratos: [] });
    expect(vazio.texto()).toContain('Contratos');
    expect(vazio.texto()).toContain('Sem contratos registados.');
    expect(vazio.texto()).toContain('Contratos a renovar');

    const { texto } = equipamentos({ contratos: [NET, SEGURO, INSPECAO] });
    const tx = texto();
    expect(tx).toContain('Seguro do carro · Fidelidade');
    expect(tx).toContain('renova em 23 dias');
    expect(tx).toContain('passou há 4 dias');
    expect(tx).toContain('fidelização até 03/2027 · Tomás');
  });

  it('a linha abre a ficha, com a renovação, o documento, os campos e «Remover Contrato»', () => {
    const { r, texto } = equipamentos({ contratos: [SEGURO] });
    tocar(r, 'Seguro do carro · Fidelidade');
    const tx = texto();
    expect(tx).toContain('Renova em breve');
    expect(tx).toContain('A apólice ou o contrato');
    expect(tx).toContain('Por adicionar');
    expect(tx).toContain('Remover Contrato');
    expect(tx).toContain('Quem trata');
  });

  it('e `abrir` com «contrato:<id>» chega com a ficha desse contrato aberta — é o que o aviso do Início faz', () => {
    const { texto } = equipamentos({ contratos: [INSPECAO] }, { abrir: 'contrato:ct-insp' });
    expect(texto()).toContain('Renovação passada');
    expect(texto()).toContain('Remover Contrato');
  });

  it('um documento que ainda só está neste telemóvel diz «só aqui»', () => {
    const { r, texto } = equipamentos({ contratos: [{ ...SEGURO, ficheiroLocal: 'blob:x', porSubir: true }] });
    tocar(r, 'Seguro do carro · Fidelidade');
    expect(texto()).toContain('só aqui');
    expect(texto()).toContain('Guardado');
  });

  it('o Início avisa do que renova em 30 dias e do que já passou, e a linha vai à ficha do contrato', () => {
    const onEquip = jest.fn();
    const { r, texto } = montar(Inicio, { t: T, user: 'Rita', go: () => {}, onSaude: () => {}, onEquip, onFicha: () => {} },
      { contratos: [SEGURO, INSPECAO, NET] });
    const tx = texto();
    expect(tx).toContain('Seguro do carro · Fidelidade');
    expect(tx).toContain(`Renova em 23 dias · ${SEGURO.renovaEm}`);
    expect(tx).toContain('A renovação passou há 4 dias');
    expect(tx).not.toContain('Internet · MEO');
    tocar(r, 'Seguro do carro · Fidelidade');
    expect(onEquip).toHaveBeenCalledWith('contrato:ct-seguro');
  });

  it('⚠ a criança não vê um contrato em lado nenhum da app dela', () => {
    for (const tab of ['tarefas', 'compras', 'cofre']) {
      const { texto } = montar(KidApp, { kid: 'Léo', kidTab: tab, setKidTab: () => {}, onLogout: () => {} },
        { contratos: [SEGURO, INSPECAO] });
      expect(texto()).not.toContain('Seguro do carro');
      expect(texto()).not.toContain('Inspeção');
    }
  });
});
