/**
 * O estado de um artigo escreve-se de UMA maneira. A dos ecrãs.
 *
 * ⚠ Havia duas, e nenhuma prova as comparava.
 *
 *   os ecrãs      `'sem-stock'`, com hífen. Três sítios do `ModoCompras.jsx`:
 *                 o que o toque escreve, e o que a linha lê para se desenhar.
 *   o `sync.js`   `'sem stock'`, com espaço, dentro da tabela de tradução — e
 *                 um comentário por cima a afirmar «a loja fala open | done |
 *                 sem stock», que era simplesmente falso.
 *
 * Marcar um artigo como esgotado não funcionava em direcção nenhuma:
 *
 *   a escrever   `ESTADO_NO_SERVIDOR['sem-stock']` é `undefined`, e havia um
 *                `|| 'por_comprar'` a apanhá-lo. A Rita marcava o papel de
 *                cozinha como esgotado, o servidor guardava «por comprar», e o
 *                artigo voltava para a lista de compras. Sem erro nenhum.
 *   a ler        `sem_stock` voltava como «sem stock», a linha comparava com
 *                «sem-stock», nunca dava. O artigo esgotado desenhava-se como
 *                um artigo normal à espera de confirmação.
 *
 * Sem servidor funcionava, porque aí a loja escreve e lê a mesma grafia — e é
 * assim que sobreviveu: as 1556 provas correm sem servidor, e as do servidor
 * comparavam a tabela consigo própria («a prova que fotografa», classe 8).
 *
 * ⚠ Esta prova não escreve grafia nenhuma. LÊ as que os ecrãs usam e exige que
 * a tabela as cubra, todas, exactamente. Uma grafia nova num ecrã aparece aqui
 * sozinha.
 */
const fs = require('fs');
const path = require('path');
const {
  ESTADO_NO_SERVIDOR, ESTADO_NA_LOJA, ESTADOS_DA_LOJA, ESTADOS_DO_SERVIDOR,
  ESTADO_INICIAL, paraOServidor, paraALoja,
} = require('../src/compras-estado');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

// ⚠ Sem comentários, e é a segunda vez que aprendo isto no mesmo dia.
//
// Um guarda que procura o texto do defeito falha nas linhas que o EXPLICAM, e
// obriga a apagar a única memória de porque a regra existe. Aconteceu com o
// `'Mercearia'` do `store.jsx` de manhã, e voltou a acontecer aqui à tarde —
// por isso está numa função, e não remendado duas vezes.
const soCodigo = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

// Os ficheiros que mexem no estado de um artigo. Enumerados por procura, e não
// escritos aqui: um ecrã novo que toque no `status` entra sozinho.
const FICHEIROS = (() => {
  const achados = [];
  const percorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) percorrer(p);
      else if (/\.jsx?$/.test(e.name)) achados.push(p);
    }
  };
  percorrer(path.join(RAIZ, 'src'));
  return achados
    .map(p => path.relative(RAIZ, p).split(path.sep).join('/'))
    .filter(p => p !== 'src/compras-estado.js' && p !== 'src/sync.js')
    .filter(p => /stateOf|marcarArtigo|s\.status|x\.status/.test(ler(p)));
})();

// As grafias que aparecem comparadas ou escritas ao lado do estado de um
// artigo. O padrão apanha `stateOf(i) === 'x'`, `marcar(id, 'x')`,
// `status[id] || 'x'` e `[id]: 'x'`.
const grafiasEm = (rel) => {
  const txt = soCodigo(ler(rel));
  const fora = new Set();
  const padroes = [
    /stateOf\([^)]*\)\s*(?:===|!==)\s*'([^']+)'/g,
    /\bestado\s*(?:===|!==)\s*'([^']+)'/g,
    /marcar(?:Artigo)?\([^,]+,\s*'([^']+)'/g,
    /status\[[^\]]+\]\s*\|\|\s*'([^']+)'/g,
    /\breal\s*\?\s*'([^']+)'\s*:\s*'([^']+)'/g,
  ];
  for (const p of padroes) {
    for (const m of txt.matchAll(p)) {
      for (const g of m.slice(1)) if (g) fora.add(g);
    }
  }
  return fora;
};

describe('⚠ as grafias dos ecrãs e a tabela de tradução são a mesma coisa', () => {
  it('a procura encontra ficheiros — senão isto não prova nada', () => {
    expect(FICHEIROS.length).toBeGreaterThan(1);
  });

  it.each(FICHEIROS)('%s não usa grafia nenhuma fora da tabela', (rel) => {
    const desconhecidas = [...grafiasEm(rel)].filter(g => !ESTADO_NO_SERVIDOR[g]);
    expect(desconhecidas).toEqual([]);
  });

  it("⚠ e a grafia é «sem-stock», com hífen — a dos ecrãs", () => {
    // A grafia da LOJA manda: é a que o toque escreve. Escrito à mão de
    // propósito, porque é este o valor que o defeito trocou.
    expect(ESTADOS_DA_LOJA).toContain('sem-stock');
    expect(ESTADO_NO_SERVIDOR['sem stock']).toBeUndefined();
  });

  it('e a tabela não tem sobras — cada grafia dela é usada por algum ecrã', () => {
    // Uma entrada a mais não dá erro, e envelhece a dizer sim.
    const usadas = new Set();
    for (const rel of FICHEIROS) for (const g of grafiasEm(rel)) usadas.add(g);
    expect([...ESTADOS_DA_LOJA].filter(g => !usadas.has(g))).toEqual([]);
  });
});

describe('a tradução é reversível, e não inventa nada', () => {
  it.each(ESTADOS_DA_LOJA)('«%s» vai e volta', (loja) => {
    expect(paraALoja(paraOServidor(loja))).toBe(loja);
  });

  it.each(ESTADOS_DO_SERVIDOR)('«%s» volta e vai', (servidor) => {
    expect(paraOServidor(paraALoja(servidor))).toBe(servidor);
  });

  it('as duas tabelas têm o mesmo tamanho — nenhuma grafia se perde no caminho', () => {
    expect(Object.keys(ESTADO_NA_LOJA).length).toBe(ESTADOS_DA_LOJA.length);
  });

  it('⚠ um estado desconhecido dá `null`, e não um estado válido', () => {
    // Era `|| 'por_comprar'`. Um valor por omissão que corrompe o dado é pior
    // do que um erro: escrevia «por comprar» por cima do que a pessoa marcou.
    expect(paraOServidor('sem stock')).toBeNull();
    expect(paraOServidor('esgotado')).toBeNull();
    expect(paraOServidor(undefined)).toBeNull();
    expect(paraALoja('nada_disto')).toBeNull();
  });

  it('e o estado inicial é um dos da loja', () => {
    expect(ESTADOS_DA_LOJA).toContain(ESTADO_INICIAL);
  });
});

describe('⚠ o `sync.js` não escreve o campo quando não sabe traduzir', () => {
  const sync = ler('src/sync.js');

  it('a tabela saiu do `sync.js` — não há duas', () => {
    expect(sync).not.toMatch(/^const ESTADO_NO_SERVIDOR = \{/m);
    expect(sync).toMatch(/from '\.\/compras-estado'/);
  });

  it("o `|| 'por_comprar'` desapareceu", () => {
    expect(sync).not.toMatch(/ESTADO_NO_SERVIDOR\[estado\] \|\| 'por_comprar'/);
    expect(sync).not.toMatch(/paraOServidor\([^)]*\) \|\| 'por_comprar'/);
  });

  it('e o campo só entra na escrita se houver tradução', () => {
    expect(sync).toMatch(/\.\.\.\(paraOServidor\(estado\) \? \{ estado: paraOServidor\(estado\) \} : \{\}\)/);
  });
});

describe('a prova do servidor fala a grafia da loja', () => {
  // ⚠ A `provar-compras.mjs` exigia `igual(lida.status[leite], 'sem stock')` —
  // comparava a tabela consigo própria, e por isso ficou verde os meses todos
  // em que os ecrãs falavam outra língua. É a classe «prova que fotografa».
  it('nenhuma prova do PocketBase espera «sem stock» com espaço', () => {
    const dir = path.join(RAIZ, 'db', 'pocketbase');
    const maus = fs.readdirSync(dir)
      .filter(f => f.endsWith('.mjs'))
      .filter(f => /'sem stock'|"sem stock"/.test(soCodigo(fs.readFileSync(path.join(dir, f), 'utf8'))));
    expect(maus).toEqual([]);
  });
});
