/**
 * Renomear uma especialidade.
 *
 * ── O defeito ────────────────────────────────────────────────────────────────
 *
 * O `renameSpecialty` trocava o nome na LISTA e mais nada:
 *
 *     specialities: (x.specialities || []).map(s => s === oldName ? newName : s)
 *
 * Mas o nome está em três sítios, não em um. Os episódios de `health` guardam
 * a especialidade como TEXTO, e o evento que «marcar consulta» cria leva-a no
 * título (`Consulta <especialidade>`). Renomear deixava a ficha do Léo a dizer
 * «Pediatria» e a lista já sem ela — uma consulta órfã, que não dá erro
 * nenhum e que ninguém vê até precisar dela.
 *
 * Foi por isto que a interface de renomear foi retirada quando as
 * especialidades passaram a ser geridas num sítio só. Isto é a correção.
 *
 * ── A forma da prova ─────────────────────────────────────────────────────────
 *
 * A prova principal não confere uma lista de campos: anda pelo estado todo e
 * exige que o nome antigo não sobreviva em sítio nenhum estrutural. É a mesma
 * forma da prova do `renomearMembro`, e pela mesma razão — se alguém
 * acrescentar um campo que guarde o nome e se esquecer desta função, isto cai.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { StoreProvider, useStore, DEMO } = require('../src/store');

const comLoja = (estado) => {
  let api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    TestRenderer.create(React.createElement(StoreProvider, null,
      React.createElement(Sonda)));
  });
  // A loja arranca na demonstração; o que a prova quer é um estado seu.
  TestRenderer.act(() => { api.set(() => estado); });
  return () => api;
};

const cheio = () => ({
  ...DEMO(),
  specialities: ['Medicina geral', 'Pediatria', 'Dentista'],
  health: [
    { id: 'h1', member: 'Léo', specialty: 'Pediatria', day: 'd2026-08-08' },
    { id: 'h2', member: 'Mia', specialty: 'Dentista', day: 'd2026-08-28' },
  ],
  added: [
    { id: 'e1', title: 'Consulta Pediatria', tag: 'Saúde', day: 'd2026-08-08' },
    // ⚠ Estes dois NÃO se tocam, e é metade do valor desta prova.
    { id: 'e2', title: 'Consulta Pediatria', day: 'd2026-08-09' },            // sem etiqueta
    { id: 'e3', title: 'Levar o Léo à Pediatria', tag: 'Saúde', day: 'd2026-08-10' },
  ],
  registo: [],
});

// Onde é que uma string aparece no estado, por caminho. Sem isto a prova seria
// uma lista de campos de que eu me lembrei — e é a lista que falha.
//
// ⚠ Por CONTIDA, não por igual. A primeira versão comparava `v === alvo` e a
// prova de sanidade logo abaixo apanhou-a: só via dois sítios em vez de três,
// porque o título do evento é «Consulta Pediatria» e não «Pediatria». Ou seja,
// a prova principal passava sem nunca ter olhado para o sítio onde metade do
// defeito vivia.
const ondeAparece = (v, alvo, caminho) => {
  const c = caminho || '';
  const achados = [];
  if (typeof v === 'string') { if (v.includes(alvo)) achados.push(c); return achados; }
  if (Array.isArray(v)) {
    v.forEach((x, i) => achados.push(...ondeAparece(x, alvo, c + '[' + i + ']')));
    return achados;
  }
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (k === alvo) achados.push(c + '.{' + k + '}');
      achados.push(...ondeAparece(x, alvo, c + '.' + k));
    }
  }
  return achados;
};

// Texto que uma pessoa escreveu, e que não se reescreve: presumir que todas as
// «Pediatria» daquela frase são esta é o mesmo erro do renomear membro.
const TEXTO_LIVRE = [
  '.added[1].title', '.added[2].title',
  // ⚠ E o registo da casa, que DIZ o nome antigo de propósito: «A
  // especialidade Pediatria passou a chamar-se X» tem de o dizer para a frase
  // fazer sentido. É a mesma exclusão que a prova do renomear membro faz.
  '.registo[0].t',
];

const renomear = (loja, a, b) => {
  let r;
  TestRenderer.act(() => { r = loja().renameSpecialty(a, b); });
  return r;
};

describe('⚠ renomear leva tudo atrás', () => {
  it('a sonda vê o nome antes de renomear — senão não estaria a provar nada', () => {
    const sobrou = ondeAparece(cheio(), 'Pediatria').filter(x => !TEXTO_LIVRE.includes(x));
    expect(sobrou.length).toBeGreaterThanOrEqual(3);   // lista, episódio, evento
  });

  it('⚠ o nome antigo não sobrevive em sítio nenhum estrutural', () => {
    const loja = comLoja(cheio());
    expect(renomear(loja, 'Pediatria', 'Puericultura')).toBeNull();
    const sobrou = ondeAparece(loja().s, 'Pediatria').filter(x => !TEXTO_LIVRE.includes(x));
    expect(sobrou).toEqual([]);
  });

  it('e o nome novo chegou aos três sítios', () => {
    const loja = comLoja(cheio());
    renomear(loja, 'Pediatria', 'Puericultura');
    const s = loja().s;
    expect(s.specialities).toEqual(['Medicina geral', 'Puericultura', 'Dentista']);
    expect(s.health.find(h => h.id === 'h1').specialty).toBe('Puericultura');
    expect(s.added.find(e => e.id === 'e1').title).toBe('Consulta Puericultura');
  });

  it('⚠ e não toca no que não é dele', () => {
    // Uma substituição de texto solta apanhava os dois: o evento sem a
    // etiqueta «Saúde» e o que alguém escreveu à mão.
    const loja = comLoja(cheio());
    renomear(loja, 'Pediatria', 'Puericultura');
    const s = loja().s;
    expect(s.added.find(e => e.id === 'e2').title).toBe('Consulta Pediatria');
    expect(s.added.find(e => e.id === 'e3').title).toBe('Levar o Léo à Pediatria');
    expect(s.health.find(h => h.id === 'h2').specialty).toBe('Dentista');
  });
});

describe('renomear para um nome que já existe é uma fusão', () => {
  it('as consultas passam para o que fica, e a lista não duplica', () => {
    const loja = comLoja(cheio());
    expect(renomear(loja, 'Pediatria', 'Dentista')).toBeNull();
    const s = loja().s;
    expect(s.specialities).toEqual(['Medicina geral', 'Dentista']);
    expect(s.health.find(h => h.id === 'h1').specialty).toBe('Dentista');
  });

  it('⚠ e ignora maiúsculas, ficando com a grafia que já lá estava', () => {
    // Sem isto, «dentista» e «Dentista» ficavam as duas na lista — o mesmo
    // defeito com outra cara.
    const loja = comLoja(cheio());
    renomear(loja, 'Pediatria', 'dentista');
    const s = loja().s;
    expect(s.specialities).toEqual(['Medicina geral', 'Dentista']);
    expect(s.health.find(h => h.id === 'h1').specialty).toBe('Dentista');
  });

  it('mas mudar só as maiúsculas do próprio nome continua a ser um renomear', () => {
    const loja = comLoja(cheio());
    renomear(loja, 'Pediatria', 'pediatria');
    expect(loja().s.specialities).toEqual(['Medicina geral', 'pediatria', 'Dentista']);
  });
});

describe('e diz o que está mal, em português, como o `renomearMembro`', () => {
  it('cada recusa tem a sua frase', () => {
    const loja = comLoja(cheio());
    expect(renomear(loja, 'Cardiologia', 'Outra')).toBe('Essa especialidade não existe nesta casa.');
    expect(renomear(loja, 'Pediatria', '   ')).toBe('A especialidade precisa de um nome.');
    expect(renomear(loja, 'Pediatria', 'x'.repeat(41))).toBe('O nome não pode passar de 40 caracteres.');
  });

  it('e o mesmo nome não é erro nenhum — é não haver nada a fazer', () => {
    const loja = comLoja(cheio());
    expect(renomear(loja, 'Pediatria', 'Pediatria')).toBeNull();
    expect(loja().s.specialities).toEqual(['Medicina geral', 'Pediatria', 'Dentista']);
  });
});

describe('e fica no registo da casa', () => {
  it('renomear diz que se passou a chamar', () => {
    const loja = comLoja(cheio());
    renomear(loja, 'Pediatria', 'Puericultura');
    expect(loja().s.registo[0].t)
      .toBe('A especialidade Pediatria passou a chamar-se Puericultura');
  });

  it('e fundir diz que passou a contar como', () => {
    const loja = comLoja(cheio());
    renomear(loja, 'Pediatria', 'Dentista');
    expect(loja().s.registo[0].t)
      .toBe('A especialidade Pediatria passou a contar como Dentista');
  });
});
