/**
 * UM FICHEIRO NÃO MUDA DE QUEBRA DE LINHA ÀS ESCONDIDAS
 * =====================================================
 *
 * 17/09/2026. Mudei dez linhas do `src/sync.js` com um script que o leu e o
 * reescreveu inteiro, e o `git diff` ficou com **2330 inserções e 2324
 * remoções** num ficheiro onde só se tocou num `import`, num comentário e num
 * nome de campo. O script leu com tradução de quebras de linha e escreveu com
 * a quebra do sistema: o ficheiro inteiro passou de LF a CRLF.
 *
 * O estrago não é cosmético, e é este:
 *
 *   · o `git diff` deixa de mostrar o que se fez — 4654 linhas mudadas
 *     escondem as dez que importam, e ninguém revê isso;
 *   · os guardas que LEEM CÓDIGO COMO TEXTO partem-se todos de uma vez. O
 *     `provas-verificam-a-escrita` procura `'\n}\n'` para achar o fim de cada
 *     função do `sync.js`; com `\r\n}\r\n` não achou nenhuma, deu a lista de
 *     escritas por VAZIA, e passou a acusar 165 chamadas de não estarem
 *     verificadas. Duas provas vermelhas por uma razão que não tinha nada a
 *     ver com o que diziam.
 *
 * É a mesma família de `armadilhas-de-tratar-codigo-como-texto`, vista do
 * outro lado: ali o perigo é LER mal; aqui é ESCREVER de volta mal.
 *
 * Este guarda ENUMERA: todo o ficheiro de código, desenho e configuração deste
 * repositório usa LF. Um único `\r` chumba, e diz qual é.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const IGNORAR = new Set(['node_modules', '.git', '.expo', 'dist', 'build', 'coverage', 'web-build', '.claude', 'pb_data']);
const EXTENSOES = /\.(js|jsx|mjs|cjs|ts|tsx|json|md|html|css|yml|yaml)$/;

const ficheirosDoRepositorio = () => {
  const achados = [];
  const andar = (dir) => {
    for (const nome of fs.readdirSync(dir)) {
      if (IGNORAR.has(nome)) continue;
      const p = path.join(dir, nome);
      let st;
      try { st = fs.statSync(p); } catch (e) { continue; }
      if (st.isDirectory()) andar(p);
      else if (EXTENSOES.test(nome)) achados.push(p);
    }
  };
  andar(RAIZ);
  return achados;
};

describe('um ficheiro não muda de quebra de linha às escondidas', () => {
  const ficheiros = ficheirosDoRepositorio();

  it('há ficheiros para ler — senão este guarda passa por vacuidade', () => {
    // Um `every` sobre uma lista vazia é verdadeiro, e um guarda que não vê
    // ficheiro nenhum passa a verde para sempre.
    expect(ficheiros.length).toBeGreaterThan(200);
    expect(ficheiros.some(f => f.endsWith(path.join('src', 'sync.js')))).toBe(true);
    expect(ficheiros.some(f => f.endsWith('.md'))).toBe(true);
  });

  it('todos usam LF — nenhum tem um \\r', () => {
    const comCR = [];
    for (const f of ficheiros) {
      const texto = fs.readFileSync(f, 'utf8');
      const quantos = (texto.match(/\r/g) || []).length;
      if (quantos) comCR.push(`${path.relative(RAIZ, f).split(path.sep).join('/')} — ${quantos} \\r`);
    }
    expect(comCR).toEqual([]);
  });
});
