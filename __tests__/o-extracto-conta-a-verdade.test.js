/**
 * O EXTRACTO CONTA A VERDADE — cada movimento, e a soma do que se mostra
 * =====================================================================
 *
 * 17/09/2026. O extracto mensal é DERIVADO das linhas que já existem, e nunca
 * gravado ao fechar o mês. Estas provas guardam as três coisas que o tornam
 * confiável, e que se perdem sozinhas se ninguém as vigiar:
 *
 *  1. um mês FECHADO não muda quando o seguinte abre (INVARIANTE #2 aplicado a
 *     um extracto: as linhas ficam onde estão e a soma é a mesma);
 *  2. o extracto e o RETRATO concordam sobre o mesmo mês — os dois filtram pelo
 *     mesmo intervalo e pelo mesmo `anula_id`, e dois ecrãs a dizer números
 *     diferentes sobre setembro é a pior coisa que uma app de dinheiro faz;
 *  3. os três números do cabeçalho são a SOMA DA LISTA que o ecrã mostra, e não
 *     uma contagem ao lado dela.
 */
const { extractosDe, nomeDoMesDoExtracto } = require('../src/extracto-do-mes');

const NOMES = { r: 'Rita', t: 'Tomás', leo: 'Léo', mia: 'Mia' };

// Uma casa com dois meses: setembro (fechado a 30) e outubro (aberto a 01).
const casaDeExemplo = () => ({
  meses: [
    { id: 'm9', mes: '2026-09-01', rendimento: 2020, fechado_em: '2026-09-30', limites: {} },
    { id: 'm10', mes: '2026-10-01', rendimento: 2020, fechado_em: null, limites: {} },
  ],
  envelopes: [
    { id: 'e1', nome: 'Mercearia', limite_base: 590 },
    { id: 'e2', nome: 'Casa & contas', limite_base: 780 },
  ],
  metas: [{ id: 'g1', nome: 'Bicicleta da Mia' }],
  membros: [
    { id: 'r', nome: 'Rita', papel: 'adulto' },
    { id: 't', nome: 'Tomás', papel: 'adulto' },
    { id: 'leo', nome: 'Léo', papel: 'crianca' },
  ],
  despesas: [
    { id: 'd1', envelope: 'e1', valor: 62.4, descricao: 'Pingo Doce', data: '2026-09-17', pagador: 'r', divide_meias: true },
    { id: 'd2', envelope: 'e2', valor: 650, descricao: 'Renda', data: '2026-09-08', pagador: 't', conta_fixa: 'c1' },
    // Em OUTUBRO — não pode aparecer no extracto de setembro.
    { id: 'd3', envelope: 'e1', valor: 41.1, descricao: 'Continente', data: '2026-10-03', pagador: 'r' },
  ],
  cofre_movimentos: [
    { id: 'c1', membro: 'leo', tipo: 'semanada', valor: 4.2, pontos: 14, data: '2026-09-15', autorizado_por: 'r' },
  ],
  meta_movimentos: [
    { id: 'g1m', meta: 'g1', valor: 30, motivo: 'Reforço de setembro', data: '2026-09-20', por: 't' },
  ],
  acertos: [
    { id: 'a1', de_membro: 't', para_membro: 'r', valor: 83.67, data: '2026-09-12' },
  ],
  transferencias: [
    { id: 'tr1', de_envelope: 'e2', para_envelope: 'e1', valor: 25, mes: '2026-09-22', por: 'r' },
  ],
  tarefas: [], tarefas_feitas: [], listas_compras: [],
});

const setembroDe = (casa) => extractosDe(casa, NOMES).find(e => e.nome === 'Setembro de 2026');

describe('o extracto do mês', () => {
  it('dá um extracto por mês, do mais recente para o mais antigo', () => {
    const es = extractosDe(casaDeExemplo(), NOMES);
    expect(es.map(e => e.nome)).toEqual(['Outubro de 2026', 'Setembro de 2026']);
    expect(es[0].aberto).toBe(true);
    expect(es[1].aberto).toBe(false);
    expect(es[1].fechadoEm).toBe('d2026-09-30');
  });

  it('junta as CINCO espécies de movimento, mais a abertura do mês', () => {
    const set = setembroDe(casaDeExemplo());
    expect(set.movimentos.map(m => m.especie).sort()).toEqual(
      ['acerto', 'cofre', 'despesa', 'despesa', 'meta', 'rendimento', 'transferencia']);
  });

  it('cada movimento diz quanto, quando e QUEM', () => {
    const set = setembroDe(casaDeExemplo());
    const compra = set.movimentos.find(m => m.chave === 'despesa:d1');
    expect(compra).toMatchObject({ data: '2026-09-17', quem: 'Rita', titulo: 'Pingo Doce', detalhe: 'Mercearia', valor: -62.4 });
    // O cofre é de quem AUTORIZA — a criança vai no detalhe.
    const cofre = set.movimentos.find(m => m.chave === 'cofre:c1');
    expect(cofre).toMatchObject({ quem: 'Rita', detalhe: 'Cofre · Léo', valor: -4.2 });
    const acerto = set.movimentos.find(m => m.chave === 'acerto:a1');
    expect(acerto).toMatchObject({ quem: 'Tomás', titulo: 'Acerto de contas com Rita' });
  });

  it('vem do mais RECENTE para o mais antigo, e a abertura fica no fim', () => {
    const datas = setembroDe(casaDeExemplo()).movimentos.map(m => m.data);
    expect(datas).toEqual([...datas].sort().reverse());
    expect(datas[datas.length - 1]).toBe('2026-09-01');
  });

  it('o saldo corrente desce a cada saída e começa no rendimento', () => {
    const movs = setembroDe(casaDeExemplo()).movimentos;
    const saldoDe = (chave) => movs.find(m => m.chave === chave).saldo;
    expect(saldoDe('mes:m9')).toBe(2020);            // 2020
    expect(saldoDe('despesa:d2')).toBe(1370);        // − 650 (renda, dia 8)
    expect(saldoDe('cofre:c1')).toBe(1365.8);        // − 4,20 (semanada, dia 15)
    expect(saldoDe('despesa:d1')).toBe(1303.4);      // − 62,40 (compras, dia 17)
    expect(saldoDe('meta:g1m')).toBe(1273.4);        // − 30 (meta, dia 20)
  });

  it('⚠ a ABERTURA do mês vem primeiro no dia dela, e o saldo não mergulha', () => {
    // O defeito de 18/09/2026, numa captura do dono da casa: o mês abriu a
    // 01/09 e a casa gastou nesse mesmo dia. O desempate era só alfabético e
    // `despesa:` vem antes de `mes:` — o «Rendimento do mês» aparecia A MEIO
    // do dia 1, e o saldo corrente ia a −165,00 € antes de o dinheiro entrar.
    // A soma final estava certa e o ecrã dizia que a casa tinha ficado a dever.
    const casa = casaDeExemplo();
    casa.despesas.push(
      { id: 'dA', envelope: 'e1', valor: 165, descricao: 'Compras do mês', data: '2026-09-01', pagador: 'r' },
      { id: 'dB', envelope: 'e2', valor: 24.99, descricao: 'Gás', data: '2026-09-01', pagador: 't' },
    );
    const movs = setembroDe(casa).movimentos;
    const noDia1 = movs.filter(m => m.data === '2026-09-01');
    // A lista vem do mais recente para o mais antigo, por isso a abertura é a
    // ÚLTIMA das linhas do dia 1 — e no ecrã fica por baixo de todas elas.
    expect(noDia1[noDia1.length - 1].especie).toBe('rendimento');
    // E nenhum saldo do mês é negativo: o rendimento entrou antes de se gastar.
    expect(movs.filter(m => !m.neutro).every(m => m.saldo > 0)).toBe(true);
    const saldoDe = (chave) => movs.find(m => m.chave === chave).saldo;
    expect(saldoDe('mes:m9')).toBe(2020);
    expect(saldoDe('despesa:dA')).toBe(1855);        // − 165
    expect(saldoDe('despesa:dB')).toBe(1830.01);     // − 24,99
  });

  it('um acerto e uma transferência APARECEM e NÃO mexem no saldo', () => {
    const movs = setembroDe(casaDeExemplo()).movimentos;
    const acerto = movs.find(m => m.chave === 'acerto:a1');
    const transf = movs.find(m => m.chave === 'transferencia:tr1');
    // Aparecem, com valor e com pessoa — é dinheiro que se moveu.
    expect(acerto.valor).toBe(83.67);
    expect(transf.valor).toBe(25);
    expect(acerto.neutro).toBe(true);
    expect(transf.neutro).toBe(true);
    // ⚠ E o saldo de cada um é o da linha ANTERIOR: o dinheiro mudou de mão e
    // de gaveta, e a casa ficou com o mesmo. Somá-los seria dizer que entraram
    // 83,67 € em casa, e não entraram.
    expect(acerto.saldo).toBe(1370);   // igual ao de depois da renda
    expect(transf.saldo).toBe(1273.4); // igual ao de depois da meta
  });

  it('os três números do cabeçalho são a SOMA DA LISTA que se mostra', () => {
    const set = setembroDe(casaDeExemplo());
    const daLista = set.movimentos.filter(m => !m.neutro);
    const entrou = daLista.filter(m => m.valor >= 0).reduce((n, m) => n + m.valor, 0);
    const saiu = -daLista.filter(m => m.valor < 0).reduce((n, m) => n + m.valor, 0);
    expect(set.entrou).toBeCloseTo(entrou, 2);
    expect(set.saiu).toBeCloseTo(saiu, 2);
    expect(set.sobrou).toBeCloseTo(entrou - saiu, 2);
    expect(set.sobrou).toBe(1273.4);
  });

  it('um mês FECHADO não muda quando o seguinte abre', () => {
    // A prova do INVARIANTE #2 aplicado a um extracto. Setembro fechou; abrir
    // novembro e gastar lá não pode mexer uma vírgula em setembro.
    const antes = setembroDe(casaDeExemplo());
    const depois = casaDeExemplo();
    depois.meses.push({ id: 'm11', mes: '2026-11-01', rendimento: 2100, fechado_em: null, limites: {} });
    depois.meses.find(m => m.id === 'm10').fechado_em = '2026-10-31';
    depois.despesas.push({ id: 'd9', envelope: 'e1', valor: 500, descricao: 'Novembro', data: '2026-11-04', pagador: 'r' });
    expect(setembroDe(depois)).toEqual(antes);
  });

  it('CONCORDA com o «gasto» que o ecrã do Dinheiro soma para o mesmo mês', () => {
    // O `registered` do `sync.js` é a soma das despesas não anuladas do mês
    // aberto, e é o número que o cartão do topo do Dinheiro mostra. Se estes
    // dois divergirem, um ecrã diz que outubro custou X e o outro diz Y — que
    // é a pior coisa que uma app de dinheiro faz. A conta está aqui escrita
    // como o `sync.js` a faz, para que uma mudança lá parta isto.
    const casa = casaDeExemplo();
    const aberto = extractosDe(casa, NOMES).find(e => e.aberto);
    const inicioDoMes = '2026-10-01';
    const registered = casa.despesas
      .filter(d => !d.anula_id && String(d.data).slice(0, 10) >= inicioDoMes)
      .reduce((n, d) => n + d.valor, 0);
    const despesasDoExtracto = aberto.movimentos
      .filter(m => m.especie === 'despesa')
      .reduce((n, m) => n - m.valor, 0);
    expect(despesasDoExtracto).toBeCloseTo(registered, 2);
    expect(aberto.inicio).toBe(`d${inicioDoMes}`);
  });

  it('uma despesa ANULADA não entra — o mesmo filtro do resto da app', () => {
    const casa = casaDeExemplo();
    casa.despesas.push({ id: 'd1x', envelope: 'e1', valor: 62.4, descricao: 'Anula o Pingo Doce', data: '2026-09-18', pagador: 'r', anula_id: 'd1' });
    const set = setembroDe(casa);
    expect(set.movimentos.some(m => m.chave === 'despesa:d1x')).toBe(false);
  });

  it('uma linha SEM data não entra em mês nenhum', () => {
    // ⚠ A armadilha que o `sync.js` documenta: `String(undefined).slice(0,10)`
    // é `"undefine"`, que é MAIOR do que `"2026-09-01"` em ordem alfabética —
    // uma linha sem data contava em todos os meses, para sempre.
    const casa = casaDeExemplo();
    casa.despesas.push({ id: 'dsem', envelope: 'e1', valor: 999, descricao: 'Sem data', pagador: 'r' });
    const todos = extractosDe(casa, NOMES);
    expect(todos.some(e => e.movimentos.some(m => m.chave === 'despesa:dsem'))).toBe(false);
  });

  it('a ordem é a MESMA em duas leituras da mesma casa', () => {
    // Sem desempate estável, dois movimentos do mesmo dia trocavam de sítio
    // entre leituras e o saldo de cada linha mudava à frente de quem lia.
    const casa = casaDeExemplo();
    const baralhada = { ...casa, despesas: [...casa.despesas].reverse() };
    expect(setembroDe(baralhada).movimentos.map(m => m.chave))
      .toEqual(setembroDe(casa).movimentos.map(m => m.chave));
  });

  it('uma casa sem meses não dá extracto nenhum, e não rebenta', () => {
    expect(extractosDe({}, {})).toEqual([]);
    expect(extractosDe({ meses: [], despesas: [{ id: 'x', valor: 3, data: '2026-09-01' }] }, {})).toEqual([]);
  });

  it('nomeia o mês em português', () => {
    expect(nomeDoMesDoExtracto('2026-09-01')).toBe('Setembro de 2026');
    expect(nomeDoMesDoExtracto('d2026-01-15')).toBe('Janeiro de 2026');
    expect(nomeDoMesDoExtracto('lixo')).toBe('');
  });
});
