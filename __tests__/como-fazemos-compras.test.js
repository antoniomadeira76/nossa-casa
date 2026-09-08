/**
 * «Como esta casa faz compras» — o plano, as lojas e os corredores num sítio só.
 *
 * ── O que este ecrã resolve ──────────────────────────────────────────────────
 *
 * Três coisas que respondem à MESMA pergunta estavam espalhadas por três
 * sítios, e uma delas não estava em sítio nenhum:
 *
 *   o plano       um cartão no Compras cujo «Alterar» só mudava QUEM vai — o
 *                 dia, a hora e a loja não se mudavam de lado nenhum
 *   as lojas      no fundo da Gestão
 *   os corredores em parte nenhuma: quatro nomes fixos no `data.js`
 *
 * É o desenho E de `design/ida-as-compras.dc.html`.
 *
 * ⚠ E a ordem dos corredores é o dado, não a apresentação: uma secção não é um
 * rótulo, é o lugar dela no percurso da loja, e é por essa ordem que o Modo
 * Compras leva a pessoa de corredor em corredor.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider, useStore } = require('../src/store');
const { buildTheme } = require('../src/theme');
const Ecra = require('../src/screens/ComoFazemosCompras').default;

const texto = (n) => {
  if (n === null || n === undefined || n === false) return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(texto).join(' ');
  return texto(n.children || (n.props && n.props.children) || null);
};

const abrir = (antes) => {
  let arvore = null;
  let api = null;
  const Sonda = () => {
    api = useStore();
    return React.createElement(Ecra, {
      t: buildTheme(0, false), user: 'Rita', onClose: () => {},
    });
  };
  TestRenderer.act(() => {
    arvore = TestRenderer.create(
      React.createElement(SafeAreaProvider, {
        initialMetrics: { frame: { x: 0, y: 0, width: 402, height: 874 },
                          insets: { top: 47, left: 0, right: 0, bottom: 34 } },
      }, React.createElement(StoreProvider, null, React.createElement(Sonda))));
  });
  if (antes) TestRenderer.act(() => { antes(api); });
  return {
    loja: () => api,
    ecra: () => texto(arvore.toJSON()),
    mexer: (f) => { TestRenderer.act(() => { f(api); }); },
    alvos: () => arvore.root.findAll(x => x.props
      && typeof x.props.onPress === 'function' && x.props.accessibilityLabel),
  };
};

describe('o ecrã monta e mostra as três coisas', () => {
  it('a ida marcada, as lojas e os corredores', () => {
    const t = abrir().ecra();
    expect(t).toContain('A próxima ida');
    expect(t).toContain('Lojas');
    expect(t).toContain('Corredores da loja');
  });

  it('e diz quem vai, quando e onde', () => {
    const d = abrir();
    const t = d.ecra();
    expect(t).toContain('quem vai às compras');
    expect(t).toContain('quando');
    expect(t).toContain('onde');
  });

  it('⚠ com a casa vazia não rebenta nem mostra «undefined»', () => {
    // Entre duas idas o `shopPlan` é NULO, e foi assim que o «iniciar compras
    // na loja» já deu ecrã branco uma vez.
    const d = abrir(a => a.set({ shopPlan: null, stores: [] }));
    const t = d.ecra();
    expect(t).not.toContain('undefined');
    expect(t).toContain('Por escolher');
    expect(t).toContain('Sem lojas');
  });

  it('⚠ e a linha do quando não deixa separador pendurado sem hora', () => {
    const d = abrir(a => a.set({ shopPlan: { ...a.s.shopPlan, time: null } }));
    const t = d.ecra();
    expect(t).not.toMatch(/·\s*·/);
    expect(t).not.toMatch(/·\s*$/m);
  });

  it('todos os alvos declaram para que servem', () => {
    for (const a of abrir().alvos()) {
      expect(String(a.props.accessibilityLabel).length).toBeGreaterThan(2);
    }
  });
});

describe('⚠ os corredores são a lista da CASA, e ordenam-se', () => {
  it('mostra os que a casa tem, e quantos artigos cada um leva', () => {
    const d = abrir();
    const t = d.ecra();
    for (const n of d.loja().seccoes) expect(t).toContain(n);
    // E o número de artigos, que é o que diz se apagar um custa alguma coisa.
    expect(t).toMatch(/\d+ artigos?/);
  });

  it('⚠ reordenar muda a ordem da lista, e é a ordem que o Modo Compras usa', () => {
    const d = abrir();
    const antes = [...d.loja().seccoes];
    const invertida = [...antes].reverse();
    d.mexer(a => a.reordenarSeccoes(invertida));
    expect(d.loja().seccoes).toEqual(invertida);
  });

  it('⚠ e recusa uma ordem que não seja a mesma gente', () => {
    // Uma ordem parcial apagava as que ficassem de fora.
    const d = abrir();
    const antes = [...d.loja().seccoes];
    let msg = null;
    d.mexer(a => { msg = a.reordenarSeccoes(antes.slice(0, 2)); });
    expect(msg).toBeTruthy();
    expect(d.loja().seccoes).toEqual(antes);
  });

  it('criar acrescenta ao fim', () => {
    const d = abrir();
    const antes = [...d.loja().seccoes];
    d.mexer(a => a.criarSeccao('Congelados'));
    expect(d.loja().seccoes).toEqual([...antes, 'Congelados']);
  });

  it('⚠ e recusa um nome repetido, com maiúsculas ou sem elas', () => {
    const d = abrir();
    let msg = null;
    d.mexer(a => { msg = a.criarSeccao(a.seccoes[0].toUpperCase()); });
    expect(msg).toBeTruthy();
  });

  it('⚠ renomear leva os ARTIGOS com ele — a chave é o nome', () => {
    const d = abrir();
    const alvo = d.loja().seccoes[0];
    d.mexer(a => a.set({ newItems: [{ id: 'x', s: alvo, label: 'Maçã' }] }));
    d.mexer(a => a.alterarSeccao(alvo, 'Hortofrutícolas'));
    expect(d.loja().seccoes).toContain('Hortofrutícolas');
    expect(d.loja().s.newItems[0].s).toBe('Hortofrutícolas');
  });

  it('⚠ apagar NÃO apaga os artigos: passam para o primeiro que sobra', () => {
    // Um artigo sem corredor desaparecia de todas as abas menos «Todos», e
    // ninguém saberia porquê.
    const d = abrir();
    const alvo = d.loja().seccoes[1];
    d.mexer(a => a.set({ newItems: [{ id: 'x', s: alvo, label: 'Leite' }] }));
    d.mexer(a => a.apagarSeccao(alvo));
    expect(d.loja().seccoes).not.toContain(alvo);
    const artigo = d.loja().s.newItems.find(i => i.id === 'x');
    expect(artigo.s).toBe(d.loja().seccoes[0]);
  });

  it('⚠ e a última secção não se apaga', () => {
    // ⚠ Um `apagarSeccao` por `act`, e não todos dentro do mesmo: a lista que
    // a loja devolve é a do desenho, e dentro de um `act` ela não se
    // actualiza — o segundo apagar via a lista de antes do primeiro.
    const d = abrir();
    while (d.loja().seccoes.length > 1) {
      const alvo = d.loja().seccoes[d.loja().seccoes.length - 1];
      d.mexer(a => a.apagarSeccao(alvo));
    }
    expect(d.loja().seccoes.length).toBe(1);

    let msg = null;
    const ultima = d.loja().seccoes[0];
    d.mexer(a => { msg = a.apagarSeccao(ultima); });
    expect(msg).toBeTruthy();
    expect(d.loja().seccoes).toEqual([ultima]);
  });
});

describe('⚠ o plano muda pelas três pontas, e não só por quem vai', () => {
  it('quem', () => {
    const d = abrir();
    const outro = d.loja().adultos.find(n => n !== d.loja().s.shopPlan.who);
    d.mexer(a => a.mudarPlanoDeCompras({ who: outro }));
    expect(d.loja().s.shopPlan.who).toBe(outro);
  });

  it('quando — o dia', () => {
    const d = abrir();
    d.mexer(a => a.mudarPlanoDeCompras({ day: 'd2026-12-24' }));
    expect(d.loja().s.shopPlan.day).toBe('d2026-12-24');
  });

  it('⚠ e a hora, que antes não existia no dado', () => {
    const d = abrir();
    d.mexer(a => a.mudarPlanoDeCompras({ time: '18:45' }));
    expect(d.loja().s.shopPlan.time).toBe('18:45');
    expect(d.ecra()).toContain('18:45');
  });

  it('onde', () => {
    const d = abrir();
    d.mexer(a => a.set({ stores: ['Continente', 'Pingo Doce'] }));
    d.mexer(a => a.mudarPlanoDeCompras({ store: 1 }));
    expect(d.loja().lojaDoPlano()).toBe('Pingo Doce');
  });
});
