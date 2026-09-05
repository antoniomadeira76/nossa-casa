// Quando é que uma sessão acaba — e quando é só a rede.
//
// ── Porque é que isto é um ficheiro só para si ───────────────────────────────
//
// A decisão pertence ao `pocketbase.js`, mas esse importa o SDK do PocketBase,
// que é ESM: uma prova em Jest que o carregue rebenta com «Unexpected token
// 'export'». É a mesma razão pela qual a loja carrega o `sync` dinamicamente —
// está escrita lá, e custou uma suite inteira a aprender.
//
// Uma decisão que não se pode pôr à prova acaba por não ser posta à prova. Esta
// é pequena, é pura, e é a diferença entre o dono da casa entrar na app ou ter
// de repetir a janela de consentimento da Google.
//
// ── A regra ─────────────────────────────────────────────────────────────────
//
//   • 4xx  → o servidor VIU o token e recusou-o. Está morto: a sessão acaba, e
//            a pessoa tem mesmo de entrar outra vez.
//   • 0/5xx → não houve resposta, ou o servidor falhou. O servidor de casa está
//            desligado, o telemóvel está sem rede, o portátil ainda arranca.
//            O token gravado continua bom e FICA.
//
// Em 05/09/2026 o servidor de casa parou a meio da tarde e a app pôs o dono
// fora dela. É a mesma distinção da fila de escritas — ali perde-se uma
// escrita, aqui perde-se a entrada.
export const terminaSessao = (e) =>
  Boolean(e && typeof e.status === 'number' && e.status >= 400 && e.status < 500);
