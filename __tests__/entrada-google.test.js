/**
 * O ecrã de entrada não afirma causas que não apurou.
 *
 * Este defeito voltou duas vezes, das duas por caminhos diferentes:
 *
 *   1ª  a causa deduzia-se da FRASE do erro, com `/oauth|provider|missing/`.
 *       «Failed to fetch OAuth2 user» tem «OAuth» lá dentro, e o ecrã dizia
 *       «a Google não está configurada» com tudo configurado.
 *   2ª  a causa passou a ser perguntada ao servidor, mas o `provedores()`
 *       devolvia `[]` tanto para «o servidor diz que não tem a Google» como
 *       para «o servidor não respondeu». O ecrã leu o segundo como o primeiro
 *       e disse outra vez «não está configurada» — com o servidor DESLIGADO.
 *
 * Das duas vezes, a mensagem mandou olhar para a consola da Google, onde não
 * havia nada. É por isso que isto tem teste.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const semComentarios = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map(l => l.replace(/(^|\s)\/\/.*$/, '')).join('\n');

const login = semComentarios(fs.readFileSync(path.join(raiz, 'src/screens/Login.jsx'), 'utf8'));
const pb = semComentarios(fs.readFileSync(path.join(raiz, 'src/pocketbase.js'), 'utf8'));

describe('a causa da falha é apurada, não deduzida', () => {
  it('não se lê a causa na frase do erro', () => {
    // O teste original. Se voltar, volta o mesmo engano.
    expect(login).not.toMatch(/oauth\|provider\|missing/);
  });

  it('`provedores()` distingue «não tem» de «não respondeu»', () => {
    const bloco = pb.slice(pb.indexOf('provedores: async'), pb.indexOf('sair:'));
    expect(bloco).toMatch(/alcancavel/);
    expect(bloco).toMatch(/semServidor/);
    // Um `return []` cru é o defeito: apaga a diferença entre os dois casos.
    expect(bloco).not.toMatch(/catch\s*\{\s*return \[\];?\s*\}/);
  });

  it('cada causa tem a sua mensagem', () => {
    // O fim procura-se A PARTIR do início, não desde o topo do ficheiro:
    // há um `setStep('contas')` mais acima e a fatia saía vazia — um teste
    // que examina uma cadeia vazia falha sem dizer porquê.
    const inicio = login.indexOf('const p = await servidor.auth.provedores()');
    expect(inicio).toBeGreaterThan(-1);
    const bloco = login.slice(inicio, login.indexOf("setStep('contas')", inicio));
    expect(bloco.length).toBeGreaterThan(100);
    // sem servidor nenhum
    expect(bloco).toMatch(/semServidor/);
    // servidor configurado mas caído — é esta que faltava
    expect(bloco).toMatch(/!p\.alcancavel/);
    expect(bloco).toMatch(/não está a responder/);
    // servidor a responder, sem a Google
    expect(bloco).toMatch(/!p\.lista\.includes\('google'\)/);
    // a pessoa fechou a janela
    expect(bloco).toMatch(/cancelado/);
  });

  it('a mensagem do servidor caído não culpa a Google', () => {
    // Foi o que custou as duas voltas: a frase mandava olhar para o lado
    // errado. Agora diz explicitamente que não é a Google.
    const m = login.match(/'O servidor da casa não está a responder\.[^;]+/);
    expect(m).not.toBeNull();
    expect(m[0]).toMatch(/Não é a Google/);
  });

  it('nenhuma mensagem de entrada trata a pessoa por tu ou você', () => {
    // O registo é formal e em terceira pessoa, sem o pronome.
    const frases = login.match(/'[^']{25,}'/g) || [];
    for (const f of frases) {
      expect(f).not.toMatch(/\b(tu|você|teu|tua|seu servidor)\b/i);
    }
  });
});
