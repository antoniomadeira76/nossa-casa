/**
 * As migrações, e o que acontece quando uma falha.
 *
 * A cadeia converte a loja de uma versão para a seguinte. O que este ficheiro
 * guarda não é só «as migrações estão certas» — é o caminho quando UMA está
 * errada, que é onde uma casa se perde.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');

jest.mock('../src/pocketbase', () => ({
  estaLigado: () => false,
  auth: { valida: () => false, membro: () => null },
  ler: {},
  google: { disponivel: () => false, porLigar: () => false, porSaber: () => false,
            verificar: async () => false },
}));

// O `jest.setup.js` substitui o AsyncStorage por `jest.fn()` vazios, que não
// guardam nada. Aqui é preciso um disco a sério: o que se está a verificar é
// exactamente o que fica escrito nele.
jest.mock('@react-native-async-storage/async-storage', () => {
  const disco = new Map();
  return {
    getItem: async (k) => (disco.has(k) ? disco.get(k) : null),
    setItem: async (k, v) => { disco.set(k, String(v)); },
    removeItem: async (k) => { disco.delete(k); },
    clear: async () => { disco.clear(); },
    multiGet: async (ks) => ks.map(k => [k, disco.get(k) ?? null]),
    multiSet: async (ps) => { for (const [k, v] of ps) disco.set(k, String(v)); },
  };
});

const AsyncStorage = require('@react-native-async-storage/async-storage');
const { MIGRATIONS, SCHEMA, StoreProvider, useStore } = require('../src/store');

// Uma loja como a que esteve no navegador: v8, com eventos, esquema e registo.
const LOJA_V8 = {
  v: 8,
  added: [
    { id: 'a', title: 'teste', date: '2026-08-14', visibilidade: 'familia' },
    { id: 'b', title: 'teste 31/8', day: 'd2026-08-31', visibilidade: 'so-eu' },
  ],
  eventEdits: { 'evt-1': { idGoogle: 'jab9amr0so4t' } },
  schemeByUser: { 'António': 1 },
  googleCalendarImported: { 'gcal-1': true },
  registo: [{ t: 'A casa passou a chamar-se Madeira', at: 1 }],
};

describe('a cadeia aguenta a loja que esteve no navegador', () => {
  const correr = (inicial) => {
    let s = inicial;
    for (let n = 9; n <= SCHEMA; n++) if (MIGRATIONS[n]) s = MIGRATIONS[n](s);
    return s;
  };

  it('não atira, e não perde nada pelo caminho', () => {
    let s;
    expect(() => { s = correr(LOJA_V8); }).not.toThrow();
    expect(s.added).toHaveLength(2);
    // o `date` órfão vira chave com prefixo — v9
    expect(s.added[0].day).toBe('d2026-08-14');
    expect(s.eventEdits['evt-1'].idGoogle).toBe('jab9amr0so4t');
    expect(s.registo).toHaveLength(1);
    // violeta era o índice 1 na lista antiga e é o 0 na nova — v10
    expect(s.schemeByUser['António']).toBe(0);
  });

  it('aguenta uma loja sem nenhum destes campos', () => {
    expect(() => correr({ v: 8 })).not.toThrow();
  });

  it('aguenta campos com a forma errada', () => {
    // Se uma migração atirar aqui, o carregamento tem de PRESERVAR o disco —
    // é o que o bloco seguinte verifica.
    expect(() => correr({ v: 8, added: null, eventEdits: null,
                          schemeByUser: null, registo: null })).not.toThrow();
  });

  it('o SCHEMA alcança a última migração', () => {
    // Uma migração acima do SCHEMA nunca corre; um SCHEMA acima da última
    // deixa passar dados por converter. Foi por este buraco que quatro
    // eventos ficaram invisíveis durante duas semanas.
    const numeros = Object.keys(MIGRATIONS).map(Number);
    expect(Math.max(...numeros)).toBe(SCHEMA);
  });
});

describe('uma migração que falha não apaga a casa', () => {
  // ── O caminho que existia ──────────────────────────────────────────────────
  //
  //   1. uma migração atira
  //   2. um `catch` genérico engole o erro, a dizer «armazenamento indisponível»
  //   3. o estado fica o INICIAL
  //   4. `ready` fica verdadeiro na mesma
  //   5. o efeito de gravação escreve o estado inicial por cima de tudo, com
  //      `v: SCHEMA` — e a migração nunca mais volta a correr
  //
  // Eventos, cofre, histórico de preços: tudo, em silêncio.
  const KEY = 'nossa-casa/v1';

  const montar = async () => {
    const Sonda = () => { useStore(); return null; };
    let arvore;
    await TestRenderer.act(async () => {
      arvore = TestRenderer.create(
        React.createElement(StoreProvider, null, React.createElement(Sonda)));
      await Promise.resolve();
    });
    // deixa correr o efeito de gravação, se ele for correr
    await TestRenderer.act(async () => { await new Promise(r => setTimeout(r, 30)); });
    return arvore;
  };

  beforeEach(async () => { await AsyncStorage.clear(); jest.restoreAllMocks(); });

  it('o disco fica intacto quando a migração atira', async () => {
    const gravado = JSON.stringify(LOJA_V8);
    await AsyncStorage.setItem(KEY, gravado);

    // Uma migração da cadeia passa a atirar, como um descuido faria.
    const original = MIGRATIONS[SCHEMA];
    MIGRATIONS[SCHEMA] = () => { throw new Error('descuido numa migração'); };
    jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await montar();
      expect(await AsyncStorage.getItem(KEY)).toBe(gravado);
    } finally {
      MIGRATIONS[SCHEMA] = original;
    }
  });

  it('a cópia vive numa chave fixa, uma só', async () => {
    // Era `.antes-de-v${v}`: cada migração deixava uma cópia nova e nenhuma
    // saía — `antes-de-v9`, `antes-de-v10`, `antes-de-v11`… casas velhas a
    // ocupar o armazenamento do telemóvel para sempre. Viu-se uma no
    // navegador ao fim de uma tarde.
    await AsyncStorage.setItem(KEY, JSON.stringify(LOJA_V8));
    // uma cópia de uma versão anterior, deixada atrás
    await AsyncStorage.setItem(`${KEY}.antes-de-v7`, 'lixo antigo');
    await montar();
    expect(await AsyncStorage.getItem(`${KEY}.antes-de-v7`)).toBeNull();
    expect(await AsyncStorage.getItem(`${KEY}.antes-de-v8`)).toBeNull();
    expect(await AsyncStorage.getItem(`${KEY}.antes-da-migracao`)).toBe(JSON.stringify(LOJA_V8));
  });

  it('e fica uma cópia do que lá estava, antes de lhe mexer', async () => {
    const gravado = JSON.stringify(LOJA_V8);
    await AsyncStorage.setItem(KEY, gravado);
    const original = MIGRATIONS[SCHEMA];
    MIGRATIONS[SCHEMA] = () => { throw new Error('descuido numa migração'); };
    jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await montar();
      expect(await AsyncStorage.getItem(`${KEY}.antes-da-migracao`)).toBe(gravado);
    } finally {
      MIGRATIONS[SCHEMA] = original;
    }
  });

  it('e diz o que falhou, em vez de falar do disco', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(LOJA_V8));
    const original = MIGRATIONS[SCHEMA];
    MIGRATIONS[SCHEMA] = () => { throw new Error('descuido numa migração'); };
    const erro = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await montar();
      const ditas = erro.mock.calls.map(c => String(c[0])).join(' ');
      expect(ditas).toMatch(/migração/i);
      expect(ditas).toMatch(/NÃO foram tocados/);
    } finally {
      MIGRATIONS[SCHEMA] = original;
    }
  });

  it('com a migração boa, grava normalmente', async () => {
    // A guarda não pode ficar ligada por engano: uma loja sã tem de continuar
    // a gravar, senão isto trocava uma perda por outra.
    await AsyncStorage.setItem(KEY, JSON.stringify(LOJA_V8));
    await montar();
    const depois = JSON.parse(await AsyncStorage.getItem(KEY));
    expect(depois.v).toBe(SCHEMA);
    expect(depois.added).toHaveLength(2);
  });
});

describe('o plano de compras não aponta para quem não existe', () => {
  // Visto no ecrã: «Compras de domingo · Domingo, 23/08» com um avatar «?».
  // O `who` era «Tomás» — o segundo adulto da casa de DEMONSTRAÇÃO — numa casa
  // que só tem o António. `MEMBROS['Tomás']` é `undefined`, o avatar sai «?» e
  // a cor sai cinzenta. E o `day` era a data fixa antiga, de há duas semanas.
  //
  // É a mesma família dos nomes escritos à mão que se tiraram do código: este
  // estava nos DADOS gravados, e por isso sobreviveu à limpeza.
  const { chaveRelativa, TODAY } = require('../src/format');
  const doze = (loja) => MIGRATIONS[12](loja);

  const casaComUmAdulto = {
    v: 11,
    membros: { 'António': { initial: 'A', email: 'a@exemplo.pt' } },
  };

  it('reaponta para o adulto da casa', () => {
    const r = doze({ ...casaComUmAdulto,
      shopPlan: { who: 'Tomás', day: chaveRelativa(3), time: '10:30', store: 0 } });
    expect(r.shopPlan.who).toBe('António');
  });

  it('não mexe em quem JÁ é da casa', () => {
    const plano = { who: 'António', day: chaveRelativa(3), time: '10:30', store: 0 };
    expect(doze({ ...casaComUmAdulto, shopPlan: plano }).shopPlan).toEqual(plano);
  });

  it('prefere um adulto a uma criança', () => {
    const r = doze({
      v: 11,
      membros: { 'Léo': { kid: true }, 'Rita': { email: 'r@exemplo.pt' } },
      shopPlan: { who: 'Tomás', day: chaveRelativa(3), time: '10:30', store: 0 },
    });
    // Ir às compras é uma tarefa de adulto; e a criança não tem e-mail nem
    // conta própria (§8).
    expect(r.shopPlan.who).toBe('Rita');
  });

  it('⚠ sem quadro gravado NÃO inventa um nome', () => {
    // A casa vem do servidor: o nome pode ser válido lá e o quadro só chegar
    // depois. Apagá-lo aqui seria pior do que deixá-lo.
    const plano = { who: 'Tomás', day: chaveRelativa(3), time: '10:30', store: 0 };
    expect(doze({ v: 11, shopPlan: plano }).shopPlan.who).toBe('Tomás');
    expect(doze({ v: 11, membros: {}, shopPlan: plano }).shopPlan.who).toBe('Tomás');
  });

  it('um dia que já passou vira o próximo domingo', () => {
    const r = doze({ ...casaComUmAdulto,
      shopPlan: { who: 'António', day: chaveRelativa(-14), time: '10:30', store: 0 } });
    const p = /^d(\d{4})-(\d{2})-(\d{2})$/.exec(r.shopPlan.day);
    expect(p).not.toBeNull();
    expect(new Date(+p[1], +p[2] - 1, +p[3]).getDay()).toBe(0);   // domingo
    const hoje = new Date(TODAY.y, TODAY.m, TODAY.d);
    expect(new Date(+p[1], +p[2] - 1, +p[3]).getTime()).toBeGreaterThanOrEqual(hoje.getTime());
  });

  it('um dia futuro fica onde está', () => {
    const dia = chaveRelativa(5);
    const r = doze({ ...casaComUmAdulto,
      shopPlan: { who: 'António', day: dia, time: '10:30', store: 0 } });
    expect(r.shopPlan.day).toBe(dia);
  });

  it('sem plano nenhum não rebenta', () => {
    expect(() => doze({ v: 11 })).not.toThrow();
    expect(doze({ v: 11 }).shopPlan).toBeUndefined();
  });

  it('a hora e a loja não se tocam', () => {
    const r = doze({ ...casaComUmAdulto,
      shopPlan: { who: 'Tomás', day: chaveRelativa(-1), time: '09:15', store: 2 } });
    expect(r.shopPlan.time).toBe('09:15');
    expect(r.shopPlan.store).toBe(2);
  });
});
