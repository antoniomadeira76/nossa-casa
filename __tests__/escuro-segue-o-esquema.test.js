/**
 * O modo escuro segue o esquema escolhido — e continua legível nos seis.
 *
 * O escuro era UM só: página #00101C, cartão #0A2033, linhas #1E3A4F. Um
 * azul-marinho fixo, igual nos seis esquemas. No claro isso não se nota, porque
 * a página é um cinzento quase branco e quem dá cor ao ecrã é o cabeçalho. No
 * escuro a PÁGINA é a maior superfície do ecrã — e com o Violeta escolhido o
 * ecrã inteiro ficava azul-marinho com um ponto violeta no meio.
 *
 * ⚠ Isto não é um teste de gosto. Cada par aqui tem um mínimo da WCAG e um
 * motivo, e os mínimos das duas SEPARAÇÕES (cartão/página, linha/cartão) são os
 * do escuro antigo — o novo não pode separar pior do que aquilo que substitui.
 */
const { SCHEMES, buildTheme, contraste } = require('../src/theme');

const ESCUROS = SCHEMES.map((sc, i) => [sc.name, buildTheme(i, true)]);

// ── O contraste, par a par ───────────────────────────────────────────────────
//
// [nome, primeiro plano, fundo, mínimo, porquê]
//
// Os 4,5:1 são texto; os 3:1 são texto grande e elementos de interface. As duas
// últimas linhas não são texto — são a separação entre superfícies, e os
// valores vêm do escuro antigo (medidos: 1,16 e 1,40).
const PARES = (t) => [
  ['text1 / page',  t.text1, t.page, 4.5],
  ['text1 / card',  t.text1, t.card, 4.5],
  ['text2 / card',  t.text2, t.card, 4.5],
  ['text3 / card',  t.text3, t.card, 4.5],
  ['text3 / page',  t.text3, t.page, 4.5],
  ['slate / card',  t.slate, t.card, 4.5],
  ['slate / page',  t.slate, t.page, 4.5],
  ['titulo / page', t.titulo, t.page, 3],
  ['titulo / card', t.titulo, t.card, 3],
  // O acento no escuro NÃO se mede contra o cartão: aí ele nunca é texto. O
  // uso a sério é o botão cheio — branco sobre o acento.
  ['branco / accent', '#FFFFFF', t.accent, 3],
  ['card / page',   t.card, t.page, 1.16],
  ['border / card', t.border, t.card, 1.40],
];

describe.each(ESCUROS)('%s, no escuro', (nome, t) => {
  it.each(PARES(t))('%s cumpre o mínimo', (par, fg, bg, min) => {
    expect(contraste(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});

describe('a página deixou de ser a mesma para todos', () => {
  it('os seis esquemas têm SEIS páginas diferentes', () => {
    // Era este o defeito: uma página só, azul, para os seis.
    const paginas = new Set(ESCUROS.map(([, t]) => t.page));
    expect(paginas.size).toBe(SCHEMES.length);
  });

  it('e seis cartões diferentes', () => {
    expect(new Set(ESCUROS.map(([, t]) => t.card)).size).toBe(SCHEMES.length);
  });

  it('nenhum é o azul-marinho antigo', () => {
    for (const [nome, t] of ESCUROS) {
      expect(t.page.toUpperCase()).not.toBe('#00101C');
      expect(t.card.toUpperCase()).not.toBe('#0A2033');
    }
  });
});

describe('⚠ a saturação é limitada pela do esquema, não por um valor fixo', () => {
  // Uma saturação igual para todos tornava o Cinza — que é cinzento DE
  // PROPÓSITO, e foi escolhido para isso — num azul como os outros.
  const canal = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const amplitude = (hex) => { const c = canal(hex); return Math.max(...c) - Math.min(...c); };

  const cinza = buildTheme(SCHEMES.findIndex(s => s.name === 'Cinza'), true);
  const violeta = buildTheme(SCHEMES.findIndex(s => s.name === 'Violeta'), true);

  it('o Cinza continua quase sem cor', () => {
    // Oito valores de 255 entre o canal mais alto e o mais baixo: é cinzento.
    expect(amplitude(cinza.card)).toBeLessThanOrEqual(12);
  });

  it('e o Violeta é francamente violeta', () => {
    expect(amplitude(violeta.card)).toBeGreaterThan(20);
    const [r, g, b] = canal(violeta.card);
    expect(b).toBeGreaterThan(g);   // azul acima do verde
    expect(r).toBeGreaterThan(g);   // e vermelho também — o violeta é isso
  });
});

describe('o título sobe sozinho até ao mínimo', () => {
  // O `hover` é o ponto de partida, não a resposta. Com o cartão a seguir o
  // esquema, o Cinza — o hover mais apagado dos seis — caía a 2,92 contra o
  // seu. Escolher outro tom à mão resolvia o Cinza e deixava o esquema
  // seguinte a falhar em silêncio, tal como este falhou.
  it('o do Cinza foi clareado acima do hover do esquema', () => {
    const i = SCHEMES.findIndex(s => s.name === 'Cinza');
    const t = buildTheme(i, true);
    expect(t.titulo.toUpperCase()).not.toBe(SCHEMES[i].hover.toUpperCase());
    expect(contraste(t.titulo, t.card)).toBeGreaterThanOrEqual(3);
  });

  it('e nenhum título ficou branco — isso seria desistir do esquema', () => {
    for (const [nome, t] of ESCUROS) expect(t.titulo.toUpperCase()).not.toBe('#FFFFFF');
  });
});

describe('o claro não mexeu', () => {
  // O pedido era o escuro seguir o esquema «tal como já é feito no claro».
  // Mexer no claro ao mesmo tempo seria responder a outra pergunta.
  it('a página clara continua a ser a mesma nos seis', () => {
    const claras = new Set(SCHEMES.map((_, i) => buildTheme(i, false).page));
    expect(claras).toEqual(new Set(['#F0F2F5']));
  });

  it('e o título claro continua a ser o acento, sem clarear', () => {
    for (let i = 0; i < SCHEMES.length; i++) {
      expect(buildTheme(i, false).titulo).toBe(SCHEMES[i].accent);
    }
  });
});
