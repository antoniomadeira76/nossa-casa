/**
 * ⚠ Toda a área da app tem descrição escrita, e toda a descrição tem área.
 *
 * ── Porque é que esta prova existe ───────────────────────────────────────────
 *
 * O «Como funciona» junta duas listas pelo NOME da área: o `AREAS`, escrito à
 * mão, diz o que cada uma faz; o `REGISTO_APP` diz o que mudou em cada uma. A
 * junção é por string.
 *
 * Uma string que não bate certo não dá erro nenhum — dá uma secção sem
 * alterações e outra sem descrição, as duas com ar de estarem bem. «Gestão da
 * Casa» contra «Gestão da casa» chegava.
 *
 * ── E o que a prova não deixa esquecer ───────────────────────────────────────
 *
 * Quem acrescentar uma área ao registo de alterações tem de escrever o que ela
 * faz, ali e nesse momento. Era isso que faltava: o ecrã descrevia doze áreas
 * pelas suas CORREÇÕES e nenhuma pelo que é.
 */
const { AREAS, AMBITO, REGISTO_APP } = require('../src/registo-app');

const NO_REGISTO = [...new Set(REGISTO_APP.map(r => r.a))].sort();
const ESCRITAS = AREAS.map(a => a.area);

describe('⚠ a Documentação descreve o que a app faz', () => {
  it('há áreas para conferir — senão isto não prova nada', () => {
    expect(ESCRITAS.length).toBeGreaterThanOrEqual(10);
    expect(NO_REGISTO.length).toBeGreaterThanOrEqual(10);
  });

  it('⚠ nenhuma área do registo fica sem descrição escrita', () => {
    // A mensagem diz QUAIS — é o nome que se copia para o `AREAS`.
    const semDescricao = NO_REGISTO.filter(a => !ESCRITAS.includes(a));
    expect(semDescricao).toEqual([]);
  });

  it('⚠ e nenhuma descrição fala de uma área que não existe', () => {
    // Um nome mal escrito aqui aparece como uma área a mais, sem alterações
    // nenhumas — e a que ele devia nomear fica sem descrição.
    const inventadas = ESCRITAS.filter(a => !NO_REGISTO.includes(a));
    expect(inventadas).toEqual([]);
  });

  it('cada área diz para que serve, e o que lá se faz', () => {
    for (const a of AREAS) {
      expect(typeof a.o).toBe('string');
      // Uma frase de quatro palavras não descreve uma área. O limite obriga a
      // dizer para que serve, não a repetir o nome.
      expect(a.o.length).toBeGreaterThanOrEqual(25);
      expect(Array.isArray(a.faz)).toBe(true);
      expect(a.faz.length).toBeGreaterThanOrEqual(2);
      for (const linha of a.faz) expect(linha.length).toBeGreaterThanOrEqual(20);
      expect(typeof a.icon).toBe('string');
    }
  });

  it('não há áreas repetidas', () => {
    expect(new Set(ESCRITAS).size).toBe(ESCRITAS.length);
  });

  it('o âmbito existe e diz alguma coisa', () => {
    // É o único sítio da app que responde a «o que é isto?».
    expect(typeof AMBITO).toBe('string');
    expect(AMBITO.length).toBeGreaterThanOrEqual(150);
  });
});
