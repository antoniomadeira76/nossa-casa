/**
 * A folha de agendar, a correr com uma casa de DOIS adultos com e-mail.
 *
 * É a casa para que esta app foi feita — «Rita e Tomás» está na primeira linha
 * do CLAUDE.md — e era precisamente a casa que a folha não aguentava.
 */
// A camada do servidor é substituída: este teste é sobre a folha, e o pacote
// `pocketbase` é ESM que o Jest não digere. `disponivel: false` é o caso mais
// exigente — é o que faz a folha desenhar o aviso em vez do interruptor.
jest.mock('../src/pocketbase', () => ({
  google: {
    disponivel: () => false,
    porLigar: () => false,
    criarEvento: async () => 'id-falso',
    atualizarEvento: async () => {},
    apagarEvento: async () => {},
  },
}));

const React = require('react');
const TestRenderer = require('react-test-renderer');
const { StoreProvider, useStore } = require('../src/store');
const { buildTheme } = require('../src/theme');
const { SafeAreaProvider } = require('react-native-safe-area-context');

const NovoEvento = require('../src/sheets/NovoEvento').default;

const comMargens = (filho) => React.createElement(SafeAreaProvider,
  { initialMetrics: { frame: { x: 0, y: 0, width: 402, height: 874 },
                      insets: { top: 47, left: 0, right: 0, bottom: 34 } } }, filho);

// Uma casa com dois adultos, ambos com e-mail — e quem entrou é um deles.
const abrir = (quem = 'Rita') => {
  let arvore = null;
  const t = buildTheme('violet', false);
  const Envolve = () => {
    const st = useStore();
    // A casa a sério, posta antes de a folha correr.
    React.useMemo(() => st.set({
      membros: {
        Rita:  { initial: 'R', email: 'rita@exemplo.pt' },
        Tomás: { initial: 'T', email: 'tomas@exemplo.pt' },
        Léo:   { initial: 'L', kid: true },
      },
    }), []);
    return React.createElement(NovoEvento,
      { t, user: quem, onClose: () => {} });
  };
  TestRenderer.act(() => {
    arvore = TestRenderer.create(
      comMargens(React.createElement(StoreProvider, null, React.createElement(Envolve))));
  });
  const junta = (n) => {
    if (n === null || n === undefined || n === false) return '';
    if (typeof n === 'string' || typeof n === 'number') return String(n);
    if (Array.isArray(n)) return n.map(junta).join(' ');
    return junta(n.children || (n.props && n.props.children) || null);
  };
  return junta(arvore.toJSON());
};

describe('agendar numa casa com dois adultos', () => {
  // ── O defeito ─────────────────────────────────────────────────────────────
  //
  // `convidados` era calculado ACIMA do `useState` do `form` e lia
  // `form.visibilidade`. Zona morta temporal: aceder a um `const` antes da sua
  // declaração atira `Cannot access 'form' before initialization`.
  //
  // Numa casa de UM adulto isto nunca acontecia. A condição é
  //
  //     nome !== user && m.email && !m.kid && (form.visibilidade === …)
  //
  // e com um adulto só, `nome !== user` é falso para ele e o `&&` corta antes
  // de tocar no `form`. As crianças caem no `m.email`. Ninguém chegava à
  // quarta condição — e a app corria, a esconder o erro.
  //
  // Basta o segundo adulto com e-mail, que é o propósito da app, para a folha
  // deixar de abrir e a Agenda ficar em branco.
  it('a folha abre', () => {
    expect(() => abrir('Rita')).not.toThrow();
  });

  it('mostra os campos todos', () => {
    const texto = abrir('Rita');
    expect(texto).toContain('Título do evento');
    expect(texto).toContain('Quem vê');
    expect(texto).toContain('Guardar evento');
  });

  it('abre para o outro adulto também', () => {
    expect(() => abrir('Tomás')).not.toThrow();
  });
});

describe('a ordem das declarações na folha', () => {
  const fs = require('fs');
  const path = require('path');
  const codigo = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'sheets', 'NovoEvento.jsx'), 'utf8');

  it('`convidados` vem depois do `form` que lê', () => {
    // O teste acima apanha o sintoma; este apanha a causa, e é o que impede a
    // mesma inversão de voltar noutra folha desta forma.
    const form = codigo.indexOf('const [form, setForm] = useState(');
    const convidados = codigo.indexOf('const convidados = Object.entries(MEMBROS)');
    expect(form).toBeGreaterThan(-1);
    expect(convidados).toBeGreaterThan(form);
  });
});
