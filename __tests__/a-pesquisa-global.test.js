/**
 * A pesquisa global — a lupa no cabeçalho do Início (13/09/2026).
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * «Uma pesquisa global no cabeçalho do primeiro ecrã, com autocomplete e a
 * mostrar o que encontra à medida que se vai escrevendo.» Cinco desenhos em
 * `design/pesquisa-global.dc.html`; ficou a A: a lupa no cabeçalho, o campo no
 * lugar da saudação, os resultados no lugar do conteúdo, por área, com três
 * sugestões em pastilhas.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. `pesquisa.js` é puro: normaliza sem acentos, ordena «começa por» antes
 *      de «contém», agrupa pela ordem do rodapé, sugere palavras que completam,
 *      e marca a palavra no título original.
 *   2. Os resultados desenham-se com alvos de 44 e uma linha por item; sem
 *      termo dizem o que se pode procurar; sem resultados dizem-no.
 *   3. O App tem a lupa no Início e o campo no cabeçalho; a criança também, e o
 *      índice dela não tem dinheiro da casa.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');

jest.mock('../src/pocketbase', () => ({
  estaLigado: () => false,
  auth: { valida: () => false, membro: () => null },
  ler: {},
  google: { disponivel: () => false, porLigar: () => false, verificar: async () => false },
}));

const { normalizar, indexar, pesquisar, sugerir, realcar, AREAS_DA_PESQUISA } = require('../src/pesquisa');
const { StoreProvider } = require('../src/store');
const { buildTheme } = require('../src/theme');
const Resultados = require('../src/screens/Resultados').default;

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const T = buildTheme(1, false);

const junta = (n) => {
  if (n === null || n === undefined || n === false) return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(junta).join(' ');
  return junta(n.children || (n.props && n.props.children) || null);
};
const montar = (props) => {
  let r = null;
  TestRenderer.act(() => {
    r = TestRenderer.create(React.createElement(SafeAreaProvider,
      { initialMetrics: { frame: { x: 0, y: 0, width: 412, height: 915 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } } },
      React.createElement(StoreProvider, null, React.createElement(Resultados, { t: T, ...props }))));
  });
  return { r, texto: () => junta(r.toJSON()) };
};
const botoes = (r) => r.root.findAll(n => typeof n.type === 'string' && n.props
  && n.props.accessibilityRole === 'button' && typeof n.props.accessibilityLabel === 'string');
const estiloDe = (no) => [].concat(no.props.style).filter(Boolean)
  .reduce((a, s) => ({ ...a, ...(typeof s === 'function' ? s({ pressed: false }) : s) }), {});

const CASA = indexar({
  tarefas: [{ id: 'lixo', title: 'Levar o lixo', who: 'Léo', recur: 'Todos os dias' },
    { id: 'mesa', title: 'Pôr a mesa', who: 'Mia', recur: 'Todos os dias', dueKey: 'd2026-09-13' }],
  eventos: [{ id: 'e1', title: 'Dentista da Mia', day: 'd2026-09-15', time: '16:30' }],
  artigos: [{ id: 'a1', label: 'Lixívia', section: 'Higiene e limpeza' }, { id: 'a2', label: 'Leite meio-gordo', section: 'Frescos' }],
  contas: [{ id: 'c1', nome: 'Renda', dia: 1, envelope: 'Casa & contas' }],
  metas: [{ id: 'm1', nome: 'Férias no Algarve' }],
  equipamentos: [{ id: 'q1', name: 'Frigorífico', brand: 'Bosch' }],
  contratos: [{ id: 'k1', nome: 'Seguro do carro', fornecedor: 'Fidelidade', renovaEm: '21/09/2026' }],
  consultas: [{ id: 'h1', member: 'Léo', specialty: 'Pediatria', doctor: 'Dr.ª Neves', day: 'd2026-08-04' }],
  documentos: [{ id: 'd1', member: 'Léo', title: 'Boletim de vacinas', kind: 'Exame' }],
  membros: [{ nome: 'Rita', kid: false }, { nome: 'Léo', kid: true }],
  areas: [{ area: 'Compras', o: 'A lista da casa.', faz: ['Fecha a ida em despesa'] }],
  novidades: [{ v: '1.12.1', d: '13/09/2026', k: 'novo', a: 'Início', t: 'A pesquisa da casa' }],
});

describe('⚠ 1. o módulo puro', () => {
  it('normaliza sem acentos nem maiúsculas', () => {
    expect(normalizar('  Léo · Frutas & Legumes ')).toBe('leo · frutas & legumes');
    expect(normalizar(null)).toBe('');
  });

  it('com menos de duas letras não procura; «começa por» vem antes de «contém»; as áreas seguem a ordem do rodapé', () => {
    expect(pesquisar(CASA, 'l').total).toBe(0);
    const r = pesquisar(CASA, 'li');
    // As Tarefas antes das Compras (a ordem do rodapé); «li» também aparece
    // em «Higiene e limpeza» e em «A lista da casa», por isso só se fixa a cabeça.
    expect(r.grupos.map(g => g.area).slice(0, 2)).toEqual(['Tarefas', 'Compras']);
    expect(r.grupos[1].itens.map(i => i.titulo)).toEqual(['Lixívia']);   // «Leite» não tem «li»
    const lei = pesquisar(CASA, 'le');
    // Na área das Compras «Leite» (começa por) antes de nada que só contenha.
    expect(lei.grupos.find(g => g.area === 'Compras').itens[0].titulo).toBe('Leite meio-gordo');
    // «Léo» encontra-se por «leo» — o acento não conta.
    expect(pesquisar(CASA, 'leo').grupos.map(g => g.area)).toEqual(['Tarefas', 'Saúde', 'Pessoas']);
    for (const g of r.grupos) expect(AREAS_DA_PESQUISA).toContain(g.area);
  });

  it('procura também no subtítulo e nas notas — mas o título ganha', () => {
    const r = pesquisar(CASA, 'neves');
    expect(r.total).toBe(1);
    expect(r.grupos[0].itens[0].titulo).toBe('Pediatria · Léo');
    const bosch = pesquisar(CASA, 'bosch');
    expect(bosch.grupos[0].area).toBe('Equipamentos');
  });

  it('sugere até três palavras que completam, sem repetir, as mais curtas primeiro', () => {
    expect(sugerir(CASA, 'li')).toEqual(['lixo', 'Lixívia']);
    expect(sugerir(CASA, 'l')).toEqual([]);
    expect(sugerir(CASA, 'lixo')).toEqual([]);   // já está inteira
    expect(sugerir(CASA, 'fr')).toEqual(['Frigorífico']);
  });

  it('marca a palavra no título ORIGINAL, com acentos e maiúsculas', () => {
    expect(realcar('Lixívia', 'lixi')).toEqual([{ texto: 'Lixí', marca: true }, { texto: 'via', marca: false }]);
    expect(realcar('Pôr a mesa', 'por')).toEqual([{ texto: 'Pôr', marca: true }, { texto: ' a mesa', marca: false }]);
    expect(realcar('Renda', 'zz')).toEqual([{ texto: 'Renda', marca: false }]);
  });

  it('cada item sabe para onde leva', () => {
    const porArea = Object.fromEntries(CASA.map(i => [i.titulo, i.destino]));
    expect(porArea['Levar o lixo']).toEqual({ tab: 'tarefas', id: 'lixo' });
    expect(porArea['Frigorífico']).toEqual({ vista: 'equip', id: 'q1' });
    expect(porArea['Seguro do carro']).toEqual({ vista: 'equip', id: 'contrato:k1' });
    expect(porArea['Pediatria · Léo']).toEqual({ vista: 'ficha', membro: 'Léo' });
    expect(porArea['Rita']).toEqual({ vista: 'ficha', membro: 'Rita' });
    expect(porArea['Léo']).toEqual({ tab: 'tarefas', membro: 'Léo' });
  });
});

describe('⚠ 2. o ecrã dos resultados', () => {
  it('sem termo mostra «Onde se Procura» — uma linha por área, que leva lá; com termo desenha os grupos com alvos de 44', () => {
    // Opção C de design/campo-de-pesquisa.dc.html (13/09/2026): em vez de um
    // cartão a repetir «Procurar na casa», as áreas em linhas tocáveis.
    const abertos = [];
    const { r: r0, texto } = montar({ termo: '', itens: CASA, onAbrir: (d) => abertos.push(d), onSugerir: () => {} });
    expect(texto()).toMatch(/Onde se Procura/);
    expect(texto()).toMatch(/Escreva pelo menos duas letras/);
    expect(texto()).not.toMatch(/Procurar na casa/);
    const linhas = botoes(r0).filter(b => /^Ir a /.test(b.props.accessibilityLabel));
    expect(linhas.map(b => b.props.accessibilityLabel)).toEqual(
      ['Tarefas', 'Agenda', 'Compras', 'Dinheiro', 'Equipamentos', 'Saúde', 'Pessoas', 'Documentação'].map(a => `Ir a ${a}`));
    for (const b of linhas) expect(estiloDe(b).minHeight).toBeGreaterThanOrEqual(44);
    TestRenderer.act(() => { (linhas[5].props.onPress || linhas[5].props.onClick)(); });
    expect(abertos).toEqual([{ vista: 'saude' }]);
    // A criança só vê as áreas dela.
    const { r: rk, texto: tk } = montar({ termo: '', itens: CASA, onAbrir: () => {}, onSugerir: () => {}, areas: ['Tarefas', 'Compras', 'Pessoas'] });
    expect(botoes(rk).filter(b => /^Ir a /.test(b.props.accessibilityLabel)).length).toBe(3);
    expect(tk()).not.toMatch(/Dinheiro/);
    const { r, texto: tx } = montar({ termo: 'li', itens: CASA, onAbrir: () => {}, onSugerir: () => {} });
    expect(tx()).toMatch(/Tarefas/);
    expect(tx()).toMatch(/Compras/);
    const alvos = botoes(r);
    expect(alvos.map(b => b.props.accessibilityLabel)).toEqual(expect.arrayContaining(['Procurar lixo', 'Abrir Levar o lixo — Tarefas', 'Abrir Lixívia — Compras']));
    for (const b of alvos) expect(estiloDe(b).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('tocar num resultado devolve o destino; tocar numa sugestão devolve a palavra', () => {
    const abertos = [], sugeridos = [];
    const { r } = montar({ termo: 'li', itens: CASA, onAbrir: (d) => abertos.push(d), onSugerir: (p) => sugeridos.push(p) });
    const toca = (b) => TestRenderer.act(() => { (b.props.onPress || b.props.onClick)(); });
    const abrir = botoes(r).find(b => b.props.accessibilityLabel === 'Abrir Lixívia — Compras');
    toca(abrir);
    expect(abertos).toEqual([{ tab: 'compras', id: 'a1' }]);
    const sug = botoes(r).find(b => b.props.accessibilityLabel === 'Procurar Lixívia');
    toca(sug);
    expect(sugeridos).toEqual(['Lixívia']);
  });

  it('sem resultados, diz-o com o termo', () => {
    const { texto } = montar({ termo: 'zzzz', itens: CASA, onAbrir: () => {}, onSugerir: () => {} });
    expect(texto()).toMatch(/Nada encontrado para «zzzz»/);
  });
});

describe('⚠ 3. a lupa no cabeçalho — adultos e criança', () => {
  it('o App tem a lupa no Início, o campo no cabeçalho, e um separador fecha a pesquisa', () => {
    const app = semComentarios(ler('App.jsx'));
    expect(app).toMatch(/label="Procurar na casa"/);
    expect(app).toMatch(/accessibilityLabel="Procurar na casa"/);
    expect(app).toMatch(/label="Fechar a pesquisa"/);
    expect(app).toMatch(/<Resultados t=\{t\} termo=\{pesquisa\} itens=\{indice\}/);
    expect(app).toMatch(/setPesquisa\(null\); fecharVistas\(\); setTab\(x\.key\)/);
    // O índice filtra os eventos pela regra da loja, não à mão.
    expect(app).toMatch(/allEvents\(\)\.filter\(e => podeVerEvento\(e, user, MEMBERS\)\)/);
  });

  // 13/09/2026, no Chrome do Windows: o campo saía com um anel LARANJA — o
  // foco do navegador, na cor do acento do sistema. A app desenha o seu
  // (opção C): sem caixa, linha de 2 px por baixo, a 60 % e a 100 % com o
  // foco; e o `outlineStyle: 'none'` tira o do navegador. Nos dois cabeçalhos.
  it('⚠ o campo é a app que o desenha: sem anel do navegador, uma linha por baixo que acende com o foco', () => {
    for (const f of ['App.jsx', 'src/KidApp.jsx']) {
      const txt = semComentarios(ler(f));
      const i = txt.indexOf('accessibilityLabel="Procurar na casa" returnKeyType');
      const campo = txt.slice(txt.lastIndexOf('<View', i), txt.indexOf('/>', i));
      expect(campo).toMatch(/outlineStyle: 'none'/);
      expect(campo).toMatch(/borderBottomWidth: 2/);
      expect(campo).toMatch(/borderBottomColor: pesquisaFocada \? '#FFFFFF' : 'rgba\(255,255,255,0\.6\)'/);
      expect(campo).toMatch(/onFocus=\{\(\) => setPesquisaFocada\(true\)\} onBlur=\{\(\) => setPesquisaFocada\(false\)\}/);
      expect(campo).not.toMatch(/backgroundColor: 'rgba\(255,255,255,0\.16\)'/);
    }
  });

  it('⚠ a criança tem a mesma lupa, e o índice dela não leva dinheiro da casa', () => {
    const kid = semComentarios(ler('src/KidApp.jsx'));
    expect(kid).toMatch(/accessibilityLabel="Procurar na casa"/);
    expect(kid).toMatch(/<Resultados t=\{t\} termo=\{pesquisa\} itens=\{indice\}/);
    const i = kid.indexOf('const indice = pesquisa === null ? [] : indexar({');
    const bloco = kid.slice(i, kid.indexOf('});', i));
    expect(bloco).not.toMatch(/contas:|metas:|equipamentos:|contratos:|consultas:|documentos:|areas:|novidades:/);
    expect(bloco).toMatch(/tarefas: tasks\.filter\(x => x\.who === kid\)/);
    expect(bloco).toMatch(/!== 'adultos'/);
  });
});
