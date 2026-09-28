/// <reference path="../pb_data/types.d.ts" />
//
// O Account Linking da skill da Alexa — fase 1 do `docs/alexa.md`.
//
// Aqui a casa é o SERVIDOR DE AUTORIZAÇÃO, e não o cliente. É o contrário do
// `agenda-google.pb.js`: lá pedimos autorização à Google; aqui damo-la à Amazon.
//
//   GET  /api/alexa/autorizar   a página onde um adulto da casa se identifica
//   POST /api/alexa/autorizar   recebe-a e devolve um código à Amazon
//   POST /api/alexa/token       troca o código (ou o refresh) por um token
//
// ── O token de acesso é um token do PocketBase ───────────────────────────────
//
// Podia ser um segredo nosso, guardado numa coleção e resolvido à mão em cada
// rota. Não é — é um token de autenticação do próprio PocketBase, cunhado para
// o membro com `newAuthToken()`.
//
// A diferença importa: assim as três rotas da voz não mudam uma linha. Continuam
// com `$apis.requireAuth('membros')`, e as 26 provas que as defendem continuam a
// provar o que provavam. Um token nosso obrigaria a resolver a sessão à mão
// dentro de cada rota — mais código no sítio onde menos se quer código novo.
//
// O que é nosso é o REFRESH, que o PocketBase não tem: uma linha em
// `alexa_ligacoes`, com as cinco regras a `null`.

// ── A página onde se autoriza ────────────────────────────────────────────────
//
// A Amazon manda cá o navegador de quem está a ligar a conta. Mostra-se um
// formulário, e mais nada: nem sessão, nem cookie, nem JavaScript.
routerAdd('GET', '/api/alexa/autorizar', (e) => {
  const A = require(`${__hooks}/alexa-conta-comum.js`);
  const q = e.request.url.query();
  const pedido = A.lerPedido(q.get('client_id'), q.get('redirect_uri'), q.get('state'), q.get('response_type'));
  return A.pagina(e, pedido, '');
});

// ── A identificação ──────────────────────────────────────────────────────────
routerAdd('POST', '/api/alexa/autorizar', (e) => {
  const A = require(`${__hooks}/alexa-conta-comum.js`);

  const corpo = new DynamicModel({
    client_id: '', redirect_uri: '', state: '', response_type: 'code',
    email: '', palavra: '',
  });
  e.bindBody(corpo);

  const pedido = A.lerPedido(corpo.client_id, corpo.redirect_uri, corpo.state, corpo.response_type);

  const email = String(corpo.email || '').trim().toLowerCase();
  const palavra = String(corpo.palavra || '');
  if (!email || !palavra) return A.pagina(e, pedido, 'Falta o endereço ou a palavra-passe.');

  // ⚠ A mesma mensagem para «não existe» e para «a palavra-passe não bate».
  //
  // Duas mensagens diferentes dizem a quem tentar QUAIS os endereços que existem
  // nesta casa, um de cada vez. É a mesma razão pela qual a entrada da app não
  // distingue os dois casos.
  let membro = null;
  try {
    membro = $app.findFirstRecordByFilter('membros', 'email = {:e}', { e: email });
  } catch (err) { membro = null; }

  if (!membro || !membro.validatePassword(palavra)) {
    return A.pagina(e, pedido, 'Não reconheço esse endereço ou essa palavra-passe.');
  }

  // ⚠ A criança não liga altifalantes. É a mesma regra das três rotas da voz, e
  // pela mesma razão: a Alexa não sabe quem está a falar, e um token de voz
  // representa um adulto da casa.
  if (membro.get('papel') === 'crianca') {
    return A.pagina(e, pedido, 'A voz da casa é dos adultos.');
  }

  // A casa de quem se identificou tem de ser a casa das credenciais usadas. Sem
  // isto, um adulto da casa B autorizava a skill da casa A.
  if (String(membro.get('casa')) !== String(pedido.casa)) {
    return A.pagina(e, pedido, 'Essas credenciais não são desta casa.');
  }

  const ligacao = A.novaLigacao(membro, pedido);

  // O `state` volta tal e qual, que é o que prova à Amazon que a resposta é
  // desta viagem e não de outra.
  const destino = pedido.redirect_uri
    + (pedido.redirect_uri.indexOf('?') >= 0 ? '&' : '?')
    + 'code=' + encodeURIComponent(ligacao.get('codigo'))
    + (pedido.state ? '&state=' + encodeURIComponent(pedido.state) : '');

  $app.logger().info('Alexa: conta ligada', 'casa', String(membro.get('casa')), 'membro', membro.get('nome'));
  return e.redirect(302, destino);
});

// ── O caminho da Google, ida ─────────────────────────────────────────────────
//
// ⚠ Existe porque sem ele o dono desta casa não conseguia ligar a Alexa.
//
// Os adultos daqui entram pela Google, e quem entra por lá nunca definiu
// palavra-passe: o registo nasce do OAuth com uma ao acaso, que ninguém sabe. A
// página só sabia pedir e-mail e palavra-passe, e a ele respondia sempre «Não
// reconheço esse endereço ou essa palavra-passe» — com razão, e sem serventia.
//
// Isto põe DOIS OAuth encadeados: a Amazon manda-nos o navegador, nós mandamo-lo
// à Google, e o pedido da Amazon tem de sobreviver à viagem. Sobrevive numa
// linha de `alexa_esperas`, e o que viaja é só uma chave ao acaso — o cabeçalho
// dessa coleção explica porque é que não pode ser ao contrário.
//
// ⚠ E os parâmetros são validados OUTRA VEZ aqui, apesar de virem da nossa
// própria página. Quem chama esta rota é o navegador, e o navegador é de quem
// estamos a autenticar: um endereço escrito à mão chega cá igualzinho.
routerAdd('GET', '/api/alexa/google', (e) => {
  const A = require(`${__hooks}/alexa-conta-comum.js`);
  const q = e.request.url.query();
  const pedido = A.lerPedido(q.get('client_id'), q.get('redirect_uri'), q.get('state'), q.get('response_type'));

  const espera = A.guardarEspera(pedido);

  // ⚠ O fornecedor vem da configuração da COLEÇÃO, com o segredo lá dentro. O
  // segredo da Google não passa por este ficheiro nem por ficheiro nenhum meu.
  const provedor = A.provedorGoogle();
  return e.redirect(302, provedor.buildAuthURL(espera.get('chave')));
});

// ── O caminho da Google, volta ───────────────────────────────────────────────
//
// ⚠ O endereço desta rota está registado na consola da Google, letra por letra.
// Mudá-lo aqui sem o mudar lá parte a entrada, e o erro que a Google dá —
// `redirect_uri_mismatch` — aparece do lado dela, não nos nossos registos.
routerAdd('GET', '/api/alexa/retorno-google', (e) => {
  const A = require(`${__hooks}/alexa-conta-comum.js`);
  const q = e.request.url.query();

  const espera = A.gastarEspera(q.get('state'));
  if (!espera) return A.paginaSimples(e, 400, 'Este pedido expirou.',
    'Volte à aplicação da Alexa e carregue outra vez em «Ligar conta».');

  // ⚠ Dentro de um `try`. O `lerPedido` rebenta com `BadRequestError`, e aqui
  // quem está do outro lado é um NAVEGADOR, a meio de ligar um altifalante —
  // não a Amazon a falar por JSON. Sem isto, uma credencial apagada entre a ida
  // e a volta despejava-lhe na cara o JSON cru do PocketBase.
  let pedido = null;
  try {
    pedido = A.lerPedido(espera.client_id, espera.redirect_uri, espera.estado, 'code');
  } catch (err) {
    return A.paginaSimples(e, 400, 'Este pedido já não serve.',
      'Volte à aplicação da Alexa e carregue outra vez em «Ligar conta».');
  }

  const erro = String(q.get('error') || '');
  if (erro) {
    return A.paginaSimples(e, 400, 'A Google não autorizou.',
      'Não foi dada permissão, ou a conta foi recusada. Pode tentar outra vez.');
  }

  const codigo = String(q.get('code') || '');
  if (!codigo) return A.paginaSimples(e, 400, 'A Google não devolveu nada.', 'Tente outra vez.');

  const membro = A.membroPelaGoogle(codigo, pedido.casa);
  if (!membro) {
    return A.paginaSimples(e, 403, 'Essa conta Google não é desta casa.',
      'Só um adulto já registado na Nossa Casa pode ligar a Alexa. '
      + 'Entre na aplicação com essa conta primeiro.');
  }

  // ⚠ As mesmas três verificações do caminho da palavra-passe, e pela mesma
  // razão. Um caminho novo que salte uma delas é uma porta das traseiras.
  if (membro.get('papel') === 'crianca') {
    return A.paginaSimples(e, 403, 'A voz da casa é dos adultos.',
      'Peça a um adulto da casa que ligue o altifalante.');
  }
  if (String(membro.get('casa')) !== String(pedido.casa)) {
    return A.paginaSimples(e, 403, 'Essa conta não é desta casa.',
      'A conta com que se identificou pertence a outra casa.');
  }

  const ligacao = A.novaLigacao(membro, pedido);

  const destino = pedido.redirect_uri
    + (pedido.redirect_uri.indexOf('?') >= 0 ? '&' : '?')
    + 'code=' + encodeURIComponent(ligacao.get('codigo'))
    + (pedido.state ? '&state=' + encodeURIComponent(pedido.state) : '');

  $app.logger().info('Alexa: conta ligada pela Google', 'casa', String(membro.get('casa')), 'membro', membro.get('nome'));
  return e.redirect(302, destino);
});

// ── A troca ──────────────────────────────────────────────────────────────────
//
// Só a Amazon chega aqui, e prova-o com o `client_secret`. É uma rota pública
// por obrigação do protocolo — o segredo é que faz de tranca.
routerAdd('POST', '/api/alexa/token', (e) => {
  const A = require(`${__hooks}/alexa-conta-comum.js`);

  const corpo = new DynamicModel({
    grant_type: '', code: '', refresh_token: '', redirect_uri: '',
    client_id: '', client_secret: '',
  });
  e.bindBody(corpo);

  // ⚠ Os erros desta rota vão em JSON com os nomes do OAuth (`invalid_grant`,
  // `invalid_client`), e não como os erros do PocketBase: quem os lê é a
  // Amazon, e ela sabe o que fazer com estes e não com os outros.
  // As credenciais vêm do corpo OU do cabeçalho Basic — a consola da Amazon
  // deixa escolher, e escolher a errada dava um `invalid_client` que parece um
  // segredo mal copiado. Aceitam-se as duas, como o RFC 6749 manda.
  const basic = A.doCabecalhoBasic(e.request.header.get('Authorization'));
  const idDado = basic ? basic.id : String(corpo.client_id || '');
  const segredoDado = basic ? basic.segredo : String(corpo.client_secret || '');

  const cred = A.credenciaisDaCasa(idDado);
  if (!cred || String(cred.get('client_secret')) !== segredoDado) {
    e.response.header().set('Cache-Control', 'no-store');
    return e.json(401, { error: 'invalid_client' });
  }

  const tipo = String(corpo.grant_type || '');
  let ligacao = null;

  if (tipo === 'authorization_code') {
    ligacao = A.pelaCodigo(String(cred.get('casa')), String(corpo.code || ''), String(corpo.redirect_uri || ''));
  } else if (tipo === 'refresh_token') {
    ligacao = A.peloRefresh(String(cred.get('casa')), String(corpo.refresh_token || ''));
  } else {
    e.response.header().set('Cache-Control', 'no-store');
    return e.json(400, { error: 'unsupported_grant_type' });
  }

  if (!ligacao) {
    e.response.header().set('Cache-Control', 'no-store');
    return e.json(400, { error: 'invalid_grant' });
  }

  return A.responderComToken(e, ligacao);
});
