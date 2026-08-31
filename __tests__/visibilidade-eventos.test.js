/**
 * Quem vê um evento, e num campo que a app leia.
 *
 * Dois defeitos, e o segundo é o que se sentiu: o «Guardar evento» gravava
 * `date: '2026-08-21'` e a app lê `day: 'd2026-08-21'` — nome diferente e
 * formato diferente. O evento ficava gravado e não aparecia em lado nenhum.
 * Guardar parecia não fazer nada, e fazia: num campo que ninguém consulta.
 */

const fs = require('fs');
const path = require('path');
const { podeVerEvento, visibilidadeDe, VISIBILIDADES, MIGRATIONS, SCHEMA } = require('../src/store');

const QUADRO = {
  Rita: { kid: false }, Tomás: { kid: false },
  Léo: { kid: true }, Mia: { kid: true },
};
const ev = (extra) => ({ id: 'e', owner: 'Rita', day: 'd2026-08-20', ...extra });

describe('Três níveis, e não dois', () => {
  test('a interface oferece os três, com a mesma ordem e chaves da regra', () => {
    expect(VISIBILIDADES.map(v => v.chave)).toEqual(['familia', 'adultos', 'so-eu']);
    for (const v of VISIBILIDADES) {
      expect(v.rotulo).toBeTruthy();
      expect(v.detalhe).toBeTruthy();
    }
  });

  test('«toda a família» é toda a gente', () => {
    const e = ev({ visibilidade: 'familia' });
    for (const n of Object.keys(QUADRO)) expect(podeVerEvento(e, n, QUADRO)).toBe(true);
  });

  // O nível que faltava: o que uma família precisa mais vezes.
  test('«só os adultos» esconde-o das crianças', () => {
    const e = ev({ visibilidade: 'adultos' });
    expect(podeVerEvento(e, 'Rita', QUADRO)).toBe(true);
    expect(podeVerEvento(e, 'Tomás', QUADRO)).toBe(true);
    expect(podeVerEvento(e, 'Léo', QUADRO)).toBe(false);
    expect(podeVerEvento(e, 'Mia', QUADRO)).toBe(false);
  });

  test('«só eu» esconde-o de toda a gente, incluindo o outro adulto', () => {
    const e = ev({ visibilidade: 'so-eu' });
    expect(podeVerEvento(e, 'Tomás', QUADRO)).toBe(false);
    expect(podeVerEvento(e, 'Léo', QUADRO)).toBe(false);
  });

  test('o dono vê sempre o seu, seja qual for o nível', () => {
    for (const v of ['familia', 'adultos', 'so-eu']) {
      expect(podeVerEvento(ev({ visibilidade: v }), 'Rita', QUADRO)).toBe(true);
    }
  });

  // Uma criança dona do seu evento vê-o; o «só adultos» de outra pessoa, não.
  test('uma criança vê o seu próprio evento', () => {
    expect(podeVerEvento(ev({ owner: 'Léo', visibilidade: 'so-eu' }), 'Léo', QUADRO)).toBe(true);
    expect(podeVerEvento(ev({ owner: 'Rita', visibilidade: 'adultos' }), 'Léo', QUADRO)).toBe(false);
  });

  test('quem não vive na casa não vê nada que não seja seu', () => {
    expect(podeVerEvento(ev({ visibilidade: 'adultos' }), 'Ana', QUADRO)).toBe(false);
    expect(podeVerEvento(ev({ visibilidade: 'familia' }), 'Ana', QUADRO)).toBe(true);
  });
});

describe('A forma antiga continua a ler-se', () => {
  // Um evento gravado antes disto não tem `visibilidade`. Ler `undefined` como
  // «só eu» esconderia metade da agenda da casa de um dia para o outro.
  test('`shared: true` é «toda a família»', () => {
    expect(visibilidadeDe({ shared: true })).toBe('familia');
    expect(podeVerEvento(ev({ shared: true }), 'Léo', QUADRO)).toBe(true);
  });

  test('`shared: false` é «só eu»', () => {
    expect(visibilidadeDe({ shared: false })).toBe('so-eu');
    expect(podeVerEvento(ev({ shared: false }), 'Tomás', QUADRO)).toBe(false);
  });

  test('e o nível novo ganha ao booleano, quando os dois estão lá', () => {
    expect(visibilidadeDe({ shared: true, visibilidade: 'adultos' })).toBe('adultos');
  });

  test('a migração 7 traduz sem mudar o que ninguém vê', () => {
    expect(SCHEMA).toBeGreaterThanOrEqual(7);
    const d = MIGRATIONS[7]({
      added: [{ id: 'a', shared: true }, { id: 'b', shared: false },
              { id: 'c', visibilidade: 'adultos' }],
      eventEdits: { e1: { shared: true } },
    });
    expect(d.added.map(e => e.visibilidade)).toEqual(['familia', 'so-eu', 'adultos']);
    expect(d.eventEdits.e1.visibilidade).toBe('familia');
  });
});

describe('O evento grava-se num campo que a app lê', () => {
  const fonte = fs.readFileSync(path.join(__dirname, '..', 'src/sheets/NovoEvento.jsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  test('grava `day`, e não `date`', () => {
    expect(fonte).toMatch(/day: form\.day/);
    expect(fonte).not.toMatch(/date: form\./);
  });

  // O `day` é uma chave `d2026-08-21`. O campo de data já as devolve assim;
  // o que havia era uma tradução para `2026-08-21`, que a app não lê.
  test('e a data vem do campo em chave, sem tradução pelo meio', () => {
    expect(fonte).toMatch(/valor=\{form\.day\}/);
    expect(fonte).toMatch(/setForm\(f => \(\{ \.\.\.f, day: chave \}\)\)/);
    expect(fonte).not.toMatch(/replace\(\/\^d\//);
  });

  test('e grava a visibilidade, não o booleano', () => {
    expect(fonte).toMatch(/visibilidade: form\.visibilidade/);
    expect(fonte).not.toMatch(/shared: !form\.private/);
  });
});

describe('Nenhum ecrã escreve o seu próprio filtro', () => {
  // Dois ecrãs a escreverem o mesmo filtro divergem, e um filtro de
  // visibilidade que diverge mostra a alguém o que não devia.
  const ecras = ['src/screens/Agenda.jsx', 'src/screens/Inicio.jsx'];
  test.each(ecras)('%s usa a regra da loja', (f) => {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/podeVerEvento\(e, user\)/);
    expect(src).not.toMatch(/e\.shared \|\| e\.owner/);
  });
});

describe('Os eventos perdidos no campo errado voltam', () => {
  // Quatro eventos reais, escritos por uma pessoa, gravados com `date` em vez
  // de `day` e invisíveis desde então. Uma migração que os deixasse para trás
  // apagava trabalho de alguém em silêncio.
  test('a migração 7 traduz `date` em `day`, e a chave leva o `d`', () => {
    const d = MIGRATIONS[7]({
      added: [
        { id: 'a', title: 'teste', date: '2026-08-14', visibilidade: 'so-eu' },
        { id: 'b', title: 'fz', date: 'd2026-08-21', shared: true },
        { id: 'c', title: 'já certo', day: 'd2026-08-30', visibilidade: 'adultos' },
      ],
    });
    expect(d.added[0].day).toBe('d2026-08-14');
    expect(d.added[1].day).toBe('d2026-08-21');   // já tinha o `d`, não leva dois
    expect(d.added[2].day).toBe('d2026-08-30');   // o que estava certo não muda
    // e o campo antigo sai, para não haver duas verdades sobre a mesma data
    for (const e of d.added) expect(e.date).toBeUndefined();
  });

  test('e o que não tem data nenhuma não inventa uma', () => {
    const d = MIGRATIONS[7]({ added: [{ id: 'x', title: 'sem data' }] });
    expect(d.added[0].day).toBeUndefined();
  });
});
