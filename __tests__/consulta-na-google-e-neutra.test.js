/**
 * Uma consulta vai para a agenda da Google — e vai NEUTRA.
 *
 * ⚠ É a prova de uma tensão, e não de uma funcionalidade.
 *
 * A decisão do dono da casa (06/09/2026) é que tudo o que a app marca em
 * calendário vai para a Google. O módulo de saúde só sincroniza para um
 * servidor DENTRO de casa, porque são dados clínicos de menores — categoria
 * especial no RGPD. Mandar «Consulta Dentista · Mia» para a Google é
 * exactamente o que esse travão existe para impedir, por outra porta.
 *
 * A resposta decidida: para a Google vai «Consulta» e a hora. A especialidade,
 * o médico, o nome de quem vai e as notas ficam na app e no servidor de casa.
 *
 * Sem esta prova, a decisão é um comentário. Com ela, quem lhe mexer sabe.
 */
const fs = require('fs');
const path = require('path');
const {
  eDeSaude, tituloParaGoogle, descricaoParaGoogle, convidadosParaGoogle,
  paraGoogle, enfileirar, naoVaiPassar, TITULO_NEUTRO,
} = require('../src/agenda-google');

const ler = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const CONSULTA = {
  title: 'Consulta Dentista',
  day: 'd2026-09-18', time: '15:00',
  who: 'Mia · Consulta de saúde', owner: 'Rita',
  visibilidade: 'adultos', tag: 'Saúde', healthId: 'h-1',
};
const JANTAR = {
  title: 'Jantar de aniversário',
  day: 'd2026-09-26', time: '19:30', owner: 'Rita', visibilidade: 'familia',
};

describe('⚠ o que a Google fica a saber de uma consulta', () => {
  it('reconhece-se uma consulta pelo episódio OU pela etiqueta', () => {
    expect(eDeSaude(CONSULTA)).toBe(true);
    expect(eDeSaude({ tag: 'Saúde' })).toBe(true);        // sem episódio atrás
    expect(eDeSaude({ healthId: 'h-9' })).toBe(true);     // sem etiqueta
    expect(eDeSaude(JANTAR)).toBe(false);
    expect(eDeSaude(null)).toBe(false);
  });

  it('⚠ o título é neutro, e a especialidade não sai de casa', () => {
    expect(tituloParaGoogle(CONSULTA)).toBe(TITULO_NEUTRO);
    expect(tituloParaGoogle(CONSULTA)).not.toMatch(/Dentista/);
  });

  it('⚠ nem o nome de quem vai — que é uma criança', () => {
    const corpo = JSON.stringify(paraGoogle(CONSULTA, {
      autor: 'Rita', emails: ['tomas@exemplo.pt'],
    }));
    expect(corpo).not.toMatch(/Mia/);
    expect(corpo).not.toMatch(/Dentista/);
    expect(corpo).not.toMatch(/Rita/);
  });

  it('⚠ e NINGUÉM é convidado — convidar manda a consulta por e-mail', () => {
    expect(convidadosParaGoogle(CONSULTA, ['tomas@exemplo.pt'])).toEqual([]);
  });

  it('⚠ nem descrição, que também diz de quem é a casa', () => {
    expect(descricaoParaGoogle(CONSULTA, 'Rita')).toBeUndefined();
  });

  it('mas a hora vai, que é para isso que serve', () => {
    const corpo = paraGoogle(CONSULTA, { autor: 'Rita' });
    expect(corpo.dia).toBe('d2026-09-18');
    expect(corpo.hora).toBe('15:00');
  });
});

describe('e um evento normal vai inteiro', () => {
  it('com o título que a pessoa escreveu', () => {
    expect(tituloParaGoogle(JANTAR)).toBe('Jantar de aniversário');
  });

  it('com quem o evento alcança, convidado', () => {
    expect(convidadosParaGoogle(JANTAR, ['tomas@exemplo.pt']))
      .toEqual(['tomas@exemplo.pt']);
  });

  it('e diz de onde veio', () => {
    expect(descricaoParaGoogle(JANTAR, 'Rita')).toMatch(/Nossa Casa/);
  });

  it('lê as duas formas de nomear um evento — a da loja e a do servidor', () => {
    expect(paraGoogle({ titulo: 'Reunião', dia: 'd2026-09-10', hora: '18:00' }))
      .toMatchObject({ titulo: 'Reunião', dia: 'd2026-09-10', hora: '18:00' });
  });
});

describe('a fila do que ainda não chegou à Google', () => {
  it('uma alteração repetida substitui a anterior', () => {
    // Três alterações sem rede mandavam três pedidos para dizer a mesma coisa,
    // e o penúltimo podia chegar depois do último.
    let f = [];
    f = enfileirar(f, { id: 'e1', acao: 'alterar', corpo: { hora: '10:00' } });
    f = enfileirar(f, { id: 'e1', acao: 'alterar', corpo: { hora: '11:00' } });
    expect(f).toHaveLength(1);
    expect(f[0].corpo.hora).toBe('11:00');
  });

  it('eventos diferentes não se atropelam', () => {
    let f = [];
    f = enfileirar(f, { id: 'e1', acao: 'criar', corpo: {} });
    f = enfileirar(f, { id: 'e2', acao: 'criar', corpo: {} });
    expect(f.map(x => x.id)).toEqual(['e1', 'e2']);
  });

  it('⚠ criado e apagado sem rede não deixa nada para trás', () => {
    // Não há o que apagar do lado de lá: o evento nunca chegou a existir.
    let f = enfileirar([], { id: 'e1', acao: 'criar', corpo: {} });
    f = enfileirar(f, { id: 'e1', acao: 'apagar' });
    expect(f).toEqual([]);
  });

  it('mas apagar um que JÁ subiu fica na fila', () => {
    let f = enfileirar([], { id: 'e1', acao: 'criar', corpo: {} });
    f = enfileirar(f, { id: 'e1', acao: 'apagar', idGoogle: 'g-1' });
    expect(f).toHaveLength(1);
    expect(f[0].acao).toBe('apagar');
  });

  it('⚠ tem tecto — uma rede de segurança sem fundo é um saco', () => {
    const { FILA_MAX } = require('../src/agenda-google');
    let f = [];
    for (let i = 0; i < FILA_MAX + 25; i++) {
      f = enfileirar(f, { id: 'e' + i, acao: 'criar', corpo: {} });
    }
    expect(f).toHaveLength(FILA_MAX);
    // As mais antigas é que saem: o que ficou preso há mais tempo é o que tem
    // menos hipóteses de ainda interessar.
    expect(f[f.length - 1].id).toBe('e' + (FILA_MAX + 24));
    expect(f[0].id).toBe('e25');
  });

  it('⚠ e sem a agenda LIGADA nada entra na fila', () => {
    // Numa casa que nunca autorizou a Google, cada evento entrava numa fila que
    // nada esvazia. A fila é para uma rede que caiu, não para uma agenda que
    // não existe.
    const loja = ler('src/store.jsx');
    const bloco = loja.slice(loja.indexOf('const empurrarParaGoogle'),
      loja.indexOf('const escoarFilaGoogle'));
    expect(bloco).toMatch(/agendaGoogle\.disponivel\(\)\) return/);
  });

  it('⚠ e o que a Google recusa sai da fila em vez de a entupir', () => {
    expect(naoVaiPassar({ status: 404 })).toBe(true);
    expect(naoVaiPassar({ status: 403 })).toBe(true);
    expect(naoVaiPassar({ status: 503 })).toBe(false);
    expect(naoVaiPassar(new Error('Network request failed'))).toBe(false);
  });
});

describe('⚠ e a decisão está ligada, não só escrita', () => {
  const loja = ler('src/store.jsx');

  it('a loja usa o `paraGoogle`, e não monta o corpo à mão', () => {
    expect(loja).toMatch(/from '\.\/agenda-google'/);
    expect(loja).toMatch(/paraGoogle\(ev, \{/);
    // ⚠ E o corpo que vai para a Google não traz título nenhum escrito à mão.
    //
    // A primeira versão desta prova recusava `titulo: title` no `criarEvento`
    // inteiro — e falhou, com razão: o `sync.eventoDaCasa` logo acima escreve
    // `titulo: title`, e ESSE tem de levar o título completo. O servidor é de
    // casa; a Google não é. A prova é sobre o que sai para a Google.
    const empurra = loja.slice(loja.indexOf('empurrarParaGoogle({'),
      loja.indexOf('return idLocal'));
    expect(empurra).toMatch(/paraGoogle\(/);
    expect(empurra).not.toMatch(/titulo:/);
  });

  it('a Saúde marca pelo `criarEvento` da loja, que é quem empurra', () => {
    const saude = ler('src/screens/Saude.jsx');
    expect(saude).toMatch(/st\.criarEvento\(\{/);
    // E marca-a como sendo de saúde, senão o título neutro não se aplica.
    const bloco = saude.slice(saude.indexOf('st.criarEvento({'),
      saude.indexOf('st.criarEvento({') + 600);
    expect(bloco).toMatch(/tag: 'Saúde'/);
    expect(bloco).toMatch(/healthId:/);
  });
});
