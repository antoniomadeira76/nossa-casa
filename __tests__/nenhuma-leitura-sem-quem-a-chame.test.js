/**
 * ⚠ Nenhuma função de LEITURA do cliente fica sem quem a chame.
 *
 * ── O defeito ────────────────────────────────────────────────────────────────
 *
 * O `ler.saude()` do `pocketbase.js` estava escrito, comentado e documentado —
 * até o `CLAUDE.md` o citava como prova de que o lado do cliente estava feito.
 * E ninguém lhe chamava. Nem o `sync.js`, nem a loja, nem um ecrã.
 *
 * Consequência: a saúde era a única área da app de sentido ÚNICO. A Rita
 * marcava uma consulta à Mia, ela subia para o servidor da casa, e o telemóvel
 * do Tomás nunca a via — não por uma regra, mas porque nunca perguntava. Todo o
 * resto da casa desce.
 *
 * Descoberto a semear a casa e a olhar para o ecrã: quatro consultas no
 * servidor, «0 consultas» na app.
 *
 * ── Porque é que faltava esta prova ──────────────────────────────────────────
 *
 * Já existiam duas irmãs desta:
 *
 *   `nenhuma-escrita-sem-quem-a-chame`  — funções que escrevem e ninguém chama
 *   `nenhuma-chave-sem-quem-a-leia`     — estado guardado que ninguém lê
 *
 * Faltava a terceira ponta: funções que LEEM e que ninguém chama. As três
 * juntas fecham o triângulo — escrever, guardar, ler.
 *
 * ── Porque é que a prova é assim ─────────────────────────────────────────────
 *
 * Lê as leituras do próprio `pocketbase.js` em vez de as listar à mão: a
 * próxima que alguém escrever está coberta no dia em que nascer.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const conteudo = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');
const semComentarios = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// As leituras, tiradas do objeto `ler` do cliente.
function leiturasDoCliente() {
  const pb = semComentarios(conteudo('src/pocketbase.js'));
  const inicio = pb.indexOf('export const ler = {');
  const fim = pb.indexOf('\n};', inicio);
  const bloco = pb.slice(inicio, fim);
  const nomes = new Set();
  for (const m of bloco.matchAll(/^\s{2}(?:async )?(\w+)\s*[(:]/gm)) nomes.add(m[1]);
  return [...nomes];
}

// Onde se pode chamar uma leitura: em qualquer lado menos no ficheiro que a
// define.
const ONDE = ['src/sync.js', 'src/store.jsx', 'App.jsx']
  .concat(fs.readdirSync(path.join(raiz, 'src', 'screens'))
    .filter(f => f.endsWith('.jsx')).map(f => `src/screens/${f}`))
  .concat(fs.readdirSync(path.join(raiz, 'src', 'sheets'))
    .filter(f => f.endsWith('.jsx')).map(f => `src/sheets/${f}`));

const codigo = ONDE.map(f => semComentarios(conteudo(f))).join('\n');

// ⚠ As excepções são explícitas, e cada uma traz a razão — como no guarda das
// escritas. Uma lista de excepções sem porquê é uma lista de defeitos por
// descobrir.
const EXCECOES = {
  // Uma porta genérica para qualquer coleção, e a app nunca a usa: os ecrãs
  // falam com a loja, e a loja com o `sync`. Quem lhe chama são as PROVAS DO
  // SERVIDOR — o `provar-cliente.mjs` usa-a para ler o que acabou de escrever
  // e confirmar que lá está. É código de prova exposto pelo cliente, e não
  // uma leitura da app que ficou por ligar.
  colecao: 'só as provas do servidor lhe chamam (db/pocketbase/provar-cliente.mjs)',
};

describe('⚠ nenhuma leitura do cliente fica sem quem a chame', () => {
  const leituras = leiturasDoCliente();

  it('há leituras para conferir — senão isto não prova nada', () => {
    expect(leituras.length).toBeGreaterThan(1);
    expect(leituras).toEqual(expect.arrayContaining(['casa', 'saude']));
  });

  it('⚠ e cada uma é chamada de algum lado', () => {
    const orfas = leituras.filter((n) => {
      if (EXCECOES[n]) return false;
      // `ler.saude(`, `servidor.ler.saude(`, ou desestruturada.
      const re = new RegExp(`\\bler\\.${n}\\(|\\b${n}\\s*\\(`);
      return !re.test(codigo);
    });
    expect(orfas).toEqual([]);
  });

  it('e as excepções que se declaram existem mesmo', () => {
    // Uma excepção para uma leitura que já não existe esconde a próxima.
    for (const n of Object.keys(EXCECOES)) expect(leituras).toContain(n);
  });

  it('e a razão de cada excepção diz alguma coisa', () => {
    for (const [n, razao] of Object.entries(EXCECOES)) {
      expect(`${n}: ${razao}`.length).toBeGreaterThan(30);
    }
  });
});

describe('e a saúde desce mesmo — que era a que faltava', () => {
  const sync = semComentarios(conteudo('src/sync.js'));
  const loja = semComentarios(conteudo('src/store.jsx'));
  const ecra = semComentarios(conteudo('src/screens/Saude.jsx'));

  it('o `sync` tem por onde a puxar', () => {
    expect(sync).toMatch(/export async function puxarSaude/);
    expect(sync).toMatch(/servidor\.ler\.saude\(/);
  });

  it('⚠ e só de um servidor de CASA — a mesma condição da escrita', () => {
    const bloco = sync.slice(sync.indexOf('export async function puxarSaude'),
      sync.indexOf('export async function puxarSaude') + 400);
    expect(bloco).toMatch(/saudeSincroniza\(\)/);
  });

  it('a loja funde sem perder o que ainda não subiu', () => {
    const bloco = loja.slice(loja.indexOf('const lerSaudeDoServidor'),
      loja.indexOf('const arquivarConsulta'));
    expect(bloco).toMatch(/filter\(h => !h\.idServidor\)/);
    // ⚠ E guarda o id LOCAL de uma consulta que já existe cá: as notas, as
    // receitas e os documentos são indexados por ele, e recriá-la com id novo
    // deixava-os órfãos.
    expect(bloco).toMatch(/id: ja\.id/);
  });

  it('⚠ e não filtra por quem pode ver — quem decide é o servidor', () => {
    const bloco = loja.slice(loja.indexOf('const lerSaudeDoServidor'),
      loja.indexOf('const arquivarConsulta'));
    expect(bloco).not.toMatch(/podeVerSaude|canSeeHealth/);
  });

  it('e o ecrã pede-as ao abrir', () => {
    expect(ecra).toMatch(/lerSaudeDoServidor\(\)/);
  });
});
