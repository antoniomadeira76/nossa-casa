/**
 * ⚠ Quem tem índice único em `idem_key` está no `COM_IDEM`.
 *
 * ── O defeito ────────────────────────────────────────────────────────────────
 *
 * Quatro coleções de dinheiro têm `CREATE UNIQUE INDEX ... (casa, idem_key)`:
 * despesas, cofre_movimentos, transferencias e acertos. O índice existe para
 * que um reenvio COLIDA em vez de pagar a semanada duas vezes (§6).
 *
 * O `COM_IDEM` do `src/pocketbase.js` — a lista das coleções a que a fila
 * acrescenta uma chave — tinha duas das quatro. As outras duas subiam com
 * `idem_key` vazio, e vazio é igual a vazio: a SEGUNDA transferência de uma
 * casa colidia com a primeira e era recusada com 400.
 *
 * O 400 era engolido pela fila, que parava na primeira falha sem dizer qual.
 * A casa deixava de sincronizar e o único sintoma era o número de pendentes a
 * subir. Custou uma tarde a encontrar, e o que a encontrou foi a fila passar a
 * devolver `recusadas`.
 *
 * ── A forma do guarda ────────────────────────────────────────────────────────
 *
 * A mesma das relações não ancoradas e do `o-que-sobe`: em vez de eu me lembrar
 * de acrescentar a coleção às duas listas, ENUMERA-SE. O esquema é a fonte —
 * quem lá puser o índice tem de aparecer aqui, e a mensagem diz qual falta.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const esquema = fs.readFileSync(path.join(raiz, 'db/pocketbase/criar-colecoes.mjs'), 'utf8');
const cliente = fs.readFileSync(path.join(raiz, 'src/pocketbase.js'), 'utf8');

// As coleções cujo índice único inclui `idem_key`.
const COM_INDICE = [...esquema.matchAll(
  /CREATE UNIQUE INDEX\s+\w+\s+ON\s+(\w+)\s*\(([^)]*)\)/g,
)].filter(m => /\bidem_key\b/.test(m[2])).map(m => m[1]);

// A lista do cliente.
const bloco = cliente.match(/const COM_IDEM = new Set\(\[([^\]]*)\]\)/);
const NA_LISTA = bloco ? [...bloco[1].matchAll(/'([^']+)'/g)].map(m => m[1]) : null;

describe('⚠ a chave de idempotência acompanha o índice', () => {
  it('há índices para conferir — senão isto não prova nada', () => {
    expect(COM_INDICE.length).toBeGreaterThanOrEqual(4);
  });

  it('o `COM_IDEM` existe e lê-se', () => {
    expect(NA_LISTA).not.toBeNull();
  });

  it('⚠ nenhuma coleção com o índice fica de fora da lista', () => {
    // Se falhar: a segunda escrita dessa coleção numa casa vai ser recusada.
    const deFora = COM_INDICE.filter(c => !NA_LISTA.includes(c));
    expect(deFora).toEqual([]);
  });

  it('⚠ e nenhuma sobra — uma sem índice na lista esconde a próxima que falte', () => {
    const aMais = NA_LISTA.filter(c => !COM_INDICE.includes(c));
    expect(aMais).toEqual([]);
  });
});
