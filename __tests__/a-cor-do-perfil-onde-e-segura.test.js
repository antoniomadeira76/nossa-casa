/**
 * A cor do perfil entra nos botões — e entra onde é SEGURA.
 *
 * ── O pedido ─────────────────────────────────────────────────────────────────
 *
 * «este tipo de botões também devem ter o esquema de cores do perfil», com um
 * print do «+ agendar evento» e do «+ importar do google» — os dois cinzentos,
 * num ecrã onde o título da secção e os outros botões seguem o esquema.
 *
 * ── Onde a cor pode entrar, e onde não ───────────────────────────────────────
 *
 * A WCAG trata as duas coisas de maneira diferente, e a app tem de as separar:
 *
 *   um CONTORNO ou um ÍCONE é um objeto de interface   →  3:1
 *   um RÓTULO de 13,5 px é texto pequeno               →  4,5:1
 *
 * Medido nos doze temas (seis esquemas × claro/escuro):
 *
 *   accent  como contorno   2,12 no pior caso — falha 3:1 em CINCO escuros
 *   titulo  como contorno   3,01 no pior caso (Cinza escuro, sobre cartão) ✓
 *   titulo  como rótulo     3,01 — muito abaixo dos 4,5 ✗
 *   text3   como rótulo     4,31 sobre a página (Violeta claro) ✗
 *   text2   como rótulo     8,82 ✓
 *
 * Por isso: contorno e ícone levam `titulo` — o token que o tema já tem para
 * isto, o acento no claro e o `hover` no escuro, clareado quando não chega — e
 * o rótulo leva `text2`.
 *
 * ⚠ E o rótulo subir de `text3` para `text2` é uma CORREÇÃO, não um gosto: o
 * `text3` já estava a 4,31 sobre a página, abaixo da linha, e ninguém o media.
 *
 * ⚠ Pôr o acento no rótulo é o defeito que os dois botões de mês do Dinheiro
 * tiveram durante meses — 2,12:1 no Cinza escuro, e o `CLAUDE.md` a afirmar que
 * «o acento no escuro NÃO se mede contra o cartão: aí ele nunca é texto». Era
 * falso. É a terceira vez que este erro aparece; esta prova é o guarda dele.
 */
const fs = require('fs');
const path = require('path');
const { SCHEMES, buildTheme, contraste } = require('../src/theme');

const RAIZ = path.join(__dirname, '..');

// Os doze temas que a família pode ter escolhido.
const TEMAS = [];
for (const escuro of [false, true]) {
  for (let i = 0; i < SCHEMES.length; i++) {
    TEMAS.push([`${SCHEMES[i].name}, no ${escuro ? 'escuro' : 'claro'}`, buildTheme(i, escuro)]);
  }
}

// Os dois fundos onde um botão destes se pode encontrar.
const FUNDOS = (t) => [['página', t.page], ['cartão', t.card]];

describe.each(TEMAS)('%s', (nome, t) => {
  // ── O `titulo` como objeto gráfico ─────────────────────────────────────────
  it.each(FUNDOS(t))('o `titulo` serve de contorno sobre a %s (≥ 3:1)', (onde, fundo) => {
    expect(contraste(t.titulo, fundo)).toBeGreaterThanOrEqual(3);
  });

  // ── E o rótulo como texto pequeno ──────────────────────────────────────────
  it.each(FUNDOS(t))('e o `text2` serve de rótulo de 13,5 px sobre a %s (≥ 4,5:1)', (onde, fundo) => {
    expect(contraste(t.text2, fundo)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('⚠ e o que NÃO serve — para a prova não ser optimista', () => {
  // Se um destes começar a passar, o tema mudou e a regra pode ser revista.
  // Enquanto falharem, são a razão por que o `titulo` e o `text2` existem aqui.
  const pior = (f) => Math.min(...TEMAS.map(([, t]) => f(t)));

  it('o `accent` NÃO serve de contorno em todos os doze', () => {
    expect(pior(t => Math.min(contraste(t.accent, t.page), contraste(t.accent, t.card))))
      .toBeLessThan(3);
  });

  it('o `titulo` NÃO serve de rótulo pequeno em todos os doze', () => {
    expect(pior(t => Math.min(contraste(t.titulo, t.page), contraste(t.titulo, t.card))))
      .toBeLessThan(4.5);
  });

  it('e o `text3` também não, sobre a página', () => {
    // 4,31 no Violeta claro. Era o que o `AddButton` tinha.
    expect(pior(t => contraste(t.text3, t.page))).toBeLessThan(4.5);
  });
});

describe('⚠ o código usa os tokens que esta prova mede', () => {
  const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
  const ui = ler('src/ui.jsx');
  const bloco = ui.slice(ui.indexOf('export const AddButton'), ui.indexOf('export const Avatar'));

  it('o `AddButton` leva `titulo` no contorno', () => {
    expect(bloco).toMatch(/borderColor: t\.titulo/);
  });

  it('e `titulo` no «+»', () => {
    // ⚠ As chaves ESCAPADAS. `size={18}` num regex é «o caractere anterior
    // repetido 18 vezes», não duas chaves — e a prova falhou sobre código que
    // estava certo. É a terceira vez hoje que uma expressão me engana.
    expect(bloco).toMatch(/<Icon name="plus" size=\{18\} color=\{t\.titulo\} \/>/);
  });

  it('⚠ e o rótulo NÃO leva a cor do esquema', () => {
    // O sítio onde este erro sempre aparece. `text2`, e nada de `accent`,
    // `titulo` ou `hover` no `<Text>`.
    const texto = bloco.slice(bloco.indexOf('<Text'));
    expect(texto).toMatch(/color: t\.text2/);
    expect(texto).not.toMatch(/color: t\.(accent|titulo|hover)/);
  });

  it('nem `text3`, que estava abaixo da linha', () => {
    const texto = bloco.slice(bloco.indexOf('<Text'));
    expect(texto).not.toMatch(/color: t\.text3/);
  });

  it('e o tracejado escrito à mão na Saúde usa os mesmos tokens', () => {
    // ⚠ O `AddButton` tem um irmão: «Fotografe o exame ou a receita», o mesmo
    // padrão escrito à mão. Dois desenhos para a mesma coisa é a classe de
    // defeito de sempre — e este ficou para trás na primeira passagem.
    const saude = ler('src/screens/Saude.jsx');
    const i = saude.indexOf('Fotografar o documento');
    expect(i).toBeGreaterThan(0);
    const perto = saude.slice(i, i + 900);
    expect(perto).toMatch(/borderStyle: 'dashed', borderColor: t\.titulo/);
    expect(perto).toMatch(/<Icon name="camera" size=\{19\} color=\{t\.titulo\} \/>/);
  });
});

describe('e os dois botões de mês do Dinheiro deixaram de ter o defeito', () => {
  const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

  it('⚠ o par passou a ser o componente partilhado, e não dois `Pressable` à mão', () => {
    const d = ler('src/screens/Dinheiro.jsx');
    // ⚠ Chamava-se `BotaoDoMes`. Quando passou a servir também os «Guardar» da
    // ficha de saúde, o nome deixou de poder ser o do primeiro sítio onde
    // apareceu — é `BotaoCompacto`, e o peso vem no `tom`.
    expect(d).toMatch(/<BotaoCompacto t=\{t\} tom="acento" label=\{`Abrir \$\{proximoMes\}`\}/);
    expect(d).toMatch(/<BotaoCompacto t=\{t\} label=\{`Fechar \$\{s\.monthName\}`\}/);
    // E o que lá estava — o acento e o âmbar como cor de texto — desapareceu.
    expect(d).not.toMatch(/fontSize: 13, fontWeight: '600', color: t\.accent/);
    expect(d).not.toMatch(/color: t\.state\.warnDeep[\s\S]{0,40}Fechar Mês/);
  });

  it('o componente vive no `ui.jsx`, que é o que faz haver UM desenho', () => {
    expect(ler('src/ui.jsx')).toMatch(/export function BotaoCompacto/);
    // Três ecrãs, um desenho: o par do mês em dois, e os «Guardar» da Saúde.
    for (const f of ['src/screens/Dinheiro.jsx', 'src/screens/Gestao.jsx', 'src/screens/Saude.jsx']) {
      expect(ler(f)).toMatch(/BotaoCompacto/);
      // E nenhum dos três o redefine.
      expect(ler(f)).not.toMatch(/function BotaoCompacto/);
    }
  });

  it('e o rótulo dele é branco sobre o acento, ou `text2` — nunca o acento', () => {
    const ui = ler('src/ui.jsx');
    const bloco = ui.slice(ui.indexOf('export function BotaoCompacto'), ui.indexOf('export const PastilhaTocavel'));
    // Os três pesos, e nenhum deles põe a cor do esquema num rótulo pequeno.
    expect(bloco).toMatch(/tom === 'acento' \? '#FFFFFF'/);
    expect(bloco).toMatch(/tom === 'comum' \? t\.page : t\.text2/);
    expect(bloco).not.toMatch(/color[\s\S]{0,60}t\.accent/);
  });
});
