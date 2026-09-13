/**
 * O filtro por membro das Tarefas é «Todos» e um AVATAR por pessoa.
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 12/09/2026 — o dono da casa mostrou a fila de seis pastilhas com o nome a
 * embrulhar em duas linhas e pediu cinco alternativas
 * (`design/filtro-de-membros.dc.html`). Ficou a A: cada membro é a sua bola,
 * a mesma que cada linha de tarefa já mostra, num alvo de 44; o escolhido ganha
 * um anel do acento e o NOME passa para o título da secção.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. Há um alvo por membro da casa, com um rótulo em voz que diz o que faz, e
 *      nenhum deles escreve o nome na fila — o nome só aparece no título.
 *   2. Tocar num filtra e muda o título; tocar outra vez volta a «Todos».
 *   3. O filtro continua a mostrar só as tarefas dessa pessoa.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');

jest.mock('../src/pocketbase', () => ({
  estaLigado: () => false,
  auth: { valida: () => false, membro: () => null },
  ler: {},
  google: { disponivel: () => false, porLigar: () => false, verificar: async () => false },
}));

const { StoreProvider, useStore } = require('../src/store');
const { buildTheme } = require('../src/theme');
const Tarefas = require('../src/screens/Tarefas').default;

const junta = (n) => {
  if (n === null || n === undefined || n === false) return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(junta).join(' ');
  return junta(n.children || (n.props && n.props.children) || null);
};
const montar = () => {
  let r = null, api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    r = TestRenderer.create(React.createElement(SafeAreaProvider,
      { initialMetrics: { frame: { x: 0, y: 0, width: 412, height: 915 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } } },
      React.createElement(StoreProvider, null,
        React.createElement(React.Fragment, null,
          React.createElement(Sonda),
          React.createElement(Tarefas, { t: buildTheme(1, false), user: 'Rita' })))));
  });
  return { r, loja: () => api, texto: () => junta(r.toJSON()) };
};
const botoes = (r) => r.root.findAll(n => typeof n.type === 'string' && n.props
  && n.props.accessibilityRole === 'button' && typeof n.props.accessibilityLabel === 'string');
const tocar = (r, label) => {
  const alvo = botoes(r).filter(n => n.props.accessibilityLabel === label).pop();
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  TestRenderer.act(() => { (alvo.props.onPress || alvo.props.onClick)(); });
};

describe('⚠ o filtro por membro é de avatares', () => {
  it('há «Todos» e um alvo de 52 × 44 por membro, com o que faz dito em voz — e o nome numa linha por baixo da bola', () => {
    // 13/09/2026: ele perguntou «há alguma hipótese de saber o nome da pessoa?»
    // e escolheu a B de design/nome-no-filtro.dc.html — o nome a 10 px por
    // baixo, uma linha, cortado num nome composto. O alvo cresceu para 52 de
    // largo; os 44 de altura ficam.
    const { r, loja, texto } = montar();
    const membros = loja().membrosDaCasa;
    expect(membros.length).toBeGreaterThanOrEqual(4);
    const filtros = botoes(r).filter(n => /^Mostrar só as tarefas d[oa] /.test(n.props.accessibilityLabel));
    expect(filtros.map(n => n.props.accessibilityLabel.replace(/^Mostrar só as tarefas d[oa] /, '')).sort())
      .toEqual([...membros].sort());
    for (const f of filtros) {
      const st = Array.isArray(f.props.style) ? Object.assign({}, ...f.props.style) : f.props.style;
      expect(st.width).toBe(52);
      expect(st.minHeight).toBe(44);
      // Cada alvo tem uma bola lá dentro — o `Avatar` — e o nome numa linha só.
      const textos = f.findAll(n => typeof n.type === 'string' && /Text/.test(n.type));
      expect(textos.length).toBeLessThanOrEqual(2);   // a inicial da bola e o nome
      const nome = textos.find(n => n.props.numberOfLines === 1);
      expect(nome).toBeTruthy();
      expect(membros).toContain(junta(nome.props.children));
    }
    expect(botoes(r).some(n => n.props.accessibilityLabel === 'Todos')).toBe(true);
    // O título diz «Rotinas e Tarefas» e mais nada enquanto é «Todos».
    expect(texto()).toContain('Rotinas e Tarefas');
    expect(texto()).not.toContain('Rotinas e Tarefas ·');
  });

  it('tocar num membro filtra e leva o nome ao título; tocar outra vez volta a «Todos»', () => {
    const { r, loja, texto } = montar();
    const crianca = loja().criancas[0];
    tocar(r, `Mostrar só as tarefas ${loja().deNome(crianca)} ${crianca}`);
    expect(texto()).toContain(`Rotinas e Tarefas · ${crianca}`);
    // Só as tarefas dessa pessoa: cada linha «Marcar …» é dela.
    const linhas = botoes(r).filter(n => /^(Marcar|Confirmar) /.test(n.props.accessibilityLabel));
    expect(linhas.length).toBeGreaterThan(0);
    const dela = loja().allTasks().filter(t => t.who === crianca).map(t => t.title);
    for (const l of linhas) {
      expect(dela.some(tit => l.props.accessibilityLabel.includes(tit))).toBe(true);
    }
    tocar(r, `Mostrar só as tarefas ${loja().deNome(crianca)} ${crianca}`);
    expect(texto()).not.toContain('Rotinas e Tarefas ·');
    tocar(r, `Mostrar só as tarefas ${loja().deNome(crianca)} ${crianca}`);
    tocar(r, 'Todos');
    expect(texto()).not.toContain('Rotinas e Tarefas ·');
  });
});
