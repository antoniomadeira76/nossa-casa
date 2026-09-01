/**
 * O «hoje» da app.
 *
 * Esteve preso em 20 de agosto de 2026 — a data do protótipo, para as capturas
 * de `docs/referencia` baterem certo. Serviu enquanto a app não saía do
 * computador. No dia em que alguém a usou, o cabeçalho dizia «Quinta, 20/08» a
 * 1 de setembro, as tarefas de hoje eram as de há duas semanas, e uma garantia
 * a expirar em três dias aparecia com doze.
 */

describe('o TODAY segue o relógio', () => {
  const semEnv = () => {
    jest.resetModules();
    const guardado = process.env.EXPO_PUBLIC_HOJE;
    delete process.env.EXPO_PUBLIC_HOJE;
    const f = require('../src/format');
    process.env.EXPO_PUBLIC_HOJE = guardado;
    return f;
  };

  const comEnv = (dia) => {
    jest.resetModules();
    const guardado = process.env.EXPO_PUBLIC_HOJE;
    process.env.EXPO_PUBLIC_HOJE = dia;
    const f = require('../src/format');
    process.env.EXPO_PUBLIC_HOJE = guardado;
    return f;
  };

  it('sem override, é o dia de hoje a sério', () => {
    const { TODAY } = semEnv();
    const agora = new Date();
    expect(TODAY.y).toBe(agora.getFullYear());
    expect(TODAY.m).toBe(agora.getMonth());
    expect(TODAY.d).toBe(agora.getDate());
  });

  it('não está preso em 20 de agosto de 2026', () => {
    // A linha que aqui estava era `TODAY = { y: 2026, m: 7, d: 20 }`.
    const fs = require('fs');
    const path = require('path');
    const codigo = fs.readFileSync(path.join(__dirname, '..', 'src', 'format.js'), 'utf8');
    expect(codigo).not.toMatch(/TODAY = \{ y: 2026, m: 7, d: 20 \}/);
    expect(codigo).toMatch(/agora\.getFullYear\(\)/);
  });

  it('o override fixa-o, para as provas e as capturas', () => {
    const { TODAY, TODAY_KEY } = comEnv('2026-08-20');
    expect(TODAY).toEqual({ y: 2026, m: 7, d: 20 });
    expect(TODAY_KEY).toBe('d2026-08-20');
  });

  it('o override usa meio-dia, não meia-noite', () => {
    // À meia-noite, um fuso a oeste de Greenwich atira a data para o dia
    // anterior — e a app inteira anda um dia para trás em Lisboa no inverno.
    const { TODAY } = comEnv('2026-01-15');
    expect(TODAY).toEqual({ y: 2026, m: 0, d: 15 });
  });

  it('um override malformado é ignorado, e vale o relógio', () => {
    const { TODAY } = comEnv('não é uma data');
    const agora = new Date();
    expect(TODAY.y).toBe(agora.getFullYear());
  });
});

describe('o dia seguinte atravessa o fim do mês', () => {
  const em = (dia) => {
    jest.resetModules();
    const guardado = process.env.EXPO_PUBLIC_HOJE;
    process.env.EXPO_PUBLIC_HOJE = dia;
    const f = require('../src/format');
    process.env.EXPO_PUBLIC_HOJE = guardado;
    return f;
  };

  it('31 de agosto → 1 de setembro, e não «32 de agosto»', () => {
    // Era `dkey(TODAY.y, TODAY.m, TODAY.d + 1)`, e dava `d2026-08-32`: uma
    // chave que o `parseKey` aceita pelo formato e que não é dia nenhum.
    // Nunca se viu porque o «hoje» estava preso a 20 de agosto; passou a ser
    // alcançável no momento em que a data se tornou real.
    expect(em('2026-08-31').TOMORROW_KEY).toBe('d2026-09-01');
  });

  it('31 de dezembro → 1 de janeiro do ano seguinte', () => {
    expect(em('2026-12-31').TOMORROW_KEY).toBe('d2027-01-01');
  });

  it('28 de fevereiro de um ano bissexto → 29', () => {
    expect(em('2028-02-28').TOMORROW_KEY).toBe('d2028-02-29');
  });

  it('28 de fevereiro de um ano normal → 1 de março', () => {
    expect(em('2026-02-28').TOMORROW_KEY).toBe('d2026-03-01');
  });

  it('e o «Amanhã» é escrito por extenso nessa chave', () => {
    const { dayLabel, TOMORROW_KEY } = em('2026-08-31');
    expect(dayLabel(TOMORROW_KEY)).toMatch(/^Amanhã · /);
  });
});
