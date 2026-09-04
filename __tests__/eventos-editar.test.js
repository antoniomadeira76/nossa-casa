/**
 * Editar, apagar, e marcar na agenda da Google.
 *
 * O `eventGone` e o `eventEdits` já eram aplicados na leitura desde sempre — e
 * nenhum ecrã os escrevia. Infraestrutura sem porta: um evento com a hora
 * errada ficava com a hora errada.
 */

const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { StoreProvider, useStore, podeEditarEvento } = require('../src/store');

const semComs = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const QUADRO = {
  Rita: { kid: false }, Tomás: { kid: false },
  Léo: { kid: true }, Mia: { kid: true },
};
const ev = (extra) => ({ id: 'e', owner: 'Rita', day: 'd2026-08-20', ...extra });

const loja = () => {
  let api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
  });
  return () => api;
};

describe('Quem pode mexer, e quem só pode ver', () => {
  // Numa casa de dois, obrigar a Rita a pedir ao Tomás para corrigir a hora de
  // uma reunião de pais é atrito sem ganho — os dois já veem o evento.
  test('um adulto muda o que vê', () => {
    expect(podeEditarEvento(ev({ visibilidade: 'familia' }), 'Tomás', QUADRO)).toBe(true);
    expect(podeEditarEvento(ev({ visibilidade: 'adultos' }), 'Tomás', QUADRO)).toBe(true);
  });

  test('mas não o que não vê', () => {
    expect(podeEditarEvento(ev({ visibilidade: 'so-eu' }), 'Tomás', QUADRO)).toBe(false);
  });

  // A agenda da casa não é das crianças para arrumar.
  test('uma criança muda só o que é seu', () => {
    expect(podeEditarEvento(ev({ visibilidade: 'familia' }), 'Léo', QUADRO)).toBe(false);
    expect(podeEditarEvento(ev({ owner: 'Léo', visibilidade: 'familia' }), 'Léo', QUADRO)).toBe(true);
  });

  test('e ver não é poder mudar', () => {
    const e = ev({ visibilidade: 'familia' });
    const { podeVerEvento } = require('../src/store');
    expect(podeVerEvento(e, 'Léo', QUADRO)).toBe(true);
    expect(podeEditarEvento(e, 'Léo', QUADRO)).toBe(false);
  });
});

describe('Editar e apagar escrevem mesmo', () => {
  test('editar um evento muda o que a app lê', () => {
    const ler = loja();
    const antes = ler().allEvents().find(e => e.id === 'e1');
    expect(antes).toBeTruthy();
    TestRenderer.act(() => { ler().editarEvento('e1', { time: '09:15', title: 'Outra coisa' }); });
    const depois = ler().allEvents().find(e => e.id === 'e1');
    expect(depois.time).toBe('09:15');
    expect(depois.title).toBe('Outra coisa');
  });

  // As sementes vivem no código e não se conseguem reescrever. O remendo é o
  // que faz um evento de semente e um criado na app comportarem-se igual.
  test('e o remendo fica em `eventEdits`, sem tocar na semente', () => {
    const ler = loja();
    TestRenderer.act(() => { ler().editarEvento('e1', { time: '09:15' }); });
    expect(ler().s.eventEdits.e1.time).toBe('09:15');
    const { EVENTS } = require('../src/data');
    expect(EVENTS.find(e => e.id === 'e1').time).not.toBe('09:15');
  });

  test('apagar tira-o da lista', () => {
    const ler = loja();
    expect(ler().allEvents().some(e => e.id === 'e1')).toBe(true);
    TestRenderer.act(() => { ler().removerEvento('e1'); });
    expect(ler().allEvents().some(e => e.id === 'e1')).toBe(false);
  });

  test('e fica registado, porque não se desfaz', () => {
    const ler = loja();
    TestRenderer.act(() => { ler().removerEvento('e1'); });
    expect(ler().s.registo[0].t).toMatch(/apagado da agenda/);
  });
});

describe('A agenda da Google: convida, não invade', () => {
  const cliente = semComs('src/pocketbase.js');
  const folha = semComs('src/sheets/NovoEvento.jsx');

  // A agenda de cada um é dela. O único token que existe é o de quem entrou,
  // e escrever na agenda do outro exigiria que ELE autorizasse esta app.
  test('o evento nasce na agenda de quem o cria, com os outros convidados', () => {
    expect(cliente).toMatch(/attendees: convidados\.map/);
    expect(cliente).toMatch(/method: 'POST'/);
  });

  // Convidar manda e-mail. Não é um pormenor técnico: é correio que sai em
  // nome de quem carrega no botão.
  test('os convites são mesmo enviados, e só quando há convidados', () => {
    expect(cliente).toMatch(/sendUpdates=\$\{convidados\.length \? 'all' : 'none'\}/);
  });

  test('e o ecrã diz que manda e-mail ANTES de acontecer', () => {
    expect(folha).toMatch(/a Google manda-lhes um e-mail/);
  });

  // As crianças não têm e-mail — é uma decisão do §8, não um esquecimento.
  test('as crianças não são convidadas', () => {
    expect(folha).toMatch(/m\.email && !m\.kid/);
  });

  test('nem quem não alcança o evento', () => {
    expect(folha).toMatch(/form\.visibilidade === 'familia' \|\| form\.visibilidade === 'adultos'/);
  });

  // Se a Google falhar, o evento não pode desaparecer: uma rede não apaga o
  // que uma pessoa escreveu.
  test('a app guarda primeiro, e a Google depois', () => {
    // ⚠ A forma mudou em 05/09/2026 e a propriedade não: a escrita local
    // deixou de ser um `set({ added: [...] })` na folha e passa pelo
    // `criarEvento` da loja, que também o manda para o SERVIDOR DA CASA — o
    // `sync.eventoDaCasa` existia e ninguém o chamava.
    //
    // O que esta prova protege continua a ser a ORDEM: a app guarda, e só
    // depois vai à Google. Prende-se às posições, não ao texto de uma delas.
    const guardaCa = folha.indexOf('criarEvento(event)');
    const vaiAGoogle = folha.indexOf('servidor.google.criarEvento');
    expect(guardaCa).toBeGreaterThan(0);
    expect(vaiAGoogle).toBeGreaterThan(0);
    expect(guardaCa).toBeLessThan(vaiAGoogle);
  });

  test('⚠ e a folha já não escreve no `added` por si', () => {
    // Uma escrita numa folha é uma escrita sem sítio onde a sincronização
    // possa viver — e o evento ficava só neste telefone.
    expect(folha).not.toMatch(/added: \[\.\.\.\(s\.added \|\| \[\]\), event\]/);
  });

  // Sem o identificador da Google, editar na app deixava a agenda a dizer
  // outra coisa e ninguém percebia porquê.
  test('o identificador da Google guarda-se, para editar e apagar do outro lado', () => {
    expect(folha).toMatch(/idGoogle/);
    expect(cliente).toMatch(/atualizarEvento\(idGoogle/);
    expect(cliente).toMatch(/apagarEvento\(idGoogle/);
  });

  // Um interruptor que não pode fazer nada é pior do que a sua ausência.
  test('o controlo só aparece quando há autorização da agenda', () => {
    expect(folha).toMatch(/servidor\.google\.disponivel\(\) \? \(/);
  });

  test('e o scope pedido é o de escrever, não o de ler', () => {
    expect(cliente).toMatch(/calendar\.events/);
    expect(cliente).not.toMatch(/calendar\.readonly/);
  });
});
