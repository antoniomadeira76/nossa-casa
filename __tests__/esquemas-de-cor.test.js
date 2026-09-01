/**
 * Os seis esquemas de cor: contraste e a geometria da bola.
 *
 * O contraste de um esquema não é questão de gosto — o cabeçalho leva o título
 * a branco, 20 px, peso 500, que não conta como texto grande em norma nenhuma.
 * Sem este teste, «escolhe tons mais claros» acaba, uma iteração qualquer, num
 * título ilegível que ninguém mede.
 */
const { SCHEMES, onChrome, chromeLine } = require('../src/theme');

// Luminância relativa, WCAG 2.1.
const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const luminancia = (hex) => {
  const c = (i) => parseInt(hex.slice(i, i + 2), 16) / 255;
  return 0.2126 * lin(c(1)) + 0.7152 * lin(c(3)) + 0.0722 * lin(c(5));
};
const contrasteComBranco = (hex) => 1.05 / (luminancia(hex) + 0.05);

describe('os esquemas de cor', () => {
  it('são seis', () => {
    expect(SCHEMES).toHaveLength(6);
  });

  it('não há dois com o mesmo nome nem a mesma cor de ação', () => {
    expect(new Set(SCHEMES.map(s => s.name)).size).toBe(6);
    expect(new Set(SCHEMES.map(s => s.accent)).size).toBe(6);
  });

  for (const s of SCHEMES) {
    describe(s.name, () => {
      it('o cabeçalho aguenta o título a branco (≥ 4,5:1)', () => {
        // 20 px peso 500 não é texto grande. O limite é 4,5, não 3.
        expect(contrasteComBranco(s.chrome)).toBeGreaterThanOrEqual(4.5);
      });

      it('a cor de ação aguenta o rótulo a branco de um botão (≥ 3:1)', () => {
        // Aqui 3 basta: os botões usam a fonte display a 700, que é texto
        // grande. O Cião está em 3,55 desde sempre e é o piso real do sistema.
        expect(contrasteComBranco(s.accent)).toBeGreaterThanOrEqual(3);
      });

      it('as três cores são hexadecimais de seis dígitos', () => {
        for (const cor of [s.accent, s.hover, s.chrome]) {
          expect(cor).toMatch(/^#[0-9A-F]{6}$/i);
        }
      });

      it('o `hover` é mais claro do que a cor de ação', () => {
        // É um estado de realce. Um hover mais escuro lê-se como carregado.
        expect(luminancia(s.hover)).toBeGreaterThan(luminancia(s.accent));
      });

      it('o subtítulo do cabeçalho sobe de alfa nos esquemas claros', () => {
        // O `onChrome` existe para isto: um alfa fixo calibrado para um
        // cabeçalho escuro falhava o contraste nos claros (erro #4 do
        // CLAUDE.md). Quanto mais claro o cabeçalho, mais opaco o branco.
        const alfa = Number(onChrome(s.chrome).match(/([\d.]+)\)$/)[1]);
        expect(alfa).toBeGreaterThanOrEqual(0.55);
        expect(alfa).toBeLessThanOrEqual(0.92);
        const traco = Number(chromeLine(s.chrome).match(/([\d.]+)\)$/)[1]);
        expect(traco).toBeGreaterThan(0);
      });
    });
  }

  it('nenhum esquema é um laranja', () => {
    // O laranja saiu desta app de propósito (erro #3 do CLAUDE.md): quando o
    // acento laranja desapareceu, o ícone ficou incoerente durante semanas.
    // Um esquema âmbar ou terracota trá-lo-ia de volta pela porta do lado, e
    // passa no contraste — por isso o contraste não o apanha, e este apanha.
    for (const s of SCHEMES) {
      const r = parseInt(s.accent.slice(1, 3), 16);
      const g = parseInt(s.accent.slice(3, 5), 16);
      const b = parseInt(s.accent.slice(5, 7), 16);
      const laranja = r > 120 && g > 60 && g < r * 0.8 && b < g * 0.7;
      expect({ esquema: s.name, laranja }).toEqual({ esquema: s.name, laranja: false });
    }
  });
});

describe('a bola do esquema, com o risco em diagonal', () => {
  // A geometria vive no Perfil como três constantes. Este teste repete o
  // cálculo a partir da definição — «a aresta do quadrado rodado passa pelo
  // centro da bola» — e falha se as constantes deixarem de a cumprir.
  const fs = require('fs');
  const path = require('path');
  const perfil = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'screens', 'Perfil.jsx'), 'utf8');

  // As constantes lêem-se do ficheiro e avaliam-se, para o teste medir os
  // valores a sério e não uma cópia que envelhece ao lado deles. `RECUO` é
  // escrito em função das outras duas, por isso elas entram em âmbito.
  const num = (nome, ambito = {}) => {
    const m = perfil.match(new RegExp(`const ${nome} = ([^;]+);`));
    if (!m) throw new Error(`não achei a constante ${nome}`);
    const chaves = Object.keys(ambito);
    // eslint-disable-next-line no-new-func
    return Function(...chaves, `"use strict";return (${m[1]})`)(...chaves.map(k => ambito[k]));
  };

  const BOLA = num('BOLA');
  const CORTE = num('CORTE');
  const RECUO = num('RECUO', { BOLA, CORTE });

  it('a bola cabe no alvo de toque de 44 px', () => {
    // INVARIANTE #5. A bola é 34 dentro de um Pressable de 44.
    expect(BOLA).toBeLessThanOrEqual(44);
    expect(perfil).toMatch(/width: 44, height: 44/);
  });

  it('o quadrado tapa a bola inteira depois de rodado', () => {
    // Rodado 45°, o quadrado só cobre um lado se a sua diagonal for maior do
    // que a bola. Um quadrado curto deixava um canto de `accent` do lado
    // errado do risco.
    expect(CORTE * Math.SQRT2).toBeGreaterThan(BOLA * 1.5);
  });

  it('a aresta do quadrado passa pelo centro da bola', () => {
    // Rodado 45° em torno do seu centro, a aresta mais próxima fica a CORTE/2
    // do centro, na diagonal. Para ela passar pelo centro da bola:
    //
    //   centro do quadrado = centro da bola + (CORTE/2)·(√½, √½)
    //   canto superior esquerdo = centro do quadrado − CORTE/2
    const centroDoQuadrado = BOLA / 2 + (CORTE / 2) * Math.SQRT1_2;
    const esperado = centroDoQuadrado - CORTE / 2;
    expect(RECUO).toBeCloseTo(esperado, 6);
  });

  it('o risco é uma rotação de 45°, e não um lado a lado', () => {
    expect(perfil).toMatch(/rotate: '45deg'/);
    // A versão antiga eram dois `flex: 1` numa linha. Se voltar, o risco
    // volta a ser vertical sem ninguém notar.
    const bloco = perfil.slice(perfil.indexOf('SCHEMES.map'), perfil.indexOf('MODO_LABEL[mode]'));
    expect(bloco).not.toMatch(/flexDirection: 'row'[\s\S]{0,200}flex: 1/);
  });

  it('a bola mostra as DUAS cores do esquema', () => {
    const bloco = perfil.slice(perfil.indexOf('SCHEMES.map'), perfil.indexOf('MODO_LABEL[mode]'));
    expect(bloco).toMatch(/backgroundColor: sc\.accent/);
    expect(bloco).toMatch(/backgroundColor: sc\.chrome/);
  });
});

describe('os avisos seguem o esquema escolhido', () => {
  const fs = require('fs');
  const path = require('path');
  const ler = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const ui = ler('src/ui.jsx');

  it('o aviso informativo usa o acento, e não o azul do sistema', () => {
    // Um aviso «não há nada aqui» não é um estado, é a app a falar. Ficava
    // azul-do-sistema em cima de um cabeçalho violeta ou cinzento e lia-se
    // como uma peça de outra app.
    const tile = ui.slice(ui.indexOf('const TILE = {'), ui.indexOf('export const Tile'));
    expect(tile).toMatch(/info:.*t\.accent/);
    expect(tile).not.toMatch(/info:.*t\.state\.info/);
  });

  it('⚠ o aviso e o erro NÃO seguem o esquema', () => {
    // É uma decisão, não um esquecimento: um aviso que toma a cor do esquema
    // deixa de se distinguir do resto, e um erro em cião não é um erro. A cor
    // deles é o que eles significam, e num ecrã de dinheiro isso importa.
    const tile = ui.slice(ui.indexOf('const TILE = {'), ui.indexOf('export const Tile'));
    expect(tile).toMatch(/warn:.*t\.state\.warn/);
    expect(tile).toMatch(/err:.*t\.state\.err/);
  });

  it('o `Empty` é a mesma caixa do aviso, e não uma tracejada', () => {
    const empty = ui.slice(ui.indexOf('export const Empty'), ui.indexOf('export const Empty') + 900);
    expect(empty).toMatch(/borderColor: t\.accent/);
    expect(empty).not.toMatch(/borderStyle: 'dashed'/);
  });

  it('o fundo do aviso deriva do acento, e não é um rgba escrito à mão', () => {
    // Seis esquemas dariam seis literais para manter. É um cálculo.
    expect(ui).toMatch(/comAlfa\(t\.accent/);
    expect(ler('src/theme.js')).toMatch(/export const comAlfa/);
  });

  it('a barra do carrinho e a das metas são do esquema', () => {
    // O progresso de uma compra ou de uma meta não é um estado.
    expect(ler('src/screens/ModoCompras.jsx')).toMatch(/pctCart > 80 \? t\.state\.warn : t\.accent/);
    expect(ler('src/screens/Dinheiro.jsx')).toMatch(/color=\{t\.accent\} height=\{6\}/);
  });
});
