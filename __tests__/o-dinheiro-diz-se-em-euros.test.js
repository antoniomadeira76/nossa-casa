/**
 * Nesta app o dinheiro diz-se em EUROS. Nunca em percentagem.
 *
 * ── A decisão ────────────────────────────────────────────────────────────────
 *
 * Pedida pelo dono da casa em 07/09/2026, e vale para toda a interface: onde a
 * app fala de dinheiro, o número é em euros. Uma percentagem obriga quem lê a
 * fazer a conta de cabeça para saber de quanto dinheiro se fala — e num ecrã
 * onde os outros números já são euros, é o mesmo cálculo escrito de duas
 * maneiras, uma delas por traduzir.
 *
 * Havia três, e caíram uma a uma:
 *
 *   Dinheiro   «62 % dos 2 020,00 € atribuídos aos envelopes» — e esta estava
 *              ERRADA por cima: os 62 % eram o gasto sobre o orçamento e os
 *              2 020 € eram o orçamento, duas contas sobre bolos diferentes na
 *              mesma frase. Ver `a-frase-do-orcamento-fecha-a-conta`.
 *   Início     «62 % do orçamento de Setembro usado até agora» — certa, e ainda
 *              assim o terceiro número do mesmo cartão numa terceira unidade,
 *              ao lado de «771,36 €» e «de 2 020,00 €».
 *   Gestão     `{pct}%` no canto de cada envelope, ao lado de «546,60 € de
 *              590,00 €» — a percentagem era redundante e era o número menos
 *              útil dos três que ali cabem: quem olha para um envelope quer
 *              saber quanto ainda pode gastar. Passou a «livre 43,40 €», que é
 *              a palavra que a grelha do Dinheiro já usava.
 *
 * ⚠ As BARRAS ficam. Uma barra é uma proporção desenhada, e lê-se de relance
 * sem se fazer conta nenhuma — é o contrário do problema. O que sai é o número.
 *
 * ── Como isto se prova ───────────────────────────────────────────────────────
 *
 * Percorre os `.jsx` e apanha cada `%`, separando três coisas:
 *
 *   o operador módulo    `(x + 1) % 12` — não é símbolo nenhum
 *   uma medida de estilo `width: `${pct}%`` — é CSS, e é a barra
 *   texto para ler       `{pct}%` — é o que não pode existir
 *
 * ⚠ Sem a primeira separação isto dava catorze falsos positivos e resolvia-se a
 * esconder a regra. O módulo tem operandos dos dois lados; um símbolo colado a
 * um `}` ou a um dígito não é módulo — não se divide um bloco.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const soCodigo = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

const JSX = (() => {
  const fora = [];
  const percorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) percorrer(p);
      else if (/\.jsx$/.test(e.name)) fora.push(p);
    }
  };
  percorrer(path.join(RAIZ, 'src'));
  fora.push(path.join(RAIZ, 'App.jsx'));
  return fora.map(p => path.relative(RAIZ, p).split(path.sep).join('/'));
})();

// Uma propriedade de estilo que aceita percentagem — é aí que a barra vive.
const MEDIDA = /(width|height|Width|Height|flexBasis|left|top|right|bottom|size)\s*:\s*[^;]{0,40}$/;

// Cada `%` que é SÍMBOLO e não operador: colado a um `}` ou a um dígito.
const simbolosEm = (rel) => {
  const txt = soCodigo(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
  const fora = [];
  for (const m of txt.matchAll(/(\}|\d)\s*%/g)) {
    const antes = txt.slice(Math.max(0, m.index - 90), m.index + 1);
    if (MEDIDA.test(antes)) continue;               // é a barra, e a barra fica
    fora.push({
      rel,
      linha: txt.slice(0, m.index).split('\n').length,
      trecho: txt.slice(Math.max(0, m.index - 40), m.index + m[0].length).replace(/\n/g, ' ').trim(),
    });
  }
  return fora;
};

const SIMBOLOS = JSX.flatMap(simbolosEm);

describe('⚠ nenhum número de dinheiro se mostra em percentagem', () => {
  it('a prova sabe distinguir o módulo do símbolo', () => {
    // Se isto falhar, o discriminador deixou de discriminar e a prova de baixo
    // passou a não medir nada. `(hoje.getDay() + 6) % 7` é módulo em quatro
    // ficheiros, e nenhum deles pode aparecer como símbolo.
    const modulos = JSX.flatMap(rel => {
      const txt = soCodigo(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
      return [...txt.matchAll(/\)\s%\s\w/g)].map(() => rel);
    });
    expect(modulos.length).toBeGreaterThan(3);
    // E nenhum desses entrou na lista de símbolos.
    expect(SIMBOLOS.filter(s => /\)\s%$/.test(s.trecho))).toEqual([]);
  });

  it('⚠ e não há nenhum símbolo de percentagem em texto', () => {
    const maus = SIMBOLOS.map(s => `${s.rel}:${s.linha} → «${s.trecho}»`);
    expect(maus).toEqual([]);
  });
});

describe('os três sítios onde havia percentagem falam euros', () => {
  const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

  it('a frase do Dinheiro', () => {
    expect(ler('src/screens/Dinheiro.jsx'))
      .toMatch(/\{EUR\(budget\)\} dos \{EUR\(rendimento\)\} atribuídos aos envelopes/);
  });

  it('a frase do Início', () => {
    expect(ler('src/screens/Inicio.jsx'))
      .toMatch(/\{EUR\(spent\)\} do orçamento de \{s\.monthName\} usados até agora/);
  });

  it('e o canto de cada envelope na Gestão', () => {
    const g = ler('src/screens/Gestao.jsx');
    expect(g).toMatch(/livre \$\{EUR\(sobra\)\}/);
    expect(g).toMatch(/excedido em \$\{EUR\(-sobra\)\}/);
  });
});

describe('⚠ as barras ficam — uma proporção desenhada não é um número a traduzir', () => {
  const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

  it('a Gestão continua a desenhar a barra de cada envelope', () => {
    // O `pct` deixou de ser TEXTO e continua a ser a largura. Tirá-lo daqui
    // seria responder a outra pergunta.
    expect(ler('src/screens/Gestao.jsx')).toMatch(/width: `\$\{Math\.min\(100, pct\)\}%`/);
  });

  it('e o Dinheiro e o Início continuam a ter a sua', () => {
    for (const f of ['src/screens/Dinheiro.jsx', 'src/screens/Inicio.jsx']) {
      expect(ler(f)).toMatch(/<Bar t=\{t\} pct=\{pct\}/);
    }
  });
});

describe('e o envelope diz quanto sobra, com o sinal certo', () => {
  const { EUR } = require('../src/format');

  it('dentro do limite, «livre» é o que falta gastar', () => {
    // 590,00 − 546,60 = 43,40. É o número que a grelha do Dinheiro já mostra
    // para o mesmo envelope: uma casa, uma palavra, um valor.
    expect(EUR(590 - 546.6)).toContain('43,40');
  });

  it('⚠ e acima do limite não se escreve «livre −43,40 €»', () => {
    // Um valor livre negativo não é um valor livre. O ecrã diz «excedido em», e
    // o «livre» é o ramo do CONTRÁRIO — a ordem do ternário é a propriedade:
    // `over ? excedido : livre`, e nunca o inverso.
    const g = fs.readFileSync(path.join(RAIZ, 'src/screens/Gestao.jsx'), 'utf8');
    expect(g).toMatch(/over \? `excedido em \$\{EUR\(-sobra\)\}` : `livre \$\{EUR\(sobra\)\}`/);
    // E o excedido leva o simétrico, senão mostrava um valor negativo.
    expect(g).toMatch(/EUR\(-sobra\)/);
  });
});
