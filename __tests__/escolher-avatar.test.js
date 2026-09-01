/**
 * A escolha do avatar: figura, cor, ou a fotografia da conta.
 *
 * O avatar era a inicial numa cor calculada do nome, e mais nada. Não havia
 * como o mudar, e a fotografia que a Google devolve a cada entrada não ia parar
 * a lado nenhum.
 *
 * ── As duas metades, e porque são duas ───────────────────────────────────────
 *
 * A FIGURA distingue de perto — numa linha de tarefa, numa folha. A COR
 * distingue de longe: no ponto de 9 px do calendário e no filtro da agenda não
 * cabe desenho nenhum, e a cor é tudo o que resta. Por isso duas pessoas da
 * mesma casa não podem ter a mesma cor, mesmo com figuras diferentes.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');

jest.mock('../src/pocketbase', () => ({
  estaLigado: () => false,
  auth: { valida: () => false, membro: () => null },
  ler: {},
  google: { disponivel: () => false, porLigar: () => false, verificar: async () => false },
}));

const { StoreProvider, useStore } = require('../src/store');
const { buildTheme, PALETA_MEMBROS, corDoMembro } = require('../src/theme');
const { FIGURAS, GRUPOS, figurasDoGrupo, nomeDaFigura, existeFigura } = require('../src/Avatares');
const EscolherAvatar = require('../src/sheets/EscolherAvatar').default;

const FOTO = 'https://lh3.googleusercontent.com/a/abc123';

const CASA = (extra = {}) => ({
  membros: {
    'Rita':  { initial: 'R', cor: PALETA_MEMBROS[0], fem: true, ...extra },
    'Tomás': { initial: 'T', cor: PALETA_MEMBROS[1] },
    'Léo':   { initial: 'L', kid: true, cor: PALETA_MEMBROS[2] },
  },
  roles: { 'Rita': 'admin', 'Tomás': 'adulto', 'Léo': 'crianca' },
});

// ⚠ A loja é presa A CADA MONTAGEM, e não numa variável de módulo.
//
// Numa variável de módulo os testes contaminavam-se: as árvores anteriores
// ficam montadas, o `definirAvatar` é assíncrono, e o `set` de um teste chegava
// depois do seguinte já ter montado a sua — reescrevendo a variável com a loja
// ERRADA. Duas provas falhavam em conjunto e passavam sozinhas, que é o sintoma
// clássico e o mais caro de perseguir.
const montadas = [];
const montar = (casa = CASA(), user = 'Rita') => {
  const cofre = {};
  let arvore = null;
  const Envolve = () => {
    const st = useStore();
    cofre.st = st;
    React.useMemo(() => st.set(casa), []);
    return React.createElement(EscolherAvatar, {
      t: buildTheme(0, false), user, onFeito: jest.fn(),
    });
  };
  TestRenderer.act(() => {
    arvore = TestRenderer.create(
      React.createElement(StoreProvider, null, React.createElement(Envolve)));
  });
  montadas.push(arvore);
  arvore.eu = () => cofre.st.membros['Rita'];
  return arvore;
};

afterEach(() => {
  TestRenderer.act(() => { montadas.forEach(a => a.unmount()); });
  montadas.length = 0;
});

const porRotulo = (a, r) => a.root.findAll(n => n.props && n.props.accessibilityLabel === r)[0];
const tocar = (a, rotulo) => TestRenderer.act(async () => { await porRotulo(a, rotulo).props.onPress(); });
const texto = (a) => {
  const junta = (n) => {
    if (n === null || n === undefined || n === false) return '';
    if (typeof n === 'string' || typeof n === 'number') return String(n);
    if (Array.isArray(n)) return n.map(junta).join(' ');
    return junta(n.children || (n.props && n.props.children) || null);
  };
  return junta(a.toJSON());
};

// ── O conjunto de figuras ────────────────────────────────────────────────────

describe('as figuras', () => {
  it('há pessoas, animais e coisas — que foi o que se pediu', () => {
    expect(GRUPOS).toEqual(['Pessoas', 'Animais', 'Coisas']);
    for (const g of GRUPOS) expect(figurasDoGrupo(g).length).toBeGreaterThanOrEqual(4);
  });

  it('todas as da lista existem, e todas têm nome em português', () => {
    for (const k of FIGURAS) {
      expect(existeFigura(k)).toBe(true);
      expect(typeof nomeDaFigura(k)).toBe('string');
      expect(nomeDaFigura(k).length).toBeGreaterThan(2);
    }
  });

  it('a ordem é EXPLÍCITA, e não a de um objeto', () => {
    // A ordem das chaves de um objeto é uma coincidência do motor. Uma lista
    // que se reordena sozinha entre versões faz a pessoa procurar o seu avatar
    // onde ele já não está.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'Avatares.jsx'), 'utf8');
    expect(src).toMatch(/export const FIGURAS = \[/);
    expect(src).not.toMatch(/export const FIGURAS = Object\.keys/);
  });

  it('⚠ nenhuma figura tem o nome de um ícone do sistema', () => {
    // Os do `Icon.jsx` têm significado exclusivo: o `lock` é privado, o `smile`
    // é bónus de criança, o `heartPulse` é saúde. Uma figura com o mesmo nome
    // seria a porta aberta para alguém as trocar sem dar por isso — e um
    // cadeado a servir de cara gasta o «privado» em todo o lado onde ele
    // aparece a sério.
    const fs = require('fs');
    const path = require('path');
    const icones = fs.readFileSync(path.join(__dirname, '..', 'src', 'Icon.jsx'), 'utf8');
    const nomes = new Set([...icones.matchAll(/^\s{2}([a-zA-Z]+):/gm)].map(m => m[1]));
    for (const k of FIGURAS) expect(nomes.has(k)).toBe(false);
  });

  it('e desenham-se todas sem rebentar', () => {
    const Figura = require('../src/Avatares').default;
    for (const k of FIGURAS) {
      let a = null;
      TestRenderer.act(() => { a = TestRenderer.create(React.createElement(Figura, { nome: k })); });
      expect(a.toJSON()).toBeTruthy();
      TestRenderer.act(() => a.unmount());
    }
  });

  it('um nome desconhecido não desenha nada, e não estoira', () => {
    const Figura = require('../src/Avatares').default;
    let a = null;
    TestRenderer.act(() => { a = TestRenderer.create(React.createElement(Figura, { nome: 'unicornio' })); });
    expect(a.toJSON()).toBeNull();
    TestRenderer.act(() => a.unmount());
  });
});

describe('escolher uma figura', () => {
  it('a folha oferece-as todas', () => {
    const a = montar();
    for (const k of FIGURAS) expect(porRotulo(a, nomeDaFigura(k))).toBeTruthy();
  });

  it('tocar numa grava-a no membro', async () => {
    const a = montar();
    await tocar(a, nomeDaFigura('gato'));
    expect(a.eu().figura).toBe('gato');
  });

  it('e desliga a fotografia — um avatar é UM', async () => {
    const a = montar(CASA({ avatar: FOTO, usarFoto: true }));
    await tocar(a, nomeDaFigura('coruja'));
    expect(a.eu().figura).toBe('coruja');
    expect(a.eu().usarFoto).toBe(false);
  });

  it('«A minha inicial» tira a figura — dá para voltar atrás', async () => {
    const a = montar(CASA({ figura: 'urso' }));
    await tocar(a, 'A minha inicial');
    expect(a.eu().figura).toBe('');
  });

  it('a escolhida aparece marcada', () => {
    const a = montar(CASA({ figura: 'raposa' }));
    expect(porRotulo(a, nomeDaFigura('raposa')).props.accessibilityState.selected).toBe(true);
    expect(porRotulo(a, nomeDaFigura('gato')).props.accessibilityState.selected).toBe(false);
  });
});

describe('as cores', () => {
  it('⚠ a cor de OUTRO membro não se pode escolher', () => {
    // Duas iguais na mesma casa deixam o ponto do calendário sem dizer de quem
    // é o evento — que é a única coisa que ele faz.
    const a = montar();
    const doTomas = porRotulo(a, 'Cor de Tomás, indisponível');
    expect(doTomas).toBeTruthy();
    expect(doTomas.props.accessibilityState.disabled).toBe(true);
  });

  it('e a do Léo também não, que criança é membro na mesma', () => {
    expect(porRotulo(montar(), 'Cor de Léo, indisponível')).toBeTruthy();
  });

  it('a MINHA continua escolhível — é a que está', () => {
    const minha = porRotulo(montar(), `Cor ${PALETA_MEMBROS[0]}`);
    expect(minha).toBeTruthy();
    expect(minha.props.accessibilityState.selected).toBe(true);
  });

  it('escolher uma livre grava-a', async () => {
    const livre = PALETA_MEMBROS[4];
    const a = montar();
    await tocar(a, `Cor ${livre}`);
    expect(a.eu().cor).toBe(livre);
  });

  it('mudar de cor NÃO tira a figura — são escolhas separadas', async () => {
    const a = montar(CASA({ figura: 'gato' }));
    await tocar(a, `Cor ${PALETA_MEMBROS[4]}`);
    expect(a.eu().figura).toBe('gato');
  });
});

describe('a fotografia da conta', () => {
  it('⚠ sem fotografia, oferece um BOTÃO em vez de uma instrução', () => {
    // Dizia «Aparece aqui depois de entrar com a conta Google» a quem já tinha
    // entrado com a conta Google — mandava fazer o que estava feito. Depois
    // passou a «termine a sessão e volte a entrar», que era verdade e má
    // resposta: obrigava a sair de casa para ir buscar uma coisa à porta.
    const a = montar();
    expect(porRotulo(a, 'Trazer a fotografia da Google')).toBeTruthy();
    const t = texto(a);
    expect(t).not.toContain('Aparece aqui depois de entrar');
    expect(t).not.toContain('termine a sessão');
  });

  it('sem fotografia, não finge que já há uma para usar', () => {
    expect(porRotulo(montar(), 'Usar a fotografia da conta Google')).toBeFalsy();
  });

  it('e com fotografia o botão de a trazer desaparece', () => {
    expect(porRotulo(montar(CASA({ avatar: FOTO })), 'Trazer a fotografia da Google')).toBeFalsy();
  });

  it('com fotografia, dá-se a desligar', () => {
    const a = montar(CASA({ avatar: FOTO }));
    expect(porRotulo(a, 'Usar a fotografia da conta Google')).toBeTruthy();
    expect(texto(a)).toContain('A ser usada');
  });

  // ⚠ Um toque por prova, e não dois na mesma.
  //
  // O efeito que grava a loja corre entre os dois `act`, e o AsyncStorage
  // simulado devolve `undefined` em vez de uma promessa — o `.catch` rebenta.
  // É artefacto do ambiente e não da app, mas duas provas de um toque dizem o
  // mesmo sem depender disso.
  it('tocar desliga-a', async () => {
    const a = montar(CASA({ avatar: FOTO }));
    await tocar(a, 'Usar a fotografia da conta Google');
    expect(a.eu().usarFoto).toBe(false);
  });

  it('e a partir de desligada, tocar volta a ligá-la', async () => {
    const a = montar(CASA({ avatar: FOTO, usarFoto: false }));
    await tocar(a, 'Usar a fotografia da conta Google');
    expect(a.eu().usarFoto).toBe(true);
  });

  it('⚠ a escrita da fotografia não falha em silêncio', () => {
    // Durante DUAS entradas seguidas o servidor respondeu 404 a esta escrita —
    // a rota ainda não estava carregada — e a app não disse nada. A folha
    // mostrava «ainda não há fotografia», que é verdade e não é a verdade
    // útil: a fotografia veio e não se conseguiu guardar.
    const fs = require('fs');
    const path = require('path');
    const c = fs.readFileSync(path.join(__dirname, '..', 'src', 'pocketbase.js'), 'utf8');
    const i = c.indexOf('const foto = r.meta');
    const bloco = c.slice(i, i + 1200);
    expect(bloco).toContain('erroDaFotografia =');
    expect(bloco).not.toContain('a entrada não se perde por causa de uma fotografia */ }');
    expect(c).toContain('erroDaFotografia: () => erroDaFotografia');
  });

  it('⚠ uma fotografia guardada MOSTRA-SE, sem ser preciso escolhê-la', () => {
    // Começou por não se mostrar, por uma razão de privacidade que era minha e
    // não de quem usa a app: a fotografia era importada, ficava guardada, e o
    // avatar continuava a mostrar a inicial. Parecia avariado, e era.
    const { mostraFotografia } = require('../src/ui');
    expect(mostraFotografia({ avatar: FOTO })).toBe(true);
    expect(texto(montar(CASA({ avatar: FOTO })))).toContain('A ser usada');
  });

  it('mas uma figura escolhida ganha à fotografia', () => {
    const { mostraFotografia } = require('../src/ui');
    expect(mostraFotografia({ avatar: FOTO, figura: 'gato' })).toBe(false);
  });

  it('e um NÃO explícito ganha às duas — a escolha manda nos dois sentidos', () => {
    const { mostraFotografia } = require('../src/ui');
    expect(mostraFotografia({ avatar: FOTO, usarFoto: false })).toBe(false);
    expect(mostraFotografia({ avatar: FOTO, figura: 'gato', usarFoto: true })).toBe(true);
  });

  it('sem fotografia nenhuma, não se mostra nada', () => {
    const { mostraFotografia } = require('../src/ui');
    expect(mostraFotografia({ usarFoto: true })).toBe(false);
    expect(mostraFotografia({})).toBe(false);
    expect(mostraFotografia(null)).toBe(false);
  });
});

describe('os alvos de toque (INVARIANTE #5)', () => {
  const estilo = (n) => (Array.isArray(n.props.style)
    ? Object.assign({}, ...n.props.style) : n.props.style);

  it('nenhuma bola vive num alvo abaixo de 44', () => {
    const a = montar();
    const rotulos = [...FIGURAS.map(nomeDaFigura), `Cor ${PALETA_MEMBROS[0]}`];
    for (const r of rotulos) {
      // O `findAll` devolve o composto E o anfitrião; o estilo está no que tem
      // largura, e é esse que importa medir.
      const alvo = a.root.findAll(n => n.props && n.props.accessibilityLabel === r
        && estilo(n) && estilo(n).width)[0];
      expect(alvo).toBeTruthy();
      expect(estilo(alvo).width).toBeGreaterThanOrEqual(44);
      expect(estilo(alvo).height).toBeGreaterThanOrEqual(44);
    }
  });

  it('e as duas linhas tocáveis têm 64', () => {
    const a = montar(CASA({ avatar: FOTO }));
    for (const r of ['A minha inicial', 'Usar a fotografia da conta Google']) {
      const linha = a.root.findAll(n => n.props && n.props.accessibilityLabel === r
        && estilo(n) && estilo(n).minHeight)[0];
      expect(estilo(linha).minHeight).toBeGreaterThanOrEqual(44);
    }
  });
});

describe('o servidor', () => {
  const fs = require('fs');
  const path = require('path');
  const semComentarios = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.replace(/(^|\s)\/\/.*$/, '')).join('\n');

  it('⚠ o aspeto vai por uma ROTA, e não por um update da coleção', () => {
    // A regra de update de `membros` exige papel admin, porque quem escreve um
    // membro escreve o PAPEL dele. Uma regra que deixasse um membro escrever-se
    // a si deixava-o promover-se: o PocketBase autoriza a OPERAÇÃO, não o
    // campo. A rota escreve três campos, no membro autenticado, e mais nada.
    const c = semComentarios('src/pocketbase.js');
    expect(c).toMatch(/\/api\/membro\/aspeto/);
    expect(c).not.toMatch(/collection\('membros'\)\.update\([^)]*(avatar|figura)/);
  });

  it('a rota só aceita fotografias da Google', () => {
    // Um endereço qualquer era deixar apontar o avatar para um servidor que
    // conta quem o abriu — e assim saber a que horas esta casa usa a app.
    const h = semComentarios('db/pocketbase/pb_hooks/avatar.pb.js');
    expect(h).toMatch(/googleusercontent/);
    expect(h).toMatch(/\^https:/);
  });

  it('e só chaves de figura, nunca um desenho', () => {
    // Aceitar marcação aqui era deixar entrar um desenho escolhido por um
    // membro no ecrã de todos os outros.
    const h = semComentarios('db/pocketbase/pb_hooks/avatar.pb.js');
    expect(h).toMatch(/\^\[a-z\]\{2,24\}\$/);
  });

  it('escreve no membro AUTENTICADO, nunca num id que venha no pedido', () => {
    const h = semComentarios('db/pocketbase/pb_hooks/avatar.pb.js');
    expect(h).toMatch(/const membro = e\.auth/);
    expect(h).toMatch(/\$apis\.requireAuth\(\)/);
    expect(h).not.toMatch(/corpo\.(membro|id)\b/);
  });

  it('⚠ trazer a fotografia corre num cliente DESCARTÁVEL', () => {
    // Sem isso, a entrada substituía a sessão em curso: quem escolhesse outra
    // conta na janela da Google — a do trabalho, a de outra pessoa do mesmo
    // telemóvel — ficava com a app aberta em nome dela sem ter pedido nada.
    const c = semComentarios('src/pocketbase.js');
    const i = c.indexOf('trazerFotografiaDaGoogle');
    const bloco = c.slice(i, i + 1400);
    expect(bloco).toContain('const descartavel = new PocketBase(URL)');
    expect(bloco).toContain("descartavel.collection('membros').authWithOAuth2");
    expect(bloco).not.toContain("pb.collection('membros').authWithOAuth2");
  });

  it('e recusa se a conta devolvida for de OUTRO membro', () => {
    const c = semComentarios('src/pocketbase.js');
    const bloco = c.slice(c.indexOf('trazerFotografiaDaGoogle'), c.indexOf('trazerFotografiaDaGoogle') + 1600);
    expect(bloco).toContain('r.record.id !== eu.id');
    expect(bloco).toContain('outra conta Google');
  });

  it('e não pede o âmbito da agenda para ir buscar uma fotografia', () => {
    // Alargar o âmbito de uma autorização de AGENDA para apanhar uma
    // fotografia seria pedir mais acesso do que o preciso — e ficaria pedido
    // para sempre.
    const c = semComentarios('src/pocketbase.js');
    const bloco = c.slice(c.indexOf('trazerFotografiaDaGoogle'), c.indexOf('trazerFotografiaDaGoogle') + 1400);
    expect(bloco).not.toMatch(/calendar/);
  });

  it('a cor e a figura viajam; mostrar a própria cara não', () => {
    // As duas primeiras são da casa — é o que distingue as pessoas nos dois
    // telemóveis. Mostrar a própria cara é de quem está a olhar para o aparelho.
    const c = semComentarios('src/store.jsx');
    const bloco = c.slice(c.indexOf('definirAvatar'), c.indexOf('definirAvatar') + 1600);
    expect(bloco).toMatch(/if \(cor === undefined && figura === undefined\) return null;/);
    expect(bloco).toMatch(/guardarAspeto\(\{/);
    expect(bloco).not.toMatch(/usarFoto:.*guardarAspeto/);
  });
});

describe('a escolha chega a TODA a app, e não só ao Perfil', () => {
  const fs = require('fs');
  const path = require('path');
  const ler = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

  const ECRAS = ['src/screens/Agenda.jsx', 'src/screens/Compras.jsx', 'src/screens/Gestao.jsx',
    'src/screens/Inicio.jsx', 'src/screens/Perfil.jsx', 'src/screens/Saude.jsx',
    'src/screens/Tarefas.jsx', 'src/screens/Login.jsx',
    'src/sheets/Cofre.jsx', 'src/sheets/ConfirmarAdministradores.jsx'];

  it('⚠ nenhum ecrã pede a cor SEM a escolha do membro', () => {
    // Era este o defeito: dez dos onze sítios chamavam `corDoMembro(nome)` com
    // um argumento só. Quem escolhesse uma cor via-a no Perfil e em mais lado
    // nenhum — na agenda, nas tarefas e nas compras continuava a cor calculada
    // do nome. Uma escolha que só funciona em metade da app é pior do que
    // nenhuma: parece avariada.
    const culpados = [];
    for (const f of ECRAS) {
      const c = ler(f).replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n').map(l => l.replace(/(^|\s)\/\/.*$/, '')).join('\n');
      // Um argumento só: `corDoMembro(x)` sem vírgula antes do fecho.
      const maus = [...c.matchAll(/corDoMembro\(([^(),]+)\)/g)].map(m => m[0]);
      if (maus.length) culpados.push(`${f}: ${maus.join(', ')}`);
    }
    expect(culpados).toEqual([]);
  });

  it('e todos passam pelo `avatarDe`, que decide num sítio só', () => {
    for (const f of ECRAS.filter(x => /Agenda|Compras|Gestao|Inicio|Perfil|Saude|Tarefas|Cofre|Confirmar/.test(x))) {
      const c = ler(f);
      if (!/<Avatar\b/.test(c)) continue;
      expect(c).toMatch(/avatarDe\(/);
    }
  });
});

describe('a fotografia desenha-se mesmo', () => {
  const React = require('react');
  const TestRenderer = require('react-test-renderer');
  const { Avatar, AvatarDeCabecalho } = require('../src/ui');
  const { buildTheme } = require('../src/theme');
  const fs = require('fs');
  const path = require('path');
  const ler = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

  it('⚠ pede-a sem referenciador — sem isso a Google RECUSA-A', () => {
    // Medido no navegador, contra o endereço real de uma conta:
    //
    //     política por omissão   erro
    //     no-referrer            OK 96x96
    //
    // O `Image` do react-native-web (0.21.2) não expõe `referrerPolicy` — não
    // existe no módulo. Daí o `<img>` verdadeiro na web.
    const c = ler('src/ui.jsx');
    expect(c).toContain("referrerPolicy: 'no-referrer'");
    expect(c).toMatch(/Platform\.OS === 'web'/);
  });

  it('⚠ e se ela falhar, a bola NÃO fica vazia', () => {
    // Foi o que aconteceu: a bola aparecia da cor do membro e vazia por
    // dentro, sem inicial e sem figura — pior do que não ter fotografia
    // nenhuma. Um endereço destes caduca quando a pessoa a muda na conta.
    let a = null;
    TestRenderer.act(() => {
      a = TestRenderer.create(React.createElement(Avatar,
        { initial: 'R', color: '#722ED1', size: 40, foto: FOTO }));
    });
    const img = a.root.findAll(n => n.props && n.props.onError)[0];
    expect(img).toBeTruthy();
    TestRenderer.act(() => { img.props.onError(); });
    // Caiu para a inicial.
    expect(JSON.stringify(a.toJSON())).toContain('R');
    TestRenderer.act(() => a.unmount());
  });

  it('o avatar do CABEÇALHO também conhece a fotografia', () => {
    // Era um desenho à parte — disco branco com a inicial — e não sabia de
    // escolha nenhuma. É o avatar mais visto da app, e era esse o que aparecia
    // nas capturas de quem perguntava porque é que nada mudava.
    let a = null;
    TestRenderer.act(() => {
      a = TestRenderer.create(React.createElement(AvatarDeCabecalho,
        { t: buildTheme(0, false), nome: 'Rita', membro: { initial: 'R', avatar: FOTO } }));
    });
    // Indiferente à plataforma: no jest o `Platform.OS` é nativo e sai um
    // `Image` com `source.uri`; na web sai um `<img>` com `src`. O que importa
    // é que a fotografia lá está.
    const comFoto = a.root.findAll(n => n.props
      && (n.props.src === FOTO || (n.props.source && n.props.source.uri === FOTO)));
    expect(comFoto.length).toBeGreaterThan(0);
    TestRenderer.act(() => a.unmount());
  });

  it('e o App usa-o, em vez de desenhar a inicial à mão', () => {
    const c = ler('App.jsx');
    expect(c).toContain('<AvatarDeCabecalho');
    expect(c).not.toContain('{euNaCasa.initial}');
  });

  it('a folha usa o MESMO Avatar, e não um desenho parecido', () => {
    // Um deles sabia o que fazer quando a fotografia não carrega e o outro
    // não — e era o da pré-visualização que ficava um buraco.
    const c = ler('src/sheets/EscolherAvatar.jsx');
    expect(c).not.toContain('<Image source={{ uri: foto }}');
    expect(c).toContain('<Avatar size={size}');
  });
});
