/**
 * Apagar uma consulta — e a validação que a trava.
 *
 * ⚠ O `healthGone` era lido a cada leitura de fichas e NUNCA escrito.
 *
 * A maquinaria de apagar estava montada — a lista existia, o filtro lia-a — e
 * não havia porta nenhuma: nem botão, nem menu, nem gesto. Uma consulta marcada
 * por engano, no membro errado ou a dobrar, ficava para sempre. Arquivar
 * esconde-a da lista; não a tira da casa nem do servidor.
 *
 * Apanhado a percorrer os ecrãs com a casa vazia, 06/09/2026. É a mesma forma
 * do `tempoReal`: construído, comentado, e sem quem lhe chame.
 *
 * ── A validação, em três camadas ────────────────────────────────────────────
 *
 *   servidor   a `deleteRule` de `episodios_saude` — um adulto apaga a SUA ou a
 *              de uma criança da casa, e mais ninguém. É ela que conta
 *              (INVARIANTE #3), e tem provas em `provar-saude.mjs`.
 *   cliente    a mesma regra deste lado, para a app poder EXPLICAR o não em vez
 *              de mandar o pedido e mostrar um 404.
 *   a pergunta diz o que leva atrás — notas, receitas, documentos, decisão e o
 *              evento na agenda — contado do estado, e não escrito à mão.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const fs = require('fs');
const path = require('path');
const { StoreProvider, useStore } = require('../src/store');

const ler = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const loja = () => {
  let api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
  });
  return () => api;
};

// Uma consulta de uma criança, que os adultos veem e ela não.
//
// ⚠ O id sai do `s.health`, e não de um `find` no `allHealth()`.
//
// A casa de demonstração JÁ TEM consultas do Léo — sementes do `data.js` —, e
// o `find(h => h.member === membro)` devolvia a primeira delas, que é uma
// semente com documentos anexados. A prova apagava a semente e depois
// espantava-se com dois documentos que não eram dela.
const marcar = (ler_, membro = 'Léo') => {
  TestRenderer.act(() => {
    ler_().addHealthRecord(membro, '28/09/2026', 'Pediatria', '10:00',
      { doctor: 'Dr.ª Neves', nota: 'Levar o boletim' });
  });
  const criadas = ler_().s.health || [];
  return criadas[criadas.length - 1].id;
};

describe('⚠ apagar uma consulta — o que faltava', () => {
  it('a consulta desaparece das fichas', () => {
    const l = loja();
    const id = marcar(l);
    expect(l().allHealth().some(h => h.id === id)).toBe(true);
    let porque;
    TestRenderer.act(() => { porque = l().apagarConsulta(id, 'Rita'); });
    expect(porque).toBe(null);
    expect(l().allHealth().some(h => h.id === id)).toBe(false);
  });

  it('e a lápide fica escrita — que é o que a faz desaparecer', () => {
    const l = loja();
    const id = marcar(l);
    TestRenderer.act(() => { l().apagarConsulta(id, 'Rita'); });
    expect(l().s.healthGone[id]).toBe(true);
  });

  it('⚠ as notas, as receitas e os documentos vão com ela', () => {
    const l = loja();
    const id = marcar(l);
    TestRenderer.act(() => {
      l().addHealthNote(id, 'Rita', 'Correu bem');
      l().addRecipe(id, 'Ben-u-ron', '250mg', 2, 'ml', '');
      l().setHealthDecision(id, { type: 'Exame', status: 'Pendente', note: '' });
    });
    expect((l().s.healthNotes[id] || []).length).toBe(1);
    TestRenderer.act(() => { l().apagarConsulta(id, 'Rita'); });
    expect(l().s.healthNotes[id]).toBeUndefined();
    expect(l().s.healthRecipes[id]).toBeUndefined();
    expect(l().s.healthDecisions[id]).toBeUndefined();
    expect(l().docsDaConsulta(id)).toEqual([]);
  });

  it('⚠ e o evento da agenda também — senão fica a apitar à hora de nada', () => {
    const l = loja();
    let id;
    TestRenderer.act(() => {
      id = 'h-teste';
      l().criarEvento({ day: 'd2026-09-28', time: '10:00', title: 'Consulta Pediatria',
        owner: 'Rita', visibilidade: 'adultos', tag: 'Saúde', healthId: id });
    });
    expect(l().allEvents().some(e => e.healthId === id)).toBe(true);
    TestRenderer.act(() => {
      l().addHealthRecord('Léo', '28/09/2026', 'Pediatria', '10:00');
    });
    const real = l().allHealth().find(h => h.member === 'Léo').id;
    // O evento aponta para `h-teste`; liga-se um evento ao episódio real.
    TestRenderer.act(() => {
      l().criarEvento({ day: 'd2026-09-28', time: '10:00', title: 'Consulta Pediatria',
        owner: 'Rita', visibilidade: 'adultos', tag: 'Saúde', healthId: real });
    });
    expect(l().allEvents().some(e => e.healthId === real)).toBe(true);
    TestRenderer.act(() => { l().apagarConsulta(real, 'Rita'); });
    expect(l().allEvents().some(e => e.healthId === real)).toBe(false);
  });

  it('o registo da casa regista — sem dizer de quem nem de quê', () => {
    // ⚠ O registo é lido por todos os adultos. «Consulta de Dentista da Mia
    // apagada» punha no histórico exatamente o que a ficha existe para fechar.
    const l = loja();
    const id = marcar(l);
    TestRenderer.act(() => { l().apagarConsulta(id, 'Rita'); });
    const linha = (l().s.registo || [])[0];
    expect(linha.t).toBe('Uma consulta foi apagada');
    expect(linha.a).toBe('Saúde');
    expect(linha.t).not.toMatch(/Pediatria|Léo/);
  });
});

describe('⚠ e a validação recusa quando tem de recusar', () => {
  it('uma consulta que já não existe', () => {
    const l = loja();
    expect(l().porqueNaoApaga('inventado', 'Rita')).toMatch(/já não existe/);
  });

  it('⚠ a ficha de um adulto não é apagada pelo OUTRO adulto', () => {
    const l = loja();
    const id = marcar(l, 'Rita');
    expect(l().porqueNaoApaga(id, 'Tomás')).toMatch(/não é sua/);
    let porque;
    TestRenderer.act(() => { porque = l().apagarConsulta(id, 'Tomás'); });
    expect(porque).toMatch(/não é sua/);
    // E continua lá.
    expect(l().allHealth().some(h => h.id === id)).toBe(true);
  });

  it('⚠ nem uma criança apaga a sua própria — que nem a vê', () => {
    const l = loja();
    const id = marcar(l, 'Léo');
    expect(l().porqueNaoApaga(id, 'Léo')).toMatch(/não é sua/);
    let porque;
    TestRenderer.act(() => { porque = l().apagarConsulta(id, 'Léo'); });
    expect(porque).toBeTruthy();
    expect(l().allHealth().some(h => h.id === id)).toBe(true);
  });

  it('mas um adulto apaga a de uma criança da casa', () => {
    const l = loja();
    const id = marcar(l, 'Mia');
    expect(l().porqueNaoApaga(id, 'Tomás')).toBe(null);
  });

  it('e a razão é a MESMA do `podeVerSaude` — não uma segunda regra ao lado', () => {
    const codigo = ler('src/store.jsx');
    const bloco = codigo.slice(codigo.indexOf('const porqueNaoApaga'),
      codigo.indexOf('const apagarConsulta'));
    expect(bloco).toMatch(/podeVerSaude\(r\.member, quemPede\)/);
  });
});

describe('a pergunta diz o que leva atrás', () => {
  it('conta as peças a partir do estado', () => {
    const l = loja();
    const id = marcar(l);
    TestRenderer.act(() => {
      l().addHealthNote(id, 'Rita', 'uma');
      l().addHealthNote(id, 'Rita', 'duas');
      l().addRecipe(id, 'Ben-u-ron', '250mg', 1, 'ml', '');
    });
    const cai = l().oQueCaiCom(id);
    expect(cai.notas).toBe(2);
    expect(cai.receitas).toBe(1);
    expect(cai.documentos).toBe(0);
    expect(cai.decisao).toBe(false);
  });

  it('⚠ e o ecrã usa essa contagem, e não uma sua', () => {
    // Duas contagens ao lado uma da outra divergem, e a pergunta passaria a
    // mentir sobre o que o botão faz — o INVARIANTE #2 aplicado a uma frase.
    const ecra = ler('src/screens/Saude.jsx');
    expect(ecra).toMatch(/oQueCaiCom\(aApagar\.id\)/);
    expect(ecra).toMatch(/Não se desfaz/);
    expect(ecra).toMatch(/use Arquivar/);
  });

  it('e o botão existe, com confirmação', () => {
    const ecra = ler('src/screens/Saude.jsx');
    expect(ecra).toMatch(/Apagar Consulta/);
    expect(ecra).toMatch(/<Confirm t=\{t\}[\s\S]{0,600}destructive/);
  });
});

describe('a saúde só se apaga onde se pode escrever', () => {
  it('⚠ passa pelo mesmo travão das outras escritas de saúde', () => {
    // `recusaSaude` rebenta quando o servidor não é de casa. Apagar é uma
    // escrita, e escapava-lhe se não o chamasse.
    const sync = ler('src/sync.js');
    const bloco = sync.slice(sync.indexOf('export async function apagarEpisodioDeSaude'),
      sync.indexOf('export async function apagarEpisodioDeSaude') + 400);
    expect(bloco).toMatch(/recusaSaude\('episodios_saude'\)/);
  });

  it('e o servidor é chamado primeiro, antes de a app se apagar a si', () => {
    const codigo = ler('src/store.jsx');
    const bloco = codigo.slice(codigo.indexOf('const apagarConsulta'),
      codigo.indexOf('const apagarConsulta') + 2200);
    expect(bloco.indexOf('apagarEpisodioDeSaude'))
      .toBeLessThan(bloco.indexOf('healthGone:'));
  });
});
