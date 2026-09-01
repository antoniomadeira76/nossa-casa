/**
 * Os dados de demonstração são coerentes em QUALQUER dia.
 *
 * Estavam escritos à mão em torno de 20 de agosto de 2026, com o «hoje» preso
 * na mesma data. Quando o «hoje» passou a vir do relógio, a demonstração ficou
 * toda no passado: consultas «próximas» há duas semanas, garantias expiradas,
 * uma receita a expirar há um mês.
 *
 * Este ficheiro carrega as sementes em vários dias — incluindo os que quebram
 * contas de datas feitas à mão — e exige que as relações se mantenham.
 */

const DIAS = [
  '2026-08-20',   // o dia original, para as capturas de referência
  '2026-01-31',   // fim de mês curto
  '2026-02-28',   // véspera de 1 de março num ano normal
  '2028-02-29',   // 29 de fevereiro de um ano bissexto
  '2026-08-31',   // o dia que dava «d2026-08-32»
  '2026-12-31',   // vira o ano
  '2027-06-15',   // um dia qualquer, longe do original
];

// ⚠ O `store.jsx` tem de ser carregado AQUI, com os outros.
//
// A primeira versão só recarregava `data` e `format`, e depois pedia
// `require('../src/store')` dentro de cada `it`. O registo de módulos já tinha
// avançado: o store vinha com a data da ÚLTIMA iteração do ciclo, e o teste do
// dia 20 de agosto comparava-se contra junho de 2027. Cinco falhas que não
// eram do código.
const carregar = (dia) => {
  jest.resetModules();
  const guardado = process.env.EXPO_PUBLIC_HOJE;
  process.env.EXPO_PUBLIC_HOJE = dia;
  const data = require('../src/data');
  const format = require('../src/format');
  const store = require('../src/store');
  process.env.EXPO_PUBLIC_HOJE = guardado;
  return { ...data, ...format, DEMO: store.DEMO };
};

for (const dia of DIAS) {
  describe(`com hoje em ${dia}`, () => {
    const m = carregar(dia);

    it('todas as chaves de dia são dias que existem', () => {
      // `dkey` não normaliza: somar ao dia do mês dava «d2026-08-32», que o
      // `parseKey` aceita pelo formato e não corresponde a data nenhuma.
      const chaves = [
        ...m.EVENTS.map(e => e.day),
        ...m.TASKS.map(t => t.due).filter(Boolean),
        ...m.HEALTH.map(h => h.day),
        ...m.HEALTH_DOCS.map(d => d.expires).filter(Boolean),
        ...m.VAULT.map(v => v.day),
      ];
      expect(chaves.length).toBeGreaterThan(15);
      for (const k of chaves) {
        const p = m.parseKey(k);
        expect(p).not.toBeNull();
        // A volta completa: se o dia não existir, o `Date` normaliza-o e a
        // chave reconstruída deixa de ser igual à original.
        const d = new Date(p.y, p.m, p.d);
        expect(m.dkey(d.getFullYear(), d.getMonth(), d.getDate())).toBe(k);
      }
    });

    it('todas as datas dd/mm/aaaa são datas que existem', () => {
      const textos = m.EQUIP.flatMap(e => [e.bought, e.warrantyEnd, e.maintDate])
        .filter(Boolean);
      expect(textos.length).toBeGreaterThan(8);
      for (const t of textos) {
        expect(t).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        const [d, mes, a] = t.split('/').map(Number);
        const real = new Date(a, mes - 1, d);
        expect(real.getDate()).toBe(d);
        expect(real.getMonth()).toBe(mes - 1);
      }
    });

    it('há sempre uma consulta futura e uma passada', () => {
      // O «Precisa de Si» mostra as consultas próximas. Se todas ficarem no
      // passado, a secção fica vazia e a demonstração não demonstra nada.
      const dias = m.HEALTH.map(h => m.daysUntil(h.day));
      expect(dias.some(d => d > 0)).toBe(true);
      expect(dias.some(d => d < 0)).toBe(true);
    });

    it('a receita expira no futuro, dentro do prazo do aviso', () => {
      const rec = m.HEALTH_DOCS.find(d => d.kind === 'Receita');
      const faltam = m.daysUntil(rec.expires);
      expect(faltam).toBeGreaterThan(0);
      expect(faltam).toBeLessThanOrEqual(30);
    });

    it('os equipamentos povoam os três estados de garantia', () => {
      // Uma em vigor, uma a expirar, uma fora. Se caírem todas no mesmo
      // estado, o ecrã perde dois terços do que devia mostrar.
      const estado = (e) => {
        const d = m.warrantyDaysLeft(e);
        return d > 90 ? 'em' : d > 0 ? 'a-expirar' : 'fora';
      };
      expect([...new Set(m.EQUIP.map(estado))].sort())
        .toEqual(['a-expirar', 'em', 'fora']);
    });

    it('cada equipamento foi comprado ANTES de a garantia acabar', () => {
      // As compras eram datas fixas e a garantia passou a ser relativa: uma
      // máquina comprada em 2025 com garantia a acabar daqui a 203 dias tinha
      // dois anos de garantia em 2026 e cinco em 2029. Agora as duas são
      // deslocamentos, e a relação é a mesma em qualquer dia.
      for (const e of m.EQUIP) {
        const chave = (t) => { const [d, s, a] = t.split('/').map(Number); return Date.UTC(a, s - 1, d); };
        expect(chave(e.bought)).toBeLessThan(chave(e.warrantyEnd));
      }
    });

    it('as legendas do cofre não contradizem os dias', () => {
      // «Semanada de 10 a 16 de agosto» com o movimento gravado em setembro é
      // pior do que uma data velha: é a app a dizer duas coisas diferentes na
      // mesma linha.
      const semanada = m.VAULT.find(v => /^Semanada de /.test(v.label));
      expect(semanada).toBeDefined();
      const mes = m.MONTHS[m.parseKey(semanada.day).m].toLowerCase();
      const mesAnterior = m.MONTHS[(m.parseKey(semanada.day).m + 11) % 12].toLowerCase();
      // O período acaba poucos dias antes do pagamento: ou é o mesmo mês, ou
      // o anterior.
      expect(semanada.label).toMatch(new RegExp(`de (${mes}|${mesAnterior})$`));
    });

    it('os cofres das crianças têm saldo positivo', () => {
      // São somas de movimentos (INVARIANTE #2). Um saldo negativo na
      // demonstração leria-se como uma criança a dever dinheiro à casa.
      for (const kid of ['Léo', 'Mia']) {
        const saldo = m.VAULT.filter(v => v.kid === kid)
          .reduce((a, v) => a + v.delta, 0);
        expect(saldo).toBeGreaterThan(0);
      }
    });

    it('o mês do orçamento é o mês de hoje', () => {
      // Era `'Agosto'` escrito à mão. A 1 de setembro o Dinheiro dizia «Conta
      // conjunta · Agosto de 2026» e o Início «Orçamento de Agosto», com o
      // resto da app já em setembro.
      expect(m.DEMO().monthName).toBe(m.MONTHS[m.TODAY.m]);
    });

    it('a ida às compras é num domingo que ainda não passou', () => {
      // A semente tinha `d2026-08-23` — um domingo, mas só naquela semana.
      // Fora dela o ecrã mostrava um plano para um dia que já lá ia.
      const chave = m.DEMO().shopPlan.day;
      const p = m.parseKey(chave);
      expect(p).not.toBeNull();
      expect(new Date(p.y, p.m, p.d).getDay()).toBe(0);        // domingo
      expect(m.daysUntil(chave)).toBeGreaterThanOrEqual(0);    // hoje ou à frente
      expect(m.daysUntil(chave)).toBeLessThanOrEqual(6);
    });

    it('as legendas dos artigos não trazem datas de outra semana', () => {
      // «Adicionado por Rita · 19/08» numa lista da semana de 31/08.
      const comData = m.ITEMS.map(i => i.by).filter(b => /\d{2}\/\d{2}/.test(b));
      expect(comData.length).toBeGreaterThan(2);
      for (const b of comData) {
        const [, dd, mm] = b.match(/(\d{2})\/(\d{2})/);
        const ano = Number(mm) - 1 > m.TODAY.m ? m.TODAY.y - 1 : m.TODAY.y;
        const dias = Math.round(
          (Date.UTC(m.TODAY.y, m.TODAY.m, m.TODAY.d) - Date.UTC(ano, Number(mm) - 1, Number(dd))) / 86400000);
        // Adicionado nos últimos dias, nunca no futuro.
        expect(dias).toBeGreaterThanOrEqual(0);
        expect(dias).toBeLessThanOrEqual(7);
      }
    });

    it('o prazo da meta está no futuro', () => {
      const meta = m.GOALS.find(g => g.when !== 'sem prazo');
      const ano = Number(String(meta.when).match(/(\d{4})$/)[1]);
      expect(ano).toBeGreaterThanOrEqual(m.TODAY.y);
    });
  });
}

describe('nenhuma data de demonstração está escrita à mão', () => {
  const fs = require('fs');
  const path = require('path');
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'src', 'data.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.replace(/(^|\s)\/\/.*$/, '')).join('\n');

  it('não há anos literais fora dos comentários', () => {
    // Um ano escrito à mão é uma data que vai envelhecer em silêncio.
    const achados = codigo.match(/['"`][^'"`]*\b20\d\d\b[^'"`]*['"`]/g) || [];
    expect(achados).toEqual([]);
  });

  it('nem chamadas a `dkey` com o ano escrito', () => {
    expect(codigo).not.toMatch(/dkey\(\s*20\d\d/);
  });
});
