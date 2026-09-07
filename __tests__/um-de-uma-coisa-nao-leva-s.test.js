/**
 * «1 artigo», e não «1 artigos». Em toda a app.
 *
 * ⚠ Segunda vez, e por isso guarda em vez de remendo.
 *
 * Apanhado a percorrer os quatro corredores do Modo Compras depois de eles
 * voltarem a ter artigos: «Mercearia · 1 artigos», «Casa · 1 artigos». Dois dos
 * quatro tinham um só. O `plural` do `format.js` existe exactamente para isto e
 * estava a ser usado três ficheiros ao lado.
 *
 * O varrimento seguinte encontrou mais cinco sítios, e o pior era o Dinheiro:
 *
 *     `${eq.length} equipamentos · ${eqWarn} garantia a expirar · …`
 *
 * três contagens numa linha, e com duas garantias a expirar lia-se
 * «2 garantia a expirar». Na casa de demonstração havia uma de cada, e por isso
 * parecia bem — a demonstração a esconder o defeito, outra vez.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * Um número seguido de uma palavra no plural tem de passar pelo `plural(...)`,
 * ou estar dentro de um ramo que já separou o singular (`=== 1 ? … : …`).
 *
 * ⚠ ENUMERA. Percorre os `.jsx` todos e apanha cada `{…length} palavras`. Um
 * sítio novo entra aqui sozinho — que é a diferença entre isto e eu voltar a
 * caçá-los um a um.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const soCodigo = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

const JSX = (() => {
  const fora = [];
  const percorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) percorrer(p);
      else if (/\.jsx$/.test(e.name)) fora.push(p);
    }
  };
  percorrer(path.join(RAIZ, 'src'));
  fora.push(path.join(RAIZ, 'App.jsx'));
  return fora.map(p => path.relative(RAIZ, p).split(path.sep).join('/'));
})();

// Palavras portuguesas no plural que a app conta. Acentos incluídos.
const PALAVRA_PLURAL = '[a-zà-öø-ÿ]+(?:s|ões|ães)';

// Cada `{<algo>.length} palavras` ou `${<algo>.length} palavras`, com o pedaço
// de código à volta para se poder ver se está guardado.
const contagensEm = (rel) => {
  const txt = soCodigo(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
  const fora = [];
  const padrao = new RegExp(`\\$?\\{([^{}]*\\.length)\\}\\s+(${PALAVRA_PLURAL})\\b`, 'g');
  for (const m of txt.matchAll(padrao)) {
    // ⚠ A vizinhança é generosa de propósito: o ramo que separa o singular
    // costuma estar na linha ACIMA («n === 1 ? 'um evento' : `${n} eventos`»),
    // e uma janela curta dava falsos positivos que se resolveriam a esconder a
    // regra em vez de a cumprir.
    const de = Math.max(0, m.index - 260);
    fora.push({
      trecho: `${m[1]} ${m[2]}`,
      linha: txt.slice(0, m.index).split('\n').length,
      volta: txt.slice(de, m.index + m[0].length + 60),
    });
  }
  return fora;
};

const guardado = (c) => /plural\(/.test(c.volta) || /===\s*1\s*\?/.test(c.volta)
  || /length\s*>\s*1/.test(c.volta) || /!==\s*1\s*\?/.test(c.volta);

const TODAS = JSX.flatMap(rel => contagensEm(rel).map(c => ({ ...c, rel })));

describe('⚠ nenhuma contagem escreve o plural à mão', () => {
  it('a procura encontra contagens — senão isto não prova nada', () => {
    // Se der zero, ou o padrão deixou de casar ou a app deixou de contar
    // coisas. Nos dois casos, quero saber.
    expect(TODAS.length).toBeGreaterThan(3);
  });

  it('⚠ todas passam pelo `plural`, ou por um ramo que separa o singular', () => {
    const soltas = TODAS.filter(c => !guardado(c))
      .map(c => `${c.rel}:${c.linha} → «${c.trecho}»`);
    expect(soltas).toEqual([]);
  });
});

describe('o `plural` faz o que diz', () => {
  const { plural } = require('../src/format');

  it('um leva o singular', () => {
    expect(plural(1, 'artigo', 'artigos')).toBe('1 artigo');
  });

  it('zero leva o plural — «0 artigos», que é como se diz', () => {
    expect(plural(0, 'artigo', 'artigos')).toBe('0 artigos');
  });

  it('e dois também', () => {
    expect(plural(2, 'artigo', 'artigos')).toBe('2 artigos');
  });

  it('aguenta uma expressão inteira, e não só uma palavra', () => {
    // É o que o Dinheiro precisa: «1 garantia a expirar» / «2 garantias a
    // expirar». O plural não é sempre um «s» no fim da palavra.
    expect(plural(1, 'garantia a expirar', 'garantias a expirar')).toBe('1 garantia a expirar');
    expect(plural(3, 'garantia a expirar', 'garantias a expirar')).toBe('3 garantias a expirar');
  });
});

describe('⚠ e os sítios que o defeito tinha ficaram corrigidos', () => {
  // Escritos à mão, porque são a memória de onde ele estava. Se um deles voltar
  // a ser texto solto, a prova de cima apanha-o; esta diz qual era.
  const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

  it('o corredor do Modo Compras', () => {
    expect(ler('src/screens/ModoCompras.jsx')).toMatch(/plural\([^)]*'artigo', 'artigos'\)/);
  });

  it('a secção das Compras', () => {
    expect(ler('src/screens/Compras.jsx')).toMatch(/plural\(rows\.length, 'artigo', 'artigos'\)/);
  });

  it('as três contagens dos equipamentos, no Dinheiro', () => {
    const d = ler('src/screens/Dinheiro.jsx');
    expect(d).toMatch(/plural\(eq\.length, 'equipamento', 'equipamentos'\)/);
    expect(d).toMatch(/plural\(eqWarn, 'garantia a expirar', 'garantias a expirar'\)/);
  });

  it('e a contagem de eventos de um dia, na Agenda', () => {
    expect(ler('src/screens/Agenda.jsx')).toMatch(/plural\(c\.evs\.length, 'evento', 'eventos'\)/);
  });
});
