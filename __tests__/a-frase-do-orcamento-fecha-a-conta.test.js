/**
 * A frase debaixo da barra do Dinheiro tem de fechar a conta com ela própria.
 *
 * ⚠ Dizia isto, e as duas metades não eram sobre o mesmo bolo:
 *
 *     «62 % dos 2 020,00 € atribuídos aos envelopes.
 *      Sobram 1 180,00 € sem envelope.»
 *
 *   · os 62 % eram o GASTO a dividir pelo ORÇAMENTO   (1 248,64 / 2 020)
 *   · os 1 180 € eram o orçamento a subtrair ao RENDIMENTO (3 200 − 2 020)
 *
 * Lidas juntas mentem duas vezes. Primeiro porque 100 % dos 2 020 € estão
 * atribuídos aos envelopes por definição — o orçamento É a soma deles
 * (INVARIANTE #2), ver `o-orcamento-e-a-soma-dos-envelopes`. Segundo porque
 * sobrarem 1 180 dos mesmos 2 020 não deixa 62 % atribuídos, deixa 42 %.
 *
 * E viveu meses assim porque o número errado calhou perto do certo:
 * 2 020/3 200 = 63 %, um ponto ao lado dos 62 % que apareciam por acidente.
 * Nenhuma das 1444 provas de então lia a frase inteira.
 *
 * ⚠ Esta lê-a do ecrã montado e obriga as três parcelas a fecharem entre si.
 * Não confere a fórmula — confere a ARITMÉTICA do que a família vê, e por isso
 * continua a valer se a fórmula mudar outra vez.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider, useStore } = require('../src/store');
const { buildTheme } = require('../src/theme');
const Dinheiro = require('../src/screens/Dinheiro').default;

const texto = (n) => {
  if (n === null || n === undefined || n === false) return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(texto).join(' ');
  return texto(n.children || (n.props && n.props.children) || null);
};

// O euro da app: espaço estreito inquebrável nos milhares (U+202F), vírgula
// decimal, espaço inquebrável antes do símbolo (U+00A0) — INVARIANTE #4.
const numero = (s) => Number(s.replace(/[\s  ]/g, '').replace(',', '.'));

// ⚠ O texto vem da árvore com os pedaços colados por espaços, e são DOIS entre
// cada um: «55  % dos  3 200,00 €  atribuídos». A frase lê-se com `\s+`, nunca
// com espaços contados à mão — foi assim que a primeira versão desta prova
// falhou seis vezes sem que a app tivesse nada de errado.
const MOEDA = '[\\d\\s.,\\u202f\\u00a0]';

// A frase, partida nas três parcelas. `null` quando o ecrã não a mostra.
const lerFrase = (t) => {
  const m = t.match(new RegExp(`(\\d+)\\s*%\\s*dos\\s+(${MOEDA}+?)\\s*€\\s*atribuídos aos envelopes`));
  if (!m) return null;
  const sobra = t.match(new RegExp(`Sobram\\s+(${MOEDA}+?)\\s*€\\s*sem envelope`));
  return { pct: Number(m[1]), total: numero(m[2]), sobra: sobra ? numero(sobra[1]) : 0 };
};

// Monta o Dinheiro UMA vez e devolve como lê-lo e como mexer na casa. Um só
// arranque da loja por prova — montar é o que custa aqui.
const abrir = () => {
  let api = null;
  let arvore = null;
  const Sonda = () => {
    api = useStore();
    return React.createElement(Dinheiro, {
      t: buildTheme(0, false), user: 'Rita', go: () => {},
      onSaude: () => {}, onEquip: () => {}, onFicha: () => {}, onClose: () => {},
    });
  };
  TestRenderer.act(() => {
    arvore = TestRenderer.create(
      React.createElement(SafeAreaProvider, {
        initialMetrics: { frame: { x: 0, y: 0, width: 402, height: 874 },
                          insets: { top: 47, left: 0, right: 0, bottom: 34 } },
      }, React.createElement(StoreProvider, null, React.createElement(Sonda))));
  });
  return {
    loja: () => api,
    ecra: () => texto(arvore.toJSON()),
    frase: () => lerFrase(texto(arvore.toJSON())),
    mexer: (f) => { TestRenderer.act(() => { f(api); }); },
  };
};

// A propriedade, num sítio só: o que foi atribuído mais o que sobrou é o total
// que a própria frase nomeia. Nada mais, nada menos.
const fecha = (f) => {
  expect(f).not.toBeNull();
  const atribuido = f.total - f.sobra;
  // Um ponto de tolerância, que é o arredondamento ao inteiro.
  expect(f.pct).toBeCloseTo(Math.round((atribuido / f.total) * 100), 0);
  expect(f.sobra).toBeGreaterThanOrEqual(0);
  expect(f.sobra).toBeLessThanOrEqual(f.total);
};

describe('⚠ as três parcelas da frase fecham entre si', () => {
  it('na casa de demonstração', () => {
    const d = abrir();
    const f = d.frase();
    fecha(f);
    // Senão a prova passava sobre uma frase sem sobra, que é o caso fácil.
    expect(f.sobra).toBeGreaterThan(0);
  });

  it('depois de criar um envelope — a sobra encolhe e a percentagem sobe', () => {
    const d = abrir();
    const antes = d.frase();
    d.mexer(a => a.criarEnvelope('Férias', 300));
    const f = d.frase();
    fecha(f);
    expect(f.sobra).toBeCloseTo(antes.sobra - 300, 2);
    expect(f.pct).toBeGreaterThan(antes.pct);
  });

  it('depois de apagar um — a sobra cresce', () => {
    const d = abrir();
    const antes = d.frase();
    const alvo = d.loja().envelopes[0];
    d.mexer(a => a.apagarEnvelope(alvo.name));
    fecha(d.frase());
    expect(d.frase().sobra).toBeCloseTo(antes.sobra + alvo.limit, 2);
  });

  it('⚠ mover dinheiro entre envelopes não mexe na frase — não sai da conta', () => {
    const d = abrir();
    const antes = d.frase();
    const [a1, a2] = d.loja().envelopes;
    d.mexer(a => a.moverEntreEnvelopes(a1.name, a2.name, 50));
    const f = d.frase();
    fecha(f);
    expect(f.pct).toBe(antes.pct);
    expect(f.sobra).toBeCloseTo(antes.sobra, 2);
  });

  it('⚠ e gastar dinheiro também não — gastar não é desatribuir', () => {
    // Era exatamente isto que a frase antiga fazia: gastava-se, e ela anunciava
    // menos «atribuído aos envelopes».
    const d = abrir();
    const antes = d.frase();
    const alvo = d.loja().envelopes[0];
    d.mexer(a => a.registarDespesa({
      envelope: alvo.name, valor: 120, pagador: 'Rita', divideMeias: false,
    }));
    const f = d.frase();
    fecha(f);
    expect(f.pct).toBe(antes.pct);
    expect(f.sobra).toBeCloseTo(antes.sobra, 2);
  });
});

describe('e cala-se quando não tem nada a dizer', () => {
  it('⚠ sem rendimento declarado a frase desaparece, em vez de dizer «0 % dos 0,00 €»', () => {
    const d = abrir();
    d.mexer(a => a.set({ rendimento: 0 }));
    expect(d.frase()).toBeNull();
    expect(d.ecra()).not.toContain('atribuídos aos envelopes');
    // E o resto do ecrã continua de pé.
    expect(d.ecra()).toContain('Envelopes');
  });

  it('e sem sobra nenhuma a segunda metade some, mas a primeira fica', () => {
    // Rendimento igual ao orçamento: está tudo atribuído.
    const d = abrir();
    const orcamento = d.loja().budget;
    d.mexer(a => a.set({ rendimento: orcamento }));
    const f = d.frase();
    fecha(f);
    expect(f.pct).toBe(100);
    expect(f.sobra).toBe(0);
    expect(d.ecra()).not.toContain('sem envelope');
  });
});
