/**
 * Uma escolha marca-se com o ACENTO — nunca com a cor do cabeçalho.
 *
 * ── O que se viu ─────────────────────────────────────────────────────────────
 *
 * Na folha de gerir uma tarefa, «Urgente», «Léo» e «✓ Com prazo» estavam
 * cheios a `t.chrome` — a cor do cabeçalho, que no Violeta é #241239, quase
 * preto — enquanto as pastilhas da folha do artigo, ao lado, estavam em violeta.
 * O dono da casa perguntou porque não estavam na cor do perfil (09/09/2026).
 *
 * Eram dois idiomas para a mesma coisa: a `Choice` já marcava com `t.accent`, o
 * `Segmented` e oito escolhas escritas à mão marcavam com `t.chrome`. O
 * CLAUDE.md diz que a cor de ação vem do esquema e que não há botão preto —
 * e um `chrome` escuro numa pastilha É um botão preto.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * O `chrome` pinta o cabeçalho e o rodapé, e mais nada. Um preenchimento ou
 * contorno condicional a `t.chrome` fora do App e do KidApp é uma escolha a
 * fingir de cabeçalho. Enumera-se do disco.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const soCodigo = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .split('\n').map(l => (/^\s*(\/\/|\*)/.test(l) ? '' : l));

const jsx = (() => {
  const fora = [];
  const percorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) percorrer(p);
      else if (/\.jsx$/.test(e.name)) fora.push(path.relative(RAIZ, p).split(path.sep).join('/'));
    }
  };
  percorrer(path.join(RAIZ, 'src'));
  return fora;
})();

// Onde o `chrome` VIVE: o cabeçalho e o rodapé do App, a app da criança, e os
// componentes de cabeçalho do `ui.jsx`. Aqui não é escolha.
const ONDE_E_CABECALHO = ['src/KidApp.jsx', 'src/Sheet.jsx', 'src/Confirm.jsx'];

describe('⚠ nenhuma escolha se pinta com a cor do cabeçalho', () => {
  it('nenhum `? t.chrome :` — um preenchimento condicional ao cabeçalho é uma escolha a preto', () => {
    const maus = [];
    for (const rel of jsx) {
      if (ONDE_E_CABECALHO.includes(rel)) continue;
      soCodigo(fs.readFileSync(path.join(RAIZ, rel), 'utf8')).forEach((l, i) => {
        if (/\?\s*t\.chrome\s*:/.test(l)) maus.push(`${rel}:${i + 1} → ${l.trim().slice(0, 70)}`);
      });
    }
    expect(maus).toEqual([]);
  });

  it('o `Segmented` e a `Choice` marcam o escolhido com o MESMO acento', () => {
    const ui = soCodigo(fs.readFileSync(path.join(RAIZ, 'src/ui.jsx'), 'utf8')).join('\n');
    const seg = ui.slice(ui.indexOf('export const Segmented'), ui.indexOf('export const Segmented') + 1800);
    const choice = ui.slice(ui.indexOf('export const Choice'), ui.indexOf('export const Choice') + 900);
    expect(seg).toMatch(/backgroundColor: on \? t\.accent/);
    expect(choice).toMatch(/backgroundColor: selected \? t\.accent/);
  });

  it('e o branco sobre o acento lê-se nos seis esquemas — é o que as duas escrevem por cima', () => {
    const { buildTheme, SCHEMES } = require('../src/theme');
    const lum = (h) => {
      const n = h.replace('#', '');
      const v = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255)
        .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    for (let e = 0; e < SCHEMES.length; e++) {
      const t = buildTheme(e, false);
      expect((1.05) / (lum(t.accent) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
