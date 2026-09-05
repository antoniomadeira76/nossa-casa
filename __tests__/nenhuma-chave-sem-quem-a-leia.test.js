/**
 * ⚠ Nenhuma chave da loja fica gravada sem que alguém a leia.
 *
 * ── O defeito ────────────────────────────────────────────────────────────────
 *
 * O `extraLog` e o `importDone` estavam nas `DATA_KEYS`, nasciam no `DEMO()`, e
 * ninguém os lia. Vinham do protótipo, onde faziam alguma coisa; na app o
 * trabalho dos dois já era feito por outra chave — o `vaultMoves` guarda os
 * movimentos do cofre, o `googleCalendarImported` guarda o que já se importou.
 *
 * É a mesma forma das oito funções de escrita que ninguém chamava — andaime sem
 * obra — e engana pelo mesmo motivo: não dá erro nenhum. A chave é gravada no
 * disco, aparece no ficheiro como se guardasse alguma coisa, e no
 * `o-que-sobe.js` leva uma razão escrita para não subir. Quem a lê acredita que
 * há ali um dado, e não há.
 *
 * ── A forma do guarda ────────────────────────────────────────────────────────
 *
 * ENUMERA-SE. Para cada chave de `DATA_KEYS`, procura-se o nome em `src/` fora
 * das três listas onde ela é só declarada: a própria `DATA_KEYS`, o `DEMO()`, e
 * o `o-que-sobe.js`. Se não aparece em mais lado nenhum, ninguém a lê.
 *
 * ⚠ E a prova não diz que a chave é INÚTIL — diz que ninguém a usa. As duas
 * saídas honestas são ligá-la a quem devia lê-la, ou tirá-la. Alargar a janela
 * de procura até a prova calar não é nenhuma delas.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const caminhoLoja = path.join(raiz, 'src/store.jsx');
const loja = fs.readFileSync(caminhoLoja, 'utf8');

const i = loja.indexOf('const DATA_KEYS = [');
const bloco = loja.slice(i, loja.indexOf('];', i));
const CHAVES = [...bloco.matchAll(/'([^']+)'/g)].map(m => m[1]);

// Todos os ficheiros de código de `src/`.
const ficheiros = [];
(function andar(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) andar(p);
    else if (/\.(jsx?|mjs)$/.test(e.name)) ficheiros.push(p);
  }
}(path.join(raiz, 'src')));

// O texto de cada ficheiro, com o bloco das `DATA_KEYS` retirado da loja: é uma
// declaração, não uma leitura, e contá-la fazia a prova achar que toda a chave
// tem quem a use.
const textos = ficheiros
  .filter(f => !/o-que-sobe\.js$/.test(f))
  .map((f) => {
    let t = fs.readFileSync(f, 'utf8');
    if (f === caminhoLoja) t = t.slice(0, i) + t.slice(i + bloco.length);
    return { f: path.relative(raiz, f).replace(/\\/g, '/'), t };
  });

// Quantas vezes a chave aparece, e em que ficheiros.
const ondeAparece = (k) => {
  const re = new RegExp(`\\b${k}\\b`, 'g');
  const sitios = [];
  let total = 0;
  for (const { f, t } of textos) {
    const n = (t.match(re) || []).length;
    if (n) { sitios.push(f); total += n; }
  }
  return { sitios, total };
};

describe('⚠ nenhuma chave da loja sem quem a leia', () => {
  it('há chaves para conferir — senão isto não prova nada', () => {
    expect(CHAVES.length).toBeGreaterThan(50);
  });

  it('⚠ nenhuma chave de `DATA_KEYS` fica sem aparecer em lado nenhum', () => {
    const mortas = CHAVES.filter(k => ondeAparece(k).sitios.length === 0);
    expect(mortas).toEqual([]);
  });

  it('⚠ e nenhuma vive só do valor por omissão que lhe deram', () => {
    // Uma chave que só aparece na loja e uma vez só é o `DEMO()` a semeá-la e
    // mais nada — que é exatamente o que o `extraLog` era. O `importDone` tinha
    // três ocorrências e era igualmente morto: nasceu no `DEMO()`, estava no
    // `MAPAS_POR_MEMBRO`, e ninguém o lia.
    //
    // O limite é DUAS ocorrências fora da declaração: nascer e ser lida. Quem
    // só nasce, não é lida.
    const soNascem = CHAVES.filter((k) => {
      const { sitios, total } = ondeAparece(k);
      return sitios.length === 1 && sitios[0] === 'src/store.jsx' && total < 2;
    });
    expect(soNascem).toEqual([]);
  });
});
