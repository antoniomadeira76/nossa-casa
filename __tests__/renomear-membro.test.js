/**
 * Renomear um membro.
 *
 * Na loja local o nome não é um rótulo: é a chave que liga tarefas, eventos,
 * cofres, fichas de saúde, PIN, papéis e esquemas de cor. Renomear é uma
 * migração, e uma migração incompleta não dá erro — dá uma tarefa atribuída a
 * um nome que já não existe, que desaparece do filtro sem se queixar.
 *
 * Por isso a prova principal não confere uma lista de campos. Anda pelo estado
 * todo e exige que o nome antigo não sobreviva em sítio nenhum estrutural: se
 * alguém acrescentar um campo com um nome lá dentro e se esquecer da tabela em
 * `renomearNoEstado`, isto cai.
 */

const React = require('react');
const TestRenderer = require('react-test-renderer');
const { StoreProvider, useStore, renomearNoEstado, DEMO, resumoPin } = require('../src/store');

// Um estado com uma entrada de cada forma que a tabela conhece, e texto livre
// pelo meio — que não se deve tocar.
const cheio = () => ({
  ...DEMO(),
  membros: {
    'Léo': { initial: 'L', kid: true, fem: false },
    'Rita': { initial: 'R', kid: false, fem: true },
  },
  roles: { 'Léo': 'crianca', 'Rita': 'admin' },
  pins: { 'Léo': resumoPin('Léo', '2470'), 'Rita': 'x' },
  paidPts: { 'Léo': 7 },
  schemeByUser: { 'Léo': 2 },
  themeByUser: { 'Léo': 'escuro' },
  newTasks: [{ id: 't1', who: 'Léo', title: 'Levar o Léo à escola' }],
  taskEdits: { lixo: { who: 'Léo' } },
  added: [{ id: 'e1', owner: 'Léo', responsaveis: ['Léo', 'Rita'], title: 'Consulta do Léo' }],
  eventEdits: { e9: { owner: 'Léo', responsaveis: ['Rita'] } },
  vaultMoves: [{ id: 'v1', kid: 'Léo', delta: 5, label: 'Semanada do Léo' }],
  health: [{ id: 'h1', member: 'Léo', specialty: 'Dentista' }],
  healthDocs: [{ id: 'd1', member: 'Léo', title: 'Receita' }],
  healthNotes: { h1: [{ id: 'n1', author: 'Rita', text: 'O Léo tolerou bem' }] },
  shopPlan: { who: 'Léo', day: 'd2026-08-23' },
  registo: [{ t: 'Léo entrou na casa', at: 1 }],
});

// Onde é que este texto aparece no estado — como chave ou como valor.
const ondeAparece = (v, alvo, caminho = '') => {
  const achados = [];
  if (v === null || v === undefined) return achados;
  if (typeof v === 'string') { if (v === alvo) achados.push(caminho); return achados; }
  if (Array.isArray(v)) {
    v.forEach((x, i) => achados.push(...ondeAparece(x, alvo, caminho + '[' + i + ']')));
    return achados;
  }
  if (typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (k === alvo) achados.push(caminho + '.{' + k + '}');
      achados.push(...ondeAparece(x, alvo, caminho + '.' + k));
    }
  }
  return achados;
};

describe('Renomear leva tudo atrás', () => {
  // O texto livre é o único sítio onde o nome antigo pode ficar — e fica de
  // propósito: reescrever o que alguém escreveu é presumir que todos os «Léo»
  // daquele texto são este Léo.
  const TEXTO_LIVRE = [
    '.newTasks[0].title', '.added[0].title',
    '.vaultMoves[0].label', '.healthNotes.h1[0].text',
    '.registo[0].t',
  ];

  test('o nome antigo não sobrevive em sítio nenhum estrutural', () => {
    const depois = renomearNoEstado(cheio(), 'Léo', 'Leonardo');
    const sobrou = ondeAparece(depois, 'Léo').filter(c => !TEXTO_LIVRE.includes(c));
    expect(sobrou).toEqual([]);
  });

  // A prova acima só vale se a sonda vir alguma coisa. Sem isto, um estado
  // vazio passaria e eu ficava convencido de que estava provado.
  test('e a sonda vê mesmo, antes de renomear', () => {
    const sobrou = ondeAparece(cheio(), 'Léo').filter(c => !TEXTO_LIVRE.includes(c));
    // ⚠ O número é um CHÃO — «a sonda vê muitos sítios» —, não uma fotografia
    // do estado de hoje. Desceu de 16 para 15 quando o `importDone` saiu das
    // `DATA_KEYS` por ninguém o ler, e isso é uma chave a menos, não uma sonda
    // pior. Baixar este limite só se justifica quando um sítio DEIXA de existir;
    // se descer sem que nada tenha saído, é a sonda que cegou.
    expect(sobrou.length).toBeGreaterThanOrEqual(15);
  });

  test('o nome novo chegou a todos os sítios que a tabela diz', () => {
    const d = renomearNoEstado(cheio(), 'Léo', 'Leonardo');
    expect(Object.keys(d.membros)).toContain('Leonardo');
    expect(d.roles['Leonardo']).toBe('crianca');
    expect(d.paidPts['Leonardo']).toBe(7);
    expect(d.schemeByUser['Leonardo']).toBe(2);
    expect(d.themeByUser['Leonardo']).toBe('escuro');
    // O `importDone` saiu daqui em 05/09/2026: estava nas `DATA_KEYS`, nascia
    // no `DEMO()`, e ninguém o lia. Ver `nenhuma-chave-sem-quem-a-leia`.
    expect(d.newTasks[0].who).toBe('Leonardo');
    expect(d.taskEdits.lixo.who).toBe('Leonardo');
    expect(d.added[0].owner).toBe('Leonardo');
    expect(d.added[0].responsaveis).toEqual(['Leonardo', 'Rita']);
    expect(d.eventEdits.e9.owner).toBe('Leonardo');
    expect(d.vaultMoves[0].kid).toBe('Leonardo');
    expect(d.health[0].member).toBe('Leonardo');
    expect(d.healthDocs[0].member).toBe('Leonardo');
    expect(d.shopPlan.who).toBe('Leonardo');
  });

  test('e ninguém mais é tocado', () => {
    const d = renomearNoEstado(cheio(), 'Léo', 'Leonardo');
    expect(d.eventEdits.e9.responsaveis).toEqual(['Rita']);
    expect(d.healthNotes.h1[0].author).toBe('Rita');
    expect(d.roles['Rita']).toBe('admin');
    expect(d.pins['Rita']).toBe('x');
  });

  test('a inicial acompanha o nome', () => {
    expect(renomearNoEstado(cheio(), 'Léo', 'Zé').membros['Zé'].initial).toBe('Z');
  });

  // O resumo do PIN é calculado com o nome lá dentro. Não há como recalculá-lo
  // sem o valor em claro, que ninguém tem — e um resumo que não valida é pior
  // do que um PIN em falta, porque parece definido e não deixa entrar.
  test('o PIN sai, em vez de ficar a não validar', () => {
    const d = renomearNoEstado(cheio(), 'Léo', 'Leonardo');
    expect(d.pins['Leonardo']).toBeUndefined();
    expect(d.pins['Léo']).toBeUndefined();
  });

  test('o texto que as pessoas escreveram fica como está', () => {
    const d = renomearNoEstado(cheio(), 'Léo', 'Leonardo');
    expect(d.newTasks[0].title).toBe('Levar o Léo à escola');
    expect(d.vaultMoves[0].label).toBe('Semanada do Léo');
    expect(d.healthNotes.h1[0].text).toBe('O Léo tolerou bem');
    expect(d.registo[0].t).toBe('Léo entrou na casa');
  });

  test('não perde nem inventa registos', () => {
    const antes = cheio(), depois = renomearNoEstado(antes, 'Léo', 'Leonardo');
    for (const k of ['newTasks', 'added', 'vaultMoves', 'health', 'healthDocs']) {
      expect(depois[k].length).toBe(antes[k].length);
    }
    for (const k of ['membros', 'roles', 'paidPts', 'schemeByUser']) {
      expect(Object.keys(depois[k]).length).toBe(Object.keys(antes[k]).length);
    }
  });

  test('renomear para o mesmo nome não mexe em nada', () => {
    const antes = cheio();
    expect(renomearNoEstado(antes, 'Léo', 'Léo')).toEqual(antes);
  });
});

describe('renomearMembro, na loja', () => {
  const ler = () => {
    let api = null;
    const Sonda = () => { api = useStore(); return null; };
    TestRenderer.act(() => {
      TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
    });
    return () => api;
  };
  const chamar = async (obter, ...args) => {
    let r;
    await TestRenderer.act(async () => { r = await obter().renomearMembro(...args); });
    return r;
  };

  test('recusa o que está mal antes de falar com o servidor', async () => {
    const o = ler();
    expect(await chamar(o, 'Léo', '  ')).toBe('O membro precisa de um nome.');
    expect(await chamar(o, 'Léo', 'Mia')).toMatch(/Já existe/);
    expect(await chamar(o, 'Ana', 'Joana')).toMatch(/não existe nesta casa/);
    expect(await chamar(o, 'Léo', 'x'.repeat(31))).toMatch(/30 caracteres/);
  });

  test('sem servidor recusa e explica — e a casa fica como estava', async () => {
    const o = ler();
    expect(await chamar(o, 'Léo', 'Leonardo')).toContain('demonstração');
    expect(o().membrosDaCasa).toEqual(['Rita', 'Tomás', 'Léo', 'Mia']);
  });

  test('renomear para o mesmo nome passa sem fazer nada', async () => {
    expect(await chamar(ler(), 'Léo', 'Léo')).toBeNull();
  });
});
