/**
 * UM COMENTÁRIO NÃO ABRE UM BLOCO — a armadilha de escrever um caminho com
 * asterisco dentro de um comentário de linha.
 *
 * ── O que aconteceu ──────────────────────────────────────────────────────────
 *
 * Em 27/09/2026 escrevi, num comentário de linha, o caminho da API das coleções
 * do PocketBase com o asterisco no fim. Em seis ficheiros.
 *
 * Para o JavaScript não é nada: é um comentário de linha, acaba na quebra.
 *
 * Mas metade dos guardas desta casa LEEM CÓDIGO COMO TEXTO, e a primeira coisa
 * que fazem é tirar os blocos com a expressão de sempre — barra, asterisco, até
 * ao próximo asterisco-barra. Essa expressão não sabe que estava dentro de um
 * comentário de linha: vê a abertura, e apaga tudo até ao fecho seguinte, que
 * pode estar cem linhas abaixo.
 *
 * O sintoma foi um guarda a jurar que um hook não continha uma linha que estava
 * lá, na 270, a olhar para mim. O ficheiro chegava ao `toContain` com o meio
 * comido.
 *
 * ⚠ E o perigoso é o contrário disto. Ali o guarda ficou vermelho e apanhei-o.
 * Um guarda que procure o que NÃO pode estar lá — e há muitos nesta casa — fica
 * VERDE quando o código desaparece do texto que ele lê. Uma proibição deixa de
 * ser verificada sem ninguém dar por ela.
 *
 * ── Porque é que isto é um guarda, e não uma nota ────────────────────────────
 *
 * Porque é a segunda vez. A classe já estava escrita na memória desta casa —
 * «as doze formas de me enganar a escrever comentários e guardas que leem
 * ficheiros» — e voltou na mesma. À segunda vez não se remenda: enumera-se.
 *
 * Este ficheiro varre a casa toda e não deixa passar nenhum.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

// ⚠ As duas sequências construídas por concatenação, de propósito: escritas
// inteiras, este ficheiro apanhava-se a si próprio na primeira linha.
const ABRE = '/' + '*';
const FECHA = '*' + '/';

const PASTAS = ['src', 'db', 'scripts', '__tests__'];
const EXTENSOES = /\.(js|jsx|mjs|cjs)$/;

// ── Os que PODEM citar a sequência, com a razão escrita ──────────────────────
//
// Três ficheiros têm de a escrever: são os que explicam a armadilha. Estão aqui
// por nome — e o que os torna seguros não é serem perdoados, é serem ficheiros
// de PROVA: nenhum guarda desta casa lê `__tests__/` como texto. O que tem de
// ficar limpo é o que os guardas leem — `src/` e `db/` —, e daí não se
// perdoa nada.
//
// Uma lista com razões, e não uma excepção calada: um ficheiro novo com o mesmo
// problema fica vermelho, que é para o que isto serve.
const PERDOADOS = {
  '__tests__/regressoes.test.js':
    'explica o comentário JSX que se fecha a meio — tem de citar a sequência',
  '__tests__/todo-o-jsx-se-analisa.test.js':
    'o assunto dele é exactamente o comentário dentro de uma tag JSX',
  '__tests__/um-comentario-nao-abre-um-bloco.test.js':
    'este ficheiro, que descreve a armadilha para a poder proibir',
};

const ficheiros = () => {
  const saida = [];
  const andar = (dir) => {
    for (const nome of fs.readdirSync(dir)) {
      if (nome === 'node_modules' || nome === 'pb_data' || nome.startsWith('.')) continue;
      const p = path.join(dir, nome);
      const st = fs.statSync(p);
      if (st.isDirectory()) andar(p);
      else if (EXTENSOES.test(nome)) saida.push(path.relative(RAIZ, p).replace(/\\/g, '/'));
    }
  };
  for (const pasta of PASTAS) {
    const d = path.join(RAIZ, pasta);
    if (fs.existsSync(d)) andar(d);
  }
  return saida.sort();
};

// Onde começa o comentário de linha, ou -1.
//
// Salta o que está dentro de aspas, o `://` dos endereços, e — o que apanhou a
// primeira versão deste guarda — as barras ESCAPADAS de uma expressão regular.
// Metade dos guardas desta casa têm uma linha como esta:
//
//     const semComentarios = (s) => s.replace(...)
//
// onde a expressão regular acaba em barra-escapada-barra. Duas barras seguidas,
// e nenhuma delas é um comentário. A primeira versão deu catorze falsos
// positivos de uma assentada, e um guarda que grita numa casa sã é pior do que
// não haver guarda nenhum — foi a lição do `verificar-a-casa.ps1`.
const inicioDoComentario = (linha) => {
  let aspa = '';
  for (let i = 0; i < linha.length - 1; i++) {
    const c = linha[i];
    if (aspa) {
      if (c === '\\') { i++; continue; }
      if (c === aspa) aspa = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { aspa = c; continue; }
    if (c === '/' && linha[i + 1] === '/') {
      if (i > 0 && linha[i - 1] === ':') continue;    // http://
      if (i > 0 && linha[i - 1] === '\\') continue;   // barra escapada num regex
      return i;
    }
  }
  return -1;
};

describe('um comentário não abre um bloco', () => {
  const todos = ficheiros();

  it('varre a casa toda — e um guarda que não lê nada passa sempre', () => {
    expect(todos.length).toBeGreaterThan(150);
    expect(todos).toContain('db/pocketbase/pb_hooks/limpar-casa.pb.js');
    expect(todos).toContain('src/store.jsx');
  });

  it('a lista de perdoados está toda a ser usada — nenhuma entrada a mais', () => {
    // Uma excepção que já não é precisa é uma porta aberta sem porteiro.
    const orfas = Object.keys(PERDOADOS).filter((f) => !todos.includes(f));
    expect(orfas).toEqual([]);
  });

  it('⚠ nenhum comentário de linha abre nem fecha um bloco', () => {
    const maus = [];
    for (const f of todos) {
      if (PERDOADOS[f]) continue;
      const texto = fs.readFileSync(path.join(RAIZ, f), 'utf8');
      let dentroDeBloco = false;
      texto.split(/\r?\n/).forEach((linha, i) => {
        // O estado do bloco conta-se com o código inteiro: uma linha dentro de
        // um bloco `/**` também não pode reabrir outro.
        const antes = dentroDeBloco;
        if (!dentroDeBloco && linha.includes(ABRE) && !linha.includes(FECHA)) {
          const j = inicioDoComentario(linha);
          if (j === -1 || linha.indexOf(ABRE) < j) dentroDeBloco = true;
        } else if (dentroDeBloco && linha.includes(FECHA)) {
          dentroDeBloco = false;
        }

        if (antes) {
          // Dentro de um bloco: uma abertura nova não aninha, e engana a leitura.
          const resto = linha.replace(/^\s*\*?/, '');
          if (resto.includes(ABRE)) maus.push(`${f}:${i + 1}  abre um bloco DENTRO de outro: ${linha.trim()}`);
          return;
        }

        const j = inicioDoComentario(linha);
        if (j === -1) return;
        const comentario = linha.slice(j);
        if (comentario.includes(ABRE)) {
          maus.push(`${f}:${i + 1}  o comentário de linha abre um bloco: ${linha.trim()}`);
        } else if (comentario.includes(FECHA)) {
          maus.push(`${f}:${i + 1}  o comentário de linha fecha um bloco: ${linha.trim()}`);
        }
      });
    }
    // A mensagem enumera todos, e não só o primeiro: foram seis de uma vez.
    expect(maus).toEqual([]);
  });
});
