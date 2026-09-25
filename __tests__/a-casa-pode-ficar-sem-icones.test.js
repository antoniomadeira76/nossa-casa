/**
 * Uma casa pode ficar SEM ícones nos corredores.
 * ============================================================================
 *
 * 25/09/2026: «deve haver uma opção slider a dizer sem ícones». É o irmão do
 * `ementa_desligada` — uma funcionalidade inteira que se desliga — e segue-lhe
 * as três decisões, porque as três já foram pagas uma vez:
 *
 *   1. O dado está PELA NEGATIVA (`icones_desligados`). Um `bool` acrescentado
 *      a uma coleção COM LINHAS nasce a `false` em todas: um `icones_ligados`
 *      apagava os ícones a quem já os tinha escolhido, no instante em que o
 *      campo chegasse ao servidor e sem ninguém ter mexido em nada. Foi o que
 *      aconteceu à ementa. Quem LÊ pergunta pela positiva (`iconesNosCorredores`).
 *   2. É uma regra da CASA e não deste telefone. Os ícones são uma decisão de
 *      quem administra — cada um único, escolhido à mão —, e uma casa onde um
 *      adulto os vê e o outro não tinha duas leituras do mesmo corredor.
 *   3. Desligar NÃO APAGA NADA. As escolhas ficam no `iconesDeSeccao` e no
 *      `seccoes.icone`, e voltar a ligar traz cada corredor com o seu.
 *
 * ── ⚠ E o guarda do fim é genérico, de propósito ─────────────────────────────
 *
 * Desligado, o `iconeDaSeccao` devolve `null` — e um nome que o `Icon.jsx` não
 * conhece devolve um SVG VAZIO DO TAMANHO PEDIDO, sem erro nenhum. É um buraco
 * que passa em todas as outras provas. Já aconteceu com o `storefront` na
 * Gestão, e o `null` deste interruptor é a segunda vez que a mesma classe de
 * defeito bate à porta — por isso a última prova deixa de falar deste ecrã e
 * passa a ENUMERAR: monta os ecrãs que desenham corredores, nos dois estados
 * do interruptor, e chumba QUALQUER ícone que venha vazio, seja de quem for.
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

const { StoreProvider, useStore, DEMO, BLANK } = require('../src/store');
const { buildTheme } = require('../src/theme');
const Icon = require('../src/Icon').default;
const Compras = require('../src/screens/Compras').default;
const ComoFazemosCompras = require('../src/screens/ComoFazemosCompras').default;

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

const comMargens = (filho) => React.createElement(SafeAreaProvider,
  { initialMetrics: { frame: { x: 0, y: 0, width: 402, height: 874 },
                      insets: { top: 47, left: 0, right: 0, bottom: 34 } } }, filho);
const junta = (n) => {
  if (n === null || n === undefined || n === false) return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(junta).join(' ');
  return junta(n.children || (n.props && n.props.children) || null);
};

const T = buildTheme(1, false);

const montar = (Ecra, props, patch) => {
  let r = null, api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    r = TestRenderer.create(comMargens(React.createElement(StoreProvider, null,
      React.createElement(React.Fragment, null,
        React.createElement(Sonda),
        React.createElement(Ecra, props)))));
  });
  if (patch) TestRenderer.act(() => { api.set(patch); });
  return {
    r,
    loja: () => api,
    texto: () => junta(r.toJSON()),
    icones: () => r.root.findAllByType(Icon).map(n => n.props.name),
    mexer: (f) => { TestRenderer.act(() => { f(api); }); },
    // ⚠ `onPress || onClick`: o hospedeiro que o `Pressable` desenha não leva
    // um `onPress` — leva o que a plataforma usa. Exigir `onPress` dava «sem
    // alvo» num botão que existe e funciona.
    tocar: (label) => {
      const alvo = r.root.findAll(n => typeof n.type === 'string' && n.props
        && n.props.accessibilityLabel === label).pop();
      if (!alvo) throw new Error(`Sem alvo «${label}»`);
      const premir = alvo.props.onPress || alvo.props.onClick;
      if (!premir) throw new Error(`O alvo «${label}» não faz nada`);
      TestRenderer.act(() => { premir(); });
    },
    alvo: (label) => r.root.findAll(n => typeof n.type === 'string' && n.props
      && n.props.accessibilityLabel === label).pop(),
  };
};

const gestao = (patch) => montar(ComoFazemosCompras,
  { t: T, user: 'Rita', onClose: () => {} }, patch);
const compras = (patch) => montar(Compras,
  { t: T, user: 'Rita', onModoCompras: () => {}, onIda: () => {} }, patch);

describe('⚠ o campo é uma regra da casa, e está PELA NEGATIVA', () => {
  it('nasce nos DOIS sítios do servidor', () => {
    // O `criar-colecoes.mjs` é a verdade de como a base se constrói do zero; o
    // `acrescentar-campos.mjs` é o que a acrescenta a uma casa com dados. Já
    // falharam sete campos por faltar um dos dois.
    expect(ler('db/pocketbase/criar-colecoes.mjs')).toMatch(/bool\('icones_desligados'\)/);
    expect(ler('db/pocketbase/acrescentar-campos.mjs'))
      .toContain("['casas', 'icones_desligados', { type: 'bool' }]");
  });

  it('⚠ e NUNCA pela positiva — era o que apagava os ícones de quem já os tinha', () => {
    // ⚠ O CAMPO, e não a palavra: o comentário que explica porque é que o
    // inverso não serve escreve `icones_ligados` de propósito, e uma prova que
    // proibisse a palavra proibia a explicação.
    expect(ler('db/pocketbase/criar-colecoes.mjs')).not.toMatch(/bool\('icones_ligados'\)/);
    expect(ler('db/pocketbase/acrescentar-campos.mjs')).not.toContain("'icones_ligados'");
  });

  it('a tradução conhece-o nos dois sentidos', () => {
    // O PocketBase aceita um `update` e IGNORA EM SILÊNCIO o campo que não
    // conhece: um nome errado aqui é uma regra que a casa julga ter mudado e
    // não mudou.
    const sync = ler('src/sync.js');
    expect(sync).toContain('iconesDesligados: aCasa.icones_desligados === true');
    expect(sync).toContain("iconesDesligados: 'icones_desligados'");
  });

  it('e declara-se no `o-que-sobe`, como tudo o que sobe', () => {
    expect(ler('src/o-que-sobe.js')).toContain('iconesDesligados:');
  });
});

describe('⚠ com ícones por omissão, e ausente lê-se COM ícones', () => {
  it('nos dois arranques', () => {
    expect(DEMO().iconesDesligados).toBe(false);
    expect(BLANK().iconesDesligados).toBe(false);
  });

  it('⚠ e uma casa anterior ao campo — a chave em falta — continua com eles', () => {
    const d = gestao({ iconesDesligados: undefined });
    expect(d.loja().iconesNosCorredores).toBe(true);
    d.mexer(a => a.set({ iconesDesligados: true }));
    expect(d.loja().iconesNosCorredores).toBe(false);
  });
});

describe('⚠ desligado, o ícone não CHEGA ao ecrã — e não se perde', () => {
  it('o `iconeDaSeccao` devolve nulo, e o corredor fica só com o nome', () => {
    const d = gestao();
    const sec = d.loja().seccoes[0];
    d.mexer(a => a.escolherIconeDaSeccao(sec, 'padaria'));
    expect(d.loja().iconeDaSeccao(sec)).toBe('padaria');
    expect(d.icones()).toContain('padaria');

    d.mexer(a => a.mudarRegraDaCasa({ iconesDesligados: true }));
    expect(d.loja().iconeDaSeccao(sec)).toBe(null);
    expect(d.icones()).not.toContain('padaria');
    // O nome do corredor continua lá — o que sai é o desenho, não a lista.
    expect(d.texto()).toContain(sec);
  });

  it('⚠ e a ESCOLHA fica guardada: voltar a ligar traz tudo de volta', () => {
    const d = gestao();
    const sec = d.loja().seccoes[0];
    d.mexer(a => a.escolherIconeDaSeccao(sec, 'talho'));
    d.mexer(a => a.mudarRegraDaCasa({ iconesDesligados: true }));
    // A prova do meio é esta: o mapa NÃO se limpou.
    expect(d.loja().s.iconesDeSeccao[sec]).toBe('talho');
    d.mexer(a => a.mudarRegraDaCasa({ iconesDesligados: false }));
    expect(d.loja().iconeDaSeccao(sec)).toBe('talho');
    expect(d.icones()).toContain('talho');
  });

  it('⚠ e os títulos da lista de compras perdem-no também', () => {
    // O `SectionTitle` trata do `icone` ausente — mas só porque foi escrito
    // assim. Se um dia deixar de tratar, é aqui que se sabe.
    const d = compras();
    const sec = d.loja().seccoes[0];
    d.mexer(a => a.escolherIconeDaSeccao(sec, 'peixaria'));
    expect(d.icones()).toContain('peixaria');
    d.mexer(a => a.mudarRegraDaCasa({ iconesDesligados: true }));
    expect(d.icones()).not.toContain('peixaria');
  });
});

describe('o interruptor está no ecrã dos corredores, e diz o que faz', () => {
  it('⚠ chama-se «Sem ícones» — as palavras que ele pediu', () => {
    const d = gestao();
    expect(d.alvo('Sem ícones')).toBeTruthy();
    expect(d.texto()).toContain('Sem ícones');
  });

  it('e liga e desliga a casa inteira, pela porta que sobe ao servidor', () => {
    const d = gestao();
    expect(d.loja().iconesNosCorredores).toBe(true);
    d.tocar('Sem ícones');
    expect(d.loja().s.iconesDesligados).toBe(true);
    d.tocar('Sem ícones');
    expect(d.loja().s.iconesDesligados).toBe(false);
  });

  it('⚠ e sobe pelo `mudarRegraDaCasa` — não por um `set` solto', () => {
    // Um `set` direto é uma regra que fica num telefone só, e esta é da casa.
    expect(ler('src/screens/ComoFazemosCompras.jsx'))
      .toMatch(/mudarRegraDaCasa\(\{ iconesDesligados/);
  });

  it('⚠ o alvo do interruptor não desce abaixo de 44 (INVARIANTE #5)', () => {
    const alvo = gestao().alvo('Sem ícones');
    const estilo = [].concat(alvo.props.style || []).filter(Boolean)
      .reduce((a, x) => ({ ...a, ...x }), {});
    expect(estilo.minHeight).toBeGreaterThanOrEqual(44);
  });

  it('⚠ desligado, a grelha de escolher SAI da folha do corredor', () => {
    // Uma grelha que continuasse aqui oferecia uma escolha que não se vê em
    // lado nenhum — e guardava-a em silêncio: escolhia-se o pão, guardava-se, e
    // o corredor continuava sem nada.
    const d = gestao({ iconesDesligados: true });
    d.tocar(`Corredor ${d.loja().seccoes[0]}`);
    expect(d.texto()).toContain('Editar Corredor');
    expect(d.texto()).not.toContain('Cada corredor tem um ícone diferente');
    expect(d.texto()).toContain('está sem ícones');
  });

  it('e ligado, a grelha está lá com os rótulos', () => {
    const d = gestao();
    d.tocar(`Corredor ${d.loja().seccoes[0]}`);
    const txt = d.texto();
    expect(txt).toContain('Cada corredor tem um ícone diferente');
    expect(txt).toContain('Enchidos');
  });
});

describe('⚠ NENHUM ícone desenhado vem vazio — em ecrã nenhum, em estado nenhum', () => {
  // ── Porque é que esta prova não fala do interruptor ─────────────────────────
  //
  // `<Icon name={x}>` com um `x` que o `Icon.jsx` não conhece — nulo, mal
  // escrito, vindo de um servidor mais novo — devolve um `<Svg>` do tamanho
  // pedido SEM UM ÚNICO TRAÇO LÁ DENTRO. Não atira, não avisa, não aparece no
  // texto do ecrã: fica um buraco do tamanho de um ícone, e o que está ao lado
  // dele desalinha-se do resto da app.
  //
  // Aconteceu com o `storefront` na Gestão. O `null` do «sem ícones» é a
  // segunda vez, e à segunda escreve-se um guarda que ENUMERA.
  //
  // ⚠ E a forma do vazio não está escrita aqui: mede-se. Pedir um nome que de
  // certeza não existe dá a forma que um buraco tem, e qualquer ícone igual a
  // essa forma é um buraco — sem esta prova ter de saber como o `Icon.jsx`
  // desenha, nem quantos ícones existem.
  const desenho = (nome) => {
    let r = null;
    TestRenderer.act(() => { r = TestRenderer.create(React.createElement(Icon, { name: nome, size: 20 })); });
    return JSON.stringify(r.toJSON());
  };
  const BURACO = desenho('«este-nome-nao-existe-em-lado-nenhum»');

  it('a própria medida do buraco está certa', () => {
    // Se um dia o `Icon.jsx` passar a desenhar alguma coisa para um nome
    // desconhecido, é esta linha que cai — e não as de baixo, em silêncio.
    expect(desenho(null)).toBe(BURACO);
    expect(desenho('padaria')).not.toBe(BURACO);
    expect(desenho('houseGear')).not.toBe(BURACO);
  });

  const ECRAS = [
    ['Compras', compras],
    ['Como fazemos compras', gestao],
  ];
  for (const [nome, montarEcra] of ECRAS) {
    for (const desligados of [false, true]) {
      it(`${nome}, ${desligados ? 'sem' : 'com'} ícones`, () => {
        const d = montarEcra({ iconesDesligados: desligados });
        const vazios = d.icones().filter(n => desenho(n) === BURACO);
        expect(vazios).toEqual([]);
      });
    }
  }
});
