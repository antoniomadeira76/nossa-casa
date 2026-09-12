/**
 * Nenhum texto fica solto dentro de um `View`.
 *
 * ── O que se via ─────────────────────────────────────────────────────────────
 *
 * Ao abrir o Início como adulto, com o servidor ligado, a consola do
 * navegador escrevia umas vinte e cinco vezes:
 *
 *     Unexpected text node: . A text node cannot be a child of a <View>.
 *
 * Lia-se como um ponto final sozinho — e passou-se uma tarde à procura de um
 * `.` que não existia. A mensagem do react-native-web é
 *
 *     "Unexpected text node: " + item + ". A text node cannot be…"
 *
 * e o ponto é o DA FRASE. O nó era a string VAZIA: `''`. É por isso que um
 * `createTreeWalker` no DOM não o encontrava (o React não cria nó nenhum para
 * `''`), e que um grep por `>\.\s*$` não apanhava nada. A forma escrita que o
 * produz é `{campo && <Elemento/>}` com o campo a vir `''` do servidor — ver a
 * secção da Saúde, mais abaixo, que é onde se encontrou.
 *
 * No telemóvel o React Native REBENTA com «Text strings must be rendered
 * within a <Text> component» — a web avisa, o nativo cai.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * Renderizam-se os ecrãs com o `react-test-renderer` e percorre-se a árvore de
 * elementos anfitriões: um `View` não pode ter um filho que seja uma string ou
 * um número. Só um `Text` os aceita. Quando um aparece, o guarda diz o CAMINHO
 * — a cadeia de componentes até ao `View` — e o texto que lá estava, porque a
 * mensagem do navegador não dizia nem uma coisa nem outra.
 *
 * ⚠ A varredura é do que sai desenhado, não do que está escrito: `{cond && '.'}`,
 * `{x}.` fora de um `Text`, uma frase partida em dois nós — nada disto se
 * encontra a ler o ficheiro, e tudo se encontra a desenhá-lo.
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

// Uma casa a sério, para os ecrãs terem o que desenhar em vez de caírem
// sempre no aviso de vazio — o ponto solto vinha das LINHAS, não do vazio.
const CASA = {
  membros: {
    'Rita': { initial: 'R', email: 'rita@exemplo.pt', fem: true },
    'Tomás': { initial: 'T', email: 'tomas@exemplo.pt' },
    'Léo': { initial: 'L', kid: true },
    'Mia': { initial: 'M', kid: true, fem: true },
  },
  roles: { 'Rita': 'admin', 'Tomás': 'adulto', 'Léo': 'crianca', 'Mia': 'crianca' },
};

// Os nomes dos componentes anfitriões que aceitam texto. Tudo o resto que
// receba uma string como filho está errado.
const ACEITA_TEXTO = new Set(['Text', 'TextInput', 'RCTText', 'RCTVirtualText']);

const nomeDe = (inst) => {
  const t = inst.type;
  if (typeof t === 'string') return t;
  return (t && (t.displayName || t.name)) || '?';
};

// Percorre a árvore de instâncias e devolve, para cada texto solto, o caminho
// de componentes até ele.
//
// ⚠ Lê-se `props.children`, e NÃO `inst.children`.
//
// O React não cria nó nenhum para a string vazia: `{cond ? x : ''}` desaparece
// na reconciliação e os filhos renderizados ficam limpos. Mas o react-native-web
// verifica os filhos ANTES disso, no `props.children` do `View`, e é aí que a
// vazia aparece — a mensagem dele é `Unexpected text node: ${item}. A text
// node…`, e com `item === ''` lê-se «text node: . A text node», que parece um
// ponto final solto e não é. A primeira versão deste guarda olhava para os
// filhos renderizados, passava em todos os ecrãs, e o navegador continuava a
// avisar vinte e cinco vezes.
const textosSoltos = (raiz) => {
  const achados = [];
  const visita = (inst, caminho) => {
    const nome = nomeDe(inst);
    const cadeia = caminho.concat(nome);
    if (typeof inst.type === 'string' && !ACEITA_TEXTO.has(inst.type)) {
      for (const filho of React.Children.toArray(inst.props.children)) {
        if (typeof filho === 'string' || typeof filho === 'number') {
          achados.push(`«${String(filho)}» dentro de <${inst.type}> — ${cadeia.join(' › ')}`);
        }
      }
    }
    for (const filho of inst.children) {
      if (typeof filho !== 'string' && typeof filho !== 'number') visita(filho, cadeia);
    }
  };
  visita(raiz, []);
  return achados;
};

const montar = (Ecra, props = {}, casa = CASA) => {
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
  const achados = textosSoltos(arvore.root);
  TestRenderer.act(() => arvore.unmount());
  return achados;
};

// [nome, módulo, propriedades próprias]
const ECRAS = [
  ['Início',             '../src/screens/Inicio', {}],
  ['Agenda',             '../src/screens/Agenda', {}],
  ['Tarefas',            '../src/screens/Tarefas', {}],
  ['Compras',            '../src/screens/Compras', {}],
  ['Dinheiro',           '../src/screens/Dinheiro', {}],
  ['Perfil',             '../src/screens/Perfil', {}],
  ['Gestão',             '../src/screens/Gestao', {}],
  ['Saúde',              '../src/screens/Saude', {}],
  ['Equipamentos',       '../src/screens/Equipamentos', {}],
  ['Documentação',       '../src/screens/Documentacao', {}],
  ['Modo Compras',       '../src/screens/ModoCompras', {}],
  ['Como fazemos compras', '../src/screens/ComoFazemosCompras', {}],
  ['Ficha de Saúde',     '../src/screens/FichaSaude', { member: 'Léo' }],
  ['Cofre',              '../src/sheets/Cofre', { kid: 'Léo' }],
  ['Nova Tarefa',        '../src/sheets/NovaTarefa', {}],
  ['Novo Artigo',        '../src/sheets/NovoArtigo', {}],
  ['Novo Evento',        '../src/sheets/NovoEvento', {}],
  ['Nova Meta',          '../src/sheets/NovaMeta', {}],
  ['Jantar do Dia',      '../src/sheets/JantarDoDia', { dia: 'd2026-08-20', titulo: 'Prato', onNovoPrato: () => {}, onApagarPrato: () => {} }],
  ['Novo Prato',         '../src/sheets/NovoPrato', { onCriado: () => {} }],
  ['Importar da Google', '../src/sheets/ImportarGoogle', {}],
  ['Modo criança',       '../src/KidApp', { kid: 'Léo', kidTab: 'tarefas' }],
];

describe('⚠ nenhum View tem um filho que seja texto', () => {
  it('o detetor apanha um texto solto — senão o resto não prova nada', () => {
    const { View, Text } = require('react-native');
    const Partido = () => React.createElement(View, null,
      React.createElement(Text, null, 'A frase'), '.');
    const achados = montar(Partido);
    expect(achados.length).toBe(1);
    expect(achados[0]).toContain('«.»');
  });

  it('⚠ e apanha a string VAZIA, que o React não desenha e o navegador avisa', () => {
    // É a forma que o defeito tinha de facto: `{cond ? x : ''}` dentro de um
    // `View`. Nenhum nó chega à árvore, e o aviso sai na mesma.
    const { View, Text } = require('react-native');
    const Vazio = () => React.createElement(View, null,
      React.createElement(Text, null, 'A frase'), false ? 'x' : '');
    const achados = montar(Vazio);
    expect(achados.length).toBe(1);
    expect(achados[0]).toContain('«»');
  });

  it('e deixa passar o texto dentro de um Text', () => {
    const { View, Text } = require('react-native');
    const Certo = () => React.createElement(View, null,
      React.createElement(Text, null, 'A frase', '.'),
      React.createElement(Text, null, 12));
    expect(montar(Certo)).toEqual([]);
  });

  it.each(ECRAS)('%s', (nome, modulo, props) => {
    expect(montar(require(modulo).default, props)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ O caso que se ENCONTROU, e que a casa de demonstração nunca desenhava.
//
// O `puxarSaude` traduz a receita do servidor com `dosage: r.dose || ''` e
// `decision: r.decisao || ''` — uma receita sem dose ou por decidir chega ao
// ecrã com a string VAZIA nesses campos. E a Saúde escrevia:
//
//     {recipe.dosage && (<Text>Dose: …</Text>)}
//     {recipe.decision && (<Pill label={recipe.decision} />)}
//
// `'' && X` é `''`, e essa `''` fica como filho do `View` da receita. O React
// não a desenha, o react-native-web avisa — uma vez por receita, por campo, por
// render. Só se vê com a consulta EXPANDIDA e com uma receita a sério, que é o
// estado que nenhuma prova montava.
//
// A forma certa é `x ? <El/> : null`: um ternário nunca deixa o operando cair
// na árvore.
describe('⚠ a Saúde com uma receita sem dose nem decisão, expandida', () => {
  const Saude = require('../src/screens/Saude').default;

  it('não deixa a string vazia da receita dentro de um View', () => {
    let arvore = null, api = null;
    const Sonda = () => {
      api = useStore();
      return React.createElement(Saude, { t: buildTheme(0, false), user: 'Rita',
        onClose: () => {}, onFicha: () => {}, onAbrirFicha: () => {}, onMarcado: () => {} });
    };
    TestRenderer.act(() => {
      arvore = TestRenderer.create(
        React.createElement(SafeAreaProvider, { initialMetrics: MARGENS },
          React.createElement(StoreProvider, null, React.createElement(Sonda))));
    });
    // A consulta da demonstração que se vai expandir, com UMA receita na forma
    // exata em que o servidor a entrega: dose e decisão vazias.
    const alvo = api.allHealth()[0];
    expect(alvo).toBeTruthy();
    TestRenderer.act(() => {
      api.set({ healthRecipes: { [alvo.id]: [{ id: 'r1', name: 'Amoxicilina', dosage: '',
        quantity: '', unit: '', expiresAt: 'd2026-09-30', decision: '' }] } });
    });
    const cartao = arvore.root.findAll(x => x.props
      && typeof x.props.onPress === 'function'
      && String(x.props.accessibilityLabel || '').startsWith(alvo.specialty))[0];
    expect(cartao).toBeTruthy();
    TestRenderer.act(() => { cartao.props.onPress(); });

    // A receita está mesmo no ecrã — senão a prova passava sem lhe chegar.
    const texto = JSON.stringify(arvore.toJSON());
    expect(texto).toContain('Amoxicilina');
    expect(textosSoltos(arvore.root)).toEqual([]);
    TestRenderer.act(() => arvore.unmount());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E a forma ESCRITA que produz o defeito, varrida em todos os ecrãs.
//
// O guarda de cima só vê o que desenha, e desenha com a casa de demonstração:
// um campo que só vem vazio do servidor escapa-lhe até alguém montar esse
// estado à mão, como acima. Esta parte lê o código: um `&&` antes de um
// elemento JSX cujo último operando é um CAMPO (`recipe.dosage`, `task.dueKey`,
// `form.dueKey`) é a forma do defeito — um campo pode ser uma string, e uma
// string vazia é falsa e fica na árvore. Uma comparação (`=== 'x'`, `> 0`), uma
// negação (`!x`) ou uma chamada (`dueOf(t)`) não são strings; um identificador
// solto (`expanded`, `showArchive`) fica de fora porque é quase sempre um
// booleano de estado, e o guarda de cima apanha-o se não for.
//
// A correção é sempre a mesma: `campo ? (<El/>) : null`.
describe('⚠ nenhum ecrã escreve `{campo && <Elemento/>}`', () => {
  const fs = require('fs');
  const path = require('path');
  const RAIZ = path.join(__dirname, '..');
  const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const FICHEIROS = ['App.jsx']
    .concat(['src', 'src/screens', 'src/sheets', 'src/modals'].flatMap(d =>
      fs.readdirSync(path.join(RAIZ, d)).filter(f => f.endsWith('.jsx')).map(f => `${d}/${f}`)));

  // Um caminho de campo: `a.b`, `a?.b.c`. Sem `!`, sem comparação, sem `(`.
  const CAMPO = /^[\w$]+(\?\.|\.)[\w$]+((\?\.|\.)[\w$]+)*$/;

  const ocorrencias = () => {
    const achados = [];
    for (const f of FICHEIROS) {
      const linhas = semComentarios(fs.readFileSync(path.join(RAIZ, f), 'utf8')).split(/\r?\n/);
      linhas.forEach((linha, i) => {
        const m = linha.match(/\{([^{}]*?)&&\s*(<|\(\s*$)/);
        if (!m) return;
        const operandos = m[1].split('&&').map(s => s.trim()).filter(Boolean);
        const ultimo = operandos[operandos.length - 1] || '';
        if (CAMPO.test(ultimo) && !/\.length$/.test(ultimo)) achados.push(`${f}:${i + 1}  {${ultimo} && …}`);
      });
    }
    return achados;
  };

  it('a rede apanha a forma — senão o resto não prova nada', () => {
    expect(CAMPO.test('recipe.dosage')).toBe(true);
    expect(CAMPO.test('form.dueKey')).toBe(true);
    expect(CAMPO.test('!euNaCasa.kid')).toBe(false);
    expect(CAMPO.test('dueOf(task)')).toBe(false);
    expect(CAMPO.test("sheetOpen === 'membro'")).toBe(false);
  });

  it('e não há nenhuma', () => {
    expect(ocorrencias()).toEqual([]);
  });
});
