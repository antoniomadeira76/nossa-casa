/// <reference path="../pb_data/types.d.ts" />

// As peças partilhadas das rotas da agenda da Google.
//
// ── Porque é que isto é um ficheiro à parte ─────────────────────────────────
//
// Porque tem de ser. Cada handler registado com `routerAdd` corre num CONTEXTO
// ISOLADO no JSVM do PocketBase: não vê o âmbito do módulo que o registou. A
// primeira versão tinha estas funções ao lado das rotas, como se fosse JS
// normal, e todas as rotas devolviam 400 com
//
//     ReferenceError: credenciaisDaGoogle is not defined
//
// que não aparece em leitura nenhuma do código — só a correr. O `require` de
// dentro do handler é o caminho: é resolvido no momento da chamada, já dentro
// do contexto dele.
//
// O nome não acaba em `.pb.js` de propósito: o PocketBase carregaria isto como
// ficheiro de hooks e registaria nada.

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const ESCOPO = 'https://www.googleapis.com/auth/calendar.events';

// O `state` só vale dez minutos. Um consentimento a meio que fique pendurado
// não deve servir de porta de entrada uma semana depois.
const ESTADO_VALIDO_MS = 10 * 60 * 1000;

// O segredo e o identificador vêm de onde já estão: a configuração OAuth2 da
// coleção `membros`, posta pelo `configurar-google.mjs`. Duplicá-los seria dar
// dois sítios onde podem divergir — e um segredo com duas cópias é um segredo
// com o dobro das maneiras de escapar.
//
// Pela API o `clientSecret` vem mascarado; aqui dentro vem completo, porque é
// lido da base e não da resposta HTTP.
const credenciaisDaGoogle = () => {
  const membros = $app.findCollectionByNameOrId('membros');
  const achado = membros.oauth2.getProviderConfig('google');
  const cfg = Array.isArray(achado) ? achado[0] : achado;
  if (!cfg || !cfg.clientId || !cfg.clientSecret) {
    throw new BadRequestError('O provedor Google não está configurado neste servidor.');
  }
  return { id: cfg.clientId, segredo: cfg.clientSecret };
};

// O endereço de retorno tem de bater EXACTAMENTE com o que está autorizado na
// consola da Google — esquema, anfitrião e porta incluídos.
const enderecoDeRetorno = (e) => {
  const base = $app.settings().meta.appURL || '';
  if (base) return base.replace(/\/+$/, '') + '/api/agenda/retorno';
  // Sem `appURL` configurado, deduz-se do pedido. Serve para desenvolvimento;
  // num servidor a sério o `appURL` está posto e é ele que manda.
  const esquema = e.request.tls ? 'https' : 'http';
  return esquema + '://' + e.request.host + '/api/agenda/retorno';
};

// A linha de credenciais deste membro, criada se ainda não existir.
const linhaDe = (membroId) => {
  try {
    return $app.findFirstRecordByFilter('credenciais_agenda', 'membro = {:m}', { m: membroId });
  } catch (err) {
    const col = $app.findCollectionByNameOrId('credenciais_agenda');
    const r = new Record(col);
    r.set('membro', membroId);
    $app.save(r);
    return r;
  }
};

// Um pedido de formulário à Google. O corpo leva o segredo, por isso vai no
// corpo e nunca no endereço — um endereço entra em registos de servidor,
// históricos de navegador e cabeçalhos de referência.
const pedirToken = (campos) => {
  const partes = [];
  for (const k in campos) {
    partes.push(encodeURIComponent(k) + '=' + encodeURIComponent(campos[k]));
  }
  return $http.send({
    url: GOOGLE_TOKEN,
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: partes.join('&'),
    timeout: 20,
  });
};

module.exports = {
  GOOGLE_AUTH, GOOGLE_TOKEN, ESCOPO, ESTADO_VALIDO_MS,
  credenciaisDaGoogle, enderecoDeRetorno, linhaDe, pedirToken,
};
