/**
 * Registar uma despesa move o envelope onde ela cai. TODOS os envelopes.
 *
 * ⚠ Era só a Mercearia.
 *
 *   set(x => ({ registered: x.registered + (envelope === 'Mercearia' ? v : 0) }))
 *   used: … + (e.name === 'Mercearia' ? s.registered : 0)
 *
 * Um nome de envelope escrito à mão, duas vezes, nas duas pontas. Sem servidor
 * — que é como a app corre por omissão, e como correu meses — uma despesa em
 * qualquer outro envelope não fazia NADA. Nem o envelope, nem o «Gasto», nem o
 * «Disponível» do topo da app. O dinheiro saía da conta da família e a app
 * continuava a dizer o número de antes.
 *
 * Medido antes de corrigir, casa de demonstração, 12,00 € em cada:
 *
 *   Mercearia        412 → 424   spent 1387 → 1399   ✓
 *   Casa & contas    486 → 486   spent 1387 → 1387   nada
 *   Sair & lazer     171 → 171   spent 1387 → 1387   nada
 *
 * A causa é a idade do código: nasceu quando as únicas despesas da casa eram
 * compras de supermercado. Ficou lá uma condição com um nome no meio, e a app
 * cresceu à volta dela.
 *
 * ⚠ Esta prova não escolhe envelopes. ENUMERA os da casa e passa por todos —
 * é a única forma de não repetir o defeito, que era precisamente ter escolhido
 * um. As 1537 provas de então passavam todas: nenhuma registava uma despesa
 * fora da Mercearia.
 */
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

const gastoDe = (st, nome) => {
  const e = st.envelopes.find(x => x.name === nome);
  return e ? e.used : null;
};

describe('⚠ cada envelope da casa recebe a despesa que é dele', () => {
  // A lista vem da casa, não daqui. Um envelope novo entra nesta prova sozinho.
  const ler0 = loja();
  const NOMES = ler0().envelopes.map(e => e.name);

  it('a casa tem envelopes — senão isto não prova nada', () => {
    expect(NOMES.length).toBeGreaterThan(1);
  });

  it.each(NOMES)('12,00 € em «%s» sobem nesse envelope, e só nesse', (nome) => {
    const ler = loja();
    const antes = Object.fromEntries(ler().envelopes.map(e => [e.name, e.used]));
    const gastoAntes = ler().spent;

    TestRenderer.act(() => {
      ler().registarDespesa({ envelope: nome, valor: 12, pagador: 'Rita', divideMeias: false });
    });

    // O envelope escolhido sobe 12.
    expect(gastoDe(ler(), nome)).toBeCloseTo(antes[nome] + 12, 2);

    // E nenhum outro se mexeu — o defeito ao contrário também é defeito.
    for (const outro of NOMES) {
      if (outro === nome) continue;
      expect(gastoDe(ler(), outro)).toBeCloseTo(antes[outro], 2);
    }

    // ⚠ E o total do ecrã acompanha. Era aqui que se via: o «Gasto» e o
    // «Disponível» do cabeçalho do Início saem desta soma.
    expect(ler().spent).toBeCloseTo(gastoAntes + 12, 2);
  });

  it('e duas despesas no mesmo envelope somam-se, não se substituem', () => {
    // INVARIANTE #2: o gasto é uma soma de movimentos aditivos. Um `=` aqui
    // fazia a segunda despesa apagar a primeira.
    const ler = loja();
    const nome = NOMES[0];
    const antes = gastoDe(ler(), nome);
    TestRenderer.act(() => { ler().registarDespesa({ envelope: nome, valor: 10, pagador: 'Rita' }); });
    TestRenderer.act(() => { ler().registarDespesa({ envelope: nome, valor: 7.5, pagador: 'Tomás' }); });
    expect(gastoDe(ler(), nome)).toBeCloseTo(antes + 17.5, 2);
  });

  // ⚠ E o caso que a primeira correcção deixou de fora, que é o COMUM: a casa
  // já falou com o servidor, ele está em baixo, e regista-se uma despesa. O
  // `gastoPorEnvelope` está cheio de números de ontem, e a despesa de hoje
  // voltava a não aparecer — a causa corrigida e o sintoma igual.
  describe('numa casa que já leu do servidor', () => {
    const comServidor = () => {
      const ler = loja();
      // Como o `puxarCasa` a deixa: um número por envelope, e o local vazio.
      const doServidor = Object.fromEntries(ler().envelopes.map((e, i) => [e.name, 100 + i * 10]));
      TestRenderer.act(() => { ler().set({ gastoPorEnvelope: doServidor, gastoLocal: {} }); });
      return ler;
    };

    it('os envelopes mostram os números do servidor', () => {
      const ler = comServidor();
      ler().envelopes.forEach((e, i) => expect(e.used).toBeCloseTo(100 + i * 10, 2));
    });

    it.each(NOMES)('⚠ e uma despesa de 12,00 € em «%s» SOMA-SE ao número do servidor', (nome) => {
      const ler = comServidor();
      const antes = Object.fromEntries(ler().envelopes.map(e => [e.name, e.used]));
      const gastoAntes = ler().spent;
      TestRenderer.act(() => { ler().registarDespesa({ envelope: nome, valor: 12, pagador: 'Rita' }); });
      expect(gastoDe(ler(), nome)).toBeCloseTo(antes[nome] + 12, 2);
      expect(ler().spent).toBeCloseTo(gastoAntes + 12, 2);
    });

    it('e a leitura seguinte não conta duas vezes — o local esvazia-se', () => {
      const ler = comServidor();
      TestRenderer.act(() => { ler().registarDespesa({ envelope: NOMES[0], valor: 12, pagador: 'Rita' }); });
      expect(gastoDe(ler(), NOMES[0])).toBeCloseTo(112, 2);

      // O servidor responde, já com a despesa incluída. É o `puxarCasa`.
      const novo = Object.fromEntries(ler().envelopes.map((e, i) => [e.name, 100 + i * 10]));
      novo[NOMES[0]] = 112;
      TestRenderer.act(() => { ler().set({ gastoPorEnvelope: novo, gastoLocal: {} }); });

      // 112, não 124. Era este o risco de somar as duas fontes.
      expect(gastoDe(ler(), NOMES[0])).toBeCloseTo(112, 2);
    });
  });

  it('o `registered` é o total do mês, e não o de um envelope só', () => {
    // A descrição dele no `o-que-sobe.js` sempre disse «a soma das despesas
    // DESTE mês». O código dizia «as da Mercearia».
    const ler = loja();
    const antes = ler().s.registered;
    TestRenderer.act(() => {
      for (const nome of NOMES.slice(0, 3)) {
        ler().registarDespesa({ envelope: nome, valor: 5, pagador: 'Rita' });
      }
    });
    expect(ler().s.registered).toBeCloseTo(antes + 15, 2);
  });
});

describe('nenhum nome de envelope está escrito à mão nas contas da loja', () => {
  const fs = require('fs');
  const path = require('path');
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'src', 'store.jsx'), 'utf8');

  // ⚠ Sem os comentários. A primeira versão desta prova falhava nas três linhas
  // que EXPLICAM o defeito — proibia-me de o documentar, que é o contrário do
  // que ela existe para fazer. Um guarda que lê código lê código.
  const semComentarios = codigo
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

  it("⚠ o `'Mercearia'` desapareceu do cálculo do gasto", () => {
    // Duas ocorrências, nas duas pontas do mesmo defeito. O guarda é o nome:
    // um envelope que a família pode renomear ou apagar não pode estar escrito
    // dentro de uma conta.
    expect(semComentarios).not.toMatch(/=== 'Mercearia' \? /);
    expect(semComentarios).not.toMatch(/name === 'Mercearia'/);
  });

  it('e o gasto por envelope tem duas fontes com significados diferentes, não duas cópias', () => {
    // `gastoPorEnvelope` é a verdade do servidor; `gastoLocal` é o que ainda
    // não passou por ele.
    expect(codigo).toMatch(/const gastoLocal = s\.gastoLocal \|\| \{\}/);
  });

  it('⚠ o local SOMA-SE ao do servidor, e não é uma alternativa ao ramo dele', () => {
    // A primeira correcção pôs o `gastoLocal` dentro do ramo de baixo, e por
    // isso só valia numa casa que nunca tivesse falado com o servidor. O
    // parêntesis é a correcção: o ternário escolhe a BASE, e o local soma-se
    // sempre a ela.
    expect(semComentarios).toMatch(
      /used: \(temGastoDoServidor[\s\S]{0,160}\) \+ \(gastoLocal\[e\.name\] \|\| 0\)/);
  });

  it('e esvazia-se na leitura que traz o do servidor, senão conta duas vezes', () => {
    expect(semComentarios).toMatch(/gastoPorEnvelope: casa\.gastoPorEnvelope, gastoLocal: \{\}/);
  });

  it('o `gastoLocal` zera-se com o mês, ao lado do `registered`', () => {
    // Zerar um e deixar o outro punha o «Gasto» a zero com os envelopes ainda
    // a mostrar o mês anterior.
    const zeros = [...codigo.matchAll(/registered: 0,\n(?:\s*\/\/[^\n]*\n)*\s*gastoLocal: \{\},/g)];
    // Abrir o mês e fechar o mês, os dois.
    expect(zeros.length).toBeGreaterThanOrEqual(1);
    expect(codigo).toMatch(/\{ registered: 0, gastoLocal: \{\}, envMove: \{\} \}/);
  });

  it('e nasce nas DUAS funções de arranque, não só numa', () => {
    // A classe de defeito «valor por omissão só no BLANK e não no DEMO», que
    // já apareceu duas vezes com o `healthArchived`.
    const { DEMO, SEM_DINHEIRO_SEMEADO, BLANK } = require('../src/store');
    expect(DEMO().gastoLocal).toEqual({});
    expect(SEM_DINHEIRO_SEMEADO().gastoLocal).toEqual({});
    expect(BLANK().gastoLocal).toEqual({});
  });
});
