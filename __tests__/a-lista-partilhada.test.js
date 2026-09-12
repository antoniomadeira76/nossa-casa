/**
 * A lista partilhada com quem não tem a app — um endereço só de leitura.
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 12/09/2026, a nona das dez funcionalidades. «Manda-me a lista»: um adulto
 * pede um endereço com prazo de uma hora; quem o abre vê rótulos e corredores,
 * sem entrar — sem prendas «só adultos», sem preços, sem nomes. Nada se escreve
 * por lá. O endereço só serve onde o servidor for alcançável.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. `partilhas_lista` nasce nos DOIS sítios, sem regra de alteração, com a
 *      lista e quem partilha ancorados à casa e um ataque por relação.
 *   2. O hook escreve o sinal e o prazo, e a rota é GET e só GET.
 *   3. A loja pede pelo `sync` e devolve a razão quando não pode; a folha
 *      mostra-a; o ecrã das Compras tem a linha; a app da criança não.
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
const montar = (Ecra, props) => {
  let r = null, api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    r = TestRenderer.create(comMargens(React.createElement(StoreProvider, null,
      React.createElement(React.Fragment, null,
        React.createElement(Sonda),
        React.createElement(Ecra, props)))));
  });
  return { r, loja: () => api, texto: () => junta(r.toJSON()) };
};
const T = buildTheme(1, false);
const nada = () => {};
const tocar = (r, label) => {
  const alvo = r.root.findAll(n => typeof n.type === 'string' && n.props
    && typeof n.props.accessibilityLabel === 'string'
    && (n.props.accessibilityLabel === label || n.props.accessibilityLabel.startsWith(`${label} — `))).pop();
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  TestRenderer.act(() => { (alvo.props.onPress || alvo.props.onClick)(); });
};

describe('⚠ a lista partilhada: o servidor', () => {
  it('nasce nos dois sítios, sem alteração, com a lista e quem partilha ancorados, e um ataque por relação', () => {
    const cria = ler('db/pocketbase/criar-colecoes.mjs');
    const acresc = ler('db/pocketbase/acrescentar-campos.mjs');
    for (const txt of [cria, acresc]) {
      expect(txt).toMatch(/CREATE UNIQUE INDEX idx_partilha_sinal ON partilhas_lista \(sinal\)/);
      expect(txt).toMatch(/lista\.casa = @request\.auth\.casa && criada_por = @request\.auth\.id/);
      expect(txt).toMatch(/updateRule: null/);
    }
    expect(cria).toMatch(/name: 'partilhas_lista', type: 'base'/);
    const i = cria.indexOf('const NOSSAS = [');
    expect(cria.slice(i, cria.indexOf('];', i))).toContain("'partilhas_lista'");
    expect(acresc).toMatch(/nome: 'partilhas_lista'/);
    const anc = ler('db/pocketbase/provar-relacoes-ancoradas.mjs');
    for (const campo of ['lista', 'criada_por']) expect(anc).toContain(`['partilhas_lista', '${campo}',`);
    expect(JSON.parse(ler('package.json')).scripts['db:provar']).toMatch(/provar-partilha\.mjs/);
    expect(fs.existsSync(path.join(RAIZ, 'db/pocketbase/provar-partilha.mjs'))).toBe(true);
  });

  it('o hook escreve o sinal e o prazo, e a rota é GET e só GET — sem escrita', () => {
    const hook = semComentarios(ler('db/pocketbase/pb_hooks/partilha-lista.pb.js'));
    expect(hook).toMatch(/onRecordCreateRequest\(\(e\) => \{[\s\S]*\$security\.randomString\(24\)[\s\S]*'partilhas_lista'\)/);
    expect(hook).toMatch(/60 \* 60 \* 1000/);
    expect(hook).toMatch(/routerAdd\('GET', '\/lista\/\{sinal\}'/);
    expect(hook).not.toMatch(/routerAdd\('(POST|PUT|PATCH|DELETE)'/);
    expect(hook).not.toMatch(/\$app\.save\(|\.delete\(/);
    // Sem prendas «só adultos», sem preços, sem nomes: o filtro e o que se imprime.
    expect(hook).toMatch(/visibilidade != "adultos"/);
    expect(hook).not.toMatch(/estimativa|pedido_por/);
    expect(hook).toMatch(/noindex/);
  });

  it('o `sync` pede direto — sem fila — e devolve o endereço a partir do servidor', () => {
    const sync = semComentarios(ler('src/sync.js'));
    expect(sync).toMatch(/export async function partilharLista\(/);
    expect(sync).toMatch(/export async function apagarPartilhaDaLista\(/);
    const i = sync.indexOf('export async function partilharLista(');
    const corpo = sync.slice(i, sync.indexOf('\n}', i));
    expect(corpo).toMatch(/collection\('partilhas_lista'\)\.create\(/);
    expect(corpo).not.toMatch(/criarOuEnfileirar|escrever\.criar/);
    expect(corpo).toMatch(/\/lista\/\$\{r\.sinal\}/);
  });
});

describe('⚠ a lista partilhada: a loja e os ecrãs', () => {
  it('sem servidor a loja diz porquê, e não inventa um endereço', async () => {
    const { loja } = montar(Compras, { t: T, user: 'Rita', onModoCompras: nada, onIda: nada });
    const r = await loja().partilharLista('Rita');
    expect(r).toEqual({ erro: 'Só com o servidor ligado se partilha a lista.' });
    expect(await loja().desfazerPartilha('x')).toBeNull();
  });

  it('as Compras têm a linha, que abre a folha — e a folha diz que precisa do servidor', async () => {
    const { r, texto } = montar(Compras, { t: T, user: 'Rita', onModoCompras: nada, onIda: nada });
    expect(texto()).toContain('Partilhar a lista');
    expect(texto()).toContain('para quem não tem a app');
    tocar(r, 'Partilhar a lista');
    await TestRenderer.act(async () => { await Promise.resolve(); });
    const tx = texto();
    expect(tx).toContain('Um endereço só de leitura, válido uma hora');
    expect(tx).toContain('Só com o servidor ligado se partilha a lista.');
    expect(tx).not.toContain('/lista/');
  });

  it('⚠ a app da criança não partilha nada', () => {
    for (const tab of ['tarefas', 'compras', 'cofre']) {
      const { texto } = montar(KidApp, { kid: 'Léo', kidTab: tab, setKidTab: nada, onLogout: nada });
      expect(texto()).not.toMatch(/[Pp]artilhar/);
    }
    expect(semComentarios(ler('src/KidApp.jsx'))).not.toMatch(/PartilharLista|partilharLista/);
  });
});
