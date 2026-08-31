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

describe('Responsáveis: entre os adultos, um ou mais', () => {
  const { listaEmPortugues } = require('../src/format');
  const fonte = fs.readFileSync(path.join(__dirname, '..', 'src/sheets/NovoEvento.jsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  // Um evento é um compromisso, e um compromisso é de quem o pode cumprir.
  test('a escolha é entre os adultos da casa, não entre todos', () => {
    expect(fonte).toMatch(/<EscolherMembros[\s\S]{0,80}membros=\{adultos\}/);
    expect(fonte).not.toMatch(/membros=\{membrosDaCasa\}/);
  });

  test('e são vários, não um', () => {
    expect(fonte).toMatch(/responsaveis: form\.responsaveis/);
    expect(fonte).not.toMatch(/responsible: form\./);
  });

  // Um evento sem ninguém encarregue não é um compromisso, é um lembrete que
  // ninguém leu.
  test('não se guarda sem pelo menos um', () => {
    expect(fonte).toMatch(/canSave = form\.title\.trim\(\) && form\.day && form\.responsaveis\.length > 0/);
  });

  test('a linha do evento lê-se como se fala', () => {
    expect(listaEmPortugues([])).toBe('');
    expect(listaEmPortugues(['Rita'])).toBe('Rita');
    expect(listaEmPortugues(['Rita', 'Tomás'])).toBe('Rita e Tomás');
    expect(listaEmPortugues(['Rita', 'Tomás', 'Ana'])).toBe('Rita, Tomás e Ana');
    expect(listaEmPortugues(['Rita', null, 'Ana'])).toBe('Rita e Ana');
  });

  test('e é ela que vai para o `who` do evento', () => {
    expect(fonte).toMatch(/who: listaEmPortugues\(form\.responsaveis\)/);
  });

  // Renomear um membro tem de percorrer a LISTA, não só os campos de um nome.
  // Sem isto o evento ficava a nomear alguém que já não existe, em silêncio.
  test('renomear um membro chega aos responsáveis', () => {
    const { renomearNoEstado } = require('../src/store');
    const d = renomearNoEstado({
      added: [{ id: 'a', owner: 'Rita', responsaveis: ['Rita', 'Tomás'] }],
      eventEdits: { e1: { responsaveis: ['Tomás'] } },
    }, 'Tomás', 'Tomé');
    expect(d.added[0].responsaveis).toEqual(['Rita', 'Tomé']);
    expect(d.eventEdits.e1.responsaveis).toEqual(['Tomé']);
  });

  // Os eventos já gravados tinham um nome só, no campo antigo.
  test('a migração 8 converte o responsável único em lista', () => {
    const d = MIGRATIONS[8]({
      added: [{ id: 'a', responsible: 'Rita' },
              { id: 'b', responsaveis: ['Rita', 'Tomás'] },
              { id: 'c', title: 'sem responsável' }],
      eventEdits: { e1: { responsible: 'Tomás' } },
    });
    expect(d.added[0].responsaveis).toEqual(['Rita']);
    expect(d.added[0].responsible).toBeUndefined();
    expect(d.added[1].responsaveis).toEqual(['Rita', 'Tomás']);   // já era lista
    expect(d.added[2].responsaveis).toBeUndefined();              // não inventa
    expect(d.eventEdits.e1.responsaveis).toEqual(['Tomás']);
  });
});

describe('A marca diz quantos se podem escolher', () => {
  const ui = fs.readFileSync(path.join(__dirname, '..', 'src/ui.jsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  // Redonda quer dizer um, quadrada quer dizer vários. Sem essa pista, duas
  // listas com o mesmo aspeto comportam-se de maneiras diferentes.
  test('a forma da marca muda com a escolha ser única ou múltipla', () => {
    expect(ui).toMatch(/borderRadius: varios \? R\.sm : R\.pill/);
  });

  test('e as duas listas partilham a mesma pastilha', () => {
    expect(ui).toMatch(/const PastilhaMembro = /);
    expect(ui).toMatch(/export const EscolherMembro = /);
    expect(ui).toMatch(/export const EscolherMembros = /);
  });

  // A linha inteira pintada apagava o ponto de cor do membro no preciso
  // momento em que ele estava escolhido.
  test('a linha não se pinta — o ponto de cor tem de continuar a ver-se', () => {
    const i = ui.indexOf('const PastilhaMembro');
    const bloco = ui.slice(i, ui.indexOf('\n\n', i));
    expect(bloco).not.toMatch(/backgroundColor: on \? t\.chrome/);
    expect(bloco).toMatch(/borderColor: on \? t\.accent/);
  });
});
