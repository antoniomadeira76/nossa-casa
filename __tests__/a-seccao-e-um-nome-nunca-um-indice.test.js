/**
 * A secção de um artigo é um NOME. Nunca um índice.
 *
 * ── Porquê ───────────────────────────────────────────────────────────────────
 *
 * Era `i.s = 0..3`, um índice numa lista de quatro nomes fixos no `data.js` que
 * a casa não podia tocar. Enquanto os nomes fossem fixos, o índice era
 * inofensivo — nada o podia desalinhar.
 *
 * A partir do momento em que a família pode reordenar, renomear ou apagar uma
 * secção (08/09/2026), um índice passa a apontar para outra coisa a cada
 * mudança: **apagar «Frescos» faz a mercearia toda mudar de corredor**, e o
 * ecrã não tem como saber que mudou.
 *
 * É a terceira vez que esta armadilha aparece nesta casa:
 *
 *   · a grelha de envelopes mostrava o `ENV_BASE` e a confirmação aplicava
 *     `envelopes[índice]` — escolhia-se um envelope e lançava-se noutro
 *   · o `shopPlan.store` é um índice na lista `stores`
 *   · e agora a secção
 *
 * ⚠ Esta prova percorre o CÓDIGO e os DADOS: nenhuma semente com número,
 * nenhum ecrã a comparar `i.s` com um índice, e a migração a converter o que já
 * está gravado.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const soCodigo = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .split('\n').map(l => (/^\s*(\/\/|\*)/.test(l) ? '' : l)).join('\n');

describe('⚠ nenhum artigo guarda a secção como número', () => {
  const { ITEMS, SECTIONS } = require('../src/data');

  it('as sementes têm secções para conferir — senão isto não prova nada', () => {
    expect(ITEMS.length).toBeGreaterThan(5);
    expect(SECTIONS.length).toBeGreaterThan(1);
  });

  it('⚠ e a secção de cada uma é uma string, não um índice', () => {
    const numericas = ITEMS.filter(i => typeof i.s !== 'string')
      .map(i => `${i.id} → ${JSON.stringify(i.s)}`);
    expect(numericas).toEqual([]);
  });

  it('e cada uma nomeia uma secção que existe', () => {
    const orfas = ITEMS.filter(i => !SECTIONS.includes(i.s)).map(i => `${i.id} → ${i.s}`);
    expect(orfas).toEqual([]);
  });
});

describe('⚠ os ecrãs comparam nomes, e não posições', () => {
  const ECRAS = ['src/screens/Compras.jsx', 'src/screens/ModoCompras.jsx', 'src/sheets/NovoArtigo.jsx'];

  it.each(ECRAS)('%s não importa a constante `SECTIONS`', (rel) => {
    // A lista é da CASA e vem da loja. Importar a constante é ficar com uma
    // segunda fonte que não muda quando a família muda a dela — a classe de
    // defeito que pôs o Dinheiro a ler `ENV_BASE` em cinco sítios.
    expect(soCodigo(ler(rel))).not.toMatch(/import \{[^}]*SECTIONS[^}]*\} from/);
  });

  it.each(ECRAS)('%s lê as secções da loja', (rel) => {
    expect(soCodigo(ler(rel))).toMatch(/\bseccoes\b/);
  });

  it('⚠ e nenhum compara `i.s` com um número', () => {
    const maus = [];
    for (const rel of ECRAS) {
      const txt = soCodigo(ler(rel)).split('\n');
      txt.forEach((l, i) => {
        if (/i\.s\s*===\s*\d/.test(l) || /\.s\s*===\s*si\b/.test(l) || /\.s\s*===\s*idx\b/.test(l)) {
          maus.push(`${rel}:${i + 1} → ${l.trim().slice(0, 60)}`);
        }
      });
    }
    expect(maus).toEqual([]);
  });
});

describe('⚠ e o que já está gravado converte-se', () => {
  const { MIGRATIONS, SCHEMA } = require('../src/store');
  const { SECTIONS } = require('../src/data');
  const quinze = (loja) => MIGRATIONS[15](loja);

  it('a migração existe e o esquema conta-a', () => {
    expect(typeof MIGRATIONS[15]).toBe('function');
    expect(SCHEMA).toBeGreaterThanOrEqual(15);
  });

  it('⚠ um índice vira o nome que ele significava', () => {
    const r = quinze({ v: 14, newItems: [
      { id: 'a', s: 0, label: 'Maçã' },
      { id: 'b', s: 2, label: 'Arroz' },
    ] });
    expect(r.newItems[0].s).toBe(SECTIONS[0]);
    expect(r.newItems[1].s).toBe(SECTIONS[2]);
    // E o resto do artigo fica: mudar de chave não é perder o rótulo.
    expect(r.newItems[0].label).toBe('Maçã');
  });

  it('e usa a lista da CASA quando ela já a tem', () => {
    // ⚠ Uma casa que já reordenou as secções não pode ser convertida pelas
    // sementes: os índices dela significam a ordem DELA.
    const r = quinze({ v: 14, seccoesDaCasa: ['Casa', 'Frescos'], newItems: [{ id: 'a', s: 1 }] });
    expect(r.newItems[0].s).toBe('Frescos');
  });

  it('⚠ um artigo que já tem nome fica intacto', () => {
    const artigo = { id: 'a', s: 'Mercearia', label: 'Arroz' };
    const r = quinze({ v: 14, newItems: [{ ...artigo }] });
    expect(r.newItems[0]).toEqual(artigo);
  });

  it('sem índices nenhuns, devolve a loja tal e qual', () => {
    // Não é só «não rebenta»: é não tocar.
    const loja = { v: 14, newItems: [{ id: 'a', s: 'Casa' }] };
    expect(quinze(loja)).toBe(loja);
  });

  it('e um índice fora da lista cai no primeiro corredor, não em `undefined`', () => {
    const r = quinze({ v: 14, newItems: [{ id: 'a', s: 99 }] });
    expect(r.newItems[0].s).toBe(SECTIONS[0]);
  });

  it('sem artigos gravados não rebenta', () => {
    expect(() => quinze({ v: 14 })).not.toThrow();
    expect(() => quinze({ v: 14, newItems: null })).not.toThrow();
    expect(() => quinze({ v: 14, newItems: [null] })).not.toThrow();
  });
});

describe('⚠ e o servidor guarda a relação, não o número', () => {
  const sync = soCodigo(ler('src/sync.js'));

  it('o artigo sobe com `corredor`, e não com `seccao`', () => {
    expect(sync).toMatch(/corredor: corredor \|\| null/);
    expect(sync).not.toMatch(/seccao: Number/);
  });

  it('e desce pelo NOME do corredor', () => {
    expect(sync).toMatch(/s: nomeDoCorredor\[a\.corredor\]/);
  });

  it('⚠ com as secções ORDENADAS pelo posto — a ordem é o dado', () => {
    // Uma secção não é só um nome: é o lugar dela no percurso da loja. Sem
    // ordenar aqui, dois telemóveis mostravam percursos diferentes.
    expect(sync).toMatch(/\.sort\(\(a, b\) => \(Number\(a\.posto\) \|\| 0\) - \(Number\(b\.posto\) \|\| 0\)\)/);
  });
});
