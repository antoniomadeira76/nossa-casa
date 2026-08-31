/**
 * O histórico de preços da casa.
 *
 * Estas provas são sobre o que a app pode DIZER a partir do que a família
 * pagou. Um conselho errado sobre onde ir ao sábado custa uma viagem, e a
 * fronteira entre «sei» e «acho» é o que aqui se prova.
 */

const {
  chaveDoArtigo, observacao, precosDe, estimativaDe, custoPorLoja, compararLojas,
} = require('../src/precos');

const obs = (rotulo, loja, valor, dia) => observacao({ rotulo, loja, valor, dia });

const HISTORICO = [
  obs('Banana · 1 kg', 'Lidl', 1.29, 'd2026-08-01'),
  obs('Banana · 1 kg', 'Lidl', 1.19, 'd2026-08-15'),
  obs('Banana · 1 kg', 'Continente', 1.45, 'd2026-08-08'),
  obs('Leite · 6 un', 'Continente', 4.20, 'd2026-08-08'),
];

describe('A chave é o nome, não o identificador', () => {
  // A lista é semanal: a banana desta semana é um artigo novo com um id novo.
  // O que se repete é o nome.
  test('o mesmo artigo escrito de duas maneiras é o mesmo artigo', () => {
    expect(chaveDoArtigo('Banana · 1 kg')).toBe(chaveDoArtigo('banana  ·  1 KG'));
    expect(chaveDoArtigo('Maçã reineta')).toBe(chaveDoArtigo('maca reineta'));
  });

  test('e dois artigos diferentes não se confundem', () => {
    expect(chaveDoArtigo('Banana · 1 kg')).not.toBe(chaveDoArtigo('Banana · 2 kg'));
  });

  test('o rótulo original guarda-se, para o ecrã o poder mostrar', () => {
    expect(obs('Banana · 1 kg', 'Lidl', 1.29, 'd2026-08-01').rotulo).toBe('Banana · 1 kg');
  });
});

describe('O que se sabe de um artigo, loja a loja', () => {
  test('agrupa por loja e conta as vezes', () => {
    const p = precosDe(HISTORICO, 'Banana · 1 kg');
    expect(p.map(x => x.loja)).toEqual(['Lidl', 'Continente']);
    expect(p.find(x => x.loja === 'Lidl').vezes).toBe(2);
  });

  test('do mais barato para o mais caro, que é a ordem da pergunta', () => {
    const p = precosDe(HISTORICO, 'Banana · 1 kg');
    expect(p[0].loja).toBe('Lidl');
    expect(p[0].ultimo).toBe(1.19);
  });

  test('a média é uma soma das observações, não um total gravado', () => {
    const lidl = precosDe(HISTORICO, 'Banana · 1 kg').find(x => x.loja === 'Lidl');
    expect(lidl.media).toBe(1.24);        // (1,29 + 1,19) / 2
  });

  // Duas compras registadas fora de ordem davam um «último preço» do mês
  // passado — e é o último preço que decide.
  test('«último» é o mais recente por data, e não o último a ser gravado', () => {
    const desordenado = [
      obs('Pão', 'Lidl', 0.99, 'd2026-08-20'),
      obs('Pão', 'Lidl', 1.50, 'd2026-08-02'),   // gravado depois, mais antigo
    ];
    expect(precosDe(desordenado, 'Pão')[0].ultimo).toBe(0.99);
  });

  test('um artigo que nunca se comprou não inventa nada', () => {
    expect(precosDe(HISTORICO, 'Caviar')).toEqual([]);
  });
});

describe('A estimativa diz de onde veio', () => {
  // Um ecrã que mostra uma estimativa sem dizer se ela é um palpite ou uma
  // memória não ajuda a decidir.
  test('da loja onde se vai comprar, quando se conhece', () => {
    const e = estimativaDe(HISTORICO, { label: 'Banana · 1 kg', est: 2 }, 'Lidl');
    expect(e).toMatchObject({ valor: 1.19, origem: 'loja', loja: 'Lidl', vezes: 2 });
  });

  test('de outra loja, quando não se conhece esta — e diz qual', () => {
    const e = estimativaDe(HISTORICO, { label: 'Leite · 6 un', est: 5 }, 'Lidl');
    expect(e).toMatchObject({ valor: 4.20, origem: 'outra-loja', loja: 'Continente' });
  });

  test('e do que está escrito na lista, quando não se conhece nada', () => {
    const e = estimativaDe(HISTORICO, { label: 'Caviar', est: 80 }, 'Lidl');
    expect(e).toMatchObject({ valor: 80, origem: 'escrito', loja: null, vezes: 0 });
  });

  test('sem histórico e sem estimativa escrita, é zero e não undefined', () => {
    expect(estimativaDe([], { label: 'Nada' }, 'Lidl').valor).toBe(0);
  });
});

describe('Quanto custa esta lista em cada loja', () => {
  const LISTA = [
    { label: 'Banana · 1 kg', est: 2 },
    { label: 'Leite · 6 un', est: 5 },
    { label: 'Caviar', est: 80 },
  ];

  test('soma o que sabe e cai no escrito para o resto', () => {
    const c = custoPorLoja(HISTORICO, LISTA, ['Lidl', 'Continente']);
    const lidl = c.find(x => x.loja === 'Lidl');
    expect(lidl.total).toBe(1.19 + 5 + 80);      // só a banana é conhecida
    expect(lidl.conhecidos).toBe(1);
    expect(lidl.deQuantos).toBe(3);
  });

  // Um total baixo porque só se conhece um artigo de vinte não é uma loja
  // barata — é uma loja desconhecida. O ecrã precisa dos dois números.
  test('conta quantos artigos conhece, para o total se poder ler', () => {
    const c = custoPorLoja(HISTORICO, LISTA, ['Continente']);
    expect(c[0].conhecidos).toBe(2);
    expect(c[0].total).toBe(1.45 + 4.20 + 80);
  });

  // ⚠ O total NÃO serve para comparar lojas, e esta prova é que o diz.
  //
  // Onde um artigo não se conhece, o total usa a estimativa escrita — que é
  // quase sempre mais alta do que o preço real. O Continente sai «mais barato»
  // aqui só porque se conhece lá o leite: 4,20 € reais contra 5 € escritos.
  // Não é mais barato; é mais conhecido.
  test('o total ordena, mas NÃO compara — quem conhece mais parece mais barato', () => {
    const c = custoPorLoja(HISTORICO, LISTA, ['Continente', 'Lidl']);
    expect(c[0].loja).toBe('Continente');
    // e no entanto o Continente é MAIS CARO nos dois artigos que ambas conhecem
    expect(precosDe(HISTORICO, 'Banana · 1 kg').find(x => x.loja === 'Continente').ultimo)
      .toBeGreaterThan(precosDe(HISTORICO, 'Banana · 1 kg').find(x => x.loja === 'Lidl').ultimo);
  });
});

describe('A comparação só se mostra quando tem valor', () => {
  const LISTA = [{ label: 'Banana · 1 kg', est: 2 }, { label: 'Leite · 6 un', est: 5 }];

  // Só sobre o que se conhece nas DUAS. É menos ambicioso e é a única coisa
  // que se pode afirmar.
  test('compara só os artigos comuns, e diz sobre quantos', () => {
    const comuns = [
      obs('Pão', 'Lidl', 0.89, 'd2026-08-10'), obs('Pão', 'Continente', 1.10, 'd2026-08-10'),
      obs('Arroz', 'Lidl', 1.20, 'd2026-08-10'), obs('Arroz', 'Continente', 1.35, 'd2026-08-10'),
      obs('Azeite', 'Lidl', 5.99, 'd2026-08-10'), obs('Azeite', 'Continente', 6.49, 'd2026-08-10'),
    ];
    const lista = [{ label: 'Pão', est: 1 }, { label: 'Arroz', est: 2 },
                   { label: 'Azeite', est: 7 }, { label: 'Caviar', est: 80 }];
    const r = compararLojas(comuns, lista, ['Lidl', 'Continente']);
    expect(r.loja).toBe('Lidl');
    expect(r.sobre).toBe(3);            // o caviar não conta: não se conhece
    expect(r.deQuantos).toBe(4);
    expect(r.poupanca).toBeCloseTo((1.10 + 1.35 + 6.49) - (0.89 + 1.20 + 5.99), 2);
  });

  // O caso que motivou a mudança: uma loja mais cara em tudo o que se conhece
  // não pode ganhar por conhecer mais artigos.
  test('a loja mais conhecida não ganha por isso', () => {
    const r = compararLojas(HISTORICO, LISTA, ['Lidl', 'Continente'], 1);
    expect(r.loja).toBe('Lidl');        // mais barato na banana, o único comum
    expect(r.sobre).toBe(1);
  });

  // Ruído com aspeto de conselho é pior do que silêncio.
  test('com poucos artigos em comum, cala-se', () => {
    expect(compararLojas(HISTORICO, LISTA, ['Lidl', 'Continente'])).toBeNull();
  });

  test('com uma loja só, não há comparação a fazer', () => {
    expect(compararLojas(HISTORICO, LISTA, ['Lidl'], 1)).toBeNull();
  });

  test('e um empate não é um conselho', () => {
    const iguais = [
      obs('Pão', 'Lidl', 1.00, 'd2026-08-01'),
      obs('Pão', 'Continente', 1.00, 'd2026-08-01'),
    ];
    expect(compararLojas(iguais, [{ label: 'Pão', est: 1 }], ['Lidl', 'Continente'], 1)).toBeNull();
  });

  test('sem histórico nenhum, não se diz nada', () => {
    expect(compararLojas([], LISTA, ['Lidl', 'Continente'], 1)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// O ciclo inteiro, na loja: escreve-se o preço no corredor, fecha-se a conta, e
// a ida seguinte já sabe. É aqui que o motor deixa de ser uma biblioteca e
// passa a ser uma coisa que a casa usa.
describe('Da prateleira ao histórico', () => {
  const React = require('react');
  const TestRenderer = require('react-test-renderer');
  const { StoreProvider, useStore } = require('../src/store');

  const loja = () => {
    let api = null;
    const Sonda = () => { api = useStore(); return null; };
    TestRenderer.act(() => {
      TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
    });
    return () => api;
  };
  const ARTIGOS = [{ id: 'ban', label: 'Banana · 1 kg', est: 2 },
                   { id: 'pao', label: 'Pão de forma', est: 1.5 }];

  test('escrever um preço guarda-o como rascunho, não como histórico', () => {
    const o = loja();
    TestRenderer.act(() => { o().definirPrecoPago('ban', '1,19'); });
    expect(o().s.precoPago.ban).toBe(1.19);
    expect(o().precos).toEqual([]);        // ainda não é histórico
  });

  test('a vírgula é aceite, que é como se escreve em português', () => {
    const o = loja();
    TestRenderer.act(() => { o().definirPrecoPago('ban', '1,19'); });
    expect(o().s.precoPago.ban).toBe(1.19);
  });

  test('apagar o campo tira o rascunho, em vez de guardar zero', () => {
    const o = loja();
    TestRenderer.act(() => { o().definirPrecoPago('ban', '1,19'); });
    TestRenderer.act(() => { o().definirPrecoPago('ban', ''); });
    expect(o().s.precoPago.ban).toBeUndefined();
  });

  test('fechar a conta transforma o rascunho em observações, com loja e dia', () => {
    const o = loja();
    TestRenderer.act(() => {
      o().definirPrecoPago('ban', '1,19');
      o().definirPrecoPago('pao', '1,05');
    });
    TestRenderer.act(() => { o().registarPrecos(ARTIGOS, 'Lidl'); });
    const p = o().precos;
    expect(p.length).toBe(2);
    expect(p.every(x => x.loja === 'Lidl')).toBe(true);
    expect(p.every(x => x.dia)).toBe(true);
    // e o rascunho limpa-se, senão a ida seguinte começava com os preços da anterior
    expect(o().s.precoPago).toEqual({});
  });

  test('os artigos sem preço escrito não entram no histórico', () => {
    const o = loja();
    TestRenderer.act(() => { o().definirPrecoPago('ban', '1,19'); });
    TestRenderer.act(() => { o().registarPrecos(ARTIGOS, 'Lidl'); });
    expect(o().precos.map(x => x.rotulo)).toEqual(['Banana · 1 kg']);
  });

  // O ciclo fechado: é isto que a funcionalidade promete.
  test('a ida seguinte sabe quanto custou, e onde', () => {
    const o = loja();
    TestRenderer.act(() => { o().definirPrecoPago('ban', '1,19'); });
    TestRenderer.act(() => { o().registarPrecos(ARTIGOS, 'Lidl'); });

    const noLidl = o().precoDe({ label: 'Banana · 1 kg', est: 2 }, 'Lidl');
    expect(noLidl).toMatchObject({ valor: 1.19, origem: 'loja', loja: 'Lidl' });

    // E noutra loja diz que ainda não sabe ali, mas sabe onde soube.
    const noContinente = o().precoDe({ label: 'Banana · 1 kg', est: 2 }, 'Continente');
    expect(noContinente).toMatchObject({ valor: 1.19, origem: 'outra-loja', loja: 'Lidl' });
  });

  // Fechar a conta duas vezes por engano não pode inventar uma segunda compra.
  test('registar a mesma compra duas vezes não duplica o histórico', () => {
    const o = loja();
    TestRenderer.act(() => { o().definirPrecoPago('ban', '1,19'); });
    TestRenderer.act(() => { o().registarPrecos(ARTIGOS, 'Lidl'); });
    TestRenderer.act(() => { o().definirPrecoPago('ban', '1,19'); });
    TestRenderer.act(() => { o().registarPrecos(ARTIGOS, 'Lidl'); });
    expect(o().precos.length).toBe(1);
  });

  // Mas dois preços diferentes no mesmo dia são duas observações — pode ter-se
  // comprado duas vezes, ou corrigido o valor.
  test('e um preço diferente no mesmo dia é uma observação nova', () => {
    const o = loja();
    TestRenderer.act(() => { o().definirPrecoPago('ban', '1,19'); });
    TestRenderer.act(() => { o().registarPrecos(ARTIGOS, 'Lidl'); });
    TestRenderer.act(() => { o().definirPrecoPago('ban', '1,29'); });
    TestRenderer.act(() => { o().registarPrecos(ARTIGOS, 'Lidl'); });
    expect(o().precos.length).toBe(2);
  });

  // INVARIANTE #2: o histórico é aditivo. Duas idas ao supermercado no mesmo
  // sábado, em dois telemóveis, não se podem apagar uma à outra.
  test('o histórico só cresce — nunca se reescreve', () => {
    const o = loja();
    TestRenderer.act(() => { o().definirPrecoPago('ban', '1,19'); });
    TestRenderer.act(() => { o().registarPrecos(ARTIGOS, 'Lidl'); });
    const primeiro = o().precos[0];
    TestRenderer.act(() => { o().definirPrecoPago('pao', '1,05'); });
    TestRenderer.act(() => { o().registarPrecos(ARTIGOS, 'Continente'); });
    expect(o().precos.length).toBe(2);
    expect(o().precos[0]).toEqual(primeiro);   // o primeiro ficou intacto
  });
});

describe('O campo vazio e o zero são coisas diferentes', () => {
  const React = require('react');
  const TestRenderer = require('react-test-renderer');
  const { StoreProvider, useStore } = require('../src/store');
  const loja = () => {
    let api = null;
    const Sonda = () => { api = useStore(); return null; };
    TestRenderer.act(() => {
      TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
    });
    return () => api;
  };

  // Um artigo oferecido custa mesmo zero, e isso é uma observação legítima.
  test('um zero escrito guarda-se', () => {
    const o = loja();
    TestRenderer.act(() => { o().definirPrecoPago('ban', '0'); });
    expect(o().s.precoPago.ban).toBe(0);
  });

  test('e o campo vazio apaga', () => {
    const o = loja();
    TestRenderer.act(() => { o().definirPrecoPago('ban', '2'); });
    TestRenderer.act(() => { o().definirPrecoPago('ban', '   '); });
    expect(o().s.precoPago.ban).toBeUndefined();
  });

  test('texto que não é número também apaga, em vez de gravar NaN', () => {
    const o = loja();
    TestRenderer.act(() => { o().definirPrecoPago('ban', '2'); });
    TestRenderer.act(() => { o().definirPrecoPago('ban', 'abc'); });
    expect(o().s.precoPago.ban).toBeUndefined();
  });
});

describe('O talão bate certo', () => {
  const fs2 = require('fs'), path2 = require('path');
  const sem = (p) => fs2.readFileSync(path2.join(__dirname, '..', p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  // As linhas mostravam a estimativa e o total somava o pago: 2,10 + 1,60 numa
  // conta de 2,24. Um talão cujas linhas não somam o total faz duvidar do
  // total, que é a única coisa que ali interessa.
  test('as linhas do carrinho mostram o que se pagou, não a estimativa', () => {
    expect(sem('src/sheets/Carrinho.jsx')).toMatch(/pago \? pago\(i\)/);
    expect(sem('src/screens/ModoCompras.jsx')).toMatch(/<Carrinho[\s\S]{0,120}pago=\{pago\}/);
  });

  test('e o total soma a mesma coisa que as linhas mostram', () => {
    const src = sem('src/screens/ModoCompras.jsx');
    expect(src).toMatch(/const cart = doneItems\.reduce\(\(a, i\) => a \+ pago\(i\), 0\)/);
  });
});
