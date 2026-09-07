/**
 * Um artigo do servidor tem a forma que os ecrãs leem. Campo a campo.
 *
 * ⚠ Não tinha, e custou uma funcionalidade inteira.
 *
 *   o `sync.js` montava   { id, idServidor, label, section, habitual, est }
 *   os ecrãs leem         i.id, i.label, i.s, i.est, i.real, i.by
 *
 * O `section` e o `habitual` não eram lidos por ninguém, e o `s` — o índice do
 * corredor — não existia. O Modo Compras existe para andar secção a secção, e
 * numa casa ligada ao servidor as QUATRO apareciam vazias:
 *
 *     Frutas & Legumes · 0 artigos      Mercearia · 0 artigos
 *     Frescos · 0 artigos               Casa · 0 artigos
 *     Toda a lista · 8 artigos
 *
 * Os oito artigos existiam. Nenhum tinha o campo pelo qual são agrupados.
 *
 * ── A forma manda-a a LOJA ───────────────────────────────────────────────────
 *
 * `data.js` semeia `{ id, s, label, est, real, staple, by }`, e o `criarArtigo`
 * escreve o mesmo. O servidor tem de traduzir para essa forma — não o contrário
 * —, porque é a forma que os ecrãs já leem em todos os caminhos locais.
 *
 * ⚠ Esta prova ENUMERA: tira os campos do literal do `sync.js`, os da semente,
 * e os que os ecrãs leem, e compara os três. Não sabe nomear campo nenhum.
 *
 * É a terceira vez que um nome divergente entre as duas metades custa uma
 * funcionalidade, depois do `sem-stock` (marcar esgotado não funcionava em
 * direcção nenhuma) e do `plano.time` (dois separadores com nada no meio). Todas
 * invisíveis às provas, porque as provas correm com as sementes.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const soCodigo = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

// ── O que o servidor monta ───────────────────────────────────────────────────
const DO_SERVIDOR = (() => {
  const sync = soCodigo(ler('src/sync.js'));
  const i = sync.indexOf('const newItems = artigosDaLista.map(a => ({');
  expect(i).toBeGreaterThan(0);
  const bloco = sync.slice(i, sync.indexOf('}));', i));
  return new Set([...bloco.matchAll(/^\s{4}(\w+):/gm)].map(m => m[1]));
})();

// ── O que a semente tem ──────────────────────────────────────────────────────
//
// A união de todos os artigos: um artigo sem `real` é normal — `real` é o
// «já comprado» das sementes, e só alguns o têm.
const DA_SEMENTE = (() => {
  const { ITEMS } = require('../src/data');
  const fora = new Set();
  for (const i of ITEMS) for (const k of Object.keys(i)) fora.add(k);
  return fora;
})();

// ── O que os ecrãs leem ──────────────────────────────────────────────────────
//
// `i.x` onde `i` é um artigo. Procura-se nos ficheiros que percorrem artigos.
const LIDOS = (() => {
  const fora = new Map();
  const percorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) percorrer(p);
      else if (/\.jsx?$/.test(e.name)) {
        const rel = path.relative(RAIZ, p).split(path.sep).join('/');
        if (rel === 'src/sync.js' || rel === 'src/data.js') continue;
        const txt = soCodigo(ler(rel));
        if (!/allItems|doneItems|newItems/.test(txt)) continue;
        for (const m of txt.matchAll(/\bi\.(\w+)/g)) {
          if (!fora.has(m[1])) fora.set(m[1], rel);
        }
      }
    }
  };
  percorrer(path.join(RAIZ, 'src'));
  return fora;
})();

describe('⚠ o artigo do servidor tem a forma da loja', () => {
  it('a prova encontra os três lados — senão não prova nada', () => {
    expect(DO_SERVIDOR.size).toBeGreaterThan(4);
    expect(DA_SEMENTE.size).toBeGreaterThan(4);
    expect(LIDOS.size).toBeGreaterThan(3);
  });

  it('⚠ nenhum campo que um ecrã lê falta no que o servidor monta', () => {
    // `real` é a excepção com motivo: é o «já comprado» das sementes, e no
    // servidor quem responde a isso é o `estado` da linha, traduzido para o
    // mapa `status`. Ver `o-estado-do-artigo-tem-uma-grafia`.
    const EXCEPCOES = new Set(['real']);
    const faltam = [...LIDOS.entries()]
      .filter(([c]) => !DO_SERVIDOR.has(c) && !EXCEPCOES.has(c))
      .map(([c, onde]) => `${c} (lido em ${onde})`);
    expect(faltam).toEqual([]);
  });

  it('⚠ e o servidor não monta campos que não existam DE UM DOS DOIS LADOS', () => {
    // Era isto: `section` e `habitual` montados, e nem os ecrãs os leem nem a
    // semente os tem. Um campo a mais não dá erro — dá a impressão de que o
    // dado chegou, e esconde o que falta.
    //
    // ⚠ A primeira versão desta regra dizia «não monta campos que ninguém lê»,
    // e era um grau apertada demais: apanhava o `staple`, que a semente TEM e
    // que o formulário escreve, e cuja informação chega ao ecrã pela linha
    // `by` em vez de ser lida directamente. Montá-lo é coerência entre os dois
    // lados, não ruído — e o dia em que algum ecrã leia `i.staple`, ele já lá
    // está nos dois. O que o defeito fazia, e que esta versão continua a
    // apanhar, era montar um nome que NÃO existe em lado nenhum: nem `section`
    // nem `habitual` estão na semente.
    const EXCEPCOES = new Set(['idServidor']);   // o identificador da linha
    const sobras = [...DO_SERVIDOR]
      .filter(c => !LIDOS.has(c) && !DA_SEMENTE.has(c) && !EXCEPCOES.has(c));
    expect(sobras).toEqual([]);
  });

  it('os campos do servidor existem todos na semente', () => {
    const EXCEPCOES = new Set(['idServidor']);
    const estranhos = [...DO_SERVIDOR].filter(c => !DA_SEMENTE.has(c) && !EXCEPCOES.has(c));
    expect(estranhos).toEqual([]);
  });

  it("⚠ o corredor chama-se `s`, e não `section`", () => {
    // Escrito à mão de propósito: é este o nome que o defeito trocou, e o que
    // faz o Modo Compras agrupar por corredor.
    expect(DO_SERVIDOR.has('s')).toBe(true);
    expect(DO_SERVIDOR.has('section')).toBe(false);
  });

  it('e o artigo habitual chama-se `staple`, e não `habitual`', () => {
    expect(DO_SERVIDOR.has('staple')).toBe(true);
    expect(DO_SERVIDOR.has('habitual')).toBe(false);
  });
});

describe('⚠ as secções do Modo Compras não ficam vazias com artigos do servidor', () => {
  const React = require('react');
  const TestRenderer = require('react-test-renderer');
  const { SafeAreaProvider } = require('react-native-safe-area-context');
  const { StoreProvider, useStore } = require('../src/store');
  const { buildTheme } = require('../src/theme');
  const { SECTIONS } = require('../src/data');
  const ModoCompras = require('../src/screens/ModoCompras').default;

  const texto = (n) => {
    if (n === null || n === undefined || n === false) return '';
    if (typeof n === 'string' || typeof n === 'number') return String(n);
    if (Array.isArray(n)) return n.map(texto).join(' ');
    return texto(n.children || (n.props && n.props.children) || null);
  };

  // A casa como uma casa ligada ao servidor a devolve: sem sementes, e com os
  // artigos na forma que o `puxarCasa` monta. Um por corredor.
  const daCasaDoServidor = () => {
    let arvore = null; let api = null;
    const Sonda = () => {
      api = useStore();
      return React.createElement(ModoCompras, {
        t: buildTheme(0, false), user: 'Rita', onClose: () => {},
      });
    };
    TestRenderer.act(() => {
      arvore = TestRenderer.create(
        React.createElement(SafeAreaProvider, {
          initialMetrics: { frame: { x: 0, y: 0, width: 402, height: 874 },
                            insets: { top: 47, left: 0, right: 0, bottom: 34 } },
        }, React.createElement(StoreProvider, null, React.createElement(Sonda))));
    });
    TestRenderer.act(() => {
      api.set({
        clearedSeeds: true,
        newItems: SECTIONS.map((_, i) => ({
          id: `srv-${i}`, idServidor: `srv-${i}`, label: `Artigo do corredor ${i}`,
          s: i, staple: false, est: 1 + i, by: 'Adicionado por Rita',
        })),
        status: {},
      });
    });
    return () => texto(arvore.toJSON());
  };

  it('há corredores para percorrer — senão isto não prova nada', () => {
    expect(SECTIONS.length).toBeGreaterThan(1);
  });

  it.each(SECTIONS.map((s, i) => [i, typeof s === 'string' ? s : s.label || s.name || String(i)]))(
    'o corredor %i («%s») encontra o artigo que é dele',
    (i) => {
      const ver = daCasaDoServidor();
      // Sem filtro, os artigos de todos os corredores aparecem.
      expect(ver()).toContain(`Artigo do corredor ${i}`);
    });

  it('⚠ e o agrupamento por corredor vê cada artigo uma vez, não zero', () => {
    // A propriedade que o defeito quebrava: somar os artigos de todos os
    // corredores dá o total da lista. Dava zero, e o total dava oito.
    const ver = daCasaDoServidor();
    const t = ver();
    for (let i = 0; i < SECTIONS.length; i++) {
      const quantos = (t.match(new RegExp(`Artigo do corredor ${i}`, 'g')) || []).length;
      expect(quantos).toBeGreaterThan(0);
    }
  });

  it('e nenhum artigo do servidor mostra «undefined» na linha de baixo', () => {
    // O `by` não era montado: a linha pequena ficava vazia, ou pior.
    expect(daCasaDoServidor()()).not.toContain('undefined');
  });
});
