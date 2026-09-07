/**
 * A linha de uma nota diz de quem é, e nunca deixa um separador pendurado.
 *
 * ── O que se via ─────────────────────────────────────────────────────────────
 *
 *     Notas do episódio (2)
 *     Rita ·
 *     Levou o aparelho para ajuste. Queixou-se de o sentir apertado.
 *
 * Três defeitos numa linha só, e o dono da casa apanhou os três a olhar:
 *
 *   1. O NOME sozinho. O cartão já diz «Mia» no topo, e três linhas abaixo
 *      aparece «Rita» — que é quem ESCREVEU. Foi lido como se a nota fosse
 *      sobre a Rita, e a pergunta que ele fez foi «é erro na simulação?».
 *      Não era: os dados estavam certos e o ecrã é que não dizia o que aquele
 *      nome significava.
 *   2. A DATA vazia, com o «·» a prometê-la. A coleção `notas_saude` do
 *      servidor só tem `editada_em` — uma nota que nunca foi editada não tem
 *      data nenhuma, e TODAS as notas desta casa estavam assim.
 *   3. `date.split('T')[0]` dava «2026-09-07», que é a forma da máquina. Esta
 *      app escreve dd/mm/aaaa (CLAUDE.md).
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * A linha monta-se juntando só os pedaços que EXISTEM. Assim não há grafia de
 * separador que possa sobrar — é a mesma correcção do «Quarta, 09/09 ·  · Pingo
 * Doce» do plano de compras, que é a terceira vez que esta classe aparece.
 *
 * ⚠ E a prova monta o ecrã com notas nas três formas de data que este campo já
 * teve: o ISO completo que o `addHealthNote` escreve, o `editada_em` que desce
 * do servidor, e o vazio de quem nunca editou.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider, useStore } = require('../src/store');
const { buildTheme } = require('../src/theme');
const Saude = require('../src/screens/Saude').default;

const texto = (n) => {
  if (n === null || n === undefined || n === false) return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(texto).join('');
  return texto(n.children || (n.props && n.props.children) || null);
};

// Monta a Saúde e devolve o texto, com a consulta aberta e as notas que se derem.
//
// ⚠ Como a RITA, e não como o António. A casa de demonstração do `data.js` tem
// Rita, Tomás, Léo e Mia — o António é o dono desta casa a sério, e nas provas
// não existe. Montada em nome dele, a Saúde dizia «Não há fichas que possa ver»
// e a prova media um ecrã vazio.
const comNotas = (notas, quem = 'Rita') => {
  let arvore = null;
  let api = null;
  const Sonda = () => {
    api = useStore();
    return React.createElement(Saude, {
      t: buildTheme(0, false), user: quem, onClose: () => {}, onFicha: () => {},
    });
  };
  TestRenderer.act(() => {
    arvore = TestRenderer.create(
      React.createElement(SafeAreaProvider, {
        initialMetrics: { frame: { x: 0, y: 0, width: 402, height: 874 },
                          insets: { top: 47, left: 0, right: 0, bottom: 34 } },
      }, React.createElement(StoreProvider, null, React.createElement(Sonda))));
  });
  const alvo = api.allHealth()[0];
  TestRenderer.act(() => {
    api.set({ healthNotes: { [alvo.id]: notas.map((n, i) => ({ id: `n${i}`, ...n })) } });
  });
  // Abrir a consulta, que é onde as notas vivem.
  const cartao = arvore.root.findAll(x => x.props
    && typeof x.props.onPress === 'function'
    && String(x.props.accessibilityLabel || '').startsWith(alvo.specialty))[0];
  if (cartao) TestRenderer.act(() => { cartao.props.onPress(); });
  return texto(arvore.toJSON());
};

describe('⚠ nunca sobra um separador na linha de uma nota', () => {
  // A propriedade, num sítio só.
  const semPendurado = (t) => {
    expect(t).not.toMatch(/·\s*·/);        // dois seguidos
    expect(t).not.toMatch(/·\s*$/m);       // um no fim de uma linha
    expect(t).not.toContain('undefined');
    expect(t).not.toContain('NaN');
  };

  it('⚠ sem data nenhuma — que é o caso de TODAS as notas do servidor', () => {
    const t = comNotas([{ author: 'Rita', date: '', text: 'Levou o aparelho' }]);
    semPendurado(t);
    expect(t).toContain('Nota de Rita');
  });

  it('com o ISO completo que a app escreve', () => {
    const t = comNotas([{ author: 'Rita', date: '2026-09-07T21:45:02.587Z', text: 'x' }]);
    semPendurado(t);
    expect(t).toContain('07/09/2026');
    // ⚠ E nunca a forma da máquina.
    expect(t).not.toContain('2026-09-07');
  });

  it('com a data que desce do servidor', () => {
    const t = comNotas([{ author: 'Tomás', date: '2026-08-26 10:00:00.000Z', text: 'x' }]);
    semPendurado(t);
    expect(t).toContain('26/08/2026');
  });

  it('com uma data ilegível, cala-se em vez de a mostrar', () => {
    const t = comNotas([{ author: 'Rita', date: 'qualquer coisa', text: 'x' }]);
    semPendurado(t);
    expect(t).toContain('Nota de Rita');
  });

  it('e a marca de alterada entra sem partir a linha', () => {
    const t = comNotas([{ author: 'Rita', date: '', text: 'x', editadaEm: '2026-09-07' }]);
    semPendurado(t);
    expect(t).toContain('alterada');
  });
});

describe('⚠ a linha diz que o nome é o AUTOR', () => {
  it('«Nota de Rita», e não «Rita» sozinho', () => {
    // O cartão já mostra de QUEM é a consulta. Um nome solto três linhas abaixo
    // lê-se como se a nota fosse sobre essa pessoa — e foi lido assim.
    const t = comNotas([{ author: 'Rita', date: '', text: 'Levou o aparelho' }]);
    expect(t).toContain('Nota de Rita');
  });
});

describe('⚠ e a regra de quem pode alterar deixa de ser invisível', () => {
  it('com uma nota de outra pessoa, o ecrã diz a regra', () => {
    const t = comNotas([{ author: 'Tomás', date: '', text: 'x' }], 'Rita');
    expect(t).toContain('só se altera ou apaga por quem a escreveu');
  });

  it('com as notas todas suas, cala-se — não há regra a explicar', () => {
    const t = comNotas([{ author: 'Rita', date: '', text: 'x' }], 'Rita');
    expect(t).not.toContain('só se altera ou apaga por quem a escreveu');
  });

  it('e diz-se UMA vez, não uma por nota', () => {
    const t = comNotas([
      { author: 'Tomás', date: '', text: 'a' },
      { author: 'Léo', date: '', text: 'b' },
    ], 'Rita');
    expect((t.match(/só se altera ou apaga por quem a escreveu/g) || []).length).toBe(1);
  });
});
