/**
 * O objetivo do cofre — «Bicicleta, 120 €».
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 11/09/2026, a segunda das dez funcionalidades: a criança escolhe para que
 * junta, vê a barra a encher com a semanada e os bónus, e os adultos veem para
 * que ela junta na linha do cofre.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. A coleção `objetivos_cofre` nasce nos DOIS sítios do servidor com a
 *      mesma definição, só com nome e alvo: o juntado é o saldo do cofre
 *      (INVARIANTE #2), e a prova do servidor confere que não há campo para ele.
 *   2. A leitura traduz por NOME da criança; a escrita define ou altera a
 *      linha dela; o `o-que-sobe.js` diz quem a chama.
 *   3. No cofre da criança: sem objetivo, «Escolher um objetivo»; com ele, o
 *      nome, «x de y», a barra e a frase do ritmo; definir vai pela loja.
 *   4. No Dinheiro dos adultos, a linha do cofre diz para que a criança junta.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider, useStore } = require('../src/store');
const { buildTheme } = require('../src/theme');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const KidApp = require('../src/KidApp').default;
const Dinheiro = require('../src/screens/Dinheiro').default;

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
const kidCofre = (patch) => montar(KidApp, { kid: 'Léo', kidTab: 'cofre', setKidTab: () => {}, onLogout: () => {} }, patch);

const hospedeiro = (r, label) => r.root.findAll(n => typeof n.type === 'string'
  && n.props && n.props.accessibilityLabel === label).pop();
const tocar = (r, label) => {
  const alvo = hospedeiro(r, label);
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  TestRenderer.act(() => { (alvo.props.onPress || alvo.props.onClick)(); });
};
const escrever = (r, label, valor) => {
  const campo = hospedeiro(r, label);
  if (!campo) throw new Error(`Sem campo «${label}»`);
  TestRenderer.act(() => { campo.props.onChangeText(valor); });
};

describe('⚠ o objetivo do cofre: o servidor', () => {
  it('a coleção nasce nos dois sítios, só com nome e alvo, uma por criança', () => {
    const cria = ler('db/pocketbase/criar-colecoes.mjs');
    const acresc = ler('db/pocketbase/acrescentar-campos.mjs');
    expect(cria).toMatch(/name: 'objetivos_cofre', type: 'base'/);
    expect(cria).toMatch(/CREATE UNIQUE INDEX idx_objetivo_por_membro ON objetivos_cofre \(membro\)/);
    expect(acresc).toMatch(/nome: 'objetivos_cofre'/);
    expect(acresc).toMatch(/CREATE UNIQUE INDEX idx_objetivo_por_membro ON objetivos_cofre \(membro\)/);
    // Os campos da tabela são os quatro, e nenhum é um saldo.
    const i = acresc.indexOf("nome: 'objetivos_cofre'");
    const bloco = acresc.slice(i, acresc.indexOf('regras:', i));
    const campos = [...bloco.matchAll(/name: '(\w+)'/g)].map(m => m[1]);
    expect(campos).toEqual(['casa', 'membro', 'nome', 'alvo']);
    // A regra: a criança o seu, os adultos todos — nos dois ficheiros.
    expect(cria).toMatch(/listRule: `\$\{DA_CASA\} && \(membro = @request\.auth\.id \|\| \$\{ADULTO\}\)`/);
    expect(acresc).toMatch(/listRule: 'casa = @request\.auth\.casa && \(membro = @request\.auth\.id \|\| @request\.auth\.papel != "crianca"\)'/);
    // E as provas do servidor existem e estão no db:provar.
    expect(fs.existsSync(path.join(RAIZ, 'db/pocketbase/provar-objetivos-cofre.mjs'))).toBe(true);
    expect(JSON.parse(ler('package.json')).scripts['db:provar']).toMatch(/provar-objetivos-cofre\.mjs/);
  });

  it('a leitura traduz por nome, a escrita define-ou-altera, e o `o-que-sobe` diz quem a chama', () => {
    const sync = semComentarios(ler('src/sync.js'));
    expect(sync).toMatch(/objetivosCofre\[nome\] = \{ id: o\.id, nome: o\.nome, alvo: Number\(o\.alvo\) \|\| 0 \};/);
    expect(sync).toMatch(/export async function definirObjetivoDoCofre\(/);
    expect(sync).toMatch(/getFirstListItem\(`membro="\$\{membro\}"`\)/);
    expect(ler('src/pocketbase.js')).toMatch(/'objetivos_cofre'\]/);
    const sobe = ler('src/o-que-sobe.js');
    expect(sobe).toMatch(/objetivosCofre: \['linhas',[^\n]*'definirObjetivoDoCofre'\]/);
  });
});

describe('⚠ o objetivo do cofre: a criança', () => {
  it('sem objetivo, o cofre convida a escolher um', () => {
    const { r, texto } = kidCofre({ objetivosCofre: {} });
    expect(texto()).toContain('O meu objetivo');
    expect(hospedeiro(r, 'Escolher um objetivo')).toBeTruthy();
    expect(texto()).not.toContain('Mudar o objetivo');
  });

  it('com objetivo, mostra o nome, «x de y», a barra e a frase do ritmo', () => {
    const { r, texto, loja } = kidCofre({ objetivosCofre: { Léo: { nome: 'Bicicleta', alvo: 120 } } });
    const tx = texto();
    expect(tx).toContain('Bicicleta');
    // Os nós de texto juntam-se com espaços; o que importa é a ordem.
    expect(tx).toMatch(/de\s+120,00\s€/);
    expect(tx).toMatch(/Faltam/);
    const barra = r.root.findAll(n => typeof n.type === 'string' && n.props && n.props.accessibilityRole === 'progressbar')[0];
    expect(barra).toBeTruthy();
    const saldo = loja().vaultOf('Léo');
    expect(barra.props.accessibilityValue.now).toBe(Math.round(Math.min(1, Math.max(0, saldo) / 120) * 100));
    expect(hospedeiro(r, 'Mudar o objetivo')).toBeTruthy();
  });

  it('definir vai pela loja: nome e alvo, e o juntado continua a ser o saldo do cofre', () => {
    const { r, texto, loja } = kidCofre({ objetivosCofre: {} });
    tocar(r, 'Escolher um objetivo');
    escrever(r, 'Nome do objetivo', 'Bicicleta');
    escrever(r, 'Valor do objetivo em euros', '120,50');
    tocar(r, 'Começar a juntar');
    expect(loja().s.objetivosCofre['Léo']).toMatchObject({ nome: 'Bicicleta', alvo: 120.5 });
    // Nenhum campo de «juntado» ficou na loja.
    expect(Object.keys(loja().s.objetivosCofre['Léo']).sort()).toEqual(['alvo', 'nome']);
    expect(texto()).toContain('Bicicleta');
  });

  it('recusa um objetivo sem nome, a zero, ou acima de 1 000 €', () => {
    const { loja } = kidCofre(null);
    expect(loja().definirObjetivo('Léo', { nome: '', alvo: 10 })).toMatch(/nome/);
    expect(loja().definirObjetivo('Léo', { nome: 'X', alvo: 0 })).toMatch(/euros/);
    expect(loja().definirObjetivo('Léo', { nome: 'X', alvo: 1200 })).toMatch(/1 000/);
    expect(loja().s.objetivosCofre['Léo']).toBeUndefined();
  });

  it('a KidApp não escreve `objetivosCofre` por fora da loja', () => {
    const kid = semComentarios(ler('src/KidApp.jsx'));
    expect(kid).not.toMatch(/objetivosCofre:/);
    expect(kid).toMatch(/definirObjetivo\(kid, \{ nome, alvo \}\)/);
  });
});

describe('⚠ o objetivo do cofre: os adultos', () => {
  it('a linha do cofre no Dinheiro diz para que a criança junta', () => {
    const { texto } = montar(Dinheiro, { t: buildTheme(1, false), user: 'Rita', go: () => {}, onEquip: () => {} },
      { objetivosCofre: { Léo: { nome: 'Bicicleta', alvo: 120 } } });
    expect(texto()).toMatch(/A juntar para «Bicicleta» · 120,00\s€/);
  });
});
