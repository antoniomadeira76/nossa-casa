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
routerUse((e) => {
  if (e.request?.url?.path === '/api/oauth2-redirect') {
    e.response.header().set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  }
  return e.next();
});
