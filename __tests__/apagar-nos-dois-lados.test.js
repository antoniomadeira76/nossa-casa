/**
 * Apagar tem dois sentidos.
 *
 * Apagado na app, apagado na Google — isso já funcionava. Ao contrário não
 * acontecia nada: um evento apagado na agenda da Google ficava nesta casa a
 * apitar à hora de uma coisa que já não existe. É o mesmo defeito visto do
 * outro lado do espelho.
 *
 * O que este ficheiro guarda com mais cuidado não é o recurso — é o falso
 * positivo. A app lê trinta dias da agenda; um evento marcado para daqui a dois
 * meses NÃO vem nessa resposta, e não vir não quer dizer que foi apagado.
 * Oferecer-se para apagar esse seria perder um evento que ninguém mandou
 * apagar — e uma pergunta errada, repetida a cada entrada, ensina a responder
 * «sim» sem ler.
 */
process.env.EXPO_PUBLIC_HOJE = '2026-09-01';

const React = require('react');
const TestRenderer = require('react-test-renderer');

jest.mock('../src/pocketbase', () => ({
  estaLigado: () => false,
  auth: { valida: () => false, membro: () => null },
  ler: {},
  google: { disponivel: () => false, porLigar: () => false, verificar: async () => false },
}));

const { StoreProvider, useStore } = require('../src/store');
const { chaveRelativa } = require('../src/format');

// Monta a loja com eventos e devolve uma FUNÇÃO que lê a API.
//
// Devolver o objeto capturava um fecho obsoleto: depois de um `removerEvento`,
// o objeto na mão continuava a ver o estado anterior e um teste falhava a dizer
// que o evento não tinha sido apagado. O `Sonda` reatribui a cada render; quem
// pergunta tem de perguntar de novo.
const comEventos = (eventos) => {
  let api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
  });
  TestRenderer.act(() => {
    api.set({ clearedSeeds: true, added: eventos, eventEdits: {}, eventGone: {} });
  });
  return () => api;
};

const evento = (id, titulo, dias, idGoogle) => ({
  id, title: titulo, day: chaveRelativa(dias), time: '10:00',
  owner: 'Rita', visibilidade: 'familia',
  ...(idGoogle ? { idGoogle } : {}),
});

describe('o que saiu da agenda da Google', () => {
  it('é encontrado quando estava lá e já não está', () => {
    const loja = comEventos([evento('a', 'Dentista', 3, 'g-dentista')]);
    // A Google devolveu a janela SEM o «g-dentista».
    const saidos = loja().eventosQueSairamDaGoogle(['g-outro'], 30);
    expect(saidos.map(e => e.title)).toEqual(['Dentista']);
  });

  it('não é encontrado quando ainda está lá', () => {
    const loja = comEventos([evento('a', 'Dentista', 3, 'g-dentista')]);
    expect(loja().eventosQueSairamDaGoogle(['g-dentista'], 30)).toEqual([]);
  });

  it('⚠ não inclui um evento FORA da janela lida', () => {
    // O caso que faz perder eventos. A app lê trinta dias; este está a
    // sessenta, e não vir na resposta é o esperado — não é um apagar.
    const loja = comEventos([evento('a', 'Casamento', 60, 'g-casamento')]);
    expect(loja().eventosQueSairamDaGoogle([], 30)).toEqual([]);
  });

  it('nem um que já passou', () => {
    // Um evento de ontem também não vem na janela, que abre hoje.
    const loja = comEventos([evento('a', 'Reunião de ontem', -1, 'g-ontem')]);
    expect(loja().eventosQueSairamDaGoogle([], 30)).toEqual([]);
  });

  it('inclui o de hoje', () => {
    // A janela abre à meia-noite de hoje, portanto o de hoje conta.
    const loja = comEventos([evento('a', 'Almoço', 0, 'g-almoco')]);
    expect(loja().eventosQueSairamDaGoogle([], 30).map(e => e.title)).toEqual(['Almoço']);
  });

  it('ignora os eventos que nunca estiveram na Google', () => {
    // Sem `idGoogle` não há nada a comparar: são da casa e só da casa.
    const loja = comEventos([evento('a', 'Só nossa', 3, null)]);
    expect(loja().eventosQueSairamDaGoogle([], 30)).toEqual([]);
  });

  it('ignora um evento com o dia ilegível, em vez de o apagar', () => {
    const loja = comEventos([{ id: 'a', title: 'Torto', day: '2026-09-03',
      idGoogle: 'g-torto', owner: 'Rita' }]);
    expect(loja().eventosQueSairamDaGoogle([], 30)).toEqual([]);
  });

  it('não devolve um que já foi apagado na app', () => {
    const loja = comEventos([evento('a', 'Dentista', 3, 'g-dentista')]);
    TestRenderer.act(() => { loja().removerEvento('a'); });
    expect(loja().eventosQueSairamDaGoogle([], 30)).toEqual([]);
  });

  it('devolve os eventos, e não só os identificadores', () => {
    // Quem pergunta tem de poder dizer QUAIS — um diálogo que diz «3 eventos»
    // sem os nomear pede uma decisão sem dar com que a tomar.
    const loja = comEventos([evento('a', 'Dentista', 3, 'g-dentista')]);
    const [e] = loja().eventosQueSairamDaGoogle([], 30);
    expect(e.title).toBe('Dentista');
    expect(e.day).toBe(chaveRelativa(3));
  });
});

describe('o diálogo pergunta antes e informa', () => {
  const fs = require('fs');
  const path = require('path');
  const app = fs.readFileSync(path.join(__dirname, '..', 'App.jsx'), 'utf8');
  // Sem comentários: os que explicam o defeito CITAM os nomes em causa, e uma
  // rede que apanha a explicação obriga a não escrever a explicação.
  const semComentarios = (t) => t
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .split('\n').map(l => l.replace(/(^|\s)\/\/.*$/, '')).join('\n');
  const bloco = semComentarios(app.slice(app.indexOf('{saidosDaGoogle.length ?'),
                          app.indexOf('{/* Google Calendar Import Modal */}')));

  it('nomeia os eventos em causa', () => {
    expect(bloco).toMatch(/saidosDaGoogle\.slice\(0, 6\)\.map/);
    expect(bloco).toMatch(/e\.title/);
    expect(bloco).toMatch(/dayLabel\(e\.day\)/);
  });

  it('tem uma saída que não apaga', () => {
    expect(bloco).toMatch(/cancelLabel="Manter"/);
  });

  it('e «Manter» não volta a perguntar pelos mesmos', () => {
    // Uma pergunta que se repete a cada entrada ensina a responder sem ler.
    expect(bloco).toMatch(/idGoogle: null/);
  });

  it('apagar aqui não vai pedir à Google o que já não existe lá', () => {
    expect(bloco).toMatch(/removerEvento\(e\.id\)/);
    expect(bloco).not.toMatch(/apagarEvento/);
  });

  it('a acção é marcada como destrutiva', () => {
    expect(bloco).toMatch(/destructive/);
  });
});
