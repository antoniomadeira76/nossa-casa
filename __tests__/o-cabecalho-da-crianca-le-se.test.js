/**
 * O cabeçalho da app da criança lê-se — em TODAS as cores da paleta.
 *
 * ── O que se viu ─────────────────────────────────────────────────────────────
 *
 * O cabeçalho e o rodapé da KidApp são pintados com a cor do membro, e o
 * texto por cima é branco. O Léo é #1890FF: o branco dava 3,24 sobre ele —
 * «Olá, Léo» a 18 px, o resumo a 12, os rótulos do rodapé a 11, todos abaixo
 * dos 4,5 que o texto pequeno exige. A inicial branca sobre a bola a 22 % de
 * branco dava 2,51. Medido no navegador em 09/09/2026, na primeira vez que a
 * sonda de contraste entrou no modo criança.
 *
 * Não era um valor errado: era uma cor de IDENTIDADE (a do membro) usada como
 * cor de CABEÇALHO sem ninguém medir o que ficava por cima. Os adultos têm o
 * `chrome` do esquema, desenhado para levar branco; a criança tinha a cor do
 * avatar.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * `chromeDaCrianca(cor)` escurece a cor do membro até o branco chegar aos
 * 4,5. Para CADA cor da paleta, e não só para as quatro da casa de
 * demonstração: um membro novo recebe uma cor pelo nome, e pode ser qualquer
 * das oito.
 */
const fs = require('fs');
const path = require('path');
const { PALETA_MEMBROS, chromeDaCrianca, onChrome, contraste, corDoMembro } = require('../src/theme');

const kidApp = fs.readFileSync(path.join(__dirname, '..', 'src', 'KidApp.jsx'), 'utf8');

// O `rgba(255,255,255,a)` do `onChrome`, composto sobre o cabeçalho em sRGB —
// a mesma mistura que o ecrã faz.
const brancoA = (rgba, fundo) => {
  const a = parseFloat(rgba.match(/,\s*([\d.]+)\)/)[1]);
  const canal = (i) => parseInt(fundo.slice(i, i + 2), 16);
  const m = [1, 3, 5].map(i => Math.round(255 * a + canal(i) * (1 - a)));
  return '#' + m.map(v => v.toString(16).padStart(2, '0')).join('');
};

describe('⚠ o cabeçalho da criança lê-se em todas as cores da paleta', () => {
  it('o branco chega aos 4,5 sobre o cabeçalho de cada cor', () => {
    const falham = PALETA_MEMBROS
      .map(c => ({ cor: c, chrome: chromeDaCrianca(c), c: contraste(chromeDaCrianca(c), '#FFFFFF') }))
      .filter(x => x.c < 4.5);
    expect(falham).toEqual([]);
  });

  it('e o branco com alfa do subtítulo também', () => {
    const falham = PALETA_MEMBROS.map(c => {
      const chrome = chromeDaCrianca(c);
      return { cor: c, c: contraste(brancoA(onChrome(chrome), chrome), chrome) };
    }).filter(x => x.c < 4.5);
    expect(falham).toEqual([]);
  });

  it('as cores já escuras não mudam — escurecer é o remédio, não a regra', () => {
    // O índigo (#011B58) já leva branco a mais de 4,5: fica igual.
    expect(chromeDaCrianca('#011B58')).toBe('#011B58');
    // O azul do Léo muda, e continua azul: o mesmo tom.
    expect(chromeDaCrianca(corDoMembro('Léo'))).not.toBe(corDoMembro('Léo'));
  });

  it('a KidApp pinta a BOLA com `chromeDaCrianca`, nunca com a cor crua — e o cabeçalho com o esquema', () => {
    // Desde 10/09/2026 o cabeçalho e o rodapé são o `chrome` do esquema da
    // criança (ver `a-crianca-tem-o-seu-esquema`); a cor do membro, escurecida,
    // fica na bola do avatar com a inicial branca por cima.
    expect(kidApp).toMatch(/const bola = chromeDaCrianca\(kidColor\)/);
    expect(kidApp).not.toMatch(/backgroundColor: kidColor/);
    expect(kidApp).toMatch(/onChrome\(t\.chrome\)/);
    const bola = kidApp.slice(kidApp.indexOf('kid.charAt(0)') - 500, kidApp.indexOf('kid.charAt(0)'));
    expect(bola).toMatch(/backgroundColor: bola/);
    expect(bola).toMatch(/color: '#FFFFFF'/);
  });

  it('a bola da criança na ENTRADA leva o mesmo cabeçalho — e o cinzento do cartão lê-se', () => {
    // O escolhedor «Quem está a entrar?» e o passo do PIN pintavam a bola com
    // a cor crua e a inicial branca: 3,24 no Léo. E o «Perfil de criança» a
    // 12 px era #6A7282 sobre o cartão: 4,17.
    // Sem os comentários: o que explica a correção cita o valor antigo.
    const login = fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'Login.jsx'), 'utf8')
      // `[^\n]*` e não `.*`: o ficheiro tem CRLF e o `.` não engole o `\r`.
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
    expect(login.match(/chromeDaCrianca\(corDoMembro\(/g) || []).toHaveLength(2);
    expect(login).not.toMatch(/#6A7282/);
    expect(contraste('#656C7C', '#EEEEF0')).toBeGreaterThanOrEqual(4.5);
  });

  it('e vive na MESMA coluna que a app dos adultos', () => {
    // Ia de ponta a ponta do monitor: 731 px onde a app dos adultos tem 460.
    const raiz = kidApp.slice(kidApp.indexOf('export default function KidApp'));
    expect(raiz).toMatch(/maxWidth: LARGURA_APP, marginHorizontal: 'auto'/);
  });
});
