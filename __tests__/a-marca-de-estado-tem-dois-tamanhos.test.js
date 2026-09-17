/**
 * A MARCA DE ESTADO TEM DOIS TAMANHOS, E SÓ DOIS
 * ==============================================
 *
 * 17/09/2026, o dono da casa: «os vistos das compras devem ficar do mesmo
 * tamanho dos vistos das tarefas».
 *
 * Tinha QUATRO tamanhos em oito sítios — 20 nas tarefas, no início e no
 * carrinho, 24 nas compras, 24 e 28 na app da criança. Ninguém os escolheu:
 * cada ecrã escreveu o seu à medida que a marca partilhada foi chegando lá, e a
 * mesma peça ficou com quatro pesos. É a forma mais silenciosa de incoerência —
 * nada rebenta, nada se lê mal, e a app parece mal feita sem se saber porquê.
 *
 * ── A propriedade ──────────────────────────────────────────────────────────
 *
 *   1. Existem DUAS constantes e mais nenhuma: `MARCA` para a app dos adultos e
 *      `MARCA_DA_CRIANCA` para a da criança, que é maior POR DECISÃO — a app
 *      dela tem letra maior e linhas maiores.
 *   2. Nenhum ecrã passa um número escrito à mão ao `size` da marca.
 *   3. A app da criança usa a sua, e só ela; os adultos usam a deles.
 *   4. Os dois valores são diferentes, e o da criança é o maior — senão a
 *      distinção não serve para nada.
 *
 * ⚠ Este guarda é da mesma família do `o-canto-de-tudo-o-que-se-toca` e do
 * `um-objeto-grafico-ve-se-nos-doze-temas`: ENUMERA os sítios em vez de
 * remendar o que se viu. Ver [[defeito-repetido-guarda-generico]].
 */
const fs = require('fs');
const path = require('path');
const { MARCA, MARCA_DA_CRIANCA } = require('../src/ui');

const RAIZ = path.join(__dirname, '..');

// ⚠ Sem perder linhas: um comentário de bloco vira o mesmo número de linhas
// vazias, para o número que esta prova aponta corresponder ao ficheiro.
const semComentarios = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (b) => '\n'.repeat((b.match(/\n/g) || []).length))
  .replace(/^\s*\/\/[^\n]*/gm, '');

const jsx = (() => {
  const fora = [];
  const andar = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) andar(p);
      else if (/\.jsx$/.test(e.name)) fora.push(p);
    }
  };
  andar(path.join(RAIZ, 'src'));
  fora.push(path.join(RAIZ, 'App.jsx'));
  return fora.map(p => path.relative(RAIZ, p).split(path.sep).join('/'));
})();

// Cada `<MarcaDeEstado …>` da árvore, com o ficheiro e a linha.
const usos = (() => {
  const fora = [];
  for (const rel of jsx) {
    if (rel === 'src/ui.jsx') continue;              // onde ela vive
    const linhas = semComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8')).split('\n');
    linhas.forEach((linha, i) => {
      if (!/<MarcaDeEstado\b/.test(linha)) return;
      // A tag pode continuar na linha seguinte.
      const tag = [linha, linhas[i + 1] || ''].join(' ');
      const m = /size=\{([^}]*)\}/.exec(tag);
      fora.push({ rel, linha: i + 1, size: m ? m[1].trim() : null, texto: linha.trim() });
    });
  }
  return fora;
})();

describe('⚠ a marca de estado tem dois tamanhos, e só dois', () => {
  it('a prova vê os sítios onde a marca é usada — senão não prova nada', () => {
    // Oito em 17/09/2026. Se descer muito, a marca deixou de ser usada e vale a
    // pena saber; se subir, é sinal de que um ecrã novo a adotou, e a regra
    // continua a aplicar-se.
    expect(usos.length).toBeGreaterThanOrEqual(6);
    const ficheiros = new Set(usos.map(u => u.rel));
    expect(ficheiros.has('src/screens/Tarefas.jsx')).toBe(true);
    expect(ficheiros.has('src/screens/Compras.jsx')).toBe(true);
    expect(ficheiros.has('src/KidApp.jsx')).toBe(true);
  });

  it('as duas constantes existem, são diferentes, e a da criança é a maior', () => {
    expect(typeof MARCA).toBe('number');
    expect(typeof MARCA_DA_CRIANCA).toBe('number');
    expect(MARCA_DA_CRIANCA).toBeGreaterThan(MARCA);
    // E são medidas de desenho, não números ao acaso: entram na escala de
    // ícones da app, que vai de 9 a 32.
    for (const v of [MARCA, MARCA_DA_CRIANCA]) {
      expect(v).toBeGreaterThanOrEqual(9);
      expect(v).toBeLessThanOrEqual(32);
    }
  });

  it('⚠ nenhum ecrã escreve o tamanho à mão', () => {
    const maus = usos
      .filter(u => u.size !== null && /^\d/.test(u.size))
      .map(u => `${u.rel}:${u.linha} → size={${u.size}} — use MARCA ou MARCA_DA_CRIANCA`);
    expect(maus).toEqual([]);
  });

  it('⚠ a app da criança usa a SUA, e a dos adultos usa a deles', () => {
    const maus = [];
    for (const u of usos) {
      if (u.size === null) continue;                  // fica o valor por omissão
      const daCrianca = u.rel === 'src/KidApp.jsx';
      const esperado = daCrianca ? 'MARCA_DA_CRIANCA' : 'MARCA';
      if (u.size !== esperado) {
        maus.push(`${u.rel}:${u.linha} → size={${u.size}}, esperava ${esperado}`);
      }
    }
    expect(maus).toEqual([]);
  });

  it('e o valor por omissão da própria marca é o dos adultos', () => {
    const ui = semComentarios(fs.readFileSync(path.join(RAIZ, 'src/ui.jsx'), 'utf8'));
    expect(ui).toMatch(/size = MARCA \}/);
    // As duas saem do ficheiro, para os ecrãs as poderem importar.
    expect(ui).toMatch(/export const MARCA = /);
    expect(ui).toMatch(/export const MARCA_DA_CRIANCA = /);
  });
});
