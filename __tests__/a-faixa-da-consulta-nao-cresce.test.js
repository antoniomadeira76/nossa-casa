/**
 * A faixa de uma consulta aberta não cresce com o acordeão.
 *
 * 12/09/2026: o dono da casa viu a consulta do Léo aberta — receitas, notas,
 * ação, anexos, botões — com a faixa azul do membro a acompanhar tudo, cerca
 * de 700 px de linha contínua, e pediu opções (`design/faixa-da-consulta.dc.html`).
 * Escolheu a A: a faixa mede a primeira linha (52 px) e para aí.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. A `Linha` com `faixaCurta` não tem `borderLeft`: tem um filho absoluto
 *      de 3 × 52 px na cor dada, e o mesmo recuo da `faixa`.
 *   2. A consulta da Saúde usa `faixaCurta`, e não `faixa`.
 *   3. As linhas FECHADAS continuam a ler-se iguais: 52 px de altura mínima.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { Linha } = require('../src/ui');
const { buildTheme, S } = require('../src/theme');
// O recuo da faixa, lido da escala — não um número escrito aqui.
const RECUO = S.md + S.xs;

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const T = buildTheme(1, false);
const estilo = (n) => Object.assign({}, ...[].concat(n.props.style || []).filter(Boolean));

describe('⚠ a faixa curta', () => {
  it('é um filho absoluto de 3 × 52 px, sem borda esquerda, com o recuo da faixa', () => {
    let r;
    TestRenderer.act(() => {
      r = TestRenderer.create(React.createElement(Linha, { t: T, faixaCurta: '#2F6FED' },
        React.createElement(require('react-native').Text, null, 'x')));
    });
    const raiz = r.root.findAll(n => typeof n.type === 'string')[0];
    const e = estilo(raiz);
    expect(e.borderLeftWidth).toBeUndefined();
    expect(e.paddingLeft).toBe(RECUO);
    const faixa = r.root.findAll(n => n.props && n.props.testID === 'faixa-curta')[0];
    expect(faixa).toBeTruthy();
    expect(estilo(faixa)).toMatchObject({ position: 'absolute', left: 0, top: 0, width: 3, height: 52, backgroundColor: '#2F6FED' });
  });

  it('e a `faixa` de sempre continua a ser a borda — as linhas fechadas não mudam', () => {
    let r;
    TestRenderer.act(() => {
      r = TestRenderer.create(React.createElement(Linha, { t: T, faixa: '#2F6FED' },
        React.createElement(require('react-native').Text, null, 'x')));
    });
    const raiz = r.root.findAll(n => typeof n.type === 'string')[0];
    expect(estilo(raiz)).toMatchObject({ borderLeftWidth: 3, borderLeftColor: '#2F6FED', paddingLeft: RECUO, minHeight: 52 });
    expect(r.root.findAll(n => n.props && n.props.testID === 'faixa-curta')).toHaveLength(0);
  });

  it('⚠ a consulta da Saúde usa a faixa curta — é a única linha da app que abre em acordeão', () => {
    const saude = semComentarios(ler('src/screens/Saude.jsx'));
    const i = saude.indexOf('const RecordCard');
    const bloco = saude.slice(i, i + 1500);
    expect(bloco).toMatch(/<Linha[^>]*faixaCurta=\{corDoMembro\(record\.member/);
    expect(bloco).not.toMatch(/<Linha[^>]*\bfaixa=\{corDoMembro/);
  });
});
