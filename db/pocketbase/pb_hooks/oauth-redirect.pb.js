/// <reference path="../pb_data/types.d.ts" />

// A janela da Google fica aberta depois de entrar.
//
// O PocketBase serve `/api/oauth2-redirect` com `Cross-Origin-Opener-Policy:
// same-origin`. Isso põe a janela num grupo de contextos diferente do da app
// que a abriu, e o Chrome recusa o `window.close()` que essa página faz no
// fim: «Cross-Origin-Opener-Policy policy would block the window.close call».
//
// A entrada funciona à mesma — o SDK do PocketBase recebe o código pelo canal
// de tempo real, não pela janela — mas fica uma janela da Google órfã por cima
// da app, de cada vez que alguém entra.
//
// `same-origin-allow-popups` mantém a proteção onde ela interessa: esta página
// continua isolada de qualquer página que a tente abrir e espiar. O que muda é
// só que ela deixa de perder a referência a QUEM a abriu, que é o que precisa
// para se fechar.
//
// O ajuste é para esta rota e mais nenhuma. `same-origin` continua em todo o
// resto da API.
// ⚠ São DUAS rotas, não uma.
//
// `/api/agenda/retorno` é a janela do consentimento da agenda da Google, e faz
// exactamente o mesmo `window.close()` no fim. Foi acrescentada depois deste
// hook e ficou de fora: quem ligava a agenda ficava com a janela da Google
// pendurada por cima da app, e o defeito que este ficheiro existe para corrigir
// voltou pela porta do lado.
//
// Uma lista, e não um `if` por rota: a terceira janela que aparecer entra aqui
// numa linha, em vez de repetir a condição e esquecer a metade de baixo.
//
// ⚠ A lista vive DENTRO do handler, e não ao lado dele.
//
// O JSVM do PocketBase corre cada handler num contexto isolado: não vê o
// âmbito do módulo que o registou. Escrevê-la fora — como se fosse JS normal —
// deu `ReferenceError` em TODOS os pedidos, porque este `routerUse` corre em
// todos: o servidor passou a responder 400 a tudo, incluindo ao `/api/health`.
// É a mesma armadilha do `agenda-google-comum.js`, e ali custou uma volta.
routerUse((e) => {
  const janelasQueSeFecham = ['/api/oauth2-redirect', '/api/agenda/retorno'];
  if (janelasQueSeFecham.includes(e.request?.url?.path)) {
    e.response.header().set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  }
  return e.next();
});
