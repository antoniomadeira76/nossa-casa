// O andaime das provas do servidor: contar, afirmar, e ligar a app à casa.
//
// Estava escrito 23 vezes, uma por ficheiro de provas, e já tinha divergido em
// três versões do mesmo `prova()` — umas com `✕`, outra com `✗` para o stderr,
// e os parâmetros com três nomes diferentes. Pior do que a repetição: o
// `semRecusa`, que apanha uma escrita RECUSADA em silêncio, só existia em três
// dos ficheiros. Uma verificação que vive em cópias acaba por só existir onde
// alguém se lembrou de a copiar.
//
// A `casa-de-provas.mjs` continua a tratar da CASA — criá-la, limpá-la, não
// tocar em mais nada. Este trata do ANDAIME. São reexportados aqui para que
// cada prova tenha uma linha de importação só.
import { registerHooks } from 'node:module';
import { URL } from './casa-de-provas.mjs';

export {
  URL, PREFIXO, comecar, criarCasa, criarMembro, ligarComoAdmin, limparCasasDeProvas,
} from './casa-de-provas.mjs';

// ⚠ O `src/` é escrito para o Metro, que resolve `./format` sem extensão; o
// Node não. Este resolvedor põe o `.js` quando o caminho é relativo e não
// traz extensão nenhuma, e tem de estar registado ANTES do primeiro
// `await import('../../src/…')`. Está garantido: as importações estáticas de
// quem carrega este módulo correm todas antes do corpo desse ficheiro.
registerHooks({
  resolve(especificador, contexto, seguinte) {
    try { return seguinte(especificador, contexto); }
    catch (e) {
      if (especificador.startsWith('.') && !/\.[cm]?jsx?$/.test(especificador)) {
        return seguinte(especificador + '.js', contexto);
      }
      throw e;
    }
  },
});

// ─── Contar ──────────────────────────────────────────────────────────────────

let ok = 0, mau = 0;

export const prova = async (nome, fn) => {
  try { await fn(); console.log(`  ✓ ${nome}`); ok++; }
  catch (e) { console.log(`  ✕ ${nome}\n      ${e.message}`); mau++; }
};

// O fim de cada ficheiro. Devolve o código de saída, que é o que o
// `provar-tudo.mjs` lê para saber se a corrida passou.
export const resumo = () => {
  console.log(`\n${mau ? '✕' : '✓'} ${ok} provas passaram, ${mau} falharam.`);
  process.exit(mau ? 1 : 0);
};

// ─── Afirmar ─────────────────────────────────────────────────────────────────

export const igual = (a, b, o) => {
  if (a !== b) throw new Error(`esperava ${b}, veio ${a}${o ? ' · ' + o : ''}`);
};

// O contrário: isto TEM de ser recusado pelo servidor. Uma prova que passe aqui
// é uma porta aberta, e por isso a mensagem é «PASSOU» — o que se quer ver é a
// recusa.
export const recusado = async (fn) => {
  try { await fn(); throw new Error('PASSOU — devia ter sido recusado'); }
  catch (e) { if (/PASSOU/.test(e.message)) throw e; }
};

// ⚠ Uma escrita recusada pelo servidor NÃO rebenta. Há duas formas de ela
// passar despercebida, e são diferentes:
//
//   `semRecusa` — as escritas que vão pela FILA (o dinheiro, o registo, a
//   saúde). A `esvaziar()` devolve a recusa em `recusadas` e segue em frente.
//   Sem isto, uma prova podia passar por a leitura seguinte trazer o valor de
//   OUTRA escrita, e a recusa ficava por contar. Foi assim que uma
//   transferência recusada bloqueou a fila uma tarde inteira sem dizer nada.
//
//   `comId` — as escritas DIRETAS (eventos, tarefas, envelopes, meses,
//   compras, equipamentos). O `criarOuEnfileirarCasa` do `sync.js` apanha a
//   recusa, mete a linha na fila, e devolve `{ pendente: true }`. Não rebenta,
//   não tem `recusadas`, e o `semRecusa` não lhe toca. Só a ausência do `id`
//   distingue «o servidor aceitou» de «o servidor recusou e ficou na fila».
export const semRecusa = async (o, onde) => {
  const r = await o;
  const rec = (r && r.recusadas) || [];
  if (rec.length) throw new Error(`${onde}: o servidor recusou — ${JSON.stringify(rec)}`);
  if (r && r.presa) throw new Error(`${onde}: fila presa — ${JSON.stringify(r.presa)}`);
  return r;
};

export const comId = async (o, onde) => {
  const r = await o;
  if (r && r.id) return r;
  if (r && r.pendente) {
    throw new Error(`${onde}: o servidor não aceitou — a linha caiu na fila`);
  }
  throw new Error(`${onde}: não veio id — ${JSON.stringify(r)}`);
};

// ─── A memória de um telemóvel acabado de abrir ──────────────────────────────
//
// Um `Map` e não o disco: cada corrida começa sem sessão, sem fila pendente, e
// sem nada do que a corrida anterior deixou.
//
//   configurar({ url: URL, storage: memoriaDeTelemovel() });
export function memoriaDeTelemovel(memoria = new Map()) {
  return {
    getItem: async (k) => (memoria.has(k) ? memoria.get(k) : null),
    setItem: async (k, v) => { memoria.set(k, v); },
    removeItem: async (k) => { memoria.delete(k); },
  };
}
