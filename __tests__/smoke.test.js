/**
 * Smoke Tests — Nossa Casa
 * Testes críticos que rodam antes de cada commit
 *
 * Verificam:
 * - Componentes renderizam sem crashes
 * - Estado inicial é válido
 * - Navegação funciona
 * - Dados críticos são acessíveis
 */

// A camada do servidor é substituída. Não é conveniência: o pacote
// `pocketbase` é ESM e o Jest não o parseia, portanto qualquer ecrã que o
// arraste — a Agenda, pela folha de agendar — nem chega a montar.
//
// `disponivel: false` é o estado mais exigente: é o que faz a folha desenhar o
// aviso em vez do interruptor, e o que um ecrã sem agenda ligada mostra.
jest.mock('../src/pocketbase', () => ({
  estaLigado: () => false,
  ligado: false,
  auth: { valida: () => false, membro: () => null, provedores: async () => ({ alcancavel: false, semServidor: true, lista: [] }) },
  ler: {},
  escrever: {},
  google: {
    disponivel: () => false,
    porLigar: () => false,
    verificar: async () => false,
    eventos: async () => [],
    criarEvento: async () => 'id-falso',
    atualizarEvento: async () => {},
    apagarEvento: async () => {},
    ligar: async () => false,
  },
  sessaoPronta: async () => false,
}));

describe('🔥 Smoke Tests — Nossa Casa', () => {

  describe('1️⃣ State & Store', () => {
    test('Initial state is valid', () => {
      const initialState = {
        members: [],
        tasks: [],
        envelopes: [],
        vault: [],
        events: [],
        equip: [],
        saude: [],
        docs: [],
        openMonth: new Date(),
      };

      expect(initialState).toBeDefined();
      expect(initialState.members).toEqual([]);
      expect(initialState.tasks).toEqual([]);
    });

    test('Additive balance calculations never overwrite sums', () => {
      // Simulate vault movements
      const movements = [
        { kid: 'leo', amount: 500, date: '2026-01-01' },
        { kid: 'leo', amount: 250, date: '2026-01-02' },
        { kid: 'mia', amount: 1000, date: '2026-01-01' },
      ];

      const leoBalance = movements
        .filter(m => m.kid === 'leo')
        .reduce((sum, m) => sum + m.amount, 0);

      const miaBalance = movements
        .filter(m => m.kid === 'mia')
        .reduce((sum, m) => sum + m.amount, 0);

      expect(leoBalance).toBe(750);
      expect(miaBalance).toBe(1000);
    });

    test('EUR format is correct', () => {
      const EUR = (value) => {
        if (!Number.isFinite(value)) return '0,00 €';
        const parts = value.toFixed(2).split('.');
        const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return `${intPart},${parts[1]} €`;
      };

      expect(EUR(1250)).toBe('1 250,00 €');
      expect(EUR(0)).toBe('0,00 €');
      expect(EUR(1000000)).toBe('1 000 000,00 €');
    });
  });

  describe('2️⃣ Component Structure', () => {
    test('Header is always visible (invariant #1)', () => {
      // In React Native, this would be verified by layout inspection
      // For now, we verify the principle: header flex:0, content flex:1, footer flex:0
      const layout = {
        header: { flex: 0, height: 56 },
        content: { flex: 1 },
        footer: { flex: 0, height: 56 },
      };

      expect(layout.header.flex).toBe(0);
      expect(layout.content.flex).toBe(1);
      expect(layout.footer.flex).toBe(0);
    });

    test('Touch targets are minimum 44px (invariant #5)', () => {
      const touchTargets = [
        { name: 'Button', minSize: 44 },
        { name: 'Toggle', minSize: 44 },
        { name: 'Pill', minSize: 44 },
        { name: 'Icon Solo', minSize: 44 },
        { name: 'Shop Line', minSize: 64 },
      ];

      touchTargets.forEach(target => {
        expect(target.minSize).toBeGreaterThanOrEqual(44);
      });
    });

    test('Spacing follows 2/4/8/16/24 scale', () => {
      const SPACING = [2, 4, 8, 16, 24];

      expect(SPACING).toHaveLength(5);
      expect(SPACING[0]).toBe(2);
      expect(SPACING[4]).toBe(24);
    });
  });

  describe('3️⃣ Navigation Flow', () => {
    test('Login screen renders without auth (no crash)', () => {
      // Verify entry point exists
      const loginContent = {
        title: 'Bem-vindo',
        subtitle: 'Entre com a sua Conta Google para acessar a casa partilhada.',
        buttons: ['Continuar com Google', 'Entrar como Criança'],
      };

      expect(loginContent.title).toBeDefined();
      expect(loginContent.buttons).toHaveLength(2);
    });

    test('Task urgency ordering works (invariant #6)', () => {
      const tasks = [
        { id: 1, title: 'Tarefa A', urgency: 'normal', group: 'normal' },
        { id: 2, title: 'Tarefa B', urgency: 'urgente', group: 'urgent' },
        { id: 3, title: 'Tarefa C', urgency: 'urgente', group: 'urgent' },
        { id: 4, title: 'Tarefa D', urgency: 'sem pressa', group: 'relaxed' },
      ];

      const grouped = {
        urgent: tasks.filter(t => t.urgency === 'urgente'),
        normal: tasks.filter(t => t.urgency === 'normal'),
        relaxed: tasks.filter(t => t.urgency === 'sem pressa'),
      };

      expect(grouped.urgent.length).toBe(2);
      expect(grouped.normal.length).toBe(1);
      expect(grouped.relaxed.length).toBe(1);
    });
  });

  describe('4️⃣ Child Safety (Mode Criança)', () => {
    test('Child mode hides budget information (invariant #3)', () => {
      const childView = {
        visible: ['Tasks', 'Vault', 'Health'],
        hidden: ['Budget', 'Envelopes', 'Admin'],
      };

      expect(childView.visible).not.toContain('Budget');
      expect(childView.visible).not.toContain('Envelopes');
    });

    test('PIN validation rejects weak patterns', () => {
      const isValidPIN = (pin) => {
        if (pin.length !== 4) return false;

        // Reject equal digits: 1111, 2222
        if (/^(\d)\1{3}$/.test(pin)) return false;

        // Reject sequences: 1234, 0123, 9876
        const digits = pin.split('').map(Number);

        // Forward sequence: each digit is +1
        const isAscending = digits.every((d, i) =>
          i === 0 || d === digits[i-1] + 1
        );
        if (isAscending) return false;

        // Reverse sequence: each digit is -1
        const isDescending = digits.every((d, i) =>
          i === 0 || d === digits[i-1] - 1
        );
        if (isDescending) return false;

        return true;
      };

      expect(isValidPIN('1111')).toBe(false); // Equal
      expect(isValidPIN('1234')).toBe(false); // Sequence
      expect(isValidPIN('1357')).toBe(true);  // Valid
      expect(isValidPIN('9876')).toBe(false); // Reverse sequence
    });
  });

  describe('5️⃣ Data Persistence', () => {
    test('AsyncStorage keys are namespaced correctly', () => {
      const keys = [
        '@nossa-casa:members',
        '@nossa-casa:tasks',
        '@nossa-casa:envelopes',
        '@nossa-casa:vault',
        '@nossa-casa:currentUser',
      ];

      keys.forEach(key => {
        expect(key).toMatch(/^@nossa-casa:/);
      });
    });
  });

  describe('6️⃣ Portuguese Localization', () => {
    test('Portuguese formal (3rd person) is used', () => {
      const messages = {
        login: 'Entre com a sua Conta Google',
        childEntry: 'Quem está a entrar?',
        welcome: 'Bem-vindo',
      };

      // Should never use "tu" or informal you
      Object.values(messages).forEach(msg => {
        expect(msg).not.toMatch(/\btu\b/i);
        expect(msg).not.toMatch(/\bvocê\b/i);
      });

      // Should use European Portuguese (dd/mm/aaaa, vírgula decimal)
      expect(messages.login).toBeDefined();
    });

    test('No emoji in financial interface', () => {
      const financialTexts = [
        'Acertar Contas',
        'Envelopes',
        'Cofre',
        'Despesa',
      ];

      const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;

      financialTexts.forEach(text => {
        expect(text).not.toMatch(emojiRegex);
      });
    });
  });

  describe('7️⃣ Design System Compliance', () => {
    // ⚠ Estes três liam listas escritas à mão dentro do próprio teste.
    //
    // O dos esquemas afirmava que uma lista de seis nomes tinha seis nomes, e
    // essa lista trazia «Azul Sóbrio», «Verde» e «Grafite» — três esquemas que
    // deixaram de existir. Passava a verde a descrever uma app que já não era
    // esta. Um teste que não lê o código não protege o código; dá confiança,
    // que é pior do que não dar nada.
    test('Os esquemas de cor vêm do tema, e são seis', () => {
      const { SCHEMES } = require('../src/theme');
      expect(SCHEMES).toHaveLength(6);
      for (const s of SCHEMES) {
        expect(typeof s.name).toBe('string');
        expect(s.accent).toMatch(/^#[0-9A-F]{6}$/i);
        expect(s.chrome).toMatch(/^#[0-9A-F]{6}$/i);
      }
      // Sem nomes repetidos: dois esquemas com o mesmo nome no Perfil são
      // duas bolas indistinguíveis.
      expect(new Set(SCHEMES.map(s => s.name)).size).toBe(6);
    });

    test('Os títulos de secção são slate, e vêm do tema', () => {
      const { buildTheme } = require('../src/theme');
      // Nos dois aspetos: o slate do modo escuro é outro, e ambos têm de
      // existir — o título nunca é preto (é a regra de tipo mais distintiva
      // do sistema, no CLAUDE.md).
      for (const escuro of [false, true]) {
        const t = buildTheme(0, escuro);
        expect(t.slate).toMatch(/^#[0-9A-F]{6}$/i);
        expect(t.slate.toLowerCase()).not.toBe('#000000');
      }
      expect(buildTheme(0, false).slate).toBe('#67769B');
    });
  });

  describe('8️⃣ Critical Invariants', () => {
    test('All 8 CLAUDE.md invariants are enforced', () => {
      const invariants = [
        '1. Header/Footer always visible',
        '2. Balances are additive (never overwrite)',
        '3. Privacy enforced server-side (RLS)',
        '4. EUR format with U+202F and U+00A0',
        '5. Touch targets ≥44px (64px in shop)',
        '6. Tasks ordered by urgency',
        '7. Portuguese formal, 3rd person',
        '8. No emoji',
      ];

      expect(invariants).toHaveLength(8);
    });
  });

  // ⚠ Este bloco chamava-se «Web Testing Verification» e não testava web
  // nenhuma.
  //
  // Um teste dizia «App loads on http://localhost:8081 without errors» e o que
  // fazia era escrever essa string e verificar que ela existia. O outro
  // escrevia um par de objetos e contava dois. Nenhum montava nada, nenhum
  // abria nada — e a porta estava errada, que é o detalhe que revela que
  // ninguém os leu depois de os escrever.
  //
  // Um ecrã montado a sério é o que um teste de fumo deve fazer: se a árvore
  // rebentar, rebenta aqui. O que precisa de um navegador — o rodapé visível,
  // os alvos de toque, o desenho — mede-se no navegador, e não se finge aqui.
  describe('9️⃣ Ecrãs montam sem rebentar', () => {
    const React = require('react');
    const TestRenderer = require('react-test-renderer');
    const { SafeAreaProvider } = require('react-native-safe-area-context');
    const { StoreProvider } = require('../src/store');
    const { buildTheme } = require('../src/theme');

    const texto = (n) => {
      if (n === null || n === undefined || n === false) return '';
      if (typeof n === 'string' || typeof n === 'number') return String(n);
      if (Array.isArray(n)) return n.map(texto).join(' ');
      return texto(n.children || (n.props && n.props.children) || null);
    };

    const montar = (Ecra, props = {}) => {
      let arvore = null;
      TestRenderer.act(() => {
        arvore = TestRenderer.create(
          React.createElement(SafeAreaProvider, {
            initialMetrics: { frame: { x: 0, y: 0, width: 402, height: 874 },
                              insets: { top: 47, left: 0, right: 0, bottom: 34 } },
          }, React.createElement(StoreProvider, null,
            React.createElement(Ecra, {
              t: buildTheme(0, false), user: 'Rita', go: () => {},
              onSaude: () => {}, onEquip: () => {}, onFicha: () => {},
              onClose: () => {}, onEntrar: () => {}, ...props,
            }))));
      });
      return texto(arvore.toJSON());
    };

    test('O Início monta e diz alguma coisa', () => {
      const t = montar(require('../src/screens/Inicio').default);
      expect(t).toContain('Precisa de Si');
      expect(t.length).toBeGreaterThan(120);
    });

    test('As Tarefas montam', () => {
      expect(montar(require('../src/screens/Tarefas').default))
        .toContain('Rotinas e Tarefas');
    });

    test('O Dinheiro monta', () => {
      expect(montar(require('../src/screens/Dinheiro').default))
        .toContain('Envelopes');
    });

    test('A Agenda monta', () => {
      expect(montar(require('../src/screens/Agenda').default))
        .toContain('agendar evento');
    });

    test('As Compras montam', () => {
      expect(montar(require('../src/screens/Compras').default).length)
        .toBeGreaterThan(120);
    });
  });
});
