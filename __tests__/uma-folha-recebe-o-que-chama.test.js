/**
 * UMA FOLHA RECEBE O QUE CHAMA — e ninguém lhe passa o que ela não lê
 * ============================================================================
 *
 * 25/09/2026. O «+» do Modo Compras montava a folha de criar artigo assim:
 *
 *     <NovoArtigo t={t} user={user} onDone={() => setNovoArtigo(false)} />
 *
 * e o `NovoArtigo` chama `onClose()`, sem rede. Guardar um artigo pelo «+»
 * atirava «onClose is not a function» — com o carrinho na mão, no meio da loja.
 * O MESMO componente montado no ecrã das Compras sempre teve o nome certo, e
 * por isso o defeito viveu escondido: a porta que se usa todos os dias funciona,
 * e a outra rebenta.
 *
 * ── Porque é que isto não se remenda a um caso ───────────────────────────────
 *
 * É a classe «um nome que ninguém lê do outro lado», e esta casa já a apanhou
 * três vezes noutras roupagens: o PocketBase que aceita um `update` e ignora em
 * silêncio o campo que não conhece; a `Row` que aceitava um `leading` e o
 * deitava fora; o `accessibilityState` que o react-native-web não reproduz.
 * A regra desta casa é clara — à segunda, varre-se tudo e escreve-se um guarda
 * que ENUMERA.
 *
 * Este guarda cruza, para CADA componente da app montado noutro ficheiro:
 *
 *   1. o que quem o monta lhe PASSA, contra o que ele DESTRUTURA — um nome
 *      passado que ele não lê é um nome que se perde sem erro nenhum;
 *   2. o que ele CHAMA como função (`onClose()`) contra o que cada sítio lhe
 *      passa — uma chamada sem rede a um `undefined` é um ecrã que rebenta.
 *
 * ⚠ Lê-se a ÁRVORE, com o Babel, e não o texto. Um guarda desta casa que
 * procurasse «onDone» com uma expressão regular encontrava-o no comentário que
 * explica esta correcção, dentro do próprio `ModoCompras.jsx` — a armadilha já
 * catalogada em `armadilhas-de-tratar-codigo-como-texto`.
 *
 * ⚠ E não julga o que não pode julgar: componentes que espalham (`...props`),
 * que leem `props.x` sem destruturar, ou que não têm exportação por omissão,
 * ficam de fora. Um guarda que adivinha é pior do que um guarda que não existe.
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/parser');

const RAIZ = path.join(__dirname, '..');

const ficheirosDaApp = () => {
  const achados = [];
  const andar = (dir) => {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) andar(p);
      else if (/\.jsx$/.test(nome)) achados.push(p);
    }
  };
  andar(path.join(RAIZ, 'src'));
  const app = path.join(RAIZ, 'App.jsx');
  if (fs.existsSync(app)) achados.push(app);
  return achados;
};

const arvoreDe = (ficheiro) => babel.parse(fs.readFileSync(ficheiro, 'utf8'), {
  sourceType: 'module', plugins: ['jsx'],
});

// ── Andar a árvore sem uma biblioteca a mais ────────────────────────────────
const andar = (no, visita) => {
  if (!no || typeof no !== 'object') return;
  if (Array.isArray(no)) { for (const x of no) andar(x, visita); return; }
  if (typeof no.type === 'string') visita(no);
  for (const k of Object.keys(no)) {
    if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue;
    andar(no[k], visita);
  }
};

const ehComponente = (no) => (no.type === 'FunctionDeclaration'
  || no.type === 'FunctionExpression' || no.type === 'ArrowFunctionExpression');

// O que um componente DESTRUTURA do primeiro parâmetro, e se ele espalha.
const lerParametros = (fn) => {
  const p = fn.params && fn.params[0];
  if (!p) return { nomes: null, espalha: false };
  if (p.type !== 'ObjectPattern') return { nomes: null, espalha: true };  // `props` cru: não se julga
  const nomes = new Set();
  let espalha = false;
  for (const prop of p.properties) {
    if (prop.type === 'RestElement') { espalha = true; continue; }
    if (prop.key && prop.key.name) nomes.add(prop.key.name);
    else if (prop.key && prop.key.value) nomes.add(String(prop.key.value));
  }
  return { nomes, espalha };
};

// ── O mapa dos componentes: ficheiro → { nome, props, chamadasSemRede } ──────
//
// «Sem rede» quer dizer chamado como `onClose()` e não `onClose && onClose()`,
// `onClose?.()` ou `(onClose || fechar)()`. Só essas rebentam.
const componentes = new Map();   // caminho absoluto → info

for (const ficheiro of ficheirosDaApp()) {
  let arvore;
  try { arvore = arvoreDe(ficheiro); } catch { continue; }

  let alvo = null;
  for (const no of arvore.program.body) {
    if (no.type === 'ExportDefaultDeclaration') {
      const d = no.declaration;
      if (ehComponente(d)) alvo = d;
      else if (d.type === 'Identifier') {
        // `export default X` com o `X` declarado acima.
        for (const outro of arvore.program.body) {
          if (outro.type === 'FunctionDeclaration' && outro.id && outro.id.name === d.name) alvo = outro;
          if (outro.type === 'VariableDeclaration') {
            for (const decl of outro.declarations) {
              if (decl.id && decl.id.name === d.name && decl.init && ehComponente(decl.init)) alvo = decl.init;
            }
          }
        }
      }
    }
  }
  if (!alvo) continue;

  const { nomes, espalha } = lerParametros(alvo);
  if (!nomes) continue;   // `props` cru — não se julga

  // As chamadas sem rede a um nome que vem das props.
  const semRede = new Set();
  andar(alvo.body, (no) => {
    if (no.type !== 'CallExpression') return;
    const c = no.callee;
    if (c && c.type === 'Identifier' && nomes.has(c.name)) semRede.add(c.name);
  });
  // Tira-se o que estiver protegido em qualquer sítio do corpo: um componente
  // que escreva `onFeito && onFeito()` uma vez está a dizer que ele é opcional.
  andar(alvo.body, (no) => {
    if (no.type === 'LogicalExpression' && no.left && no.left.type === 'Identifier') semRede.delete(no.left.name);
    if (no.type === 'OptionalCallExpression' && no.callee && no.callee.type === 'Identifier') semRede.delete(no.callee.name);
    if (no.type === 'ConditionalExpression' && no.test && no.test.type === 'Identifier') semRede.delete(no.test.name);
    // `if (!onClose) return;` também é rede.
    if (no.type === 'UnaryExpression' && no.operator === '!' && no.argument
        && no.argument.type === 'Identifier') semRede.delete(no.argument.name);
    // ⚠ E o `typeof onHora === 'function'`, que é a rede mais forte de todas e
    // a que o `CampoData` usa. Sem esta linha, o guarda acusava dez ecrãs de
    // montarem um campo de data «sem o `onHora` que ele chama» — e o campo
    // pergunta por ele antes de lhe tocar. Um guarda que acusa quem está certo
    // gasta-se: ninguém volta a olhar para ele à terceira vez.
    if (no.type === 'UnaryExpression' && no.operator === 'typeof' && no.argument
        && no.argument.type === 'Identifier') semRede.delete(no.argument.name);
    // Um valor por omissão (`onFeito = () => {}`) não rebenta.
  });
  for (const prop of (alvo.params[0] || {}).properties || []) {
    if (prop.type === 'ObjectProperty' && prop.value && prop.value.type === 'AssignmentPattern'
        && prop.key && prop.key.name) semRede.delete(prop.key.name);
  }

  componentes.set(path.resolve(ficheiro), {
    nome: path.basename(ficheiro, '.jsx'), props: nomes, espalha, semRede,
  });
}

// ── Onde é que cada componente é montado, e com quê ──────────────────────────
const montagens = [];   // { deOnde, para, tag, passadas:Set, linha }

for (const ficheiro of ficheirosDaApp()) {
  let arvore;
  try { arvore = arvoreDe(ficheiro); } catch { continue; }

  // As importações locais: nome → caminho absoluto do ficheiro .jsx
  const importado = new Map();
  for (const no of arvore.program.body) {
    if (no.type !== 'ImportDeclaration') continue;
    const fonte = no.source.value;
    if (!fonte.startsWith('.')) continue;
    const base = path.resolve(path.dirname(ficheiro), fonte);
    const candidatos = [base, base + '.jsx', path.join(base, 'index.jsx')];
    const alvo = candidatos.find(c => fs.existsSync(c) && fs.statSync(c).isFile());
    if (!alvo || !/\.jsx$/.test(alvo)) continue;
    for (const esp of no.specifiers) {
      if (esp.type === 'ImportDefaultSpecifier') importado.set(esp.local.name, path.resolve(alvo));
    }
  }
  if (!importado.size) continue;

  andar(arvore.program, (no) => {
    if (no.type !== 'JSXOpeningElement') return;
    const tag = no.name && no.name.type === 'JSXIdentifier' ? no.name.name : null;
    if (!tag || !importado.has(tag)) return;
    const para = importado.get(tag);
    if (!componentes.has(para)) return;

    let espalha = false;
    const passadas = new Set();
    for (const a of no.attributes) {
      if (a.type === 'JSXSpreadAttribute') { espalha = true; continue; }
      if (a.name && a.name.name) passadas.add(a.name.name);
    }
    if (espalha) return;   // com um espalhar não se sabe o que vai lá dentro
    montagens.push({ deOnde: ficheiro, para, tag, passadas, linha: no.loc ? no.loc.start.line : 0 });
  });
}

const rel = (p) => path.relative(RAIZ, p).replace(/\\/g, '/');

describe('uma folha recebe o que chama', () => {
  it('o varrimento encontrou componentes e montagens que cheguem para valer alguma coisa', () => {
    // Um guarda que não varre nada passa sempre. Estes números são o chão: se
    // caírem, partiu-se o varrimento e não o código.
    expect(componentes.size).toBeGreaterThan(20);
    expect(montagens.length).toBeGreaterThan(40);
  });

  it('⚠ ninguém passa um nome que o componente não lê', () => {
    // Era isto: `<NovoArtigo onDone={…} />` para um componente que só conhece
    // `onClose`. O React aceita a prop, guarda-a, e ninguém a lê nunca.
    const perdidas = [];
    for (const m of montagens) {
      const c = componentes.get(m.para);
      if (c.espalha) continue;
      for (const nome of m.passadas) {
        if (nome === 'key' || nome === 'ref' || nome === 'children') continue;
        if (!c.props.has(nome)) {
          perdidas.push(`${rel(m.deOnde)}:${m.linha} passa «${nome}» a <${m.tag}>, que não o lê`);
        }
      }
    }
    expect(perdidas).toEqual([]);
  });

  it('⚠ e ninguém monta um componente sem lhe dar o que ele CHAMA sem rede', () => {
    // O outro lado do mesmo defeito: `onClose()` num `onClose` que não chegou
    // é «onClose is not a function» no momento exacto em que alguém guarda.
    const emFalta = [];
    for (const m of montagens) {
      const c = componentes.get(m.para);
      for (const nome of c.semRede) {
        if (!m.passadas.has(nome)) {
          emFalta.push(`${rel(m.deOnde)}:${m.linha} monta <${m.tag}> sem «${nome}», que ele chama sem rede`);
        }
      }
    }
    expect(emFalta).toEqual([]);
  });

  it('⚠ e o caso que deu origem a isto está mesmo coberto', () => {
    // Uma prova do guarda, não do código: se o varrimento deixar de ver o
    // `NovoArtigo` montado no Modo Compras, as duas provas acima passam a
    // dizer «tudo bem» sobre um ficheiro que já não olham.
    const alvo = montagens.filter(m => m.tag === 'NovoArtigo');
    expect(alvo.length).toBeGreaterThanOrEqual(2);
    for (const m of alvo) expect(m.passadas.has('onClose')).toBe(true);
  });
});
