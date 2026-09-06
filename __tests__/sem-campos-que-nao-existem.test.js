/**
 * ⚠ O cliente não lê campos que as coleções não têm.
 *
 * ── O defeito ────────────────────────────────────────────────────────────────
 *
 * O `sync.js` lia `d.created` em oito sítios, como reserva para quando a data
 * própria faltasse. Só que **as coleções deste projeto não têm `created`**: o
 * PocketBase v0.23+ só o cria quando o esquema o declara como `autodate`, e o
 * `criar-colecoes.mjs` nunca o declarou.
 *
 * A reserva era `undefined`, e isso não era só inútil:
 *
 *     String(undefined).slice(0, 10)  ===  'undefine'
 *     'undefine' >= '2026-09-01'      ===  true
 *
 * Uma linha sem data contava em TODOS os meses, para sempre — e a reserva
 * escrita para a proteger era exactamente o que a partia.
 *
 * Apareceu de outra maneira primeiro: ordenar o registo por `-created` devolvia
 * 400, o `.catch(() => [])` da leitura engolia-o, e o histórico da casa ficava
 * sempre vazio.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * Enumera-se: se o esquema não declara nenhum campo `autodate`, então nenhum
 * ficheiro de `src/` pode ler `.created` nem `.updated`. No dia em que alguém
 * os declarar, esta prova deixa de exigir nada — e é o comportamento certo.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const esquema = fs.readFileSync(path.join(raiz, 'db/pocketbase/criar-colecoes.mjs'), 'utf8');

const ficheiros = [];
(function andar(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) andar(p);
    else if (/\.(jsx?)$/.test(e.name)) ficheiros.push(p);
  }
}(path.join(raiz, 'src')));

// Sem comentários: o que interessa é o CÓDIGO que lê o campo.
const semComentarios = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

const declaraAutodate = /type: 'autodate'/.test(esquema);

describe('⚠ o cliente não lê campos que não existem', () => {
  it('o esquema lê-se, e diz se há autodate', () => {
    expect(esquema.length).toBeGreaterThan(1000);
    // Hoje não há nenhum. Se passar a haver, o teste abaixo cala-se sozinho.
    expect(typeof declaraAutodate).toBe('boolean');
  });

  it('⚠ sem `autodate` no esquema, ninguém lê `.created` nem `.updated`', () => {
    if (declaraAutodate) return;                 // passou a existir: nada a exigir
    const maus = ficheiros
      .map(f => ({ f: path.relative(raiz, f).replace(/\\/g, '/'), t: semComentarios(fs.readFileSync(f, 'utf8')) }))
      .filter(({ t }) => /\.\s*created\b|\.\s*updated\b/.test(t))
      .map(({ f }) => f);
    expect(maus).toEqual([]);
  });

  it('⚠ e o `noMes` recusa o que não é uma data', () => {
    // A guarda que impede uma linha sem data de contar em todos os meses.
    const sync = fs.readFileSync(path.join(raiz, 'src/sync.js'), 'utf8');
    const i = sync.indexOf('const noMes =');
    expect(i).toBeGreaterThan(0);
    expect(sync.slice(i, i + 300)).toMatch(/\\d\{4\}-\\d\{2\}-\\d\{2\}/);
  });
});
