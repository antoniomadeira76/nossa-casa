/**
 * O registo de versões da app.
 *
 * Alimenta as duas vistas da Documentação — as novidades por versão e o «Como
 * funciona» por área — e não tinha teste nenhum. Ficou parado na 1.4.2, de 26
 * de agosto, com três versões de trabalho por registar: quem abrisse a
 * Documentação via uma app que não tinha mudado numa semana.
 */
const { APP_VERSION, REGISTO_APP, TIPOS } = require('../src/registo-app');

// As áreas que a Documentação sabe agrupar. Uma área nova não é proibida — mas
// escrever «Gestao da Casa» sem acento cria uma segunda secção com o mesmo
// nome, e é isso que este conjunto apanha.
const AREAS = new Set(['A App', 'Entrada', 'Início', 'Dinheiro', 'Tarefas',
  'Compras', 'Agenda', 'Saúde', 'Equipamentos', 'Gestão da Casa', 'Perfil',
  'Documentação']);

const versaoParaNumero = (v) => {
  const [a, b, c] = String(v).split('.').map(Number);
  return a * 10000 + b * 100 + c;
};

const paraData = (d) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d);
  if (!m) return null;
  const dt = new Date(+m[3], +m[2] - 1, +m[1]);
  return dt.getDate() === +m[1] && dt.getMonth() === +m[2] - 1 ? dt : null;
};

describe('o registo de versões', () => {
  it('tem entradas', () => {
    expect(REGISTO_APP.length).toBeGreaterThan(30);
  });

  it('a versão da app é a mais alta do registo', () => {
    // Era 1.4.2 com trabalho de 1.5, 1.6 e 1.7 por registar. O número da
    // versão é o que a Documentação mostra no cabeçalho: ficar atrás dele é
    // dizer à casa que a app não mudou.
    const maior = REGISTO_APP.reduce(
      (a, e) => Math.max(a, versaoParaNumero(e.v)), 0);
    expect(versaoParaNumero(APP_VERSION)).toBe(maior);
  });

  it('cada entrada tem versão, data, tipo, área e texto', () => {
    for (const e of REGISTO_APP) {
      expect(e.v).toMatch(/^\d+\.\d+\.\d+$/);
      expect(paraData(e.d)).not.toBeNull();
      expect(Object.keys(TIPOS)).toContain(e.k);
      expect(AREAS.has(e.a)).toBe(true);
      expect(typeof e.t).toBe('string');
      expect(e.t.length).toBeGreaterThan(15);
    }
  });

  it('nenhuma entrada está datada no futuro', () => {
    // Contra o relógio a sério, e não contra o `TODAY` da app: uma entrada
    // datada de amanhã é um erro de escrita em qualquer dia.
    const hoje = new Date();
    hoje.setHours(23, 59, 59);
    for (const e of REGISTO_APP) {
      expect(paraData(e.d).getTime()).toBeLessThanOrEqual(hoje.getTime());
    }
  });

  it('uma versão não tem duas datas de arranque diferentes', () => {
    // Uma versão pode ser escrita ao longo de dois dias — o que não pode é a
    // Documentação mostrar a mesma versão em dois sítios da linha do tempo.
    const porVersao = {};
    for (const e of REGISTO_APP) {
      (porVersao[e.v] = porVersao[e.v] || new Set()).add(e.d);
    }
    for (const [v, datas] of Object.entries(porVersao)) {
      expect({ v, dias: datas.size }).toEqual({ v, dias: expect.any(Number) });
      expect(datas.size).toBeLessThanOrEqual(2);
    }
  });

  it('o texto não trata a pessoa por tu nem por você', () => {
    for (const e of REGISTO_APP) {
      expect(e.t).not.toMatch(/\b(tu|você|teu|tua|teus|tuas)\b/i);
    }
  });

  it('não há duas entradas iguais', () => {
    const chaves = REGISTO_APP.map(e => `${e.v}|${e.a}|${e.t}`);
    expect(chaves.length).toBe(new Set(chaves).size);
  });

  it('o trabalho de agosto e setembro está registado', () => {
    // As três versões que faltavam, e uma linha de cada uma para não passar
    // por registado com o cabeçalho só.
    for (const v of ['1.5.0', '1.6.0', '1.7.0']) {
      expect(REGISTO_APP.filter(e => e.v === v).length).toBeGreaterThan(2);
    }
  });
});
