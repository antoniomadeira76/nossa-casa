// O estado de um artigo da lista de compras, e a tradução para o servidor.
//
// ── Porque isto é um ficheiro ────────────────────────────────────────────────
//
// A tabela vivia dentro do `sync.js`, e dizia isto:
//
//   // A loja fala «open | done | sem stock»
//   const ESTADO_NO_SERVIDOR = { open: 'por_comprar', done: 'confirmado',
//                                'sem stock': 'sem_stock' };
//
// A loja não fala «sem stock». Fala **«sem-stock»**, com hífen, em três sítios
// do `ModoCompras.jsx` — é o que ela escreve no toque e o que ela lê para
// desenhar a linha. E porque a tabela tinha a outra grafia, marcar um artigo
// como esgotado não funcionava em NENHUMA das direcções:
//
//   a escrever   `ESTADO_NO_SERVIDOR['sem-stock']` é `undefined`, e o
//                `|| 'por_comprar'` traduzia-o para «por comprar». Rita marcava
//                o papel de cozinha como esgotado e o servidor guardava que
//                estava por comprar. Sem erro nenhum.
//
//   a ler        `sem_stock` voltava como «sem stock», e a linha comparava com
//                «sem-stock». Nunca dava. O artigo esgotado aparecia como um
//                artigo normal à espera de ser confirmado.
//
// Sem servidor funcionava, porque aí a loja escreve e lê a mesma grafia. Com
// servidor perdia-se em silêncio, que é a pior das duas.
//
// ⚠ O ficheiro existe para o vocabulário ter UM dono, e para as provas do Jest
// o poderem ler — o `sync.js` importa o SDK do PocketBase em ESM e o Jest não
// o consegue carregar, que é a mesma razão do `agenda-google.js` e do
// `sessao.js`. Guarda: `__tests__/o-estado-do-artigo-tem-uma-grafia.test.js`.

// A grafia da LOJA é a que manda: é a que os ecrãs escrevem no toque.
export const ESTADO_NO_SERVIDOR = {
  open: 'por_comprar',
  done: 'confirmado',
  'sem-stock': 'sem_stock',
};

export const ESTADO_NA_LOJA = Object.fromEntries(
  Object.entries(ESTADO_NO_SERVIDOR).map(([loja, servidor]) => [servidor, loja]));

// Enumerados, para quem precise de os percorrer sem os reescrever.
export const ESTADOS_DA_LOJA = Object.keys(ESTADO_NO_SERVIDOR);
export const ESTADOS_DO_SERVIDOR = Object.values(ESTADO_NO_SERVIDOR);

// O estado por omissão: um artigo sem estado está por comprar.
export const ESTADO_INICIAL = 'open';

// ⚠ Traduz, ou devolve `null` — nunca um valor por omissão.
//
// Era `ESTADO_NO_SERVIDOR[estado] || 'por_comprar'`, e esse `||` é que
// transformava um estado desconhecido num estado válido: em vez de falhar,
// escrevia «por comprar» por cima do que a pessoa acabara de marcar. Um valor
// por omissão que corrompe o dado é pior do que um erro.
//
// Quem chama decide: com `null`, NÃO se escreve o campo, e o estado no servidor
// fica como estava.
export const paraOServidor = (estado) => ESTADO_NO_SERVIDOR[estado] || null;
export const paraALoja = (estado) => ESTADO_NA_LOJA[estado] || null;
