/**
 * ⚠ O `puxarCasa` CORRE — de ponta a ponta, sobre uma casa inteira.
 *
 * ── O que aconteceu ──────────────────────────────────────────────────────────
 *
 * 12/09/2026: com o servidor a responder 200 às trinta coleções, a leitura da
 * casa acabou no `catch` do `lerDoServidor` — que devolve `false` como se o
 * servidor estivesse em baixo — e a app ficou com a família de demonstração.
 * O ecrã disse ao dono da casa que ele «não faz parte desta casa». A causa era
 * um `ReferenceError` no `puxarCasa`: uma função chamada antes de o `import`
 * dela existir, entre duas edições ao ficheiro que o servidor de
 * desenvolvimento estava a servir ao vivo.
 *
 * Nenhum guarda o apanhava: o `o-que-desce-e-usado` lê o `sync.js` como TEXTO,
 * e as provas do servidor correm o `puxarCasa` só contra casas de prova. Um
 * erro de código a fingir-se de servidor em baixo é a pior forma de falhar —
 * não há nada vermelho em lado nenhum.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * Com a ligação simulada a devolver uma casa com TODAS as coleções que o
 * `ler.casa()` puxa, o `puxarCasa` devolve sem atirar, com os membros e o nome
 * da casa, e sem um único campo `undefined` — e o `lerDoServidor` da loja, ao
 * receber isso, deixa de ser demonstração.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

// A casa que o servidor devolveria: uma linha em cada coleção que o
// `ler.casa()` pede, com os nomes de campo do `criar-colecoes.mjs`.
const HOJE = new Date().toISOString().slice(0, 10);
const mockCasa = {
  casas: [{ id: 'c1', nome: 'Madeira', valor_ponto: 0.1, dia_pagamento: 0, divide_meias: true, rendimento_mensal: 3000 }],
  membros: [
    { id: 'm1', nome: 'António', papel: 'admin', email: 'a@x.pt', login: 'c1_António' },
    { id: 'm2', nome: 'Rita', papel: 'adulto', email: 'r@x.pt', fem: true },
    { id: 'm3', nome: 'Léo', papel: 'crianca', login: 'c1_Léo', pin_definido: true },
  ],
  eventos: [{ id: 'ev1', dia: `${HOJE} 00:00:00.000Z`, hora: '18:00', titulo: 'Reunião', autor: 'm1', visibilidade: 'familia' }],
  tarefas: [{ id: 't1', titulo: 'Lixo', atribuido_a: 'm3', pontos: 2, recorrencia: 'diaria', urgencia: 1, posto: 0 }],
  tarefas_feitas: [{ id: 'f1', tarefa: 't1', data: `${HOJE} 00:00:00.000Z`, marcada_por: 'm1', confirmada_por: 'm1', confirmada_em: `${HOJE} 20:00:00.000Z` }],
  envelopes: [{ id: 'e1', nome: 'Mercearia', limite_base: 450, cor: null }],
  despesas: [{ id: 'd1', envelope: 'e1', valor: 12.5, data: `${HOJE} 00:00:00.000Z`, pagador: 'm1', divide_meias: true, idem_key: 'k1' }],
  cofre_movimentos: [{ id: 'cm1', membro: 'm3', tipo: 'semanada', valor: 1.4, pontos: 14, data: `${HOJE} 00:00:00.000Z`, motivo: 'Semanada' }],
  equipamentos: [{ id: 'eq1', nome: 'Frigorífico', categoria: 'cat1', comprado_em: '2024-01-10 00:00:00.000Z', garantia_ate: '2027-01-10 00:00:00.000Z', preco: 600 }],
  transferencias: [{ id: 'tr1', de_envelope: 'e1', para_envelope: 'e1', valor: 5, mes: `${HOJE} 00:00:00.000Z`, por: 'm1' }],
  acertos: [{ id: 'ac1', de_membro: 'm2', para_membro: 'm1', valor: 10, data: `${HOJE} 00:00:00.000Z` }],
  especialidades: [{ id: 'es1', nome: 'Pediatria' }],
  categorias_equip: [{ id: 'cat1', nome: 'Cozinha' }],
  lojas: [{ id: 'l1', nome: 'Continente' }],
  seccoes: [{ id: 's1', nome: 'Mercearia', posto: 1 }],
  listas_compras: [{ id: 'lc1', loja: 'l1', comprador: 'm1', planeada_para: `${HOJE} 10:00:00.000Z` },
    { id: 'lc0', loja: 'l1', comprador: 'm1', fechada_em: `${HOJE} 18:00:00.000Z`, total: 42 }],
  artigos: [{ id: 'a1', lista: 'lc1', rotulo: 'Arroz', corredor: 's1', estado: 'por_comprar', pedido_por: 'm2', visibilidade: 'familia', posto: 1 }],
  preferencias: [{ id: 'p1', membro: 'm1', esquema_cor: 2, aspeto: 'claro', resumo_ativo: true, resumo_hora: '20:00', aviso_prazo_dias: 1 }],
  meses: [{ id: 'mes1', mes: `${HOJE.slice(0, 7)}-01 00:00:00.000Z`, rendimento: 3000, limites: { Mercearia: 450 } }],
  registo: [{ id: 'r1', texto: 'Mês aberto', quem: 'm1', area: 'Dinheiro', quando: `${HOJE} 09:00:00.000Z` }],
  metas: [{ id: 'mt1', nome: 'Férias', alvo: 1000, quando: '2027-07' }],
  meta_movimentos: [{ id: 'mm1', meta: 'mt1', valor: 50, motivo: 'Saldo', por: 'm1', data: `${HOJE} 00:00:00.000Z` }],
  objetivos_cofre: [{ id: 'oc1', membro: 'm3', nome: 'Bicicleta', alvo: 120 }],
  contas_fixas: [{ id: 'cf1', nome: 'Renda', valor: 850, dia: 1, envelope: 'e1', quem_paga: 'm1' }],
  contratos: [{ id: 'ct1', nome: 'Seguro', fornecedor: 'F', renova_em: '2027-03-01 00:00:00.000Z', responsavel: 'm1' }],
  trocas_tarefas: [],
  pratos: [{ id: 'pr1', nome: 'Sopa', ingredientes: [{ rotulo: 'Cenoura', s: 'Mercearia' }] }],
  ementa: [{ id: 'em1', dia: `${HOJE} 00:00:00.000Z`, prato: 'pr1' }],
};

// A gravação corre a sério aqui — a loja fica «pronta» depois do arranque e
// grava o que leu —, e o `jest.fn()` do `jest.setup.js` devolve `undefined`
// onde a loja espera uma promessa. Um disco em memória, como em `migracoes`.
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

jest.mock('../src/pocketbase', () => ({
  estaLigado: () => true,
  configurar: () => {},
  pb: { authStore: { record: null, token: '' }, collection: () => ({}) },
  auth: { valida: () => true, membro: () => ({ id: 'm1', nome: 'António', casa: 'c1', papel: 'admin' }), sair: () => {} },
  ler: { casa: async () => mockCasa, ficheiro: () => null, colecao: async () => [] },
  escrever: { criar: async () => ({}), esvaziar: async () => 0 },
  google: { disponivel: () => false, porLigar: () => false, verificar: async () => false },
}));

describe('⚠ a leitura da casa corre de ponta a ponta', () => {
  it('a casa de prova tem TODAS as coleções que o `ler.casa()` pede — senão isto não prova nada', () => {
    const pb = ler('src/pocketbase.js');
    const i = pb.indexOf('const COLECOES = [');
    const bloco = pb.slice(i, pb.indexOf('];', i));
    const pedidas = [...bloco.matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
    expect(pedidas.length).toBeGreaterThan(20);
    const emFalta = pedidas.filter(c => !(c in mockCasa));
    expect(emFalta).toEqual([]);
  });

  it('⚠ o `puxarCasa` devolve sem atirar, com os membros e a casa, e sem campos `undefined`', async () => {
    const sync = require('../src/sync');
    const casa = await sync.puxarCasa();
    expect(casa).toBeTruthy();
    expect(Object.keys(casa.membros)).toEqual(['António', 'Rita', 'Léo']);
    expect(casa.nomeDaCasa).toBe('Madeira');
    expect(casa.casaId).toBe('c1');
    const indefinidos = Object.entries(casa).filter(([, v]) => v === undefined).map(([k]) => k);
    expect(indefinidos).toEqual([]);
    // As somas que a app mostra, feitas sobre as linhas de cima.
    expect(casa.registered).toBe(12.5);
    expect(casa.gastoPorEnvelope).toEqual({ Mercearia: 12.5 });
    expect(casa.paidPts).toEqual({ Léo: 14 });
    expect(casa.extractos).toHaveLength(1);
    // O que SAIU são as três espécies que tiram dinheiro à casa: a despesa de
    // 12,50, a semanada de 1,40 e os 50,00 juntados à meta. A transferência
    // entre envelopes (5,00) e o acerto entre os adultos (10,00) aparecem no
    // extracto e NÃO contam — o dinheiro mudou de gaveta e de mão, e a casa
    // ficou com o mesmo.
    expect(casa.extractos[0]).toMatchObject({ aberto: true, entrou: 3000, saiu: 12.5 + 1.4 + 50 });
    expect(casa.extractos[0].movimentos.filter(m => m.neutro).map(m => m.valor).sort()).toEqual([10, 5]);
    expect(casa.newTasks).toHaveLength(1);
    expect(casa.done).toEqual({ t1: true });
    expect(casa.contratos[0]).toMatchObject({ nome: 'Seguro', responsavel: 'António' });
  });

  it('⚠ e a loja, ao recebê-la, deixa de ser a demonstração — o António passa a estar na casa', async () => {
    const React = require('react');
    const TestRenderer = require('react-test-renderer');
    const { StoreProvider, useStore } = require('../src/store');
    let api = null;
    const Sonda = () => { api = useStore(); return null; };
    await TestRenderer.act(async () => {
      TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
    });
    let ok = null;
    await TestRenderer.act(async () => { ok = await api.lerDoServidor(); });
    expect(ok).toBe(true);
    expect(api.deDemonstracao).toBe(false);
    expect(api.nomeDaCasa).toBe('Madeira');
    expect(Object.keys(api.membros)).toEqual(['António', 'Rita', 'Léo']);
    expect(api.extractosDaCasa()[0].nome).toMatch(/de 20\d\d$/);
  });

  it('⚠ OUTRA casa no mesmo aparelho começa do zero — a cópia local da anterior não fica a mostrar-se', async () => {
    // 13/09/2026: a administradora de uma casa vazia entrou num telemóvel onde
    // antes entrara outra família, e viu o jantar, as tarefas e a garantia do
    // frigorífico dessa família. A leitura só substituía o que vinha cheio.
    const React = require('react');
    const TestRenderer = require('react-test-renderer');
    const { StoreProvider, useStore } = require('../src/store');
    let api = null;
    const Sonda = () => { api = useStore(); return null; };
    await TestRenderer.act(async () => {
      TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
    });
    await TestRenderer.act(async () => { await api.lerDoServidor(); });
    expect(api.s.casaDoServidor).toBe('c1');
    expect(api.allTasks().length).toBeGreaterThan(0);
    expect(api.s.contratos.length).toBeGreaterThan(0);

    // A Ana, de outra casa, sem nada: só a casa e ela própria.
    const guardado = { ...mockCasa };
    for (const k of Object.keys(mockCasa)) mockCasa[k] = [];
    mockCasa.casas = [{ id: 'c2', nome: 'Vazia', valor_ponto: 0.1 }];
    mockCasa.membros = [{ id: 'm9', nome: 'Ana', papel: 'admin', email: 'ana@x.pt', fem: true }];
    try {
      await TestRenderer.act(async () => { await api.lerDoServidor(); });
      expect(api.s.casaDoServidor).toBe('c2');
      expect(api.nomeDaCasa).toBe('Vazia');
      expect(Object.keys(api.membros)).toEqual(['Ana']);
      expect(api.allTasks()).toEqual([]);
      expect(api.s.contratos).toEqual([]);
      expect(api.s.added).toEqual([]);
      expect(api.s.newEquip).toEqual([]);
      expect(api.s.shopHistory).toEqual([]);
    } finally {
      for (const k of Object.keys(guardado)) mockCasa[k] = guardado[k];
    }
  });

  it('o `catch` do `lerDoServidor` já não engole o erro em silêncio', () => {
    const loja = ler('src/store.jsx');
    const i = loja.indexOf('const lerDoServidor = async');
    const fim = loja.indexOf('\n  };', i);
    expect(loja.slice(i, fim)).toMatch(/console\.warn\('\[lerDoServidor\]/);
  });
});
