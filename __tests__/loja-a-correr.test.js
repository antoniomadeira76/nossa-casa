/**
 * A loja a correr — não o código-fonte dela.
 *
 * Os outros ficheiros lêem texto: apanham «este nome está escrito à mão», mas
 * não apanham «esta constante não existe no âmbito onde é lida». Foi
 * exatamente isso que apareceu no navegador depois de tirar os nomes daqui —
 * um `ReferenceError` que nenhuma das 138 provas de leitura via.
 *
 * Aqui monta-se o StoreProvider a sério e lê-se o que ele devolve.
 */

const React = require('react');
const TestRenderer = require('react-test-renderer');
const { StoreProvider, useStore } = require('../src/store');


// Monta a loja e devolve a api que ela expõe.
const montar = () => {
  let api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
  });
  return api;
};

describe('A loja monta e responde', () => {
  test('monta sem rebentar', () => {
    expect(montar()).toBeTruthy();
  });

  test('a casa de demonstração tem dois adultos e duas crianças', () => {
    const st = montar();
    expect(st.membrosDaCasa).toEqual(['Rita', 'Tomás', 'Léo', 'Mia']);
    expect(st.adultos).toEqual(['Rita', 'Tomás']);
    expect(st.criancas).toEqual(['Léo', 'Mia']);
  });

  // O defeito que só o navegador viu: `ACERTO_INICIAL` lido dentro de `build`.
  test('o acerto entre adultos está calculado, não indefinido', () => {
    const { acerto, acertado } = montar();
    expect(acerto).not.toBeNull();
    expect(acerto.devedor).toBe('Tomás');
    expect(acerto.credor).toBe('Rita');
    expect(acerto.valor).toBeCloseTo(86.5);
    expect(acerto.pago).toBe(0);
    expect(acertado).toBe(false);
  });

  test('a concordância de género segue o quadro da casa', () => {
    const { oNome, aoNome, artigo, deNome } = montar();
    expect(oNome('Rita')).toBe('A Rita');
    expect(oNome('Tomás')).toBe('O Tomás');
    expect(aoNome('Rita')).toBe('à Rita');
    expect(aoNome('Tomás')).toBe('ao Tomás');
    expect(artigo('Mia')).toBe('a');
    expect(deNome('Léo')).toBe('do');
  });

  test('os pontos das crianças arrancam nas sementes', () => {
    const { kidPts } = montar();
    expect(Object.keys(kidPts)).toEqual(['Léo', 'Mia']);
    expect(kidPts['Léo']).toBeGreaterThanOrEqual(14);
    expect(kidPts['Mia']).toBeGreaterThanOrEqual(11);
  });

  // Tudo o que os ecrãs desestruturam tem de existir E não ser undefined.
  // O teste de leitura só confirma que o nome aparece no `return`.
  test('nada do que a loja expõe sai indefinido', () => {
    const st = montar();
    const indefinidos = Object.entries(st)
      .filter(([, v]) => v === undefined)
      .map(([k]) => k);
    expect(indefinidos).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// O ponto de tudo isto: uma casa que não é a da demonstração. Enquanto os
// nomes estiveram escritos à mão, acrescentar uma Ana dava-lhe um avatar e
// mais nada.
describe('Uma casa diferente da de demonstração', () => {
  const CASA_NOVA = {
    'Ana':    { initial: 'A', kid: false, fem: true,  email: 'ana@exemplo.pt' },
    'Bruno':  { initial: 'B', kid: false, fem: false, email: 'bruno@exemplo.pt' },
    'Carlos': { initial: 'C', kid: true,  fem: false },
    'Dina':   { initial: 'D', kid: true,  fem: true  },
    'Eva':    { initial: 'E', kid: true,  fem: true  },
  };

  // Monta a loja, troca o quadro da casa, e devolve a api já com o novo quadro.
  const casaNova = () => {
    let api = null;
    const Sonda = () => { api = useStore(); return null; };
    let r;
    TestRenderer.act(() => {
      r = TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
    });
    TestRenderer.act(() => { api.set({ membros: CASA_NOVA, nomeDaCasa: 'Ferreira' }); });
    r.update(React.createElement(StoreProvider, null, React.createElement(Sonda)));
    return api;
  };

  test('os cinco membros contam, e as crianças são as três', () => {
    const st = casaNova();
    expect(st.membrosDaCasa).toEqual(['Ana', 'Bruno', 'Carlos', 'Dina', 'Eva']);
    expect(st.adultos).toEqual(['Ana', 'Bruno']);
    expect(st.criancas).toEqual(['Carlos', 'Dina', 'Eva']);
    expect(st.nomeDaCasa).toBe('Ferreira');
  });

  test('as três crianças têm pontos — e começam a zero, sem herdar histórico', () => {
    const { kidPts } = casaNova();
    expect(Object.keys(kidPts)).toEqual(['Carlos', 'Dina', 'Eva']);
    for (const n of ['Carlos', 'Dina', 'Eva']) expect(kidPts[n]).toBe(0);
  });

  test('o acerto é entre os dois adultos desta casa, com a concordância certa', () => {
    const { acerto, oNome, aoNome } = casaNova();
    expect(acerto.credor).toBe('Ana');
    expect(acerto.devedor).toBe('Bruno');
    expect(`${oNome(acerto.devedor)} deve ${aoNome(acerto.credor)}`).toBe('O Bruno deve à Ana');
  });

  test('cada membro novo tem uma cor da paleta, e nenhuma fica sem', () => {
    const { corDoMembro } = require('../src/theme');
    const { membrosDaCasa } = casaNova();
    for (const n of membrosDaCasa) expect(corDoMembro(n)).toMatch(/^#[0-9A-F]{6}$/i);
  });

  // INVARIANTE #2 numa casa qualquer: o acerto continua a somar-se. Isto é o
  // caso dos dois telefones — cada adulto acerta metade, e a conta fecha uma
  // vez. Com o booleano `settled` que estava aqui, a primeira metade fechava a
  // conta e a segunda não tinha onde entrar: 43,25 € desapareciam.
  test('acertar metade duas vezes fecha a conta; à primeira, não', () => {
    // a sonda reatribui `api` a cada render, por isso lê-se sempre a atual
    let api = null;
    const Sonda = () => { api = useStore(); return null; };
    TestRenderer.act(() => {
      TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
    });
    TestRenderer.act(() => { api.set({ membros: CASA_NOVA }); });

    expect(api.acerto.valor).toBeCloseTo(86.5);
    expect(api.acertado).toBe(false);

    TestRenderer.act(() => { api.pagarAcerto(43.25, 'metade'); });
    expect(api.acerto.pago).toBeCloseTo(43.25);
    expect(api.acerto.valor).toBeCloseTo(43.25);
    expect(api.acertado).toBe(false);        // meia conta não é conta fechada

    TestRenderer.act(() => { api.pagarAcerto(43.25, 'metade'); });
    expect(api.acerto.pago).toBeCloseTo(86.5);
    expect(api.acerto.valor).toBe(0);
    expect(api.acertado).toBe(true);

    // e nunca fica negativo, mesmo que alguém pague a mais
    TestRenderer.act(() => { api.pagarAcerto(10, 'a mais'); });
    expect(api.acerto.valor).toBe(0);
  });

  // Numa casa de um adulto não há nada a acertar, e a secção não pode
  // rebentar a ler `adultos[1]`.
  test('uma casa de um adulto não tem acerto — e não rebenta', () => {
    let api = null;
    const Sonda = () => { api = useStore(); return null; };
    TestRenderer.act(() => {
      TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
    });
    TestRenderer.act(() => {
      api.set({ membros: { 'Ana': { initial: 'A', kid: false, fem: true },
                           'Dina': { initial: 'D', kid: true, fem: true } } });
    });
    expect(api.adultos).toEqual(['Ana']);
    expect(api.acerto).toBeNull();
    expect(api.acertado).toBe(true);      // nada por acertar é acertado
  });
});
