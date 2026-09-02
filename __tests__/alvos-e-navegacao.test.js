/**
 * Duas redes que vieram de percorrer a app no navegador, ecrã a ecrã.
 *
 * ── 1. Alvos abaixo de 44 (INVARIANTE #5) ────────────────────────────────────
 *
 * Encontrados a medir, não a ler:
 *
 *   Tarefas       as pastilhas de filtro, 40 — o primeiro que a mão encontra
 *   Gestão        o `Segmented small`, 38, em três ecrãs de uma vez
 *   Gestão        editar/apagar especialidade, 40 (um `size={40}` que anulava
 *                 os 44 por omissão do `Tap`)
 *   Gestão        a faixa de abas com OITO pixels mortos entre cada par, e a
 *                 aba «Lojas» com 31 de largura
 *   Saúde         catorze alvos entre 32 e 40
 *
 * ⚠ Na Saúde havia um segundo defeito por baixo do primeiro: QUINZE
 * `Pressable` sem `accessibilityRole`. Isso torna-os invisíveis ao leitor de
 * ecrã — e à própria medição que procura alvos pequenos. Os alvos pequenos
 * nunca apareciam em relatório nenhum porque nem sequer se contavam como
 * alvos.
 *
 * ── 2. O rodapé não levava onde dizia ────────────────────────────────────────
 *
 * Ver o bloco próprio, mais abaixo.
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');

const ficheiros = [];
for (const d of ['src/screens', 'src/sheets']) {
  for (const f of fs.readdirSync(path.join(raiz, d))) if (f.endsWith('.jsx')) ficheiros.push(`${d}/${f}`);
}
ficheiros.push('src/ui.jsx', 'src/KidApp.jsx', 'App.jsx');

// Os `Pressable` de um ficheiro, com o texto do seu `style`.
const tocaveis = (rel) => {
  const codigo = ler(rel);
  const ast = parser.parse(codigo, { sourceType: 'module', plugins: ['jsx'] });
  const achados = [];
  traverse(ast, {
    JSXElement(p) {
      if (p.node.openingElement.name.name !== 'Pressable') return;
      const est = p.node.openingElement.attributes.find(a => a.name && a.name.name === 'style');
      achados.push({
        linha: p.node.loc.start.line,
        estilo: est ? codigo.slice(est.start, est.end) : '',
        abertura: codigo.slice(p.node.openingElement.start, p.node.openingElement.end),
      });
    },
  });
  return achados;
};

describe('⚠ nenhum Pressable declara uma altura abaixo de 44 (INVARIANTE #5)', () => {
  it.each(ficheiros)('%s', (rel) => {
    const maus = [];
    for (const t of tocaveis(rel)) {
      for (const m of t.estilo.matchAll(/minHeight: (\d+)/g)) {
        if (Number(m[1]) < 44) maus.push(`linha ${t.linha}: minHeight ${m[1]}`);
      }
      for (const m of t.estilo.matchAll(/(?:^|[^a-zA-Z])height: (\d+)[,}\s]/g)) {
        if (Number(m[1]) < 44) maus.push(`linha ${t.linha}: height ${m[1]}`);
      }
    }
    expect(maus).toEqual([]);
  });
});

describe('⚠ e nenhum se esconde da medição', () => {
  // Um `Pressable` sem `accessibilityRole` não é anunciado como botão, e não
  // aparece em nenhuma varredura de alvos — é assim que catorze alvos
  // pequenos viveram escondidos na Saúde.
  it.each(ficheiros)('%s declara o papel em todos', (rel) => {
    const sem = tocaveis(rel)
      .filter(t => !/accessibilityRole/.test(t.abertura))
      .map(t => `linha ${t.linha}`);
    expect(sem).toEqual([]);
  });
});

describe('⚠ o `Tap` não se deixa encolher abaixo de 44', () => {
  it('nenhum sítio lhe passa um tamanho menor', () => {
    // A Gestão passava `size={40}` aos ícones de editar e apagar, o que
    // ANULAVA os 44 por omissão do componente.
    const maus = [];
    for (const rel of ficheiros) {
      const codigo = ler(rel);
      const ast = parser.parse(codigo, { sourceType: 'module', plugins: ['jsx'] });
      traverse(ast, {
        JSXElement(p) {
          if (p.node.openingElement.name.name !== 'Tap') return;
          const s = p.node.openingElement.attributes.find(a => a.name && a.name.name === 'size');
          const v = s && s.value && s.value.expression && s.value.expression.value;
          if (typeof v === 'number' && v < 44) maus.push(`${rel}:${p.node.loc.start.line} size=${v}`);
        },
      });
    }
    expect(maus).toEqual([]);
  });
});

describe('⚠ o rodapé leva sempre onde diz que leva', () => {
  // O toque num separador fazia `setTab` e mais nada. Com a Saúde, os
  // Equipamentos, a Gestão ou a Documentação abertos POR CIMA, o separador
  // acendia-se e o ecrã continuava a ser o outro — a app ficava presa numa
  // vista de onde só a seta do cabeçalho saía.
  //
  // Medido no navegador: o rodapé dizia «Início» e o conteúdo dizia
  // «Equipamentos da Casa».
  const app = ler('App.jsx');

  it('o separador fecha as vistas de ecrã inteiro antes de mudar de separador', () => {
    const i = app.indexOf('TABS.map');
    const bloco = app.slice(i, i + 600);
    expect(bloco).toMatch(/fecharVistas\(\)/);
    expect(bloco).toMatch(/setTab\(x\.key\)/);
  });

  it('e o `fecharVistas` fecha TODAS as que correm por cima', () => {
    const i = app.indexOf('const fecharVistas');
    expect(i).toBeGreaterThan(0);
    const corpo = app.slice(i, i + 400);
    for (const fechar of ['setFicha', 'setSaude', 'setEquip', 'setGestao', 'setDoc', 'setLoja']) {
      expect(corpo).toContain(fechar);
    }
  });

  it('⚠ e a lista de vistas do `fecharVistas` é a MESMA do `vistaAberta`', () => {
    // Uma vista nova entra no `vistaAberta` e esquece-se no `fecharVistas`, e
    // o defeito volta só para ela — que é a pior forma de voltar.
    const abertas = app.slice(app.indexOf('const vistaAberta'), app.indexOf('const V ='));
    const nomes = [...abertas.matchAll(/(\w+) \? '/g)].map(m => m[1]);
    expect(nomes.length).toBeGreaterThanOrEqual(6);

    const corpo = app.slice(app.indexOf('const fecharVistas'), app.indexOf('const fecharVistas') + 400);
    for (const n of nomes) {
      const setter = 'set' + n.charAt(0).toUpperCase() + n.slice(1);
      expect(corpo).toContain(setter);
    }
  });
});
