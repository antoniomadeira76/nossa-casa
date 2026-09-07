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
  //
  // ⚠ O corpo é `[^;]*` do princípio ao fim, e não `[\s\S]*?`.
  //
  // Com o `[\s\S]` a expressão ATRAVESSAVA declarações: bastava aparecer um
  // ternário mais acima — no `const newItems = …`, por exemplo — para o `?`
  // dele casar com o `: null;` do `shopPlan` lá abaixo. O `newItems` entrava
  // na lista de anuláveis e o `shopPlan`, que é o que interessa, saía dela.
  // Uma linha de comentário nova noutro sítio do `sync.js` chegava para
  // desarmar este guarda sem que nada ficasse vermelho — e o que ele defende é
  // o ecrã branco do «iniciar compras na loja». Um literal de objecto não tem
  // `;` dentro, por isso `[^;]*` chega e não salta a declaração.
  for (const m of sync.matchAll(/const (\w+) = [^;]*\?[^;]*:\s*null;/g)) nulos.add(m[1]);
  // `mes: aberto ? { … } : null`
  for (const m of sync.matchAll(/^\s*(\w+):\s*[^,\n;]*\?[^;]{0,400}?:\s*null,$/gm)) nulos.add(m[1]);
  return nulos;
}

// ⚠ E o `App.jsx` entra na lista.
//
// A primeira versão deste guarda varria `src/screens` e `src/sheets` e mais
// nada. Passou — e «iniciar compras na loja» continuava a dar ecrã branco: o
// `s.shopPlan.who` que rebentava estava no CABEÇALHO, montado no `App.jsx`,
// que corre antes do ecrã. A pilha apontava ao `Shell` e não ao `ModoCompras`,
// que era onde eu estava a olhar.
const ECRAS = ['App.jsx']
  .concat(fs.readdirSync(path.join(RAIZ, 'src', 'screens'))
    .filter(f => f.endsWith('.jsx')).map(f => `src/screens/${f}`))
  .concat(fs.readdirSync(path.join(RAIZ, 'src', 'sheets'))
    .filter(f => f.endsWith('.jsx')).map(f => `src/sheets/${f}`))
  .concat(fs.readdirSync(path.join(RAIZ, 'src', 'modals'))
    .filter(f => f.endsWith('.jsx')).map(f => `src/modals/${f}`));

describe('⚠ nenhum ecrã lê um campo anulável sem defesa', () => {
  const nulos = camposQuePodemSerNulos();

  it('há campos anuláveis para conferir — senão isto não prova nada', () => {
    expect(nulos.size).toBeGreaterThan(0);
    expect([...nulos]).toEqual(expect.arrayContaining(['shopPlan']));
  });

  it('há ecrãs para varrer', () => {
    expect(ECRAS.length).toBeGreaterThan(8);
  });

  it('⚠ e nenhum lê um campo anulável a seco', () => {
    // ⚠ QUALQUER prefixo, e não só o `s.`.
    //
    // A primeira versão procurava `s.<campo>.` e mais nada. Deixou passar o
    // `x.shopPlan.who` de dentro de um `set(x => …)` — onde a loja se chama
    // `x` — no `ModoCompras`, que rebentava ao FECHAR A CONTA.
    const soltas = [];
    for (const f of ECRAS) {
      const linhas = semComentarios(ler(f)).split(/\r?\n/);
      linhas.forEach((linha, i) => {
        for (const campo of nulos) {
          // Um acesso é seguro quando leva `?.`, ou quando o objeto foi
          // defendido com `(… || {})` antes do ponto.
          const re = new RegExp(`(?<!\\|\\| \\{\\}\\))\\b\\w+\\.${campo}\\.\\w`);
          if (!re.test(linha)) continue;
          if (new RegExp(`\\w+\\.${campo}\\?\\.`).test(linha)) continue;
          if (new RegExp(`\\(\\w+\\.${campo} \\|\\| \\{\\}\\)\\.`).test(linha)) continue;
          soltas.push(`${f}:${i + 1}  .${campo}.… sem defesa`);
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
