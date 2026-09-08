/**
 * No «Precisa de Si» a cor diz o GÉNERO do aviso — e não há laranja.
 *
 * ── A escala ─────────────────────────────────────────────────────────────────
 *
 *   cinzento   há algo por fazer, mas nada em risco — contas, tarefas
 *   azul       uma DATA aproxima-se — garantia, receita, consulta, agenda
 *   vermelho   um limite já foi ultrapassado — envelope
 *
 * ── O que se corrigiu em 08/09/2026 ──────────────────────────────────────────
 *
 * As garantias e as receitas a expirar levavam âmbar (`state.warn`). O dono da
 * casa perguntou «com que base escolheste as cores destes cartões?» e mandou
 * tirar o laranja. Tinha razão duas vezes: o CLAUDE.md diz que não existe
 * laranja nesta app, e a especificação (item 7, «grey except real risk») já
 * dizia que o âmbar não se usava em lado nenhum — era o CÓDIGO do protótipo que
 * a contradizia, e a app tinha seguido o código.
 *
 * E a faixa da esquerda das linhas cinzentas era a cor do ícone. No protótipo
 * são duas cores — `#6A7282` no ícone, `#A9B4C6` na linha —, e a app usava uma
 * para as duas: as faixas ficavam quase pretas ao lado das coloridas.
 *
 * ⚠ Enumera-se do código: cada `needs.push` do Início declara uma cor, e a cor
 * tem de ser uma das três. Um aviso novo com âmbar entra aqui sozinho.
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

// Cada `needs.push({ … color: X …` — a cor de cada aviso.
const AVISOS = [...inicio.matchAll(/needs\.push\(\{[^;]*?color:\s*([\w.]+)/g)].map(m => m[1]);

describe('⚠ a cor de cada aviso é uma das três da escala', () => {
  it('há avisos para conferir — senão isto não prova nada', () => {
    expect(AVISOS.length).toBeGreaterThan(5);
  });

  it('⚠ nenhum leva âmbar — nesta app não há laranja', () => {
    expect(AVISOS.filter(c => /warn/.test(c))).toEqual([]);
  });

  it('e cada um é cinzento, azul ou vermelho', () => {
    const fora = AVISOS.filter(c => !['t.text3', 't.state.info', 't.state.err'].includes(c));
    expect(fora).toEqual([]);
  });

  it('⚠ os cinzentos declaram a faixa própria, mais clara do que o ícone', () => {
    // A faixa e o ícone são duas cores no protótipo. Um aviso cinzento sem
    // `line` volta a pintar a faixa com o `text3`.
    const cinzentos = [...inicio.matchAll(/needs\.push\(\{[^;]*?color:\s*t\.text3[^;]*?\}\)/g)].map(m => m[0]);
    expect(cinzentos.length).toBeGreaterThan(1);
    for (const c of cinzentos) expect(c).toMatch(/line:\s*t\.faixa/);
  });

  it('e o cartão pinta a faixa com a `line` quando ela existe', () => {
    expect(inicio).toMatch(/borderLeftColor:\s*n\.line \|\| n\.color/);
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

  it('⚠ e em todos os doze temas a faixa é mais CLARA do que o ícone no claro e mais ESCURA no escuro', () => {
    // «Mais clara do que o ícone» é a propriedade que a distingue dele: no
    // claro o ícone é escuro sobre cartão claro, e a faixa fica entre os dois;
    // no escuro inverte-se — o ícone é claro, e a faixa fica entre a linha e ele.
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
