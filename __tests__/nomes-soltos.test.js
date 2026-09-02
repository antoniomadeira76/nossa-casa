/**
 * Um nome referenciado que não existe em âmbito nenhum.
 *
 * ── Porque isto tem prova própria ────────────────────────────────────────────
 *
 * Aconteceu TRÊS vezes, e duas delas no mesmo commit:
 *
 *   src/sheets/Cofre.jsx:79    MEMBROS  — a folha do cofre abria em branco
 *   src/screens/Saude.jsx:605  MEMBERS  — o marcar consulta rebentava
 *   src/screens/Compras.jsx:97 plural   — a lista rebentava com preços na casa
 *
 * As duas primeiras foram minhas, do mesmo refactor: pus `MEMBROS[nome]` em
 * ficheiros onde esse nome nunca existiu, verifiquei com um grep, o grep achou
 * a palavra noutro sítio, e dei-a por definida.
 *
 * ⚠ O que torna esta classe cara é o momento em que aparece: um
 * `ReferenceError` só existe quando AQUELA linha corre. As três estavam em
 * caminhos que só se percorrem com a casa em certo estado — uma criança com
 * cofre, uma consulta a marcar, preços já registados. Compilava, montava, e
 * três suites verdes passaram por cima.
 *
 * Isto percorre os âmbitos a sério, com o mesmo parser que compila a app, e
 * não corre uma linha de código da app.
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const raiz = path.join(__dirname, '..');

// O que existe sem ser declarado. Se um nome legítimo faltar aqui, a prova
// aponta-o — e acrescentá-lo é uma decisão consciente, que é o ponto.
const GLOBAIS = new Set([
  'console', 'require', 'module', 'exports', 'process', 'globalThis', '__DEV__',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask',
  'fetch', 'Headers', 'Request', 'Response', 'AbortController', 'URL', 'URLSearchParams',
  'Promise', 'JSON', 'Math', 'Date', 'Object', 'Array', 'String', 'Number', 'Boolean',
  'Error', 'TypeError', 'RangeError', 'Map', 'Set', 'WeakMap', 'WeakSet', 'RegExp',
  'Symbol', 'Intl', 'Infinity', 'NaN', 'undefined', 'parseInt', 'parseFloat',
  'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'btoa', 'atob',
  'TextEncoder', 'TextDecoder', 'crypto', 'structuredClone', 'Proxy', 'Reflect',
  'localStorage', 'sessionStorage', 'window', 'document', 'navigator', 'location',
  'Image', 'FileReader', 'Blob', 'FormData', 'performance', 'alert',
]);

const ficheiros = [];
const andar = (d) => {
  for (const nome of fs.readdirSync(path.join(raiz, d))) {
    const rel = `${d}/${nome}`;
    if (fs.statSync(path.join(raiz, rel)).isDirectory()) andar(rel);
    else if (/\.(js|jsx)$/.test(nome)) ficheiros.push(rel);
  }
};
andar('src');
ficheiros.push('App.jsx');

const soltos = (rel) => {
  const codigo = fs.readFileSync(path.join(raiz, rel), 'utf8');
  const ast = parser.parse(codigo, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'objectRestSpread', 'optionalChaining',
      'nullishCoalescingOperator'],
  });

  const achados = [];
  traverse(ast, {
    ReferencedIdentifier(p) {
      const nome = p.node.name;
      if (GLOBAIS.has(nome)) return;
      // `a.b` e `{ b: … }` não são referências ao nome `b`.
      if (p.parentPath.isMemberExpression({ computed: false }) && p.key === 'property') return;
      if (p.parentPath.isObjectProperty({ computed: false }) && p.key === 'key') return;
      if (p.scope.hasBinding(nome, true)) return;
      achados.push(`${nome} (linha ${p.node.loc ? p.node.loc.start.line : '?'})`);
    },
  });
  return achados;
};

describe('nenhum ficheiro referencia um nome que não existe', () => {
  it('há ficheiros para verificar', () => {
    expect(ficheiros.length).toBeGreaterThan(30);
  });

  it.each(ficheiros)('%s', (rel) => {
    expect(soltos(rel)).toEqual([]);
  });
});

describe('e a prova morde', () => {
  it('⚠ apanha o defeito do Cofre, tal como ele era', () => {
    // Sem isto, uma prova destas pode estar a não verificar nada e ninguém
    // repara — que foi exactamente o que aconteceu aos testes de fumo.
    const ast = parser.parse(
      `import React from 'react';
       export default function Cofre({ kid }) {
         return <Avatar {...avatarDe(kid, MEMBROS[kid])} />;
       }`,
      { sourceType: 'module', plugins: ['jsx'] });

    const achados = [];
    traverse(ast, {
      ReferencedIdentifier(p) {
        if (GLOBAIS.has(p.node.name)) return;
        if (p.scope.hasBinding(p.node.name, true)) return;
        achados.push(p.node.name);
      },
    });
    expect(achados).toContain('MEMBROS');
    expect(achados).toContain('avatarDe');   // também não estava importado
    expect(achados).not.toContain('kid');    // este está, e não é apanhado
  });
});
