/**
 * Todo o campo de texto tem 44 px de altura — INVARIANTE #5, para os campos.
 *
 * ── O que se viu ─────────────────────────────────────────────────────────────
 *
 * A folha «Editar envelope» da Gestão tinha os dois campos a 36 px: o estilo
 * estava escrito à mão, sem `minHeight`, ao lado de um `campo(t)` que o tem.
 * E as folhas da loja (nova e editar) o mesmo. Apanhado pela sonda no
 * varrimento de 09/09/2026 — os campos contam como alvos, e um campo de 36
 * é um alvo de 36.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * Enumera-se do disco: cada `<TextInput` dos `.jsx` de `src/` ou usa um estilo
 * partilhado que traz os 44 (`campo(t)`, `campo`), ou escreve `minHeight` a
 * 44 ou mais dentro da própria etiqueta. Um campo sem nenhum dos dois é um
 * campo que alguém vai medir a 36.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const jsx = (() => {
  const fora = [];
  const percorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) percorrer(p);
      else if (/\.jsx$/.test(e.name)) fora.push(p);
    }
  };
  percorrer(path.join(RAIZ, 'src'));
  return fora;
})();

const soCodigo = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/^\s*\/\/[^\n]*/gm, '');

// A etiqueta inteira: do `<TextInput` ao `/>` que a fecha.
const etiquetas = (txt) => {
  const fora = [];
  let i = 0;
  while ((i = txt.indexOf('<TextInput', i)) >= 0) {
    const fim = txt.indexOf('/>', i);
    fora.push({ linha: txt.slice(0, i).split('\n').length, tag: txt.slice(i, fim < 0 ? i + 800 : fim) });
    i = fim < 0 ? i + 10 : fim;
  }
  return fora;
};

describe('⚠ todo o campo de texto tem 44 px', () => {
  it('cada `<TextInput` usa `campo(t)` ou escreve `minHeight` ≥ 44', () => {
    const maus = [];
    for (const f of jsx) {
      const rel = path.relative(RAIZ, f).split(path.sep).join('/');
      for (const { linha, tag } of etiquetas(soCodigo(fs.readFileSync(f, 'utf8')))) {
        const ok = /minHeight:\s*(4[4-9]|[5-9]\d|\d{3})\b/.test(tag)
          || /style=\{\[?\s*campo\b/.test(tag)
          || /campo\(t\)/.test(tag);
        if (!ok) maus.push(`${rel}:${linha}`);
      }
    }
    expect(maus).toEqual([]);
  });

  it('e o `campo(t)` da Gestão tem mesmo os 44', () => {
    const gestao = fs.readFileSync(path.join(RAIZ, 'src/screens/Gestao.jsx'), 'utf8');
    const i = gestao.indexOf('const campo = (t)');
    expect(i).toBeGreaterThan(0);
    expect(gestao.slice(i, i + 400)).toMatch(/minHeight: 44/);
  });
});
