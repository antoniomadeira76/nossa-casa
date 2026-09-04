/**
 * ⚠ Nenhuma função de escrita do `sync.js` fica sem quem a chame.
 *
 * ── O defeito, e é meu ───────────────────────────────────────────────────────
 *
 * Em 05/09/2026 contei quantas das funções de escrita do `sync.js` eram
 * chamadas de algum sítio. Cinco não eram:
 *
 *     despesa            as despesas nunca chegavam ao servidor
 *     acerto             nem o acerto de contas entre os adultos
 *     receitaDeSaude     escrita por mim no dia anterior, nunca ligada
 *     decisaoDeSaude     idem
 *     eventoDaCasa       escrita por mim NESSE dia, nunca ligada
 *
 * A última é a que dói. Eu tinha acabado de escrever, numa mensagem de commit,
 * que «as tarefas e a agenda passam a viver na base de dados». A LEITURA da
 * agenda funcionava — e por isso os eventos do servidor apareciam — mas nada
 * escrevia lá. A frase dizia mais do que era verdade.
 *
 * É o mesmo padrão que este projeto já nomeou duas vezes noutros sítios: «o
 * mesmo andaime sem obra que as tarefas tinham» (sobre o `itemGone`), e o
 * `addHealthRecord` que existia na loja e nada chamava. Uma função de escrita
 * sem chamador não dá erro nenhum: as provas do servidor passam, porque elas
 * chamam-na diretamente, e a app não a usa.
 *
 * ── Porque é que a prova é assim ─────────────────────────────────────────────
 *
 * Podia listar as funções à mão, e envelhecia mal: a próxima que alguém
 * escrevesse não estava na lista. Em vez disso LÊ as exportações do `sync.js`
 * e exige que cada uma apareça noutro sítio da app.
 *
 * As excepções são explícitas, com a razão de cada uma escrita ao lado.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');

const semComentarios = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

// Todos os ficheiros da app, menos o próprio `sync.js`.
const daApp = (dir) => fs.readdirSync(path.join(raiz, dir))
  .filter(f => /\.jsx?$/.test(f))
  .map(f => `${dir}/${f}`);

const ficheiros = [
  ...daApp('src'), ...daApp('src/screens'), ...daApp('src/sheets'), 'App.jsx',
].filter(f => f !== 'src/sync.js' && fs.existsSync(path.join(raiz, f)));

const codigoDaApp = ficheiros.map(f => semComentarios(ler(f))).join('\n');

// As funções que ESCREVEM. Lê-se as exportações do `sync.js` e fica-se com as
// que são `async function` — as leituras e os atalhos não interessam aqui.
const sync = ler('src/sync.js');
const escritas = [...sync.matchAll(/export async function (\w+)/g)].map(m => m[1]);

// ── As excepções, cada uma com a sua razão ──────────────────────────────────
//
// Uma excepção sem razão escrita é uma função esquecida com autorização.
const COM_RAZAO = {
  // Chamadas pela própria loja através de nomes que a prova não vê como
  // `sync.x` — ficam aqui só se houver mesmo razão. Por agora, nenhuma.
};

describe('⚠ nenhuma função de escrita fica sem quem a chame', () => {
  it('há funções de escrita para conferir — senão isto não prova nada', () => {
    expect(escritas.length).toBeGreaterThan(10);
  });

  it('⚠ todas são chamadas de algum sítio da app', () => {
    const orfas = escritas.filter(nome => {
      if (COM_RAZAO[nome]) return false;
      return !new RegExp(`\\b${nome}\\s*\\(`).test(codigoDaApp);
    });

    // A mensagem diz QUAIS, para quem a ler não ter de ir procurar.
    expect(orfas).toEqual([]);
  });

  it('⚠ e cada excepção tem a razão escrita', () => {
    for (const [nome, razao] of Object.entries(COM_RAZAO)) {
      expect(escritas).toContain(nome);
      expect(typeof razao).toBe('string');
      expect(razao.length).toBeGreaterThan(20);
    }
  });
});
