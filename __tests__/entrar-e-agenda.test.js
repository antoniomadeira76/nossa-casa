/**
 * Entrar tem de deixar a casa montada ANTES de haver um nome.
 *
 * ── O defeito ───────────────────────────────────────────────────────────────
 *
 * `entrar()` fazia `setUser(nome)` e só depois `await lerDoServidor()`. O
 * efeito que pesquisa a agenda da Google corre quando o `user` muda, e a sua
 * primeira linha é
 *
 *     if (!user || !MEMBERS[user] || MEMBERS[user].kid) return;
 *
 * Com o nome já posto e o quadro ainda vazio, `MEMBERS[user]` era `undefined`:
 * o efeito desistia. E `MEMBERS` não estava nas dependências, portanto não
 * voltava a correr quando os membros chegavam.
 *
 * Entrar pela Google NUNCA pesquisava a agenda. Só uma recarga da página o
 * fazia — e aí por acaso, porque a retoma da sessão lê a casa antes do nome.
 */
const fs = require('fs');
const path = require('path');

const app = fs.readFileSync(path.join(__dirname, '..', 'App.jsx'), 'utf8');
const semComentarios = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map(l => l.replace(/(^|\s)\/\/.*$/, '')).join('\n');
const codigo = semComentarios(app);

describe('entrar monta a casa antes de pôr o nome', () => {
  const entrar = codigo.slice(codigo.indexOf('const entrar = async'),
                              codigo.indexOf('const mode ='));

  it('a leitura do servidor vem antes do `setUser`', () => {
    const casa = entrar.indexOf('lerDoServidor()');
    const nome = entrar.indexOf('setUser(nome)');
    expect(casa).toBeGreaterThan(-1);
    expect(nome).toBeGreaterThan(-1);
    expect(casa).toBeLessThan(nome);
  });

  it('a retoma da sessão faz o mesmo', () => {
    // Já fazia, e com o comentário a dizer porquê — o `entrar` é que divergia.
    const retoma = codigo.slice(codigo.indexOf('const m = servidor.auth.valida()'),
                                codigo.indexOf('const euNaCasa'));
    expect(retoma.indexOf('lerDoServidor()')).toBeLessThan(retoma.indexOf('setUser(m.nome)'));
  });
});

describe('a pesquisa da agenda ao entrar', () => {
  const efeito = codigo.slice(codigo.indexOf('if (!user || !MEMBERS[user]'),
                              codigo.indexOf('const euNaCasa'));

  it('depende do quadro de membros, e não só do nome', () => {
    // Sem `MEMBERS` na lista, o efeito desiste quando o quadro está vazio e
    // não volta a correr quando ele chega.
    const deps = efeito.match(/\}, \[([^\]]+)\]\);/);
    expect(deps).not.toBeNull();
    expect(deps[1]).toMatch(/\bMEMBERS\b/);
    expect(deps[1]).toMatch(/\buser\b/);
  });

  it('pergunta ao servidor se a agenda está ligada, sempre que alguém entra', () => {
    // Antes só perguntava se a resposta fosse desconhecida. Um adulto a sair e
    // outro a entrar ficava com a resposta do primeiro: a app dizia «ligada» a
    // quem nunca a ligou, e falhava a cada pedido sem explicar porquê.
    expect(efeito).toMatch(/await servidor\.google\.verificar\(\)/);
    expect(efeito).not.toMatch(/porSaber\(\)/);
  });

  it('procura os eventos e abre o aviso quando há novidades', () => {
    expect(efeito).toMatch(/servidor\.google\.eventos\(/);
    expect(efeito).toMatch(/setGoogleImport\(true\)/);
  });

  it('não oferece de volta o que a própria app pôs na Google', () => {
    expect(efeito).toMatch(/nossos\.has\(e\.id\)/);
  });
});

describe('a camada do servidor não deixa APIs sem quem as chame', () => {
  const pb = semComentarios(
    fs.readFileSync(path.join(__dirname, '..', 'src', 'pocketbase.js'), 'utf8'));

  it('`porSaber` foi removido quando deixou de ser chamado', () => {
    // Uma API que ninguém chama é uma promessa que ninguém verifica.
    expect(pb).not.toMatch(/porSaber/);
  });
});
