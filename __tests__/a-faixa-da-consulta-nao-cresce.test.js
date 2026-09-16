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

  // ⚠ Esta prova exigia `borderLeftWidth: 3` na raiz, e deixou de valer em
  // 15/09/2026. A faixa comprida era uma BORDA mais um recuo, e ambos só
  // apareciam quando havia faixa: uma linha com faixa tinha o conteúdo 11 px à
  // direita do conteúdo de uma linha sem ela, e numa lista onde a faixa marca o
  // que já se apanhou isso dá uma coluna de círculos aos degraus. O dono da casa
  // viu-o nas compras — «quando desmarcado deve continuar no mesmo sítio onde
  // está o visto agora».
  //
  // A faixa passa a desenhar-se ABSOLUTA, como a curta sempre se desenhou, e o
  // corredor dos 10 px existe em TODAS as linhas. O que esta prova defende é o
  // mesmo de antes — a faixa comprida acompanha a linha inteira e a curta para
  // aos 52 —, dito nos termos novos.
  it('a `faixa` comprida é absoluta e vai de cima a baixo — a curta para aos 52', () => {
    let r;
    TestRenderer.act(() => {
      r = TestRenderer.create(React.createElement(Linha, { t: T, faixa: '#2F6FED' },
        React.createElement(require('react-native').Text, null, 'x')));
    });
    const raiz = r.root.findAll(n => typeof n.type === 'string')[0];
    const e = estilo(raiz);
    expect(e.borderLeftWidth).toBeUndefined();
    expect(e).toMatchObject({ paddingLeft: RECUO, minHeight: 52 });
    const faixa = r.root.findAll(n => n.props && n.props.testID === 'faixa')[0];
    expect(faixa).toBeTruthy();
    expect(estilo(faixa)).toMatchObject({ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: '#2F6FED' });
    // De cima a baixo, e não 52 px: é o que a distingue da curta.
    expect(estilo(faixa).height).toBeUndefined();
    expect(r.root.findAll(n => n.props && n.props.testID === 'faixa-curta')).toHaveLength(0);
  });

  // ⚠ E o corredor é o MESMO com faixa e sem ela. É esta a propriedade que a
  // coluna de círculos das compras precisa, e a que faltava.
  it('uma linha SEM faixa tem o mesmo recuo de uma linha COM faixa', () => {
    const recuoDe = (props) => {
      let r;
      TestRenderer.act(() => {
        r = TestRenderer.create(React.createElement(Linha, { t: T, ...props },
          React.createElement(require('react-native').Text, null, 'x')));
      });
      return estilo(r.root.findAll(n => typeof n.type === 'string')[0]).paddingLeft;
    };
    expect(recuoDe({})).toBe(RECUO);
    expect(recuoDe({ faixa: '#2F6FED' })).toBe(RECUO);
    expect(recuoDe({ faixaCurta: '#2F6FED' })).toBe(RECUO);
  });

  it('⚠ a consulta da Saúde usa a faixa curta — é a única linha da app que abre em acordeão', () => {
    const saude = semComentarios(ler('src/screens/Saude.jsx'));
    const i = saude.indexOf('const RecordCard');
    const bloco = saude.slice(i, i + 1500);
    expect(bloco).toMatch(/<Linha[^>]*faixaCurta=\{corDoMembro\(record\.member/);
    expect(bloco).not.toMatch(/<Linha[^>]*\bfaixa=\{corDoMembro/);
  });
});
