/**
 * Os documentos que a app gera têm a cara da app — e o carimbo de quem imprime.
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 12/09/2026, o dono da casa: «os documentos gerados pela app devem ter o
 * logótipo da app em marca de água e o nome de quem imprime e data no canto
 * inferior direito», e «um design semelhante à app». Cinco páginas em
 * `design/documentos-da-app.dc.html`; escolheu a A.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. Os TRÊS documentos saem do mesmo molde (`paginaDaApp`): a faixa na cor
 *      do cabeçalho de quem imprime com o logótipo, títulos de secção no
 *      `actFg`, a marca de água e o carimbo — os dois `position: fixed`, para
 *      se repetirem em cada página impressa.
 *   2. O carimbo diz quem imprimiu e a data com a hora; sem nome, diz que foi
 *      a aplicação. Nada em serifa.
 *   3. Quem chama um documento passa `quemImprime` e o tema — senão o carimbo
 *      não tinha nome e a faixa não tinha a cor de quem imprime.
 */
const fs = require('fs');
const path = require('path');
const { documentoDeSaude, documentoDeEmergencia } = require('../src/exportar-saude');
const { documentoDoExtracto } = require('../src/extracto-do-mes');
const { paginaDaApp, carimboDe, logotipo } = require('../src/documento');
const { buildTheme, SCHEMES } = require('../src/theme');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');

const EXTRACTO = { nome: 'Agosto de 2026', aberto: false, fechadoEm: 'd2026-08-31',
  entrou: 2020, saiu: 120.5, sobrou: 1899.5,
  movimentos: [
    { chave: 'despesa:d2', especie: 'despesa', data: '2026-08-14', quem: 'Rita', titulo: 'Lazer do fim-de-semana', detalhe: 'Lazer', valor: -20, saldo: 1899.5 },
    { chave: 'acerto:a1', especie: 'acerto', data: '2026-08-12', quem: 'Rita', titulo: 'Acerto de contas com Tomás', detalhe: 'Rita pagou Tomás', valor: 40, neutro: true, saldo: 1919.5 },
    { chave: 'despesa:d1', especie: 'despesa', data: '2026-08-05', quem: 'Tomás', titulo: 'Continente', detalhe: 'Mercearia', valor: -100.5, saldo: 1919.5 },
    { chave: 'mes:m8', especie: 'rendimento', data: '2026-08-01', quem: null, titulo: 'Rendimento do mês', detalhe: 'abertura', valor: 2020, saldo: 2020 },
  ] };
const CONSULTAS = [{ id: 'h1', member: 'Mia', specialty: 'Dentista', day: 'd2026-08-05', time: '10:00', doctor: 'Dr. Cardoso' }];

// Os três, com quem imprime e o tema — como os ecrãs os chamam.
const OS_TRES = (t) => ({
  saude: documentoDeSaude({ membro: 'Mia', casa: 'Bengui', consultas: CONSULTAS, docs: [], notas: {}, hoje: 'd2026-08-20', quemImprime: 'Rita', t }),
  emergencia: documentoDeEmergencia({ membro: 'Léo', casa: 'Bengui', hoje: 'd2026-08-20', quemImprime: 'Rita', t,
    ficha: { alergias: [], medicacao: [], medicos: [], contactos: [] } }),
  extracto: documentoDoExtracto({ extracto: EXTRACTO, casa: 'Bengui', hoje: 'd2026-08-20', quemImprime: 'Rita', t }),
});

describe('⚠ os três documentos saem do mesmo molde, com a cara da app', () => {
  const t = buildTheme(1, false);
  const docs = OS_TRES(t);

  it.each(Object.keys(docs))('%s: faixa do esquema com o logótipo, títulos no actFg, marca de água e carimbo fixos', (qual) => {
    const html = docs[qual];
    // A faixa na cor do cabeçalho de quem imprime, com o logótipo a cores.
    expect(html).toContain(`.faixa { background: ${t.chrome};`);
    expect(html).toMatch(/<header class="faixa">\s*<svg class="logo"/);
    expect(html).toContain('fill="#8B4EE0"');
    // Os títulos de secção como na app: 13 px, 600, no actFg, com régua.
    expect(html).toMatch(new RegExp(`h2 \\{[^}]*font-size: 13px;[^}]*color: ${t.actFg};[^}]*border-bottom: 1px solid #D9D9D9;`));
    // A marca de água: o logótipo, na cor do cabeçalho, fixo e a 7 %.
    expect(html).toMatch(new RegExp(`<svg class="marca"[^>]*>.*stroke="${t.chrome}"`));
    expect(html).toMatch(/\.marca \{ position: fixed;[^}]*opacity: \.07;/);
    // ⚠ A marca é FUNDO: a página é o seu próprio contexto, senão o papel
    // branco da pré-visualização tapava-a (o dono da casa viu-a desaparecer).
    expect(html).toMatch(/html \{ isolation: isolate;/);
    expect(html).toMatch(/\.pagina \{[^}]*isolation: isolate;/);
    // O pé é UMA linha em flex — o aviso à esquerda, o carimbo à direita —
    // para nunca se sobreporem (o dono da casa apanhou-os cruzados).
    expect(html).toMatch(/\.pe \{ position: fixed; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between;/);
    expect(html).toMatch(/\.carimbo \{ flex: none; text-align: right;[^}]*white-space: nowrap;/);
    expect(html).toMatch(/<div class="pe">\s*<div class="rodape">[^<]+<\/div>\s*<div class="carimbo"><b>Impresso por Rita<\/b>20\/08\/2026 · 14:30<\/div>\s*<\/div>/);
    // Sem serifa — é a letra da app.
    expect(html).not.toMatch(/Georgia|Times New Roman|[^-]serif;/);
    expect(html).toMatch(/font-family: Inter, Roboto/);
  });

  it('a faixa é a de QUEM imprime: outro esquema, outra cor', () => {
    const cinza = buildTheme(SCHEMES.length - 1, false);
    const html = documentoDoExtracto({ extracto: EXTRACTO, casa: 'B', hoje: 'd2026-08-20', quemImprime: 'Tomás', t: cinza });
    expect(html).toContain(`.faixa { background: ${cinza.chrome};`);
    expect(cinza.chrome).not.toBe(buildTheme(1, false).chrome);
    expect(html).toContain('<b>Impresso por Tomás</b>');
  });

  it('sem nome nem tema, o carimbo diz que foi a aplicação e a faixa fica com o Cião', () => {
    const html = documentoDoExtracto({ extracto: EXTRACTO, casa: 'B', hoje: 'd2026-08-20' });
    expect(html).toContain('<b>Impresso pela aplicação Nossa Casa</b>20/08/2026 · 14:30');
    expect(html).toContain('.faixa { background: #0A5B60;');
    expect(carimboDe({ quemImprime: null, hoje: 'd2026-01-02' })).toEqual({ quem: 'Impresso pela aplicação Nossa Casa', quando: '02/01/2026 · 14:30' });
    // O logótipo é o mesmo do `Marca`: telhado e quatro bolas.
    expect(logotipo()).toMatch(/M3\.6 10\.9L12 4\.1l8\.4 6\.8/);
    expect((logotipo().match(/<circle/g) || []).length).toBe(4);
  });

  it('o molde escapa o que lhe chega — um nome com «<» não abre uma etiqueta', () => {
    const html = paginaDaApp({ titulo: '<script>', origem: 'x', corpo: '', quemImprime: '<b>', hoje: 'd2026-08-20' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('Impresso por &lt;b&gt;');
  });
});

describe('⚠ quem gera um documento passa quem imprime e o tema', () => {
  it('cada chamada a um `documento…(` nos ecrãs leva `quemImprime` e `t`', () => {
    const chamadas = [];
    const percorrer = (dir) => {
      for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) percorrer(p);
        else if (/\.jsx$/.test(e.name)) {
          const txt = semComentarios(ler(p));
          for (const m of txt.matchAll(/documento(DeSaude|DeEmergencia|DoExtracto)\(\{([^}]*)\}/g)) {
            chamadas.push({ onde: p, args: m[2] });
          }
        }
      }
    };
    percorrer('src');
    expect(chamadas.length).toBeGreaterThanOrEqual(3);
    const semCarimbo = chamadas.filter(c => !/quemImprime:/.test(c.args) || !/\bt\b/.test(c.args)).map(c => c.onde);
    expect(semCarimbo).toEqual([]);
  });

  it('e os três documentos passam pelo `paginaDaApp` — não há um segundo molde', () => {
    for (const f of ['src/exportar-saude.js', 'src/extracto-do-mes.js']) {
      const txt = semComentarios(ler(f));
      expect(txt).toMatch(/return paginaDaApp\(\{/);
      expect(txt).not.toMatch(/<!doctype html>/);
    }
  });
});
