/**
 * Exportar uma ficha de saúde.
 *
 * O documento é montado por código puro, e é por isso que se pode provar
 * contra o texto que produz — em vez de se olhar para um PDF e achar que está
 * bem. Estas provas são o que garante que o que sai da app é o que se pensa
 * que sai: os dados certos, com dono, e sem o que ficou para trás.
 */

const {
  AMBITOS, consultasDoAmbito, resumoDoAmbito, nomeDoFicheiro, documentoDeSaude,
} = require('../src/exportar-saude');

const CONSULTAS = [
  { id: 'h1', member: 'Mia', specialty: 'Dentista', doctor: 'Dr. Cardoso', day: 'd2026-08-28', time: '10:00' },
  { id: 'h2', member: 'Mia', specialty: 'Pediatria', doctor: 'Dra. Nunes', day: 'd2026-06-12', time: '09:30' },
  { id: 'h3', member: 'Mia', specialty: 'Dentista', doctor: 'Dr. Cardoso', day: 'd2026-03-04', time: '' },
];
const DOCS = [
  { id: 'd1', healthId: 'h1', title: 'Plano ortodôntico', kind: 'Relatório' },
  { id: 'd2', healthId: 'h2', title: 'Receita de ferro', kind: 'Receita' },
];
const NOTAS = {
  h1: [{ id: 'n1', author: 'Rita', text: 'Tolerou bem a anestesia.' }],
};

const base = { membro: 'Mia', casa: 'Bengui', consultas: CONSULTAS, docs: DOCS,
               notas: NOTAS, hoje: 'd2026-08-30' };

describe('O âmbito escolhe o que sai', () => {
  test('uma consulta é uma consulta', () => {
    const r = consultasDoAmbito(CONSULTAS, 'consulta', 'h2');
    expect(r.map(h => h.id)).toEqual(['h2']);
  });

  test('uma especialidade traz todas as dela, e só essas', () => {
    const r = consultasDoAmbito(CONSULTAS, 'especialidade', 'Dentista');
    expect(r.map(h => h.id).sort()).toEqual(['h1', 'h3']);
  });

  test('tudo é tudo, por ordem de data', () => {
    const r = consultasDoAmbito(CONSULTAS, 'tudo');
    expect(r.map(h => h.id)).toEqual(['h3', 'h2', 'h1']);
  });

  test('os três âmbitos que a interface promete existem', () => {
    expect(Object.keys(AMBITOS).sort()).toEqual(['consulta', 'especialidade', 'tudo']);
  });
});

describe('O ecrã sabe o que vai sair antes de sair', () => {
  test('o resumo conta consultas e anexos do âmbito', () => {
    expect(resumoDoAmbito(CONSULTAS, DOCS, 'tudo')).toEqual({ consultas: 3, anexos: 2 });
    expect(resumoDoAmbito(CONSULTAS, DOCS, 'especialidade', 'Dentista')).toEqual({ consultas: 2, anexos: 1 });
    expect(resumoDoAmbito(CONSULTAS, DOCS, 'consulta', 'h3')).toEqual({ consultas: 1, anexos: 0 });
  });
});

describe('O documento diz de quem é', () => {
  // Um papel clínico sem dono confunde-se com o de outra criança.
  test('o cabeçalho leva o membro, a casa e a data da exportação', () => {
    const html = documentoDeSaude(base);
    expect(html).toContain('Mia');
    expect(html).toContain('Casa Bengui');
    expect(html).toMatch(/exportado a /);
  });

  test('o título muda com o âmbito', () => {
    expect(documentoDeSaude({ ...base, ambito: 'tudo' })).toContain('Ficha de saúde · Mia');
    expect(documentoDeSaude({ ...base, ambito: 'especialidade', alvo: 'Dentista' }))
      .toContain('Dentista · Mia');
    expect(documentoDeSaude({ ...base, ambito: 'consulta', alvo: 'h1' })).toContain('Consulta · Mia');
  });
});

describe('O documento leva o que deve, e mais nada', () => {
  test('a ficha completa leva as três consultas e as notas', () => {
    const html = documentoDeSaude(base);
    expect(html).toContain('Dentista');
    expect(html).toContain('Pediatria');
    expect(html).toContain('Dr. Cardoso');
    expect(html).toContain('Tolerou bem a anestesia.');
    expect(html).toContain('Rita');
  });

  // O âmbito é uma promessa: exportar uma consulta não pode levar as outras.
  test('uma consulta só leva essa — as outras não aparecem', () => {
    const html = documentoDeSaude({ ...base, ambito: 'consulta', alvo: 'h2' });
    expect(html).toContain('Pediatria');
    expect(html).toContain('Dra. Nunes');
    expect(html).not.toContain('Dr. Cardoso');
    expect(html).not.toContain('Tolerou bem a anestesia.');   // nota da h1
  });

  test('uma especialidade não leva as outras', () => {
    const html = documentoDeSaude({ ...base, ambito: 'especialidade', alvo: 'Dentista' });
    expect(html).toContain('Dentista');
    expect(html).not.toContain('Pediatria');
    expect(html).not.toContain('Dra. Nunes');
  });
});

describe('O que fica para trás é dito, não omitido', () => {
  // Os anexos são ficheiros e não vão no documento. Quem leva isto ao médico
  // tem de saber que ficaram no telefone ANTES de chegar lá.
  test('os anexos são nomeados e o documento avisa que não os inclui', () => {
    const html = documentoDeSaude(base);
    expect(html).toContain('Plano ortodôntico');
    expect(html).toMatch(/não os inclui/);
    expect(html).toMatch(/continuam na aplicação/);
  });

  test('a concordância acompanha o número — um anexo, não «1 documentos»', () => {
    const html = documentoDeSaude({ ...base, ambito: 'consulta', alvo: 'h1' });
    expect(html).toMatch(/um documento/);
    expect(html).toMatch(/não o inclui/);
    expect(html).not.toMatch(/1 documentos/);
  });

  test('sem anexos, não há aviso nenhum a fazer ruído', () => {
    const html = documentoDeSaude({ ...base, ambito: 'consulta', alvo: 'h3' });
    expect(html).not.toMatch(/não .* inclui/);
  });

  test('um âmbito vazio diz que está vazio, em vez de sair em branco', () => {
    const html = documentoDeSaude({ ...base, consultas: [], docs: [] });
    expect(html).toContain('Sem consultas neste âmbito.');
  });
});

describe('O documento é seguro de abrir', () => {
  // Os campos são escritos por pessoas. Um `<script>` no nome de um médico
  // não pode virar `<script>` num ficheiro que alguém abre no navegador.
  test('o que vem dos dados é escapado', () => {
    const html = documentoDeSaude({
      ...base,
      consultas: [{ id: 'x', specialty: '<script>alert(1)</script>', doctor: 'a & b', day: 'd2026-01-01' }],
      docs: [], notas: {},
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a &amp; b');
  });

  test('e continua a ser um documento válido, com codificação declarada', () => {
    const html = documentoDeSaude(base);
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('lang="pt-PT"');
  });
});

describe('O nome do ficheiro percebe-se numa pasta cheia', () => {
  test('leva o membro, o âmbito e a data, sem acentos nem espaços', () => {
    expect(nomeDoFicheiro({ membro: 'Mia', ambito: 'tudo', dia: 'd2026-08-30' }))
      .toBe('saude-mia-ficha-completa-2026-08-30.html');
    expect(nomeDoFicheiro({ membro: 'Léo', ambito: 'especialidade', alvo: 'Otorrinolaringologia', dia: 'd2026-08-30' }))
      .toBe('saude-leo-otorrinolaringologia-2026-08-30.html');
  });

  test('nenhum caractere que um sistema de ficheiros recuse', () => {
    const n = nomeDoFicheiro({ membro: 'Ana/Maria', ambito: 'especialidade', alvo: 'Medicina Geral', dia: 'd2026-08-30' });
    expect(n).not.toMatch(/[\\/:*?"<>|\s]/);
  });
});
