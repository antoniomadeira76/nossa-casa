/// <reference path="../pb_data/types.d.ts" />
//
// As auxiliares do Account Linking da Alexa.
//
// ⚠ Não acaba em `.pb.js` de propósito, e é `require`d de DENTRO de cada
// handler: cada um corre num contexto isolado e não vê o âmbito do ficheiro que
// o registou. É a lição do `agenda-google-comum.js`.

const escapar = (x) => String(x == null ? '' : x)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── Para onde a Amazon pode mandar o navegador de volta ──────────────────────
//
// ⚠ Um `redirect_uri` que venha do pedido e não se confira é o buraco clássico
// deste protocolo: quem conheça o `client_id` — que não é segredo — manda a
// autorização para um sítio dele e fica com o código.
//
// Os endereços de retorno da Amazon são conhecidos e são três, um por região.
// Aceita-se só HTTPS e só estes anfitriões.
const RETORNOS = ['pitangui.amazon.com', 'layla.amazon.com', 'alexa.amazon.co.jp'];

const retornoAceite = (uri) => {
  const u = String(uri || '');
  if (u.length > 500) return false;
  const m = u.match(/^https:\/\/([a-z0-9.-]+)(\/|$)/i);
  if (!m) return false;
  const anfitriao = m[1].toLowerCase();
  for (let i = 0; i < RETORNOS.length; i++) if (anfitriao === RETORNOS[i]) return true;
  return false;
};

// ── As credenciais podem vir de dois sítios ──────────────────────────────────
//
// ⚠ A consola da Amazon tem um campo chamado «Client Authentication Scheme»
// com duas opções: `Credentials in request body` e `HTTP Basic`. Escolher a
// errada não dá um erro que se perceba — dá `invalid_client`, que parece um
// segredo mal copiado, e manda quem o vê procurar no sítio errado.
//
// Aceitam-se as duas. É o que o RFC 6749 manda, e tira uma armadilha de uma
// consola onde se carrega uma vez e não se volta lá.
//
// O base64 é à mão de propósito: o JSVM do PocketBase não traz `atob` nem
// ajudante nenhum, e uma dependência que não existe só se descobre a correr.
const deBase64 = (s) => {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const t = String(s || '').replace(/[^A-Za-z0-9+/]/g, '');
  let saida = '';
  for (let i = 0; i < t.length; i += 4) {
    const n = (abc.indexOf(t[i]) << 18) | (abc.indexOf(t[i + 1]) << 12)
      | ((abc.indexOf(t[i + 2]) & 63) << 6) | (abc.indexOf(t[i + 3]) & 63);
    saida += String.fromCharCode((n >> 16) & 255);
    if (t[i + 2] !== undefined) saida += String.fromCharCode((n >> 8) & 255);
    if (t[i + 3] !== undefined) saida += String.fromCharCode(n & 255);
  }
  return saida;
};

// Devolve `{ id, segredo }` do cabeçalho Basic, ou null se não houver.
const doCabecalhoBasic = (cabecalho) => {
  const h = String(cabecalho || '');
  const m = h.match(/^Basic\s+([A-Za-z0-9+/=]+)$/i);
  if (!m) return null;
  const par = deBase64(m[1]);
  const i = par.indexOf(':');
  if (i < 0) return null;
  // O RFC manda-os codificados como no formulário; a Amazon não os codifica,
  // mas descodificar o que já está descodificado é inofensivo.
  const decodificar = (x) => { try { return decodeURIComponent(x); } catch (e) { return x; } };
  return { id: decodificar(par.slice(0, i)), segredo: decodificar(par.slice(i + 1)) };
};

const credenciaisDaCasa = (clientId) => {
  const id = String(clientId || '').trim();
  if (!id) return null;
  try {
    return $app.findFirstRecordByFilter('credenciais_alexa', 'client_id = {:c}', { c: id });
  } catch (err) {
    return null;
  }
};

// Lê e confere o pedido de autorização. Rebenta com uma mensagem em português
// se alguma coisa não bater — e NÃO redirecciona nesse caso: mandar de volta um
// erro para um endereço que não se confiou seria fazer o que se está a evitar.
const lerPedido = (clientId, redirectUri, state, responseType) => {
  const cred = credenciaisDaCasa(clientId);
  if (!cred) throw new BadRequestError('Esta skill não está configurada nesta casa.');

  if (!retornoAceite(redirectUri)) {
    throw new BadRequestError('O endereço de retorno não é da Amazon.');
  }
  const tipo = String(responseType || 'code');
  if (tipo !== 'code') throw new BadRequestError('Só sei responder com um código.');

  // ⚠ O `state` NÃO SE CORTA. Esta linha era `.slice(0, 500)` e foi o que
  // impediu a conta de ligar durante meio dia (28/09/2026).
  //
  // O `state` da Amazon tem **1095 caracteres** — é um blob dela, em base64,
  // que ela própria valida à chegada. Cortado aos 500, a casa fazia tudo bem,
  // criava a ligação, devolvia o código à Amazon… e a Amazon comparava o
  // `state`, não batia, e recusava-se a vir buscar o token. Do lado dela:
  // «Não foi possível vincular a sua conta». Do nosso: silêncio, porque o
  // pedido ao `/api/alexa/token` nunca chegava a acontecer.
  //
  // ⚠ E a razão de nunca ter sido apanhado é a lição do dia: as provas todas
  // usavam `'abc123'`, `'xyz'`, `'sim-abc'` — três caracteres contra mil e
  // noventa e cinco. Uma prova com um valor de brincar não prova o caminho
  // verdadeiro. O guarda agora manda um `state` do tamanho do da Amazon e
  // exige que volte IGUAL.
  //
  // Cortar em silêncio é o pior dos três caminhos. Devolve-se inteiro, e o que
  // for absurdamente grande é RECUSADO com uma mensagem — não mutilado.
  const s = String(state || '');
  if (s.length > 4096) throw new BadRequestError('O `state` é grande de mais.');

  return {
    client_id: String(clientId),
    redirect_uri: String(redirectUri),
    state: s,
    casa: String(cred.get('casa')),
  };
};

// ── A página ─────────────────────────────────────────────────────────────────
//
// A mesma cara dos documentos da app — faixa com o logótipo, uma coluna
// estreita, sem um byte de JavaScript. Quem a abre é um adulto da casa, no
// telemóvel, no meio de ligar um altifalante.
// Os parâmetros do pedido da Amazon, para os pendurar numa ligação. Voltam a ser
// validados do outro lado — isto é só transporte.
const paraEndereco = (pedido) => 'client_id=' + encodeURIComponent(pedido.client_id)
  + '&redirect_uri=' + encodeURIComponent(pedido.redirect_uri)
  + '&state=' + encodeURIComponent(pedido.state || '')
  + '&response_type=code';

const pagina = (e, pedido, aviso) => {
  // O G da Google, nas quatro cores. É a marca deles e desenha-se como eles
  // mandam — não leva a cor do esquema da casa.
  const logoGoogle = '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">'
    + '<path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.7-.4-3.9H24v7.1h12.1c-.2 1.8-1.6 4.5-4.5 6.3l6.9 5.4c4.1-3.8 6.6-9.4 6.6-15z"/>'
    + '<path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.1 15.4 46 24 46z"/>'
    + '<path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 9.9l7.1-5.5z"/>'
    + '<path fill="#EA4335" d="M24 10.5c4.1 0 6.9 1.8 8.5 3.3l6.1-6C34.9 4.4 29.9 2 24 2 15.4 2 8 6.9 4.4 14.1l7.1 5.5C13.3 14.3 18.2 10.5 24 10.5z"/>'
    + '</svg>';

  const logo = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">'
    + '<path d="M3.6 10.9L12 4.1l8.4 6.8" stroke="#FFFFFF" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
    + '<circle cx="9.1" cy="14.9" r="1.62" fill="#8B4EE0"/><circle cx="14.9" cy="14.9" r="1.62" fill="#13ADB3"/>'
    + '<circle cx="9.1" cy="19.4" r="1.62" fill="#4A8FE0"/><circle cx="14.9" cy="19.4" r="1.62" fill="#E8EDF5"/></svg>';

  // ⚠ Sem cache e sem indexação: isto é um formulário de identificação.
  e.response.header().set('Cache-Control', 'no-store');
  e.response.header().set('X-Robots-Tag', 'noindex');

  const erro = aviso ? '<p class="erro">' + escapar(aviso) + '</p>' : '';

  return e.html(aviso ? 401 : 200, '<!doctype html><html lang="pt-PT"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">'
    + '<title>Ligar a Alexa — Nossa Casa</title><style>'
    // ⚠ O `color-scheme` não é decoração: é o que faz o navegador desenhar o
    // cursor, a barra de deslocamento e sobretudo o PREENCHIMENTO AUTOMÁTICO
    // do gestor de palavras-passe com as cores certas. Sem ele, o campo do
    // e-mail preenchido automaticamente aparece com um fundo claro forçado por
    // cima do escuro, e o texto branco lá dentro fica ilegível.
    + ':root{color-scheme:light dark}'
    + 'body{margin:0;background:#F0F2F5;color:#262626;font:16px/1.5 Inter,Roboto,"Segoe UI",system-ui,sans-serif}'
    + '.faixa{background:#0A5B60;color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px}'
    + 'h1{font-size:18px;font-weight:600;margin:0}.sub{margin:2px 0 0;font-size:12.5px;color:rgba(255,255,255,.82)}'
    + 'main{max-width:460px;margin:0 auto;padding:8px 16px 40px}'
    + 'h2{font-size:13px;font-weight:600;letter-spacing:.2px;color:#076F73;border-bottom:1px solid #D9D9D9;padding:18px 0 8px;margin:0 0 12px}'
    + 'label{display:block;font-size:12px;color:#606E90;margin:14px 0 4px}'
    + 'input{width:100%;box-sizing:border-box;min-height:44px;padding:10px 12px;font:inherit;'
    + 'border:1px solid #D9D9D9;border-radius:10px;background:#fff}'
    + 'button{width:100%;min-height:48px;margin-top:20px;font:inherit;font-weight:600;cursor:pointer;'
    + 'border:1px solid #0A5B60;border-radius:10px;background:#E6F2F2;color:#075055}'
    + '.erro{background:#FDECEC;border:1px solid #E8A0A0;color:#8C2F2F;border-radius:10px;padding:10px 12px;margin:14px 0 0;font-size:14px}'
    + '.pe{font-size:12px;color:#656C7C;margin-top:24px}'
    // ⚠ O botão da Google é NEUTRO de propósito: quem dá cor é o G deles. Pintá-lo
    // com o acento da casa punha duas marcas a discutir no mesmo alvo. E 48 de
    // altura, como o «Autorizar» — o mínimo desta casa é 44, sem excepção.
    + '.ou{text-align:center;font-size:12px;color:#656C7C;margin:18px 0 0}'
    + '.google{display:flex;align-items:center;justify-content:center;gap:10px;'
    + 'min-height:48px;margin-top:10px;font-weight:600;text-decoration:none;'
    + 'border:1px solid #D9D9D9;border-radius:10px;background:#fff;color:#262626}'
    // ── O aspeto escuro ──────────────────────────────────────────────────────
    //
    // Quem abre isto abre-o no telemóvel, e um telemóvel em modo escuro levava
    // com uma página branca na cara.
    //
    // ⚠ Os valores NÃO são escolhidos aqui: são os do esquema Cião escuro,
    // lidos do `buildTheme(1, true)` do `src/theme.js` — o Cião é o esquema
    // cujo cabeçalho é este `#0A5B60`. Esta página não sabe de quem é o
    // telemóvel (ninguém se identificou ainda), por isso não pode seguir o
    // esquema do membro como o resto da app; o que pode é não inventar cores.
    //
    //   page #051011 · card #142F31 · borda #2F5153 · text1 #F0F2F5
    //   slate #ADCBCD · text3 #9CB3B4 · actBg #114042 · actBrd #138186
    //   actFg #0AB6BB · erro rgba(255,77,79,.08) / #FF4D4F / #FF7875
    //
    // Medidos antes de escritos, e todos passam: texto 17,2 · título 7,7 ·
    // etiqueta 11,2 · rodapé 8,8 · texto do botão 4,6 · borda do botão 4,1 ·
    // texto do erro 7,1.
    //
    // ⚠ A faixa NÃO muda: o `chrome` do esquema é o mesmo nos dois aspetos.
    //
    // ⚠ E a borda do campo fica nos 2,23 contra a página, abaixo dos 3:1 que a
    // norma pede para o contorno de um controlo. Fica escrito porque é real —
    // mas no aspeto CLARO, que já cá estava, são 1,26. O escuro melhora-a; não
    // a resolve. Resolvê-la é mexer no desenho dos dois, e isso não é daqui.
    + '@media (prefers-color-scheme: dark){'
    + 'body{background:#051011;color:#F0F2F5}'
    + 'h2{color:#0AB6BB;border-bottom-color:#2F5153}'
    + 'label{color:#ADCBCD}'
    + 'input{background:#142F31;border-color:#2F5153;color:#F0F2F5}'
    + 'button{background:#114042;border-color:#138186;color:#0AB6BB}'
    + '.erro{background:rgba(255,77,79,.08);border-color:#FF4D4F;color:#FF7875}'
    + '.pe{color:#9CB3B4}'
    + '.ou{color:#9CB3B4}'
    + '.google{background:#142F31;border-color:#2F5153;color:#F0F2F5}'
    + '}'
    + '</style></head><body><header class="faixa">' + logo + '<div><h1>Ligar a Alexa</h1>'
    + '<p class="sub">Nossa Casa</p></div></header><main>'
    + '<h2>Identifique-se para autorizar</h2>'
    + '<p style="font-size:14px;margin:0">Depois disto, o altifalante pode <strong>acrescentar</strong> '
    + 'artigos à lista, marcar eventos de família e acrescentar tarefas. Não lê nada, '
    + 'e não toca em dinheiro nem em saúde.</p>'
    + erro
    + '<form method="post" action="/api/alexa/autorizar">'
    + '<input type="hidden" name="client_id" value="' + escapar(pedido.client_id) + '">'
    + '<input type="hidden" name="redirect_uri" value="' + escapar(pedido.redirect_uri) + '">'
    + '<input type="hidden" name="state" value="' + escapar(pedido.state) + '">'
    + '<input type="hidden" name="response_type" value="code">'
    + '<label for="email">Endereço de correio</label>'
    + '<input id="email" name="email" type="email" autocomplete="username" required>'
    + '<label for="palavra">Palavra-passe</label>'
    + '<input id="palavra" name="palavra" type="password" autocomplete="current-password" required>'
    + '<button type="submit">Autorizar</button></form>'
    // ── O caminho da Google ──────────────────────────────────────────────────
    //
    // ⚠ Isto faltava, e sem isto o dono desta casa NÃO CONSEGUIA ligar a Alexa.
    //
    // Os adultos daqui entram pela Google, e quem entra por lá nunca definiu
    // palavra-passe: o registo nasce do OAuth com uma ao acaso, que ninguém
    // sabe. A página só sabia pedir e-mail e palavra-passe, e respondia-lhe
    // sempre «Não reconheço esse endereço ou essa palavra-passe» — com razão, e
    // sem serventia. Medido a 28/09/2026, com ele à espera do outro lado.
    //
    // A palavra-passe fica: há contas nesta casa que a usam.
    //
    // ⚠ E é uma LIGAÇÃO, não um segundo formulário. O pedido da Amazon vai nos
    // parâmetros porque a rota `/api/alexa/google` os volta a validar do zero —
    // não se confia neles por virem daqui.
    + '<p class="ou">ou</p>'
    + '<a class="google" href="/api/alexa/google?' + paraEndereco(pedido) + '">'
    + logoGoogle + 'Continuar com Google</a>'
    + '<p class="pe">Só um adulto desta casa pode autorizar. Para desfazer, apague a ligação '
    + 'na aplicação da Alexa.</p>'
    + '</main></body></html>');
};

// ── A ligação ────────────────────────────────────────────────────────────────
//
// ⚠ O `refresh` nasce AQUI, junto com o código, e não na troca.
//
// Se nascesse na troca ficaria vazio entre as duas, e o índice único
// `(casa, refresh)` do PocketBase **não é parcial**: duas autorizações a meio
// colidiriam em dois vazios iguais. É a mesma armadilha que tirou o `idem_key`
// dos artigos.
const novaLigacao = (membro, pedido) => {
  const col = $app.findCollectionByNameOrId('alexa_ligacoes');
  const r = new Record(col);
  r.set('casa', String(membro.get('casa')));
  r.set('membro', membro.id);
  r.set('codigo', $security.randomString(40));
  // Cinco minutos. Um código de autorização vive o tempo de a Amazon o trocar,
  // que é imediato; o resto é margem para uma rede lenta.
  r.set('codigo_expira', new Date(Date.now() + 5 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 23) + 'Z');
  r.set('redirect_uri', pedido.redirect_uri);
  r.set('refresh', $security.randomString(40));
  r.set('criado_em', new Date().toISOString().replace('T', ' ').slice(0, 23) + 'Z');
  $app.save(r);
  return r;
};

// ⚠ O código é de UMA vez só, e está preso ao `redirect_uri` com que nasceu.
//
// Sem a segunda parte, um código apanhado a meio podia ser trocado a partir de
// outro sítio. Com ela, só serve para quem o pediu, e só onde o pediu.
const pelaCodigo = (casa, codigo, redirectUri) => {
  const c = String(codigo || '');
  if (!c) return null;
  let r = null;
  try {
    r = $app.findFirstRecordByFilter('alexa_ligacoes', 'casa = {:h} && codigo = {:c}', { h: casa, c });
  } catch (err) { return null; }

  if (String(r.get('redirect_uri')) !== String(redirectUri || '')) return null;

  const expira = r.getString('codigo_expira');
  if (!expira || new Date(expira.replace(' ', 'T')) < new Date()) return null;

  // Gasto. A partir daqui só o `refresh` serve.
  r.set('codigo', '');
  r.set('codigo_expira', '');
  $app.save(r);
  return r;
};

const peloRefresh = (casa, refresh) => {
  const t = String(refresh || '');
  if (!t) return null;
  try {
    return $app.findFirstRecordByFilter('alexa_ligacoes', 'casa = {:h} && refresh = {:r}', { h: casa, r: t });
  } catch (err) {
    return null;
  }
};

// ── O caminho da Google ──────────────────────────────────────────────────────
//
// ⚠ O endereço de retorno é FIXO, escrito aqui, e tem de ser igual, letra por
// letra, ao que está nos «URIs de redirecionamento autorizados» da consola da
// Google. Não se deriva do cabeçalho `Host` do pedido — esse vem de fora e
// escolhe-se; derivá-lo seria deixar quem chama apontar a Google a outro sítio.
const RETORNO_GOOGLE = 'https://casa.anossacasa.app/api/alexa/retorno-google';

const provedorGoogle = () => {
  const col = $app.findCollectionByNameOrId('membros');
  const [config, existe] = col.oauth2.getProviderConfig('google');
  if (!existe) throw new BadRequestError('Esta casa não entra pela Google.');
  // ⚠ `initProvider()` devolve o fornecedor JÁ CARREGADO com o `clientId` e o
  // `clientSecret` guardados na coleção. É por isto que o segredo da Google não
  // aparece em ficheiro nenhum deste projeto, nem no `.env.local`.
  const p = config.initProvider();
  p.setRedirectURL(RETORNO_GOOGLE);
  return p;
};

// ── O que fica a meio ────────────────────────────────────────────────────────
//
// ⚠ Uma autorização começada e nunca acabada deixa lixo VIVO, e foi medido em
// 28/09/2026: três tentativas de ligar a conta deixaram duas linhas em
// `alexa_ligacoes` com o código por gastar — e cada uma com um `refresh`
// válido, que é uma credencial de longa duração para uma ligação que nunca
// existiu. O mesmo para as `alexa_esperas`, que guardam o `state` da Amazon.
//
// Nenhuma das duas coleções se limpava. Uma tabela que só cresce, com segredos
// lá dentro, é uma fuga lenta.
//
// Limpa-se no início de cada tentativa: é quando alguém está a pagar a espera
// de qualquer maneira, e não precisa de tarefa periódica nenhuma. Nunca rebenta
// o pedido — o `try` engole, porque arrumar não pode impedir de entrar.
const limparOQueFicouAMeio = () => {
  const agora = new Date().toISOString().replace('T', ' ');
  try {
    const velhas = $app.findRecordsByFilter('alexa_esperas', 'expira < {:agora}', '', 200, 0, { agora });
    for (let i = 0; i < velhas.length; i++) {
      try { $app.delete(velhas[i]); } catch (err) { /* segue */ }
    }
  } catch (err) { /* segue */ }

  try {
    // ⚠ `codigo != ""` é o que distingue uma ligação A MEIO de uma ligação
    // FEITA: o código apaga-se quando a Amazon o troca. Uma ligação boa nunca
    // entra neste filtro, por mais velha que seja.
    const mortas = $app.findRecordsByFilter('alexa_ligacoes',
      'codigo != "" && codigo_expira < {:agora}', '', 200, 0, { agora });
    for (let i = 0; i < mortas.length; i++) {
      try { $app.delete(mortas[i]); } catch (err) { /* segue */ }
    }
  } catch (err) { /* segue */ }
};

// A espera: o pedido da Amazon fica cá enquanto o navegador vai à Google.
const guardarEspera = (pedido) => {
  limparOQueFicouAMeio();

  const col = $app.findCollectionByNameOrId('alexa_esperas');
  const r = new Record(col);
  r.set('chave', $security.randomString(40));
  r.set('client_id', pedido.client_id);
  r.set('redirect_uri', pedido.redirect_uri);
  r.set('estado', pedido.state || '');
  // Cinco minutos: chega para escolher uma conta da Google, e é pouco para
  // alguém aproveitar uma chave apanhada pelo caminho.
  r.set('expira', new Date(Date.now() + 5 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', 'Z'));
  $app.save(r);
  return r;
};

// ⚠ GASTA-a: lê e apaga na mesma passagem. Uma chave que sobrevivesse ao uso
// era um código de autorização reutilizável, que é o defeito clássico deste
// protocolo. Devolve um objeto simples, porque a linha já não existe.
const gastarEspera = (chave) => {
  const c = String(chave || '');
  if (!c || c.length > 80) return null;
  let r = null;
  try {
    r = $app.findFirstRecordByFilter('alexa_esperas', 'chave = {:c}', { c });
  } catch (err) { return null; }
  if (!r) return null;

  const copia = {
    client_id: String(r.get('client_id')),
    redirect_uri: String(r.get('redirect_uri')),
    estado: String(r.get('estado') || ''),
  };
  const expira = new Date(String(r.get('expira')).replace(' ', 'T'));
  try { $app.delete(r); } catch (err) { /* já não estava lá */ }

  if (!(expira.getTime() > Date.now())) return null;
  return copia;
};

// O membro desta casa a quem pertence a conta Google que acabou de entrar.
//
// ⚠ NÃO se usa o `/api/collections/membros/auth-with-oauth2` do PocketBase, que
// seria o caminho curto: esse CRIA um registo novo quando o e-mail não casa com
// nenhum. Aqui isso seria um estranho a nascer membro da casa por ter carregado
// num botão. Procura-se à mão, e quem não existe é recusado.
//
// ⚠ E o e-mail é o `email` do `AuthUser`, que a documentação do PocketBase
// descreve como «The VERIFIED OAuth2 account email» — vazio quando o
// fornecedor não consegue provar que a conta é de quem diz. Vazio é recusa.
const membroPelaGoogle = (codigo, casa) => {
  const p = provedorGoogle();

  let utilizador = null;
  try {
    const token = p.fetchToken(String(codigo));
    utilizador = p.fetchAuthUser(token);
  } catch (err) {
    $app.logger().warn('Alexa: a Google recusou a troca', 'erro', String(err));
    return null;
  }

  const email = String((utilizador && utilizador.email) || '').trim().toLowerCase();
  if (!email) {
    $app.logger().warn('Alexa: a Google não confirmou o endereço');
    return null;
  }

  // ⚠ A CASA entra no filtro, e não só na verificação a seguir.
  //
  // O e-mail é único em toda a coleção `membros`, portanto o resultado seria o
  // mesmo — hoje. Mas a propriedade de que isto depende («um e-mail, uma casa»)
  // vive numa restrição do PocketBase que ninguém aqui escreveu nem prova, e a
  // verificação que a defende está três linhas abaixo, noutro ficheiro. Pedir a
  // casa à consulta faz a intenção ficar onde se lê, e deixa de haver um
  // instante em que temos nas mãos o membro de outra casa.
  try {
    return $app.findFirstRecordByFilter('membros', 'email = {:e} && casa = {:c}',
      { e: email, c: String(casa) });
  } catch (err) {
    return null;
  }
};

// ── Uma página de recado, sem formulário ─────────────────────────────────────
//
// Para o que corre mal depois da Google: não há nada a preencher outra vez, e um
// formulário vazio só convidaria a tentar às cegas.
const paginaSimples = (e, codigo, titulo, explicacao) => {
  e.response.header().set('Cache-Control', 'no-store');
  e.response.header().set('X-Robots-Tag', 'noindex');
  return e.html(codigo, '<!doctype html><html lang="pt-PT"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">'
    + '<title>Ligar a Alexa — Nossa Casa</title><style>'
    + ':root{color-scheme:light dark}'
    + 'body{margin:0;background:#F0F2F5;color:#262626;font:16px/1.5 Inter,Roboto,"Segoe UI",system-ui,sans-serif}'
    + '.faixa{background:#0A5B60;color:#fff;padding:16px 18px}'
    + 'h1{font-size:18px;font-weight:600;margin:0}'
    + 'main{max-width:460px;margin:0 auto;padding:24px 16px 40px}'
    + 'h2{font-size:17px;margin:0 0 10px}p{margin:0;font-size:14px}'
    + '@media (prefers-color-scheme: dark){'
    + 'body{background:#051011;color:#F0F2F5}'
    + '}'
    + '</style></head><body><header class="faixa"><h1>Ligar a Alexa</h1></header>'
    + '<main><h2>' + escapar(titulo) + '</h2><p>' + escapar(explicacao) + '</p></main></body></html>');
};

// ── O token ──────────────────────────────────────────────────────────────────
const responderComToken = (e, ligacao) => {
  const membro = $app.findRecordById('membros', String(ligacao.get('membro')));

  // ⚠ Se o membro deixou de poder falar pela casa, a ligação deixa de valer —
  // mesmo que o refresh ainda exista. É a verificação que o `docs/alexa.md`
  // pede: o papel e a casa lêem-se do MEMBRO, nunca do pedido.
  if (membro.get('papel') === 'crianca' || String(membro.get('casa')) !== String(ligacao.get('casa'))) {
    e.response.header().set('Cache-Control', 'no-store');
    return e.json(400, { error: 'invalid_grant' });
  }

  // ── A identidade da VOZ ────────────────────────────────────────────────────
  //
  // ⚠ Isto era `membro.newAuthToken()`, e era um buraco grande. O token que ia
  // para a nuvem da Amazon era uma SESSÃO DE ADULTO a sério, boa em todo o
  // `/api/collections/…` — que está na internet. Medido em 27/09/2026 numa casa
  // de simulação com um episódio de saúde lá dentro: lia a consulta da criança
  // com as notas clínicas, e renomeava-a com um PATCH. E a página de
  // consentimento prometia, em letras, «Não lê nada, e não toca em dinheiro nem
  // em saúde». O `scope: 'casa.escrever'` aqui em baixo era uma etiqueta que
  // ninguém lia — e continua a ser, mas agora é verdade por construção.
  //
  // A voz passa a ter identidade própria: uma linha em `alexa_vozes` por
  // ligação. Essa coleção não tem `casa` nem `papel`, e as regras desta casa são
  // quase todas `casa = @request.auth.casa && ...` — por isso o token não
  // satisfaz nenhuma. Não é uma lista de proibições que é preciso manter: é uma
  // identidade que não chega a lado nenhum.
  //
  // Uma por ligação, e reaproveitada: o refresh não deve deixar um rasto de
  // identidades por cada renovação.
  let voz = null;
  try {
    voz = $app.findFirstRecordByFilter('alexa_vozes', 'ligacao = {:l}', { l: ligacao.id });
  } catch (err) { voz = null; }

  if (!voz) {
    const colVoz = $app.findCollectionByNameOrId('alexa_vozes');
    voz = new Record(colVoz);
    voz.set('ligacao', ligacao.id);
    voz.set('membro', membro.id);
    // ⚠ Uma coleção de autenticação do PocketBase exige `email`, mesmo com o
    // `passwordAuth` desligado — sem ele o `save` devolve «email: cannot be
    // blank» e a rota do token responde 400 sem dizer porquê. Medido a
    // 27/09/2026, e o registo do servidor foi o único sítio onde se viu.
    //
    // O endereço é sintético e é `.invalid` de propósito: a norma reserva esse
    // domínio para nunca existir, portanto isto não é endereço de ninguém e não
    // pode ser entregue. O `id` da ligação torna-o único, que é o que o índice
    // da coleção pede. Ninguém o lê e ninguém entra por ele.
    voz.set('email', 'voz-' + ligacao.id + '@alexa.invalid');
    // ⚠ Uma palavra-passe que ninguém sabe, nem precisa de saber: a coleção tem
    // `passwordAuth` desligado e não se entra nela por palavra-passe nenhuma.
    // Fica escrita na mesma porque um registo de autenticação sem ela não se
    // grava — e um valor ao acaso é melhor do que um vazio que um dia alguém
    // active sem reparar.
    voz.setPassword($security.randomString(50));
    $app.save(voz);
  } else if (String(voz.get('membro')) !== String(membro.id)) {
    // A ligação mudou de dono. Acontece se a linha for editada à mão; a
    // identidade segue o membro da ligação, que é quem o `quemFala` vai ler.
    voz.set('membro', membro.id);
    $app.save(voz);
  }

  const token = voz.newAuthToken();

  let duracao = 604800;   // o que o PocketBase usa por omissão: sete dias
  try {
    const col = $app.findCollectionByNameOrId('alexa_vozes');
    if (col.authToken && col.authToken.duration) duracao = Number(col.authToken.duration);
  } catch (err) { /* fica o valor por omissão */ }

  e.response.header().set('Cache-Control', 'no-store');
  return e.json(200, {
    access_token: token,
    token_type: 'Bearer',
    expires_in: duracao,
    refresh_token: String(ligacao.get('refresh')),
    scope: 'casa.escrever',
  });
};

module.exports = {
  escapar, retornoAceite, credenciaisDaCasa, lerPedido, pagina, paginaSimples,
  novaLigacao, pelaCodigo, peloRefresh, responderComToken, limparOQueFicouAMeio,
  deBase64, doCabecalhoBasic,
  RETORNO_GOOGLE, provedorGoogle, guardarEspera, gastarEspera, membroPelaGoogle,
};
