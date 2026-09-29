// Que coleções são de SAÚDE.
//
// ── Porque é que isto saiu do `src/sync.js` ──────────────────────────────────
//
// Porque o travão da saúde era perguntado num sítio só — à ENTRADA da fila — e
// nunca à SAÍDA. Medido em 28/09/2026, por quatro leitores que enumeraram 24
// caminhos por travar:
//
//   `recusaSaude(colecao)`  corre em `src/sync.js`, ANTES de a linha entrar
//   `despachar()`           corre em `src/pocketbase.js`, e envia o que lá está
//                           sem consultar nada
//
// Uma consulta escrita sem rede fica na fila. A fila vive no `AsyncStorage` e
// **sobrevive ao reinício da app e à mudança de endereço do servidor**. E não é
// preciso rede em baixo: o `catch` que enfileira apanha QUALQUER falha, incluindo
// uma recusa. Depois, qualquer escrita seguinte — uma despesa, um movimento do
// cofre, uma linha de registo — drena a fila inteira para o endereço que estiver
// configurado nesse momento.
//
// O resultado: uma consulta enfileirada enquanto o servidor era de casa subia
// para o servidor da internet, porque ninguém voltava a perguntar.
//
// Perguntar nos dois sítios obriga a lista a ser lida pelos dois ficheiros. O
// `pocketbase.js` não pode importar o `sync.js` — o `sync.js` é que o importa a
// ele. Logo a lista sai dos dois e fica aqui, pura, como o `endereco.js`.
//
// ⚠ A lista é EXPLÍCITA e não um `/saude/.test(colecao)`. Uma coleção nova de
// saúde tem de ser acrescentada aqui à mão, e é isso que se quer: o travão que
// se aplica sozinho a nomes que combinam é o travão que um dia deixa passar
// `anexos`, que não tem «saude» no nome.

export const COLECOES_DE_SAUDE = [
  'episodios_saude',
  // ⚠ `anexos` não tem «saude» no nome e é o mais sensível de todos: são as
  // fotografias dos exames.
  'anexos',
  'notas_saude',
  'receitas_saude',
  'decisoes_saude',
  // As `tomas_saude` entraram em 12/09/2026, por decisão do dono da casa: «as
  // tomas sobem pelo travão de casa» — o mesmo das consultas.
  'tomas_saude',
  // E as alergias da ficha de emergência (12/09/2026), pelo mesmo travão.
  'alergias_saude',
];

export const eColecaoDeSaude = (colecao) => COLECOES_DE_SAUDE.indexOf(String(colecao)) >= 0;
