/// <reference path="../pb_data/types.d.ts" />

// A autorização da agenda da Google, com o segredo do lado do servidor.
//
// ── O problema ───────────────────────────────────────────────────────────────
//
// O token de acesso da Google dura uma hora. O que estava antes guardava-o no
// `sessionStorage` do navegador: morria ao fechar o separador, e uma app
// instalada num telemóvel, que abre e fecha o dia todo, pedia a entrada com o
// Google a cada sessão. A alternativa fácil — `localStorage` — deixa uma
// credencial da conta Google de alguém gravada no aparelho.
//
// O caminho certo é o refresh token, e ele NUNCA pode estar no telemóvel: é
// uma chave de longa duração para a agenda de uma pessoa.
//
// ── Porque é que o fluxo é nosso e não o do PocketBase ───────────────────────
//
// O PocketBase 0.40.1 devolve `meta.refreshToken` na resposta do OAuth, mas
// nunca pede `access_type=offline` à Google. Verificado no binário:
// `refreshToken` seis vezes, `access_type` ZERO. A Google só emite refresh
// token quando lho pedem, portanto aquele campo vem sempre vazio.
//
//   POST /api/agenda/ligar    devolve o endereço do consentimento da Google
//   GET  /api/agenda/retorno  a Google devolve o código; troca-se por tokens
//   POST /api/agenda/token    o telemóvel pede um token de uma hora
//   GET  /api/agenda/estado   está ligada? sim ou não, e mais nada
//
// ── ⚠ Cada handler corre num contexto isolado ────────────────────────────────
//
// Não vê o âmbito deste ficheiro. As auxiliares vêm por `require` DENTRO de
// cada rota — ver o cabeçalho do `agenda-google-comum.js`, que explica o erro
// que isto custou.
//
// ── O que o telemóvel passa a ter ────────────────────────────────────────────
//
// Um token de acesso de uma hora, em memória, que ele volta a pedir quando
// caducar. Nada em disco. A autorização de longa duração fica na coleção
// `credenciais_agenda`, cujas cinco regras são nulas — nem o próprio dono lhe
// chega pela API.

// ── 1. Começar ───────────────────────────────────────────────────────────────
//
// `access_type=offline` é o que faz a Google emitir o refresh token, e
// `prompt=consent` é o que a faz emitir um NOVO. Sem o segundo, quem já tinha
// autorizado a app volta sem refresh token — a Google dá-o uma vez só por
// consentimento, e uma reautorização silenciosa não conta como novo.
routerAdd('POST', '/api/agenda/ligar', (e) => {
  const C = require(`${__hooks}/agenda-google-comum.js`);
  const membro = e.auth;
  if (!membro) throw new UnauthorizedError('Entre primeiro.');

  const { id } = C.credenciaisDaGoogle();
  const estado = $security.randomString(40);

  const linha = C.linhaDe(membro.id);
  linha.set('estado', estado);
  $app.save(linha);

  const q = [
    'client_id=' + encodeURIComponent(id),
    'redirect_uri=' + encodeURIComponent(C.enderecoDeRetorno(e)),
    'response_type=code',
    'scope=' + encodeURIComponent(C.ESCOPO),
    'access_type=offline',
    'prompt=consent',
    'state=' + encodeURIComponent(estado),
    'include_granted_scopes=true',
  ].join('&');
  // Devolve o ENDEREÇO, e não um 302.
  //
  // A janela do consentimento é aberta pela app, e uma janela do navegador
  // não consegue mandar cabeçalho de autorização — um 302 aqui obrigaria a
  // pôr a sessão no endereço, e uma sessão num endereço fica no histórico do
  // navegador e nos registos de qualquer coisa pelo caminho.
  //
  // Assim a app pede isto com o cabeçalho, como qualquer outra chamada, e só
  // depois abre a janela. O retorno não precisa de sessão nenhuma: quem o
  // autoriza é o `state`, que já ficou preso a este membro.
  return e.json(200, { url: `${C.GOOGLE_AUTH}?${q}` });
}, $apis.requireAuth());

// ── 2. Voltar ────────────────────────────────────────────────────────────────
//
// Esta rota é pública porque é a Google que a chama, e a Google não traz a
// sessão de ninguém. Quem autoriza o pedido é o `state`: foi criado na rota
// anterior, para um membro concreto, e vale dez minutos.
routerAdd('GET', '/api/agenda/retorno', (e) => {
  const C = require(`${__hooks}/agenda-google-comum.js`);

  const pagina = (titulo, texto) => e.html(200, `<!doctype html>
<html lang="pt-PT"><head><meta charset="utf-8"><title>${titulo}</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:3rem auto;max-width:28rem;
padding:0 1.5rem;color:#1B2440}h1{font-size:1.25rem}p{color:#4A5678}</style></head>
<body><h1>${titulo}</h1><p>${texto}</p>
<script>setTimeout(function(){try{window.close()}catch(x){}},2500)</script>
</body></html>`);

  const q = e.request.url.query();
  if (q.get('error')) {
    return pagina('A autorização não foi dada',
      'Pode fechar esta janela. A agenda continua por ligar.');
  }

  const codigo = q.get('code');
  const estado = q.get('state');
  if (!codigo || !estado) throw new BadRequestError('Retorno incompleto.');

  let linha;
  try {
    linha = $app.findFirstRecordByFilter('credenciais_agenda', 'estado = {:s}', { s: estado });
  } catch (err) {
    throw new BadRequestError('Estado desconhecido — comece outra vez.');
  }

  // O `estado_em` é um autodate que se actualiza a cada gravação, e a última
  // gravação foi a que criou este estado.
  const idade = Date.now() - new Date(linha.get('estado_em')).getTime();
  if (idade > C.ESTADO_VALIDO_MS) {
    linha.set('estado', '');
    $app.save(linha);
    throw new BadRequestError('O pedido expirou — comece outra vez.');
  }

  const cred = C.credenciaisDaGoogle();
  const r = C.pedirToken({
    code: codigo,
    client_id: cred.id,
    client_secret: cred.segredo,
    redirect_uri: C.enderecoDeRetorno(e),
    grant_type: 'authorization_code',
  });

  if (r.statusCode !== 200) {
    // O corpo da resposta da Google pode trazer o segredo de volta em algumas
    // mensagens de erro; não vai para o registo nem para a página.
    $app.logger().error('Troca do código da Google falhou', 'estado', r.statusCode);
    throw new BadRequestError('A Google recusou a troca. Tente ligar outra vez.');
  }

  const dados = r.json;
  if (!dados.refresh_token) {
    // Acontece quando a Google decide que já consentiu antes. `prompt=consent`
    // existe para o evitar; se ainda assim vier vazio, a autorização antiga
    // tem de ser retirada em myaccount.google.com/permissions.
    linha.set('estado', '');
    $app.save(linha);
    return pagina('A Google não deu uma autorização de longa duração',
      'Retire o acesso da Nossa Casa em myaccount.google.com/permissions e ligue outra vez.');
  }

  linha.set('refresh_token', dados.refresh_token);
  linha.set('estado', '');
  $app.save(linha);

  return pagina('Agenda ligada',
    'Já pode fechar esta janela. A Nossa Casa passa a marcar na sua agenda sem lhe pedir a entrada outra vez.');
});

// ── 3. Um token de uma hora ─────────────────────────────────────────────────
//
// Devolve SÓ o token de acesso e quanto falta para caducar. O refresh token
// nunca entra na resposta — é o ponto todo deste ficheiro.
routerAdd('POST', '/api/agenda/token', (e) => {
  const C = require(`${__hooks}/agenda-google-comum.js`);
  const membro = e.auth;
  if (!membro) throw new UnauthorizedError('Entre primeiro.');

  let linha;
  try {
    linha = $app.findFirstRecordByFilter('credenciais_agenda', 'membro = {:m}', { m: membro.id });
  } catch (err) {
    throw new NotFoundError('A agenda não está ligada nesta conta.');
  }
  const refresh = linha.get('refresh_token');
  if (!refresh) throw new NotFoundError('A agenda não está ligada nesta conta.');

  const cred = C.credenciaisDaGoogle();
  const r = C.pedirToken({
    client_id: cred.id,
    client_secret: cred.segredo,
    refresh_token: refresh,
    grant_type: 'refresh_token',
  });

  if (r.statusCode !== 200) {
    // Uma autorização retirada na conta Google dá 400 `invalid_grant`. Nesse
    // caso apaga-se: guardar uma credencial que a Google já recusa só serve
    // para a app dizer «ligada» e falhar a cada pedido.
    if (r.statusCode === 400 || r.statusCode === 401) {
      linha.set('refresh_token', '');
      $app.save(linha);
      throw new NotFoundError('A autorização foi retirada na conta Google. Ligue a agenda outra vez.');
    }
    $app.logger().error('Renovação do token da Google falhou', 'estado', r.statusCode);
    throw new BadRequestError('A Google não respondeu à renovação.');
  }

  return e.json(200, {
    access_token: r.json.access_token,
    expires_in: r.json.expires_in || 3600,
  });
}, $apis.requireAuth());

// ── 4. Saber se está ligada, sem pedir nada à Google ────────────────────────
routerAdd('GET', '/api/agenda/estado', (e) => {
  const membro = e.auth;
  if (!membro) throw new UnauthorizedError('Entre primeiro.');
  let ligada = false;
  try {
    const linha = $app.findFirstRecordByFilter('credenciais_agenda', 'membro = {:m}', { m: membro.id });
    ligada = Boolean(linha.get('refresh_token'));
  } catch (err) { /* sem linha: não está ligada */ }
  return e.json(200, { ligada });
}, $apis.requireAuth());
