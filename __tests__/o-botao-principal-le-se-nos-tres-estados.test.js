/**
 * O botão principal lê-se nos TRÊS estados, nos seis esquemas e nos dois aspetos.
 *
 * O `Primary` tem três roupas e nenhuma prova as media:
 *
 *   acento        rótulo branco sobre a cor do esquema — o que não se desfaz
 *   comum         rótulo `page` sobre `text1` — tudo o resto
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
  ['comum', t.page, t.text1, 4.5,
    'Mesmo tamanho, mesmo peso, mesmo mínimo.'],
  ['desactivado', t.text3, t.border, 3,
    'A WCAG isenta um controlo inactivo, e uma palavra que não se lê não é '
    + 'isenção de nada. 3:1 é o piso: apagado, e legível.'],
];

describe.each(TEMAS)('%s', (nome, t) => {
  it.each(ESTADOS(t))('o rótulo %s cumpre o mínimo', (estado, fg, bg, min) => {
    expect(contraste(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  // O botão também tem de se ver contra o que está atrás dele. Num ecrã é a
  // página, numa folha é a superfície — e são diferentes no claro.
  it.each([['página', t.page], ['folha', t.surface], ['cartão', t.card]])(
    'e o botão comum separa-se da %s (≥ 3:1, objeto de interface)',
    (onde, fundo) => {
      expect(contraste(t.text1, fundo)).toBeGreaterThanOrEqual(3);
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

  it('o comum é `page` sobre `text1`', () => {
    expect(bloco).toMatch(/comum \? t\.page/);
    expect(bloco).toMatch(/comum \? t\.text1 : t\.accent/);
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
});
