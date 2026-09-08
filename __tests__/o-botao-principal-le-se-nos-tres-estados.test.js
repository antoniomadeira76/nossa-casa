/**
 * O botão principal lê-se nos TRÊS estados, nos seis esquemas e nos dois aspetos.
 *
 * O `Primary` tem três roupas e nenhuma prova as media:
 *
 *   acento        rótulo branco sobre a cor do esquema — o que não se desfaz
 *   comum         `actFg` sobre `actBg`, com borda `actBrd` — tudo o resto
 *   desactivado   rótulo sobre o `border` — o que diz o que FALTA fazer
 *
 * ⚠ E o terceiro estava ilegível desde sempre. Branco sobre o `border` dá
 * 1,41:1 no claro; com o `comum` a pintar o rótulo de `page` passou a 1,26:1 e
 * viu-se no navegador — um botão cinzento com um fantasma escrito por cima.
 *
 * O pior é QUAIS são os rótulos: «Escreva um valor», «Valor Indisponível». Um
 * botão desactivado é o único que tem de explicar porque não responde, e era o
 * único que não se lia. A app tinha uma prova para o rótulo branco sobre o
 * acento (esta é a irmã dela) e nenhuma para os outros dois estados.
 *
 * ── O comum deixou de ser preto (08/09/2026) ─────────────────────────────────
 *
 * Era `page` sobre `text1`: um botão preto no claro, branco no escuro, igual nos
 * seis esquemas. O dono da casa perguntou três vezes «porque é que está a preto
 * e não à cor do perfil?», e a resposta estava no protótipo desde o início: os
 * botões principais dele são `--c-act-bg` / `--c-act-brd` / `--c-act-fg` — o
 * acento a 10 % em fundo, o acento escurecido em texto, e uma borda do acento.
 * Os três tokens nunca tinham chegado à app. Agora são `actBg`, `actBrd` e
 * `actFg` no `buildTheme`, e são CALCULADOS: o texto escurece ou clareia até
 * 4,5:1 sobre o fundo real do botão, e a borda sobe até 3:1 contra a superfície.
 *
 * ⚠ E no escuro a borda parte do `hover`, não do acento: contra a superfície
 * escura o acento não chega aos 3:1 nem a 100 % (Cinza 2,12, medido). A
 * primeira versão subia o alfa do acento até ao fim e ficava aquém, em silêncio
 * — esta prova apanhou-a em cinco dos seis esquemas escuros.
 *
 * ⚠ Os mínimos aqui são os da WCAG, não os valores de hoje. Uma prova que fixa
 * o que mediu envelhece a fechar os olhos — foi assim que o Cião viveu meses a
 * 3,55 com uma prova verde por cima.
 */
const { SCHEMES, buildTheme, contraste } = require('../src/theme');

// As doze combinações que a família pode ter escolhida.
const TEMAS = [];
for (const escuro of [false, true]) {
  for (let i = 0; i < SCHEMES.length; i++) {
    TEMAS.push([`${SCHEMES[i].name}, no ${escuro ? 'escuro' : 'claro'}`, buildTheme(i, escuro)]);
  }
}

// As três roupas do botão, tal como o `rotuloDo` e o `backgroundColor` do
// `Primary` as constroem. ⚠ Escritas aqui a partir da MESMA regra, e a prova
// seguinte confere que o `ui.jsx` não se afastou dela.
const ESTADOS = (t) => [
  // [nome, rótulo, fundo, mínimo, porquê]
  ['acento', '#FFFFFF', t.accent, 4.5,
    'O rótulo é 15 px a 700 — não é texto grande em norma nenhuma.'],
  ['comum', t.actFg, t.actBg, 4.5,
    'Mesmo tamanho, mesmo peso, mesmo mínimo — e agora na cor do esquema.'],
  ['desactivado', t.text3, t.border, 3,
    'A WCAG isenta um controlo inactivo, e uma palavra que não se lê não é '
    + 'isenção de nada. 3:1 é o piso: apagado, e legível.'],
];

describe.each(TEMAS)('%s', (nome, t) => {
  it.each(ESTADOS(t))('o rótulo %s cumpre o mínimo', (estado, fg, bg, min) => {
    expect(contraste(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  // O botão também tem de se ver contra o que está atrás dele. A tinta a 10 %
  // sozinha dá 1,1:1 contra a superfície — é a BORDA que separa o botão comum
  // do que o rodeia, e é ela que se mede. Num ecrã é a página, numa folha é a
  // superfície, e são diferentes no claro.
  it.each([['página', t.page], ['folha', t.surface], ['cartão', t.card]])(
    'e a borda do comum separa-o da %s (≥ 3:1, objeto de interface)',
    (onde, fundo) => {
      expect(contraste(t.actBrd, fundo)).toBeGreaterThanOrEqual(3);
    });

  it('e os três tokens do botão existem, e são cores', () => {
    for (const k of ['actBg', 'actBrd', 'actFg']) {
      expect(t[k]).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('⚠ e o comum já não é preto nem branco — é o esquema', () => {
    // A propriedade que o dono da casa pediu: o botão segue a cor escolhida.
    // Um fundo neutro dava o mesmo botão nos seis esquemas.
    expect(t.actBg).not.toBe(t.text1);
    expect(t.actBg).not.toBe(t.page);
    expect(t.actFg).not.toBe(t.page);
  });
});

describe('e os seis esquemas dão seis botões diferentes', () => {
  // Se dois esquemas dessem o mesmo `actBg`, a cor não estaria a vir do esquema.
  it.each([false, true])('no %s', (escuro) => {
    const fundos = SCHEMES.map((_, i) => buildTheme(i, escuro).actBg);
    expect(new Set(fundos).size).toBe(SCHEMES.length);
  });
});

describe('⚠ o `ui.jsx` continua a usar estes tokens, e não outros', () => {
  // Sem isto, a prova acima passa a medir uma regra que o código já não segue —
  // e mede-a para sempre, verde, ao lado de um botão ilegível.
  const fs = require('fs');
  const path = require('path');
  const ui = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui.jsx'), 'utf8');
  const bloco = ui.slice(ui.indexOf('const rotuloDo'), ui.indexOf('export const AddButton'));

  it('o rótulo desactivado é o `text3`, e é o PRIMEIRO ramo', () => {
    // A ordem importa: `disabled` tem de ganhar ao `comum`, senão um botão
    // comum desactivado volta ao `page` sobre o cinzento.
    expect(bloco).toMatch(/disabled \? t\.text3/);
  });

  it('⚠ o comum é `actFg` sobre `actBg`, com a borda `actBrd`', () => {
    expect(bloco).toMatch(/comum \? t\.actFg/);
    expect(bloco).toMatch(/comum \? t\.actBg : t\.accent/);
    expect(bloco).toMatch(/borderColor: comum && !disabled \? t\.actBrd/);
    // E nunca mais `text1`: era o preto.
    expect(bloco).not.toMatch(/comum \? t\.text1/);
    expect(bloco).not.toMatch(/comum \? t\.page/);
  });

  it('o acento leva branco', () => {
    expect(bloco).toMatch(/: '#FFFFFF'/);
  });

  it('e o fundo desactivado é o `border`', () => {
    expect(bloco).toMatch(/backgroundColor: disabled \? t\.border/);
  });

  it('⚠ o alfa da consequência não se aplica ao desactivado', () => {
    // 82 % de um `text3` que já está a 3,43 deixava de se ler.
    expect(bloco).toMatch(/opacity: disabled \? 1 : 0\.82/);
  });

  it('nenhum dos três estados escreve uma cor à mão fora do branco', () => {
    // Uma cor literal no botão principal é o erro #3 do CLAUDE.md a voltar.
    const literais = [...bloco.matchAll(/'#[0-9A-Fa-f]{6}'/g)].map(m => m[0]);
    expect(new Set(literais)).toEqual(new Set(["'#FFFFFF'"]));
  });

  it('⚠ e o `BotaoCompacto` comum usa os MESMOS tokens', () => {
    // Um compacto preto ao lado de um principal em tinta parecia de outra app.
    const inicio = ui.indexOf('export function BotaoCompacto');
    const fim = ui.indexOf('export const PastilhaTocavel');
    expect(inicio).toBeGreaterThan(0);
    expect(fim).toBeGreaterThan(inicio);
    const compacto = ui.slice(inicio, fim);
    expect(compacto).toMatch(/tom === 'comum' \? t\.actBg/);
    expect(compacto).toMatch(/tom === 'comum' \? t\.actFg/);
    expect(compacto).not.toMatch(/tom === 'comum' \? t\.text1/);
  });
});
