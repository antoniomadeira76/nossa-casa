/**
 * Uma casa vazia não pode dar ecrã branco.
 *
 * ⚠ O ecrã das Compras lia `s.shopPlan.who` cru — e o `puxarCasa` devolve
 * `shopPlan: null` sempre que não há lista aberta, que é o estado normal ENTRE
 * DUAS IDAS e o de uma casa acabada de abrir.
 *
 * Tocar em «Compras» dava «Cannot read properties of null (reading 'who')» e o
 * ecrã em branco. A loja guarda o `shopPlan` em cinco sítios — `(s.shopPlan ||
 * {})`, `s.shopPlan ? … : null` —; o ecrã não guardava em nenhum.
 *
 * As 1385 provas de então passavam todas: correm todas com uma ida marcada.
 * Apanhado a percorrer os cinco separadores com a casa vazia, à mão.
 *
 * Este guarda ENUMERA os campos da loja que podem ser nulos e confere que
 * nenhum ecrã os lê sem defesa — em vez de me lembrar de um de cada vez.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Os campos da loja que o `puxarCasa` pode devolver a NULO, tirados do próprio
// `sync.js`: assim a lista acompanha o servidor em vez de envelhecer aqui.
function camposQuePodemSerNulos() {
  const sync = semComentarios(ler('src/sync.js'));
  const nulos = new Set();
  // `const shopPlan = aberta ? { … } : null;`
  for (const m of sync.matchAll(/const (\w+) = [^;]*\?[\s\S]*?:\s*null;/g)) nulos.add(m[1]);
  // `mes: aberto ? { … } : null`
  for (const m of sync.matchAll(/^\s*(\w+):\s*[^,\n]*\?[\s\S]{0,400}?:\s*null,$/gm)) nulos.add(m[1]);
  return nulos;
}

const ECRAS = fs.readdirSync(path.join(RAIZ, 'src', 'screens'))
  .filter(f => f.endsWith('.jsx')).map(f => `src/screens/${f}`)
  .concat(fs.readdirSync(path.join(RAIZ, 'src', 'sheets'))
    .filter(f => f.endsWith('.jsx')).map(f => `src/sheets/${f}`));

describe('⚠ nenhum ecrã lê um campo anulável sem defesa', () => {
  const nulos = camposQuePodemSerNulos();

  it('há campos anuláveis para conferir — senão isto não prova nada', () => {
    expect(nulos.size).toBeGreaterThan(0);
    expect([...nulos]).toEqual(expect.arrayContaining(['shopPlan']));
  });

  it('há ecrãs para varrer', () => {
    expect(ECRAS.length).toBeGreaterThan(8);
  });

  it('⚠ e nenhum faz `s.<campo>.alguma-coisa` a seco', () => {
    const soltas = [];
    for (const f of ECRAS) {
      const linhas = semComentarios(ler(f)).split(/\r?\n/);
      linhas.forEach((linha, i) => {
        for (const campo of nulos) {
          // `s.shopPlan.who` — sem `?.`, sem `||`, sem ter sido guardado antes.
          const re = new RegExp(`\\bs\\.${campo}\\.\\w`);
          if (!re.test(linha)) continue;
          soltas.push(`${f}:${i + 1}  s.${campo}.… sem defesa`);
        }
      });
    }
    expect(soltas).toEqual([]);
  });
});

describe('e a lista fechada num telemóvel fecha no outro', () => {
  // ⚠ O `if (casa.shopPlan)` deitava o NULO fora: a Rita fechava a conta na
  // caixa e o telemóvel do Tomás continuava a mostrar a ida de sábado com os
  // artigos todos — para sempre, porque nenhuma leitura seguinte a tirava.
  //
  // É a forma do INVARIANTE #2 ao contrário: não é um total que não se
  // recalcula, é uma AUSÊNCIA que não se propaga.
  const loja = semComentarios(ler('src/store.jsx'));

  it('o nulo do servidor também se aplica', () => {
    expect(loja).not.toMatch(/if \(casa\.shopPlan\) \{/);
    expect(loja).toMatch(/shopPlan: null/);
  });

  it('e leva os artigos e os estados com ele', () => {
    const bloco = loja.slice(loja.indexOf('casa.shopPlan'), loja.indexOf('casa.shopPlan') + 420);
    expect(bloco).toMatch(/newItems: \[\]/);
    expect(bloco).toMatch(/status: \{\}/);
  });
});
