/**
 * O REACT NATIVE NÃO TEM `URL`, E ISSO JÁ ENGANOU ESTA CASA DUAS VEZES
 * ====================================================================
 *
 * O React Native substitui o `URL` global por um esboço que rebenta:
 *
 *     TypeError: URL is not a constructor
 *
 * Não é uma falha de ambiente que se note ao escrever — é código que parece
 * normal, passa a análise, e atira em execução.
 *
 * ── As duas vezes ───────────────────────────────────────────────────────────
 *
 *   1. o `src/endereco.js`, que precisava do `hostname` de um endereço e o
 *      escreveu à mão, com o motivo em comentário;
 *   2. a entrada pela Google sem janela (18/09/2026), que montou o endereço do
 *      consentimento com `new URL`. O botão passou a NÃO FAZER NADA: a excepção
 *      saía antes de a página navegar, e o `catch` de cima trocava-a por uma
 *      frase amigável que não dizia nada. Só apareceu quando a razão crua
 *      passou a ir para a consola — e apareceu à primeira.
 *
 * À segunda vez escreve-se um guarda que ENUMERA, e é este: nenhum ficheiro da
 * app constrói um `new URL(…)`.
 *
 * ⚠ O `URLSearchParams` NÃO entra nesta lista, e é de propósito: esse existe e
 * funciona (o `google.eventos` usa-o desde sempre para montar a consulta à
 * agenda, e a agenda funciona). Proibir o que funciona por parecer da mesma
 * família é um guarda a crescer para além do que mediu.
 *
 * ⚠ E lê a ÁRVORE com o Babel, não o texto: um guarda de texto encontrava-se a
 * si próprio no comentário aqui em cima.
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
      else if (/\.(jsx|js)$/.test(nome)) achados.push(p);
    }
  };
  andar(path.join(RAIZ, 'src'));
  achados.push(path.join(RAIZ, 'App.jsx'));
  return achados.map(p => path.relative(RAIZ, p).split(path.sep).join('/'));
};

const andarNaArvore = (no, visita) => {
  if (!no || typeof no !== 'object') return;
  if (Array.isArray(no)) { for (const x of no) andarNaArvore(x, visita); return; }
  if (typeof no.type === 'string') visita(no);
  for (const k of Object.keys(no)) {
    if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue;
    andarNaArvore(no[k], visita);
  }
};

const construtoresDeURL = (src) => {
  const arvore = babel.parse(src, { sourceType: 'module', plugins: ['jsx'] });
  const achados = [];
  andarNaArvore(arvore.program, (n) => {
    if (n.type !== 'NewExpression') return;
    if (n.callee.type === 'Identifier' && n.callee.name === 'URL') achados.push(n.loc.start.line);
  });
  return achados;
};

describe('o React Native não tem `URL`', () => {
  const ficheiros = ficheirosDaApp();

  it('há ficheiros para ler — senão este guarda passa por vacuidade', () => {
    expect(ficheiros.length).toBeGreaterThan(50);
    expect(ficheiros).toContain('src/pocketbase.js');
  });

  it('APANHA o defeito de 18/09/2026 — o endereço do consentimento com `new URL`', () => {
    // Um guarda que nunca se viu falhar não é um guarda.
    const comODefeito = `
      const comecar = async () => {
        const url = new URL(g.authURL + encodeURIComponent(retorno));
        url.searchParams.set('scope', 'openid');
        window.location.assign(url.toString());
      };
    `;
    expect(construtoresDeURL(comODefeito)).toEqual([3]);
  });

  it('NÃO acusa o `URLSearchParams`, que existe e funciona', () => {
    const bom = "const q = new URLSearchParams({ a: 1 }); const r = new window.URL('http://x');";
    expect(construtoresDeURL(bom)).toEqual([]);
  });

  it('⚠ nenhum ficheiro da app constrói um `new URL(…)`', () => {
    const maus = [];
    for (const rel of ficheiros) {
      for (const linha of construtoresDeURL(fs.readFileSync(path.join(RAIZ, rel), 'utf8'))) {
        maus.push(`${rel}:${linha} — \`new URL\` não existe no React Native; monte o endereço à mão`);
      }
    }
    expect(maus).toEqual([]);
  });

  it('⚠ e o `comParametro` faz o que o `URL` fazia — trocar e acrescentar', () => {
    // A peça que substituiu o `new URL`. Prova-se o comportamento, e não só a
    // existência: trocar um parâmetro que lá está, acrescentar um que não está,
    // e não estragar os vizinhos.
    const pb = fs.readFileSync(path.join(RAIZ, 'src', 'pocketbase.js'), 'utf8');
    const i = pb.indexOf('const comParametro =');
    expect(i).toBeGreaterThan(0);
    // eslint-disable-next-line no-eval
    const comParametro = eval(`(${pb.slice(pb.indexOf('(', i), pb.indexOf('\n};', i) + 2)})`);

    expect(comParametro('https://x/y?a=1&scope=velho&b=2', 'scope', 'novo em texto'))
      .toBe('https://x/y?a=1&scope=novo%20em%20texto&b=2');
    expect(comParametro('https://x/y?a=1', 'state', 'abc.def'))
      .toBe('https://x/y?a=1&state=abc.def');
    expect(comParametro('https://x/y', 'state', 'abc'))
      .toBe('https://x/y?state=abc');
    // ⚠ O valor escapa-se: um `&` por escapar partia o endereço em dois.
    expect(comParametro('https://x/y?a=1', 'q', 'um & outro'))
      .toBe('https://x/y?a=1&q=um%20%26%20outro');
  });
});
