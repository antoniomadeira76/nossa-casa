/**
 * As tarefas e a agenda sobem — a tradução entre a loja e as coleções.
 *
 * ── O que se encontrou ───────────────────────────────────────────────────────
 *
 * A base de dados tinha 31 coleções e o cliente escrevia em 10. Não havia uma
 * única escrita para `tarefas`, `eventos`, `envelopes`, `artigos`,
 * `equipamentos` — treze coleções construídas e provadas, sem ninguém a
 * escrever nelas. As tarefas e a agenda viviam só no telefone de quem as
 * escreveu, e dois telefones nunca se viam.
 *
 * ── O que estas provas cobrem, e o que não ───────────────────────────────────
 *
 * A rede a sério está em `db/pocketbase/provar-agenda-e-tarefas-pela-app.mjs`:
 * dois clientes, o servidor a correr, os campos conferidos um a um.
 *
 * Isto é a outra metade — a que corre sem servidor: que o `sync.js` traduz nos
 * dois sentidos, que os nomes são os das COLEÇÕES e não os da loja, e que a
 * loja não deixa de fazer o que fazia quando não há servidor nenhum.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { StoreProvider, useStore } = require('../src/store');

const raiz = path.join(__dirname, '..');
const sync = fs.readFileSync(path.join(raiz, 'src/sync.js'), 'utf8');
const loja = fs.readFileSync(path.join(raiz, 'src/store.jsx'), 'utf8');

const semComentarios = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

describe('⚠ os nomes são os das COLEÇÕES, não os da loja', () => {
  // O PocketBase ignora campos que não conhece EM SILÊNCIO: a escrita passa,
  // responde 200, e o dado cai. Já aconteceu duas vezes neste projeto — com o
  // `medico` e as `notas` de uma consulta, e com as despesas.
  const bloco = (nome) => {
    const i = sync.indexOf(`export async function ${nome}(`);
    expect(i).toBeGreaterThan(0);
    return sync.slice(i, i + 900);
  };

  it('uma tarefa sobe com `titulo`, `atribuido_a` e `recorrencia`', () => {
    const b = bloco('tarefaDaCasa');
    expect(b).toContain("'tarefas'");
    expect(b).toMatch(/titulo,/);
    expect(b).toMatch(/atribuido_a:/);
    expect(b).toMatch(/recorrencia:/);
    // E NÃO os nomes da loja.
    expect(b).not.toMatch(/\btitle:/);
    expect(b).not.toMatch(/\bwho:/);
    expect(b).not.toMatch(/\brecur:/);
  });

  it('um evento sobe com `titulo`, `etiqueta` e `visibilidade`', () => {
    const b = bloco('eventoDaCasa');
    expect(b).toContain("'eventos'");
    expect(b).toMatch(/titulo,/);
    expect(b).toMatch(/etiqueta:/);
    expect(b).toMatch(/visibilidade:/);
    expect(b).not.toMatch(/\btag:/);
    expect(b).not.toMatch(/\bowner:/);
  });

  it('⚠ e o `partilhado` não voltou — era o booleano de um só nível', () => {
    // A app tem três níveis. Um booleano não sabe dizer «adultos», e é esse o
    // que a consulta de uma criança usa.
    expect(semComentarios(sync)).not.toContain('partilhado');
  });
});

describe('a recorrência traduz-se nos dois sentidos', () => {
  it('as três da loja têm par no servidor, e voltam iguais', () => {
    const i = sync.indexOf('const RECORRENCIA_NO_SERVIDOR');
    expect(i).toBeGreaterThan(0);
    const bloco = sync.slice(i, sync.indexOf('};', i));
    for (const [loja, servidor] of [['Uma vez', 'uma_vez'],
                                    ['Todos os dias', 'diaria'],
                                    ['Dias de semana', 'dias_semana']]) {
      expect(bloco).toContain(`'${loja}': '${servidor}'`);
    }
    // E a tabela inversa é DERIVADA, não escrita à mão — duas tabelas soltas
    // divergem, e a segunda é sempre a que fica errada.
    expect(sync).toMatch(/RECORRENCIA_NA_LOJA = Object\.fromEntries/);
  });
});

describe('⚠ o cliente NÃO filtra a agenda — o servidor é que decide', () => {
  it('o `puxarCasa` não olha para a visibilidade ao mapear os eventos', () => {
    // Se filtrasse, o dado privado já teria chegado ao dispositivo — é o
    // INVARIANTE #3 ao contrário, e é a forma de falha que ele existe para
    // impedir. A regra vive na coleção, com 11 provas.
    const i = sync.indexOf('const added = (casa.eventos');
    expect(i).toBeGreaterThan(0);
    const bloco = sync.slice(i, i + 800);
    expect(bloco).not.toMatch(/podeVerEvento|visibilidadeDe/);
    expect(bloco).not.toMatch(/visibilidade\s*===/);
  });
});

describe('⚠ marcar uma tarefa é ADITIVO (INVARIANTE #2)', () => {
  it('marcar CRIA uma linha e desmarcar APAGA-A — nunca um booleano', () => {
    const i = sync.indexOf('export async function marcarTarefaFeita');
    const bloco = sync.slice(i, i + 1200);
    expect(bloco).toContain("collection('tarefas_feitas').create");
    // Nunca um `feita: true` na tarefa.
    expect(semComentarios(sync)).not.toMatch(/feita:\s*true/);

    const j = sync.indexOf('export async function desmarcarTarefaFeita');
    expect(sync.slice(j, j + 300)).toContain("collection('tarefas_feitas').delete");
  });

  it('⚠ e uma colisão no índice não é erro — devolve a linha que já existe', () => {
    // Dois telefones que marquem a mesma tarefa no mesmo dia colidem no índice
    // único. Isso quer dizer «já estava marcada», que é o estado que se pediu.
    const i = sync.indexOf('export async function marcarTarefaFeita');
    const bloco = sync.slice(i, i + 1200);
    expect(bloco).toContain('getFirstListItem');
    expect(bloco).toMatch(/jaEstava/);
  });
});

describe('a loja guarda o id do servidor, senão fica imutável', () => {
  it('⚠ criar uma tarefa guarda o `idServidor`', () => {
    // Sem ele, marcar, alterar e apagar não têm para onde ir: a tarefa fica
    // partilhada e imutável do outro lado.
    const i = loja.indexOf('const criarTarefa');
    expect(i).toBeGreaterThan(0);
    const bloco = loja.slice(i, i + 1800);
    expect(bloco).toContain('sync.tarefaDaCasa');
    expect(bloco).toMatch(/idServidor: r\.id/);
  });

  it('⚠ e apagar lê o id ANTES de o `set` correr', () => {
    // Depois do `set` a tarefa já não está na lista, e não há de onde o tirar.
    const i = loja.indexOf('const removerTarefa = (id) =>');
    const bloco = loja.slice(i, i + 400);
    expect(bloco).toMatch(/tarefaNoServidor\(id\)/);
    expect(bloco.indexOf('tarefaNoServidor')).toBeLessThan(bloco.indexOf('removerTarefaLocal'));
  });

  it('⚠ e a folha «Nova Tarefa» já não escreve direto na loja', () => {
    // Uma escrita numa folha é uma escrita sem sítio onde a sincronização
    // possa viver — e a folha seguinte que alguém acrescente esquece-se dela.
    const folha = fs.readFileSync(path.join(raiz, 'src/sheets/NovaTarefa.jsx'), 'utf8');
    expect(semComentarios(folha)).not.toMatch(/newTasks:\s*\[/);
    expect(folha).toContain('criarTarefa(form)');
  });
});

describe('e sem servidor a app faz o que sempre fez', () => {
  const comLoja = () => {
    let api = null;
    const Sonda = () => { api = useStore(); return null; };
    TestRenderer.act(() => {
      TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
    });
    return () => api;
  };

  it('criar uma tarefa põe-na na lista, com urgência e prazo', () => {
    const st = comLoja();
    let id;
    TestRenderer.act(() => {
      id = st().criarTarefa({ title: 'Aspirar a sala', who: 'Tomás',
        recur: 'Uma vez', pts: 2, urg: 0, dueKey: 'd2026-09-30', dueTime: '18:00' });
    });
    expect(id).toBeTruthy();
    const t = st().s.newTasks.find(x => x.id === id);
    expect(t).toMatchObject({ title: 'Aspirar a sala', who: 'Tomás', pts: 2 });
    expect(st().s.urg[id]).toBe(0);
    expect(st().s.due[id]).toEqual({ key: 'd2026-09-30', time: '18:00' });
    // Sem servidor não há id do servidor, e a tarefa continua a funcionar.
    expect(t.idServidor).toBeUndefined();
  });

  it('um título vazio não cria nada', () => {
    const st = comLoja();
    const antes = st().s.newTasks.length;
    let id;
    TestRenderer.act(() => { id = st().criarTarefa({ title: '   ', who: 'Rita' }); });
    expect(id).toBeNull();
    expect(st().s.newTasks).toHaveLength(antes);
  });

  it('⚠ e marcar uma tarefa continua a funcionar sem servidor', () => {
    // O `tapTask` passou a decidir o que sobe a partir do estado seguinte. Se
    // essa mudança tivesse partido o caminho local, a app deixava de marcar
    // tarefas em casa de quem não tem servidor — que é a maioria.
    const st = comLoja();
    let id;
    TestRenderer.act(() => {
      id = st().criarTarefa({ title: 'Regar as plantas', who: 'Rita', recur: 'Uma vez', pts: 1, urg: 1 });
    });
    expect(!!st().s.done[id]).toBe(false);
    TestRenderer.act(() => { st().tapTask(id); });
    expect(!!st().s.done[id]).toBe(true);
    TestRenderer.act(() => { st().tapTask(id); });
    expect(!!st().s.done[id]).toBe(false);
  });
});
