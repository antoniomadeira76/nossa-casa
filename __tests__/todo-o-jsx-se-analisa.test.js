/**
 * TODO O FICHEIRO DE CÓDIGO SE ANALISA — e o comentário nunca entra numa tag
 * =========================================================================
 *
 * Escrevi um comentário `{/* … *\/}` DENTRO de uma tag JSX aberta pela quarta
 * vez (15/09/2026). As três primeiras foram o `Confirm` das Tarefas, a `Sheet`
 * da Saúde e o `Pressable` do KidApp; a quarta foi a `faixa` das Tarefas, a do
 * Modo Compras e a `Linha` da app da criança, todas na mesma passagem.
 *
 * O padrão é sempre o mesmo, e é traiçoeiro por uma razão precisa: entre os
 * ATRIBUTOS de uma tag, o Babel ACEITA um comentário de barras (`// …`) — é
 * JavaScript normal — e RECUSA um contentor de expressão (`{/* … *\/}`), que
 * só é válido onde cabem FILHOS. Escreve-se a mesma intenção das duas
 * maneiras, uma passa e a outra rebenta o ficheiro inteiro. E quando rebenta,
 * não rebenta uma prova: rebentam as trinta que importam aquele ecrã, e a
 * mensagem que aparece é uma pilha de cinquenta linhas do analisador do Babel
 * sem o nome do ficheiro à vista.
 *
 * Remendar o sítio não serve de nada — já foi remendado três vezes. Este
 * guarda ENUMERA: passa todos os ficheiros de código da app pelo analisador,
 * e diz qual é e em que linha. É o guarda genérico da classe, e apanha de
 * caminho qualquer outro erro de sintaxe antes de se ir correr a app.
 *
 * ⚠ Não confundir com `armadilhas-de-tratar-codigo-como-texto`: esse trata dos
 * guardas que LEEM ficheiros com expressões regulares. Este não lê texto — usa
 * o mesmo analisador que o empacotador usa, e por isso não tem como discordar
 * dele.
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/parser');

const RAIZ = path.join(__dirname, '..');
const PASTAS = ['src', '.'];
const IGNORAR = new Set(['node_modules', '.git', '.expo', 'dist', 'build', 'coverage', '__tests__', 'design', 'docs', 'db', 'web-build', '.claude']);

const ficheirosDeCodigo = () => {
  const achados = [];
  const andar = (dir, profundidade) => {
    for (const nome of fs.readdirSync(dir)) {
      if (IGNORAR.has(nome)) continue;
      const p = path.join(dir, nome);
      const st = fs.statSync(p);
      if (st.isDirectory()) andar(p, profundidade + 1);
      // Na raiz só os ficheiros soltos da app (App.jsx, index.js); em `src`,
      // tudo. É `.jsx` e `.js` — um `.js` com JSX lá dentro também rebenta.
      else if (/\.(jsx|js)$/.test(nome)) achados.push(p);
    }
  };
  for (const pasta of PASTAS) {
    const base = path.join(RAIZ, pasta);
    if (pasta === '.') {
      for (const nome of fs.readdirSync(base)) {
        if (IGNORAR.has(nome)) continue;
        const p = path.join(base, nome);
        if (fs.statSync(p).isFile() && /\.(jsx|js)$/.test(nome)) achados.push(p);
      }
    } else andar(base, 0);
  }
  return achados;
};

describe('todo o ficheiro de código da app se analisa', () => {
  const ficheiros = ficheirosDeCodigo();

  it('há ficheiros para analisar — senão este guarda passa por vacuidade', () => {
    // Um `every` sobre uma lista vazia é verdadeiro, e um guarda que não vê
    // ficheiro nenhum passa a verde para sempre. Já aconteceu nesta casa com
    // as secções do modo compras.
    expect(ficheiros.length).toBeGreaterThan(50);
    expect(ficheiros.some(f => f.endsWith('App.jsx'))).toBe(true);
    expect(ficheiros.some(f => f.includes(path.join('src', 'screens')))).toBe(true);
  });

  it('nenhum tem erro de sintaxe', () => {
    const maus = [];
    for (const f of ficheiros) {
      try {
        babel.parse(fs.readFileSync(f, 'utf8'), {
          sourceType: 'module',
          plugins: ['jsx'],
        });
      } catch (e) {
        maus.push(`${path.relative(RAIZ, f)} — ${e.message}`);
      }
    }
    expect(maus).toEqual([]);
  });

  it('nenhum tem um contentor de expressão entre os atributos de uma tag', () => {
    // A forma exacta do defeito, dita por extenso, para quem ler a falha saber
    // o que corrigir sem ter de decifrar o analisador. Procura-se uma linha que
    // só tenha `{/*` depois de uma linha que abra uma tag e antes de a fechar.
    //
    // ⚠ Isto é leitura de TEXTO e não de árvore, portanto é um aviso e não a
    // prova — a prova é a de cima, que usa o analisador. Este só existe para
    // dar a mensagem em português quando a de cima falhar pela mesma razão.
    const maus = [];
    for (const f of ficheirosDeCodigo()) {
      const linhas = fs.readFileSync(f, 'utf8').split('\n');
      let dentroDeTag = false;
      linhas.forEach((linha, i) => {
        const cru = linha.trim();
        if (dentroDeTag && cru.startsWith('{/*')) {
          maus.push(`${path.relative(RAIZ, f)}:${i + 1} — comentário {/* */} entre atributos; use // …`);
        }
        // Abre uma tag e não a fecha nesta linha.
        if (/^<[A-Za-z][\w.]*$/.test(cru) || (/^<[A-Za-z][\w.]*\s/.test(cru) && !/\/?>\s*$/.test(cru))) dentroDeTag = true;
        else if (/\/?>\s*$/.test(cru)) dentroDeTag = false;
      });
    }
    expect(maus).toEqual([]);
  });
});
