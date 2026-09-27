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

  return {
    client_id: String(clientId),
    redirect_uri: String(redirectUri),
    state: String(state || '').slice(0, 500),
    casa: String(cred.get('casa')),
  };
};

// ── A página ─────────────────────────────────────────────────────────────────
//
// A mesma cara dos documentos da app — faixa com o logótipo, uma coluna
// estreita, sem um byte de JavaScript. Quem a abre é um adulto da casa, no
// telemóvel, no meio de ligar um altifalante.
const pagina = (e, pedido, aviso) => {
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
  escapar, retornoAceite, credenciaisDaCasa, lerPedido, pagina,
  novaLigacao, pelaCodigo, peloRefresh, responderComToken,
  deBase64, doCabecalhoBasic,
};
