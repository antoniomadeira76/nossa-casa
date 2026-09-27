// Sair de um guião que já falou com o PocketBase.
//
// ── O defeito ────────────────────────────────────────────────────────────────
//
// Um `process.exit(n)` chamado DEPOIS de uma chamada de dados ao servidor
// rebenta no Windows, com o Node 24. Não é uma teoria: mediu-se três vezes em
// três, para cada variante, contra um PocketBase de deitar fora.
//
//   Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76
//
// E o código que chega a quem corre o guião não é o `n` — é 3221226505
// (`0xC0000409`) pelo `spawn` do Node, ou 127 na consola do `bash`. Um guião
// que anuncia «sai com 2» e devolve isto parece ter ido abaixo, não ter
// recusado. Foi o que aconteceu ao travão do `criar-colecoes.mjs` em
// 26/09/2026, e o guarda que o defendia passou — porque LIA o ficheiro à
// procura do texto `process.exit(2)` em vez de correr a coisa.
//
// ── O que exactamente rebenta ────────────────────────────────────────────────
//
// Medido em 27/09/2026, treze variantes, três corridas cada, contra um
// PocketBase de deitar fora:
//
//   authWithPassword + exit ............................. limpo
//   fetch cru ao /api/health + exit ..................... limpo
//   um fetch que FALHOU (servidor em baixo) + exit ...... limpo
//   getList / getFullList / create / collections.* + exit  REBENTA, 3/3
//
// Ou seja: é a segunda conversa, a que reutiliza a ligação aberta. O código
// pedido é indiferente — o `exit(0)` rebenta tal como o `exit(2)`. O
// `cancelAllRequests()` não salva. Esperar 50 ms salva, e é precisamente por
// isso que não serve de regra: alguns sítios «passam hoje» só porque calhou
// haver trabalho pelo meio. O `acrescentar-campos.mjs:530` sai limpo com 47
// pedidos atrás dele, e o `semear-simulacao.mjs:52` rebenta com dois. Não se
// distingue a olho, e é por isso que a regra é para todos.
//
// ── A saída que serve ────────────────────────────────────────────────────────
//
// `process.exitCode` diz o código sem desligar nada, e a promessa que nunca
// resolve garante que mais nada do módulo corre. O ciclo de eventos esvazia-se
// sozinho — as ligações fecham-se na ordem delas — e o processo sai com o
// código pedido. Medido: 2·2·2, limpo, e sem demora.
//
//   import { sair } from './sair.mjs';
//   if (correuMal) { console.error('…'); await sair(1); }
//
// ⚠ O `await` não é opcional. Sem ele o guião continua a correr as linhas
// seguintes com o código de saída já posto, que é pior do que qualquer uma das
// duas coisas em separado.
//
// ⚠ E isto espera que o ciclo de eventos se ESVAZIE. Um processo filho vivo, um
// servidor à escuta ou um `setInterval` por limpar seguram-no abertos, e aí o
// guião não sai — fica pendurado para sempre, que é pior do que sair com o
// código errado. Aconteceu no próprio dia em que isto se escreveu, no
// `provar-a-recusa-sai-com-2.mjs`: a saída ficou depois do `spawn` do PocketBase
// e a corrida parou dez minutos sem imprimir uma linha. Quem tem um recurso
// aberto fecha-o na linha antes do `await sair(n)`.
//
// O guarda que impõe isto é
// `__tests__/um-guiao-que-fala-com-o-servidor-nao-sai-a-martelo.test.js`, e
// quem MEDE uma saída destas a correr é `provar-a-recusa-sai-com-2.mjs`.
//
// ⚠ Essa prova NÃO está na cadeia do `db:provar`, e é de propósito: ela levanta
// um PocketBase só dela, e um servidor que aparece sozinho no meio de uma
// bateria é uma surpresa na máquina de quem está a trabalhar. Corre-se à mão,
// quando se mexer numa saída:
//
//   npm run db:provar-a-recusa
//
// O guarda garante a FORMA todos os dias; a prova garante o EFEITO quando se
// lhe pega. Decisão do dono da casa, 27/09/2026.
export const sair = (codigo) => {
  process.exitCode = codigo;
  return new Promise(() => {});
};
