/**
 * O registo «Nesta casa» lê-se: título e detalhe, repetições dobradas, dias
 * como secções, a linha da Agenda — `design/registo-da-casa.dc.html`
 * (14/09/2026, «implementa»).
 *
 *   1. `tituloEDetalhe` parte a frase no primeiro « · » ou «: ».
 *   2. `dobrarRepeticoes` junta entradas iguais seguidas da mesma pessoa até 36 h.
 *   3. `agruparPorDia` dá um grupo por dia, com o rótulo da Agenda.
 *   4. O ecrã: sem cartão, um título por dia, a bola de quem fez, a pastilha da
 *      área, e a seta só onde há destino.
 */
const fs = require('fs');
const path = require('path');
const { tituloEDetalhe, dobrarRepeticoes, agruparPorDia, descricaoDasVezes, detalheDaLinha, horaDe } = require('../src/registo-da-casa');
const { TODAY } = require('../src/format');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const hoje = (h, m = 0) => new Date(TODAY.y, TODAY.m, TODAY.d, h, m).getTime();
const DIA = 24 * 60 * 60 * 1000;

describe('⚠ 1. título e detalhe', () => {
  it('parte no primeiro « · » ou «: »; sem separador, tudo é título', () => {
    expect(tituloEDetalhe('Meta criada: Bicicleta da Mia · 550,00 €')).toEqual({ titulo: 'Meta criada', detalhe: 'Bicicleta da Mia · 550,00 €' });
    expect(tituloEDetalhe('Envelope Lazer reforçado · 20,00 €')).toEqual({ titulo: 'Envelope Lazer reforçado', detalhe: '20,00 €' });
    expect(tituloEDetalhe('Mês de Setembro aberto')).toEqual({ titulo: 'Mês de Setembro aberto', detalhe: '' });
    // Um «:» sem espaço a seguir (uma hora, «18:00») não parte.
    expect(tituloEDetalhe('Tarefa marcada para as 18:00')).toEqual({ titulo: 'Tarefa marcada para as 18:00', detalhe: '' });
    expect(tituloEDetalhe(null)).toEqual({ titulo: '', detalhe: '' });
  });
});

describe('⚠ 2. as repetições dobram-se', () => {
  const partilha = (at) => ({ t: 'A lista de compras foi partilhada', quem: 'António', a: 'Compras', at });
  it('quatro iguais seguidas, da mesma pessoa, numa noite: uma linha com 4 vezes', () => {
    const d = dobrarRepeticoes([partilha(hoje(0, 59)), partilha(hoje(0, 26)), partilha(hoje(23, 48) - DIA), partilha(hoje(21, 24) - DIA)]);
    expect(d.length).toBe(1);
    expect(d[0].vezes).toBe(4);
    expect(d[0].at).toBe(hoje(0, 59));   // fica a mais recente
    expect(d[0].de).toBe(hoje(21, 24) - DIA);
    expect(d[0].originais.length).toBe(4);
    expect(descricaoDasVezes(d[0])).toMatch(/^4 vezes entre [a-zç]+ e [a-zç]+$/);
    expect(detalheDaLinha(d[0])).toMatch(/^António · 4 vezes entre /);
  });
  it('não dobra o que é de outra pessoa, o que tem texto diferente, nem o que está a mais de 36 h', () => {
    const d = dobrarRepeticoes([partilha(hoje(10)), { ...partilha(hoje(9)), quem: 'Rita' }, partilha(hoje(8)),
      { ...partilha(hoje(7)), t: 'Outra coisa' }, partilha(hoje(6) - 3 * DIA)]);
    expect(d.map(x => x.vezes)).toEqual([1, 1, 1, 1, 1]);
    expect(descricaoDasVezes(d[0])).toBe('');
    // No mesmo dia diz só «n vezes».
    const m = dobrarRepeticoes([partilha(hoje(10)), partilha(hoje(9))]);
    expect(descricaoDasVezes(m[0])).toBe('2 vezes');
  });
  it('o detalhe de uma linha simples é «quem · resto da frase», e sem quem é só o resto', () => {
    expect(detalheDaLinha({ t: 'Meta criada: Bicicleta da Mia · 550,00 €', quem: 'António', vezes: 1 })).toBe('António · Bicicleta da Mia · 550,00 €');
    expect(detalheDaLinha({ t: 'Mês de Setembro aberto', quem: 'Rita', vezes: 1 })).toBe('Rita');
    expect(detalheDaLinha({ t: 'Envelope Lazer reforçado · 20,00 €', vezes: 1 })).toBe('20,00 €');
  });
});

describe('⚠ 3. os dias como secções', () => {
  it('um grupo por dia, pela ordem das linhas, com o rótulo da Agenda; sem data é «Sem data»', () => {
    const g = agruparPorDia([{ t: 'a', at: hoje(9) }, { t: 'b', at: hoje(8) }, { t: 'c', at: hoje(8) - DIA }, { t: 'd' }]);
    expect(g.length).toBe(3);
    expect(g[0].rotulo).toMatch(/^Hoje · /);
    expect(g[0].linhas.length).toBe(2);
    expect(g[1].linhas.length).toBe(1);
    expect(g[2].rotulo).toBe('Sem data');
    expect(horaDe(hoje(9, 5))).toBe('09:05');
    expect(horaDe(null)).toBe('');
  });
});

describe('⚠ 4. o ecrã', () => {
  const doc = semComentarios(ler('src/screens/Documentacao.jsx'));
  const i = doc.indexOf('{daCasa.length ? (');
  const bloco = doc.slice(i, doc.indexOf('<Pager t={t} pg={pgCasa} />', i));
  it('sem cartão, um título por dia, a bola de quem fez, a pastilha da área, a seta só com destino', () => {
    expect(bloco).not.toMatch(/<Card\b/);
    expect(bloco).not.toMatch(/Mais recente primeiro/);
    expect(bloco).toMatch(/agruparPorDia\(pgCasa\.slice\)\.map/);
    expect(bloco).toMatch(/<SectionTitle t=\{t\}>\{g\.rotulo\}<\/SectionTitle>/);
    expect(bloco).toMatch(/<Avatar size=\{28\} \{\.\.\.avatarDe\(r\.quem/);
    expect(bloco).toMatch(/<Pill label=\{r\.a\}/);
    expect(bloco).toMatch(/\{podeIr \? <Icon name="caretRight"/);
    expect(bloco).toMatch(/<LinhaPlana key=\{chave\}/);
    expect(bloco).toMatch(/horaDe\(r\.at\)/);
    // As repetições dobram-se antes de paginar.
    expect(doc).toMatch(/const daCasa = dobrarRepeticoes\(todoOregisto/);
  });
});
