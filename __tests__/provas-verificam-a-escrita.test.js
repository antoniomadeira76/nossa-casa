/**
 * Uma escrita recusada pelo servidor não rebenta. As provas têm de a apanhar.
 *
 * ⚠ É a segunda vez que este projeto perde uma recusa em silêncio, e da
 * primeira a resposta foi escrever o `semRecusa` — e pô-lo em três dos vinte e
 * três ficheiros. Uma verificação que vive em cópias só existe onde alguém se
 * lembrou de a copiar. Este guarda ENUMERA, e por isso não depende de ninguém
 * se lembrar.
 *
 * Há duas formas de uma escrita passar despercebida, e são diferentes:
 *
 *   FILA    — `despesa`, `movimentoDeCofre`, `registoDaCasa`… A `esvaziar()`
 *             devolve a recusa em `recusadas` e segue. → `semRecusa`
 *
 *   DIRETO  — `tarefaDaCasa`, `criarEnvelope`, `abrirMes`… O
 *             `criarOuEnfileirarCasa` apanha a recusa, mete a linha na fila, e
 *             devolve `{ pendente: true }`. Não rebenta e não tem `recusadas`:
 *             só a ausência do `id` distingue aceite de recusado. → `comId`
 *
 * As de ALTERAR e APAGAR chamam o PocketBase direto e rebentam sozinhas — o
 * `await` já as apanha, e por isso não entram aqui.
 *
 * A lista das funções sai do `src/sync.js`, não de um rol escrito à mão: uma
 * escrita nova fica coberta no dia em que nascer.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SYNC = fs.readFileSync(path.join(RAIZ, 'src', 'sync.js'), 'utf8');
const PROVAS = path.join(RAIZ, 'db', 'pocketbase');

// ── Quem escreve, e por que caminho ──────────────────────────────────────────
function classificar() {
  const fila = new Set(), direto = new Set();
  const re = /^export async function ([a-zA-Z]+)\(/gm;
  const marcas = [...SYNC.matchAll(re)];
  marcas.forEach((m) => {
    // ⚠ Até ao `}` da própria função, e não até à função SEGUINTE. Entre a
    // `acerto` e a `eventoDaCasa` vive o `criarOuEnfileirarCasa`, e ao cortar
    // pela função seguinte o corpo da `acerto` engolia-o: uma escrita de fila
    // dava-se por direta, e o guarda pedia-lhe o `comId` errado.
    const inicio = m.index;
    const fecho = SYNC.indexOf('\n}\n', inicio);
    const corpo = SYNC.slice(inicio, fecho === -1 ? SYNC.length : fecho);
    if (/criarOuEnfileirarCasa\(/.test(corpo) || /return \{ id: /.test(corpo)) {
      direto.add(m[1]);
    } else if (/servidor\.escrever\.criar\(/.test(corpo)) {
      fila.add(m[1]);
    }
  });
  return { fila, direto };
}

const { fila, direto } = classificar();

const ficheiros = fs.readdirSync(PROVAS).filter(f => /^provar-.*\.mjs$/.test(f));

describe('as provas do servidor apanham uma escrita recusada', () => {
  it('o `sync.js` tem escritas dos dois caminhos, senão este guarda não mede nada', () => {
    expect(fila.size).toBeGreaterThan(3);
    expect(direto.size).toBeGreaterThan(3);
  });

  it('há ficheiros de provas para varrer', () => {
    expect(ficheiros.length).toBeGreaterThan(20);
  });

  it('⚠ cada escrita numa prova está verificada', () => {
    const soltas = [];

    for (const f of ficheiros) {
      const linhas = fs.readFileSync(path.join(PROVAS, f), 'utf8').split(/\r?\n/);
      linhas.forEach((linha, i) => {
        const m = linha.match(/(.*?)\bsync\.([a-zA-Z]+)\(/);
        if (!m) return;
        const [, antes, nome] = m;

        const qual = fila.has(nome) ? 'semRecusa' : direto.has(nome) ? 'comId' : null;
        if (!qual) return;

        // Envolvida na própria linha: `await comId(sync.x(…)` ou
        // `(await semRecusa(sync.x(…)`.
        if (new RegExp(`\\b${qual}\\(\\s*$`).test(antes)) return;

        // Ou marcada como recusa esperada — a prova QUER que o servidor recuse.
        const acima = linhas.slice(Math.max(0, i - 6), i).join('\n');
        if (/recusa-esperada/.test(acima)) return;

        soltas.push(`${f}:${i + 1}  sync.${nome}(…)  falta o \`${qual}\``);
      });
    }

    expect(soltas).toEqual([]);
  });
});
