/**
 * A marca de água: o logótipo da app atrás de todos os ecrãs.
 *
 * 13/09/2026, o dono da casa: «põe o logo da app como marca de água em todos
 * os ecrãs». A mesma marca dos documentos em papel, centrada na área de
 * conteúdo, numa tinta só e quase transparente.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. É FUNDO: não apanha toques (`pointerEvents="none"`), é absoluta (não
 *      entra na coluna flex do INVARIANTE #1) e quase transparente.
 *   2. Vive na área de conteúdo dos ADULTOS e da CRIANÇA, como primeiro filho —
 *      atrás do scroll e das vistas de ecrã inteiro; o rodapé continua a ser o
 *      último filho da raiz.
 *   3. É uma tinta só, do tema — o telhado branco da marca não se via na página.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');

const { MarcaDeAgua, OPACIDADE_DA_MARCA } = require('../src/ui');
const { buildTheme } = require('../src/theme');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');

describe('⚠ a marca de água', () => {
  it('é fundo: absoluta, sem toque, quase transparente, numa tinta do tema', () => {
    for (const [esquema, escuro] of [[0, false], [1, false], [3, true], [5, true]]) {
      const t = buildTheme(esquema, escuro);
      let r = null;
      TestRenderer.act(() => { r = TestRenderer.create(React.createElement(MarcaDeAgua, { t })); });
      const raiz = r.root.findAll(n => n.type === 'View')[0];
      expect(raiz.props.pointerEvents).toBe('none');
      const estilo = Object.assign({}, ...[].concat(raiz.props.style));
      expect(estilo.position).toBe('absolute');
      expect(estilo).toMatchObject({ left: 0, right: 0, top: 0, bottom: 0 });
      // A marca leva a tinta principal do tema — clara no escuro, escura no
      // claro — e a opacidade dos documentos em papel, que ele já aprovou.
      const svg = r.root.findAll(n => n.props && n.props.viewBox === '0 0 24 24')[0];
      expect(svg).toBeTruthy();
      expect(svg.props.opacity).toBe(OPACIDADE_DA_MARCA);
      expect(OPACIDADE_DA_MARCA).toBeLessThanOrEqual(0.08);
      const telhado = r.root.findAll(n => n.props && typeof n.props.d === 'string')[0];
      expect(telhado.props.stroke).toBe(t.text1);
    }
  });

  it('vive na área de conteúdo dos adultos e da criança, como primeiro filho, e o rodapé fica o último da raiz', () => {
    for (const f of ['App.jsx', 'src/KidApp.jsx']) {
      const txt = semComentarios(ler(f));
      // O primeiro elemento dentro da área de conteúdo é a marca.
      // (o `{}` é o que fica de um comentário JSX depois de os tirar)
      expect(txt).toMatch(/<View style=\{\{ flex: 1, minHeight: 0 \}\}>\s*(\{\}\s*)?<MarcaDeAgua t=\{t\} \/>/);
      // E só uma por ecrã.
      expect((txt.match(/<MarcaDeAgua/g) || []).length).toBe(1);
    }
    // O rodapé dos adultos continua a ser o último filho da raiz.
    expect(ler('App.jsx')).toMatch(/rodapé — último filho da raiz, sempre \(INVARIANTE #1\)/);
  });
});
