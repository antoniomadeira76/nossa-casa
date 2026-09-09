/**
 * No «Precisa de Si» cada aviso tem DUAS cores — a faixa e o ícone — e a cor
 * diz o género do aviso, como no código do protótipo.
 *
 * ── A escala (a lista `needs` do `Nossa Casa App.dc.html`) ───────────────────
 *
 *   cinzento   há algo por fazer, mas nada em risco — ícone `text3`, faixa `faixa`
 *   âmbar      um prazo aproxima-se — ícone `warnDeep`, faixa `warn`
 *   vermelho   um limite já foi ultrapassado — `err` nos dois
 *   azul       informação sem prazo nem risco — `info` (não está no protótipo)
 *
 * ── O que se corrigiu em 08/09/2026 ──────────────────────────────────────────
 *
 * A app pintava a faixa com a cor do ícone. No protótipo são duas cores nas
 * linhas cinzentas — `#6A7282` no ícone, `#A9B4C6` na linha —, e com uma só as
 * faixas cinzentas ficavam quase pretas ao lado das coloridas. O dono da casa
 * perguntou «com que base escolheste as cores destes cartões?», e a resposta
 * honesta era: a base era o protótipo, menos a faixa.
 *
 * ⚠ O âmbar saiu e voltou no mesmo dia: pediu-se «sem laranja», a especificação
 * dizia que o âmbar não se usava em lado nenhum, e o protótipo usava-o. Ficou o
 * protótipo, que é a regra quando os dois discordam. Esta prova enumera os
 * `needs.push` do Início e exige que cada um esteja na escala — com as duas
 * cores. Um aviso novo com uma cor fora dela entra aqui sozinho.
 */
const fs = require('fs');
const path = require('path');
const { buildTheme } = require('../src/theme');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const soCodigo = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .split('\n').map(l => (/^\s*(\/\/|\*)/.test(l) ? '' : l)).join('\n');

const inicio = soCodigo(ler('src/screens/Inicio.jsx'));

// Cada `needs.push({ … })`, com a cor do ícone e a da faixa.
const AVISOS = [...inicio.matchAll(/needs\.push\(\{([^;]*?)\}\)\)?;/g)].map(m => {
  const bloco = m[1];
  const cor = (bloco.match(/\bcolor:\s*([\w.]+)/) || [])[1] || null;
  const linha = (bloco.match(/\bline:\s*([\w.]+)/) || [])[1] || null;
  const icone = (bloco.match(/icon:\s*'(\w+)'/) || [])[1] || '?';
  return { icone, cor, linha };
});

// A escala: ícone → faixa que lhe corresponde. `null` quer dizer «a mesma cor».
// ⚠ `warnTexto`, e não `warnDeep`: o ícone está sobre o CARTÃO, e sobre o
// cartão escuro o âmbar-escuro do protótipo dá 2,89. O `warnTexto` é o deep no
// claro e o próprio âmbar no escuro — ver `STATE` no `theme.js`.
const ESCALA = {
  't.text3': 't.faixa',
  't.state.warnTexto': 't.state.warn',
  't.state.errTexto': 't.state.err',
  't.state.infoTexto': 't.state.info',
};

describe('⚠ cada aviso está na escala, com as duas cores', () => {
  it('há avisos para conferir — senão isto não prova nada', () => {
    expect(AVISOS.length).toBeGreaterThan(5);
    expect(AVISOS.every(a => a.cor)).toBe(true);
  });

  it('⚠ nenhum ícone leva uma cor fora da escala', () => {
    const fora = AVISOS.filter(a => !(a.cor in ESCALA)).map(a => `${a.icone} → ${a.cor}`);
    expect(fora).toEqual([]);
  });

  it('⚠ e a faixa é a que a escala manda para essa cor de ícone', () => {
    // Um cinzento sem `line` volta a pintar a faixa de `text3`; um âmbar sem
    // `line` pinta-a de âmbar-escuro em vez do amarelo do protótipo.
    const maus = AVISOS
      .filter(a => ESCALA[a.cor] && a.linha !== ESCALA[a.cor])
      .map(a => `${a.icone}: ícone ${a.cor}, faixa ${a.linha || '(a do ícone)'} — devia ser ${ESCALA[a.cor]}`);
    expect(maus).toEqual([]);
  });

  it('e a linha pinta a faixa com a `line` quando ela existe', () => {
    // Era `borderLeftColor` num cartão; desde o desenho C (09/09/2026) é a
    // `faixa` da `Linha` plana — a mesma cor, no mesmo sítio.
    expect(inicio).toMatch(/faixa=\{n\.line \|\| n\.color\}/);
  });

  it('a garantia e a receita a expirar são âmbar — o protótipo ganha à especificação', () => {
    const idcard = AVISOS.filter(a => a.icone === 'idcard');
    expect(idcard.length).toBe(2);
    for (const a of idcard) expect(a.cor).toBe('t.state.warnTexto');
  });
});

describe('a `faixa` vive no tema, nos dois aspetos e nos seis esquemas', () => {
  const lum = (hex) => {
    const n = String(hex).replace('#', '');
    const [r, g, b] = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255)
      .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  it('no claro é o valor do protótipo', () => {
    expect(buildTheme(0, false).faixa).toBe('#A9B4C6');
  });

  it('⚠ e em todos os doze temas fica entre a linha e o ícone', () => {
    // No claro o ícone é escuro sobre cartão claro e a faixa fica mais clara
    // do que ele; no escuro inverte-se — o ícone é claro, e a faixa fica entre
    // a linha do cartão e ele.
    for (let e = 0; e < 6; e++) {
      const claro = buildTheme(e, false);
      const escuro = buildTheme(e, true);
      expect(typeof escuro.faixa).toBe('string');
      expect(lum(claro.faixa)).toBeGreaterThan(lum(claro.text3));
      expect(lum(escuro.faixa)).toBeLessThan(lum(escuro.text3));
      expect(lum(escuro.faixa)).toBeGreaterThan(lum(escuro.border));
    }
  });
});
