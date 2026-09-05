/**
 * O ecrã da Documentação monta, e cada aba mostra o que promete.
 *
 * ── Porque é que esta prova existe ───────────────────────────────────────────
 *
 * As outras provas deste ecrã olham para os DADOS: que toda a área tem
 * descrição escrita, que os nomes batem certo entre as duas listas. Nenhuma
 * dizia se o ecrã chega a desenhar.
 *
 * E há três abas com uma cadeia de ternários entre elas, mais um acordeão com
 * estado próprio. É pouco código e muita maneira de o partir — um `</View>` a
 * mais fecha a raiz cedo, e isso já aconteceu três vezes neste projeto.
 *
 * Monta o ecrã a sério, com a loja, e lê o texto que sai.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { StoreProvider, useStore } = require('../src/store');
const { AREAS, AMBITO } = require('../src/registo-app');
const Documentacao = require('../src/screens/Documentacao').default;
const { buildTheme } = require('../src/theme');

// O tema de um membro qualquer — o ecrã lê cores dele e mais nada.
const t = buildTheme(0, false);

// Monta o ecrã dentro da loja, e devolve o renderizador e a API da loja.
const montar = (estado) => {
  let api = null;
  let arvore = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    arvore = TestRenderer.create(React.createElement(StoreProvider, null,
      React.createElement(Sonda),
      React.createElement(Documentacao, { t })));
  });
  if (estado) TestRenderer.act(() => { api.set(() => ({ ...api.s, ...estado })); });
  return { arvore, loja: () => api };
};

// Todo o texto visível, numa string.
const texto = (arvore) => {
  const saida = [];
  const andar = (n) => {
    if (n === null || n === undefined) return;
    if (typeof n === 'string' || typeof n === 'number') { saida.push(String(n)); return; }
    if (Array.isArray(n)) { n.forEach(andar); return; }
    if (n.children) n.children.forEach(andar);
  };
  andar(arvore.toJSON());
  return saida.join(' ');
};

// Toca num botão pelo rótulo de acessibilidade.
const tocar = (arvore, rotulo) => {
  const alvo = arvore.root.findAll(
    n => n.props && n.props.accessibilityLabel === rotulo && n.props.onPress,
    { deep: true })[0];
  if (!alvo) throw new Error(`não há botão «${rotulo}»`);
  TestRenderer.act(() => { alvo.props.onPress(); });
};

describe('o ecrã da Documentação', () => {
  it('monta, e abre nas Novidades', () => {
    const { arvore } = montar();
    const v = texto(arvore);
    expect(v).toContain('Novidades');
    expect(v).toContain('Como funciona');
    expect(v).toContain('Nesta casa');
    // As Novidades são a aba de partida: versões e alterações.
    expect(v).toMatch(/alteraç(ão|ões)/);
  });

  it('⚠ o «Como funciona» diz o que a app É, e não só o que mudou', () => {
    // É a razão de ser desta reescrita: o ecrã descrevia doze áreas pelas suas
    // CORREÇÕES e nenhuma pelo que faz.
    const { arvore } = montar();
    tocar(arvore, 'Como funciona');
    const v = texto(arvore);

    // O âmbito, uma vez e no topo.
    expect(v).toContain(AMBITO.slice(0, 60));

    // E cada área com o seu nome e a sua descrição.
    for (const a of AREAS) {
      expect(v).toContain(a.area);
      expect(v).toContain(a.o);
      // A primeira linha do que ali se faz está à vista sem abrir nada.
      expect(v).toContain(a.faz[0]);
    }
  });

  it('⚠ e o que MUDOU numa área começa dobrado', () => {
    // Ao contrário, o ecrã voltava a ser um registo de alterações com a
    // descrição escondida lá dentro.
    const { arvore } = montar();
    tocar(arvore, 'Como funciona');
    const fechado = texto(arvore);

    tocar(arvore, 'O que mudou em Tarefas');
    const aberto = texto(arvore);

    expect(aberto.length).toBeGreaterThan(fechado.length);
    // Uma alteração concreta das Tarefas, que só aparece com a secção aberta.
    const marca = 'Dentro de cada grupo de urgência';
    expect(fechado).not.toContain(marca);
    expect(aberto).toContain(marca);
  });

  it('o «Nesta casa» mostra o registo, com quem e quando', () => {
    const { arvore, loja } = montar();
    TestRenderer.act(() => {
      loja().set(() => ({ registo: [
        { id: 'r1', t: 'A casa passou a chamar-se Bengui', at: Date.parse('2026-09-05T10:00:00'), quem: 'Rita' },
      ] }));
    });
    tocar(arvore, 'Nesta casa');
    const v = texto(arvore);
    expect(v).toContain('Histórico da Casa');
    expect(v).toContain('A casa passou a chamar-se Bengui');
    expect(v).toContain('Rita');
    expect(v).toContain('05/09');
  });

  it('⚠ e sem registo nenhum diz que ainda não há, em vez de nada', () => {
    const { arvore, loja } = montar();
    TestRenderer.act(() => { loja().set(() => ({ registo: [] })); });
    tocar(arvore, 'Nesta casa');
    expect(texto(arvore)).toContain('Ainda sem registos');
  });
});
