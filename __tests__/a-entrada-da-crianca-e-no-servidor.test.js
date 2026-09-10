/**
 * O PIN vive no servidor — a criança entra lá, o «tem PIN» vem de lá, e ela
 * muda-o lá.
 *
 * ── O que se viu ─────────────────────────────────────────────────────────────
 *
 * 09/09/2026 — o dono da casa: «tudo deve ser guardado no servidor; no caso de
 * passwords e PINs o administrador pode fazer reset e as crianças podem
 * alterar o PIN». Três coisas, e as três estavam a meio:
 *
 * · o PIN SUBIA como palavra-passe (rota `/api/casa/pin`), mas a criança
 *   ENTRAVA contra um resumo local (`verificarPin`) — «um PIN comparado no
 *   dispositivo é um PIN que está no dispositivo» (docs/seguranca.html §3).
 *   O `auth.entrarCrianca` existia sem ninguém lhe chamar: classe #2.
 * · o «Ainda sem PIN — pedir a um adulto» lia o resumo local, que só existia
 *   no telemóvel onde o PIN fora posto: noutro, a criança com PIN aparecia
 *   sem ele.
 * · a criança não tinha como mudar o PIN.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * Com servidor, cada uma das três vai ao servidor. O resumo local fica com um
 * papel só — a entrada sem servidor — e é a LOJA que decide, não o ecrã.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');

describe('⚠ o PIN vive no servidor', () => {
  it('o ecrã de entrada pergunta à loja, e não compara resumos', () => {
    const login = ler('src/screens/Login.jsx');
    expect(login).not.toMatch(/verificarPin/);
    expect(login).toMatch(/await entrarCrianca\(kid, p\)/);
    // E o «tem PIN» também vem da loja.
    expect(login).not.toMatch(/s\.pins\[/);
    expect(login).toMatch(/temPin\(n\)/);
  });

  it('a loja entra a criança no servidor quando ele está lá, e só sem ele compara o resumo', () => {
    const store = ler('src/store.jsx');
    const i = store.indexOf('const entrarCrianca = async');
    expect(i).toBeGreaterThan(0);
    const corpo = store.slice(i, i + 900);
    expect(corpo).toMatch(/sync\.entrarCrianca\(m\.login, pin\)/);
    expect(corpo).toMatch(/return \{ ok: verificarPin\(name, pin\) \}/);
    // O servidor em baixo não é um PIN errado: `erro`, e não `ok: false` mudo.
    expect(corpo).toMatch(/erro: 'O servidor da casa não está a responder/);
  });

  it('o «tem PIN» é o `pin_definido` do servidor, declarado nos DOIS sítios da base', () => {
    expect(ler('src/sync.js')).toMatch(/pinDefinido: !!m\.pin_definido/);
    expect(ler('db/pocketbase/criar-colecoes.mjs')).toMatch(/bool\('pin_definido'\)/);
    expect(ler('db/pocketbase/acrescentar-campos.mjs')).toMatch(/\['membros', 'pin_definido', \{ type: 'bool' \}\]/);
    // Quem o escreve é o servidor: o hook, quando a palavra-passe entra, e a rota.
    expect(ler('db/pocketbase/pb_hooks/membros.pb.js')).toMatch(/e\.record\.set\('pin_definido', true\)/);
    expect(ler('db/pocketbase/pb_hooks/pin.pb.js').match(/set\('pin_definido', true\)/g) || []).toHaveLength(2);
    // E a Gestão lê-o pela loja, não pelo resumo.
    expect(ler('src/screens/Gestao.jsx')).not.toMatch(/s\.pins\[/);
  });

  it('a criança muda o seu PIN por uma rota PRÓPRIA, que exige o atual e não toca no papel', () => {
    const rota = ler('db/pocketbase/pb_hooks/pin.pb.js');
    expect(rota).toMatch(/routerAdd\('POST', '\/api\/casa\/pin\/proprio'/);
    expect(rota).toMatch(/quem\.validatePassword\(atual\)/);
    expect(rota).toMatch(/quem\.get\('papel'\) !== 'crianca'/);
    // A app chama-a, e volta a entrar com o novo — a palavra-passe nova
    // invalida o token.
    const sync = ler('src/sync.js');
    expect(sync).toMatch(/await servidor\.auth\.mudarMeuPin\(atual, novo\);\s*await servidor\.auth\.entrarCrianca\(r\.login, novo\)/);
    // E a KidApp tem onde: a bola do cabeçalho abre «O meu perfil», e uma das
    // linhas dessa folha é «O meu PIN» (desde 10/09/2026; antes a bola abria
    // o PIN directamente).
    const kid = ler('src/KidApp.jsx');
    expect(kid).toMatch(/accessibilityLabel="O meu perfil"/);
    expect(kid).toMatch(/title="O meu PIN"/);
    expect(kid).toMatch(/mudarMeuPin\(kid, atual, novo\)/);
  });

  it('a reposição continua a ser só de quem administra — a rota de cima não mudou', () => {
    const rota = ler('db/pocketbase/pb_hooks/pin.pb.js');
    expect(rota).toMatch(/routerAdd\('POST', '\/api\/casa\/pin', /);
    expect(rota).toMatch(/So quem administra a casa define PIN/);
  });

  it('sair do modo criança também sai do servidor — o token dela não fica no dispositivo', () => {
    expect(ler('App.jsx')).toMatch(/onLogout=\{\(\) => \{ servidor\.auth\.sair\(\); setUser\(null\); \}\}/);
  });
});
