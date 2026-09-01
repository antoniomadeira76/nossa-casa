/**
 * Os doze ecrãs que nenhuma prova desenhava.
 *
 * Havia 24 ecrãs e folhas. Doze eram montados por alguma prova; os outros doze
 * só eram LIDOS como texto — provas que verificam que o código diz certas
 * coisas, e que passam com a árvore partida. Um `</View>` a mais, um `map`
 * sobre `undefined`, um ícone com nome errado: nada disso aparece a quem lê o
 * ficheiro, e aparece a quem o desenha.
 *
 * Isto não verifica o que eles dizem — as provas de conteúdo estão noutros
 * ficheiros. Verifica que EXISTEM a correr, com uma casa por estrear e com uma
 * casa cheia, que são os dois estados em que uma app familiar vive.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');

// A camada do servidor é substituída: o pacote `pocketbase` é ESM e o Jest não
// o parseia, portanto qualquer ecrã que o arraste nem chega a montar.
jest.mock('../src/pocketbase', () => ({
  estaLigado: () => false,
  ligado: false,
  auth: { valida: () => false, membro: () => null,
    provedores: async () => ({ alcancavel: false, semServidor: true, lista: [] }) },
  ler: {}, escrever: {},
  google: {
    disponivel: () => false, porLigar: () => false, verificar: async () => false,
    eventos: async () => [], criarEvento: async () => 'id', atualizarEvento: async () => {},
    apagarEvento: async () => {}, ligar: async () => false,
  },
  sessaoPronta: async () => false,
}));

const { StoreProvider, useStore } = require('../src/store');
const { buildTheme } = require('../src/theme');

const MARGENS = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const junta = (n) => {
  if (n === null || n === undefined || n === false) return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(junta).join(' ');
  return junta(n.children || (n.props && n.props.children) || null);
};

// Uma casa a sério, com gente, uma tarefa, um artigo e um equipamento — para
// os ecrãs terem o que desenhar em vez de caírem sempre no aviso de vazio.
const CASA = {
  membros: {
    'Rita': { initial: 'R', email: 'rita@exemplo.pt', fem: true },
    'Tomás': { initial: 'T', email: 'tomas@exemplo.pt' },
    'Léo': { initial: 'L', kid: true },
  },
  roles: { 'Rita': 'admin', 'Tomás': 'adulto', 'Léo': 'crianca' },
};

const montar = (Ecra, props = {}, casa = null) => {
  let arvore = null;
  const Envolve = () => {
    const st = useStore();
    React.useMemo(() => { if (casa) st.set(casa); }, []);
    return React.createElement(Ecra, {
      t: buildTheme(0, false), user: 'Rita',
      onClose: () => {}, onBack: () => {}, go: () => {},
      onSaude: () => {}, onEquip: () => {}, onFicha: () => {},
      onAbrirFicha: () => {}, onMarcar: () => {}, onMarcado: () => {},
      onConfirm: () => {}, onLogout: () => {}, setKidTab: () => {},
      ...props,
    });
  };
  TestRenderer.act(() => {
    arvore = TestRenderer.create(
      React.createElement(SafeAreaProvider, { initialMetrics: MARGENS },
        React.createElement(StoreProvider, null, React.createElement(Envolve))));
  });
  const t = junta(arvore.toJSON());
  TestRenderer.act(() => arvore.unmount());
  return t;
};

// [nome, módulo, propriedades próprias]
const ECRAS = [
  ['Saúde',              '../src/screens/Saude', {}],
  ['Equipamentos',       '../src/screens/Equipamentos', {}],
  ['Documentação',       '../src/screens/Documentacao', {}],
  ['Modo Compras',       '../src/screens/ModoCompras', {}],
  ['Ficha de Saúde',     '../src/screens/FichaSaude', { member: 'Léo' }],
  ['Cofre',              '../src/sheets/Cofre', { kid: 'Léo' }],
  ['Nova Tarefa',        '../src/sheets/NovaTarefa', {}],
  ['Novo Artigo',        '../src/sheets/NovoArtigo', {}],
  ['Importar da Google', '../src/sheets/ImportarGoogle', {}],
];

describe('montam com uma casa a sério', () => {
  it.each(ECRAS)('%s', (nome, modulo, props) => {
    const t = montar(require(modulo).default, props, CASA);
    expect(typeof t).toBe('string');
    expect(t.length).toBeGreaterThan(0);
  });
});

describe('e montam com a casa por estrear', () => {
  // ⚠ É o estado em que a app é vista pela primeira vez, e o menos testado:
  // listas vazias, sem membros além de quem entrou, sem histórico nenhum.
  const VAZIA = {
    membros: { 'Rita': { initial: 'R', fem: true } },
    roles: { 'Rita': 'admin' },
    clearedSeeds: true,
    newTasks: [], newItems: [], newEquip: [], health: [], shopHistory: [],
    done: {}, urg: {}, due: {}, status: {}, vaultMoves: [],
  };

  it.each(ECRAS)('%s', (nome, modulo, props) => {
    expect(() => montar(require(modulo).default, props, VAZIA)).not.toThrow();
  });
});

describe('nenhum deles escreve «undefined» ou «NaN» no ecrã', () => {
  // O sintoma clássico de um campo que não existe naquela casa. Não rebenta —
  // aparece, e fica lá. Foi assim que se descobriu o «António · undefined» das
  // tarefas, e por isso vale a pena perguntá-lo a todos.
  it.each(ECRAS)('%s', (nome, modulo, props) => {
    const t = montar(require(modulo).default, props, CASA);
    expect(t).not.toMatch(/\bundefined\b/);
    expect(t).not.toMatch(/\bNaN\b/);
    expect(t).not.toMatch(/\bInfinity\b/);
  });
});

// ── As folhas que precisam de dados de fora ─────────────────────────────────

describe('o Carrinho', () => {
  const Carrinho = require('../src/sheets/Carrinho').default;
  const ARTIGOS = [
    { id: 'a1', s: 0, label: 'Maçã · 1 kg', est: 3.4 },
    { id: 'a2', s: 1, label: 'Leite · 6 un.', est: 5.1 },
  ];

  it('monta com o carrinho cheio', () => {
    const t = montar(Carrinho, {
      doneItems: ARTIGOS, items: ARTIGOS, cart: 8.5, pago: (i) => i.est,
      store: 'Pingo Doce', who: 'Rita',
    }, CASA);
    expect(t.length).toBeGreaterThan(0);
    expect(t).not.toMatch(/\bundefined\b/);
    expect(t).not.toMatch(/\bNaN\b/);
  });

  it('⚠ e com o carrinho VAZIO — fechar a conta sem nada é um caminho real', () => {
    // Quem abre a loja e desiste passa por aqui.
    const t = montar(Carrinho, {
      doneItems: [], items: [], cart: 0, pago: (i) => i.est, store: null, who: 'Rita',
    }, CASA);
    expect(t).not.toMatch(/\bundefined\b/);
    expect(t).not.toMatch(/\bNaN\b/);
  });
});

describe('a Ficha de Equipamento', () => {
  const Ficha = require('../src/sheets/FichaEquipamento').default;
  const EQUIP = {
    id: 'e1', name: 'Máquina de lavar', cat: 'Eletrodomésticos',
    brand: 'Bosch', bought: '12/03/2024', warrantyYears: 2,
  };

  it('monta com um equipamento', () => {
    const t = montar(Ficha, { equip: EQUIP }, CASA);
    expect(t).toContain('Máquina de lavar');
    expect(t).not.toMatch(/\bundefined\b/);
  });

  it('⚠ e um equipamento sem garantia nem fatura não escreve «undefined»', () => {
    const t = montar(Ficha, { equip: { id: 'e2', name: 'Torradeira' } }, CASA);
    expect(t).toContain('Torradeira');
    expect(t).not.toMatch(/\bundefined\b/);
    expect(t).not.toMatch(/\bNaN\b/);
  });
});

describe('o modo criança', () => {
  const KidApp = require('../src/KidApp').default;

  it('monta para uma criança da casa', () => {
    const t = montar(KidApp, { kid: 'Léo', kidTab: 'tarefas' }, CASA);
    expect(t.length).toBeGreaterThan(0);
    expect(t).not.toMatch(/\bundefined\b/);
    expect(t).not.toMatch(/\bNaN\b/);
  });

  it('⚠ e não deixa escapar uma palavra de orçamento (INVARIANTE #3)', () => {
    // A prova de leitura garante que o ficheiro não IMPORTA os ecrãs de
    // dinheiro. Esta garante que o que sai desenhado também não os nomeia.
    const t = montar(KidApp, { kid: 'Léo', kidTab: 'tarefas' }, CASA);
    for (const palavra of ['Envelope', 'Orçamento', 'Rendimento', 'Semanada por pagar']) {
      expect(t).not.toContain(palavra);
    }
  });
});

describe('e nenhum ecrã volta a ficar sem ser desenhado', () => {
  // A lista de cima envelhece sozinha: um ecrã novo entra em `src/screens` e
  // ninguém se lembra de o acrescentar aqui. Esta prova conta-os.
  const fs = require('fs');
  const path = require('path');
  const raiz = path.join(__dirname, '..');

  it('todos os 24 são montados por alguma prova', () => {
    const ecras = [];
    for (const d of ['src/screens', 'src/sheets']) {
      for (const f of fs.readdirSync(path.join(raiz, d))) {
        if (f.endsWith('.jsx')) ecras.push(`${d}/${f}`);
      }
    }
    ecras.push('src/KidApp.jsx');

    const provas = fs.readdirSync(path.join(raiz, '__tests__'))
      .map(f => fs.readFileSync(path.join(raiz, '__tests__', f), 'utf8')).join('\n');

    const fora = ecras.filter(f => !provas.includes(`'../${f.replace(/\.jsx$/, '')}'`));
    expect(fora).toEqual([]);
  });
});
