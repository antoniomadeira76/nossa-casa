/**
 * O avatar escolhido aparece nos ecrãs onde as pessoas aparecem.
 *
 * Não basta a folha de escolha funcionar: o que faz a escolha valer a pena é
 * ela chegar à linha da tarefa, à linha do evento e ao resumo do Início. Dez
 * dos onze sítios que desenhavam um avatar pediam a cor SEM a escolha do
 * membro, e a fotografia não era pedida em sítio nenhum.
 *
 * ⚠ Isto monta os ECRÃS a sério — não verifica o código por leitura. Uma prova
 * que lê ficheiros diz que a chamada certa lá está; esta diz que a fotografia
 * sai do outro lado.
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
const { buildTheme, PALETA_MEMBROS } = require('../src/theme');
const { TODAY_KEY } = require('../src/format');

const FOTO = 'https://lh3.googleusercontent.com/a/abc123';
const COR = PALETA_MEMBROS[3];

// Uma casa de um adulto com fotografia, uma tarefa e um evento — o mínimo para
// as três linhas existirem.
const CASA = (extra = {}) => ({
  membros: { 'Rita': { initial: 'R', cor: COR, fem: true, avatar: FOTO, ...extra } },
  roles: { 'Rita': 'admin' },
  tasks: [{ id: 't1', title: 'Levar o lixo', who: 'Rita', meta: 'Rotina diária',
    pts: 0, today: true, urg: 1, due: TODAY_KEY, dueTime: '18:00' }],
  events: [{ id: 'e1', day: TODAY_KEY, time: '18:30', title: 'Consulta',
    who: 'Rita', owner: 'Rita', shared: true }],
});

const montar = (Ecra, casa = CASA(), props = {}) => {
  let arvore = null;
  const Envolve = () => {
    const st = useStore();
    React.useMemo(() => st.set(casa), []);
    return React.createElement(Ecra, { t: buildTheme(0, false), user: 'Rita', ...props });
  };
  TestRenderer.act(() => {
    arvore = TestRenderer.create(
      React.createElement(StoreProvider, null, React.createElement(Envolve)));
  });
  return arvore;
};

// A fotografia, seja qual for a plataforma: no jest o `Platform.OS` é nativo e
// sai um `Image` com `source.uri`; na web sai um `<img>` com `src`.
const comFotografia = (a) => a.root.findAll(n => n.props
  && (n.props.src === FOTO || (n.props.source && n.props.source.uri === FOTO))).length;

const comFigura = (a, nome) => a.root.findAll(n => n.props && n.props.nome === nome).length;

const ECRAS = [
  ['Agenda',  require('../src/screens/Agenda').default],
  ['Tarefas', require('../src/screens/Tarefas').default],
  ['Início',  require('../src/screens/Inicio').default],
];

describe.each(ECRAS)('%s', (nome, Ecra) => {
  it('mostra a fotografia do membro', () => {
    const a = montar(Ecra);
    expect(comFotografia(a)).toBeGreaterThan(0);
    TestRenderer.act(() => a.unmount());
  });

  it('mostra a figura escolhida, quando há uma', () => {
    const a = montar(Ecra, CASA({ avatar: null, figura: 'gato' }));
    expect(comFigura(a, 'gato')).toBeGreaterThan(0);
    TestRenderer.act(() => a.unmount());
  });

  it('⚠ e usa a COR escolhida, não a calculada do nome', () => {
    // Era este o defeito: `corDoMembro(nome)` com um argumento só. A escolha
    // via-se no Perfil e em mais lado nenhum — na agenda, nas tarefas e no
    // Início continuava a cor que o nome gera.
    const { corDoMembro } = require('../src/theme');
    const doNome = corDoMembro('Rita');
    expect(COR).not.toBe(doNome);   // a prova só vale se forem diferentes

    const a = montar(Ecra, CASA({ avatar: null }));
    const cores = JSON.stringify(a.toJSON());
    expect(cores).toContain(COR);
    TestRenderer.act(() => a.unmount());
  });
});

// ── Um defeito apanhado de caminho ──────────────────────────────────────────

describe('o subtítulo de uma tarefa', () => {
  const { subtituloDaTarefa } = require('../src/format');
  const fs = require('fs');
  const path = require('path');
  const ler = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

  it('⚠ uma tarefa criada na app não diz «undefined»', () => {
    // Era `${x.who} · ${x.meta}`, e o `meta` NÃO EXISTE nas tarefas que a app
    // cria: a folha de Nova Tarefa escreve `recur`, nunca `meta`. Só os dados
    // de demonstração o traziam, e por isso o defeito viveu escondido — toda a
    // tarefa escrita por esta família saía com «António · undefined».
    const comoAAppACria = { title: 'Levar o lixo', who: 'António', recur: 'Uma vez', pts: 0 };
    const s = subtituloDaTarefa(comoAAppACria);
    expect(s).not.toContain('undefined');
    expect(s).toBe('António · Uma vez');
  });

  it('um prazo ganha à recorrência', () => {
    expect(subtituloDaTarefa({ who: 'Rita', recur: 'Uma vez' }, { text: 'amanhã às 18:00' }))
      .toBe('Rita · amanhã às 18:00');
  });

  it('e sem nada fica o nome sozinho, que é verdade e chega', () => {
    expect(subtituloDaTarefa({ who: 'Rita' })).toBe('Rita');
    expect(subtituloDaTarefa({})).toBe('');
  });

  it('nenhum ecrã volta a interpolar o `meta` à mão', () => {
    for (const f of ['src/screens/Tarefas.jsx', 'src/screens/Inicio.jsx']) {
      expect(ler(f)).not.toContain('${x.meta}');
      expect(ler(f)).not.toContain('${task.meta}');
    }
  });
});
