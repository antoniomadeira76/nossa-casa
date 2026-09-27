// O Account Linking da Alexa — o fluxo inteiro, de ponta a ponta.
//
//   node db/pocketbase/provar-alexa-conta.mjs
//
// Aqui a casa é o SERVIDOR DE AUTORIZAÇÃO, o que é o contrário de tudo o resto
// deste projeto: não pedimos autorização a ninguém, damo-la. E dar autorização
// é a operação que mais maneiras tem de correr mal em silêncio.
//
// O que interessa provar não é que o fluxo funciona — é o que ele RECUSA, e
// sobretudo o que o token que ele emite NÃO consegue fazer.
import PocketBase from 'pocketbase';
import { URL, comecar, criarCasa, criarMembro, prova, igual, resumo } from './provas.mjs';

const { pb: admin } = await comecar();

const casaA = await criarCasa(admin, 'alexa-conta-A', { valor_ponto: 0.1 });
const casaB = await criarCasa(admin, 'alexa-conta-B', { valor_ponto: 0.1 });

const rita = await criarMembro(admin, casaA, 'Rita', 'admin', {
  email: 'rita.conta@exemplo.pt', password: 'palavra-de-provas-1',
  passwordConfirm: 'palavra-de-provas-1', verified: true,
});
const leo = await criarMembro(admin, casaA, 'Leo', 'crianca', {
  password: '4731', passwordConfirm: '4731',
});
const beatriz = await criarMembro(admin, casaB, 'Beatriz', 'admin', {
  email: 'beatriz.conta@exemplo.pt', password: 'palavra-de-provas-3',
  passwordConfirm: 'palavra-de-provas-3', verified: true,
});

// As credenciais da skill, uma por casa — como o `criar-credenciais-alexa.mjs`
// as gera.
const credA = await admin.collection('credenciais_alexa').create({
  casa: casaA.id, client_id: `provas-A-${Date.now()}`, client_secret: 'segredo-da-casa-A-para-provas',
});
const credB = await admin.collection('credenciais_alexa').create({
  casa: casaB.id, client_id: `provas-B-${Date.now()}`, client_secret: 'segredo-da-casa-B-para-provas',
});

// ⚠ Um dos três endereços de retorno que a Amazon usa. Qualquer outro tem de
// ser recusado — é o buraco clássico deste protocolo.
const RETORNO = 'https://pitangui.amazon.com/api/skill/link/PROVAS';

const raiz = URL.replace(/\/+$/, '');

const autorizarGET = async (params) => {
  const q = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${raiz}/api/alexa/autorizar?${q}`, { redirect: 'manual' });
  return { estado: r.status, corpo: await r.text() };
};

const autorizarPOST = async (campos) => {
  const corpo = Object.entries(campos).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${raiz}/api/alexa/autorizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpo,
    redirect: 'manual',
  });
  return { estado: r.status, destino: r.headers.get('location') || '', corpo: await r.text() };
};

const token = async (campos) => {
  const corpo = Object.entries(campos).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${raiz}/api/alexa/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpo,
  });
  const t = await r.text();
  let d = {};
  try { d = JSON.parse(t); } catch { d = { bruto: t }; }
  return { estado: r.status, d };
};

const contarLigacoes = async () =>
  (await admin.collection('alexa_ligacoes').getFullList()).length;

const codigoDe = (destino) => {
  const m = String(destino).match(/[?&]code=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : '';
};

const BOM = { client_id: credA.client_id, redirect_uri: RETORNO, state: 'estado-123', response_type: 'code' };

console.log('\n── a página de autorização ──');

await prova('com os parâmetros certos, mostra o formulário', async () => {
  const r = await autorizarGET(BOM);
  igual(r.estado, 200, `devolveu ${r.estado}`);
  if (!/<form method="post"/.test(r.corpo)) throw new Error('não tem formulário');
  // ⚠ E diz por escrito o que o altifalante vai poder fazer. Quem autoriza tem
  // de saber ao que autoriza.
  if (!/acrescentar/.test(r.corpo)) throw new Error('não diz o que a skill faz');
  if (!/dinheiro nem em saúde/.test(r.corpo)) throw new Error('não diz o que ela NÃO faz');
});

await prova('⚠ um client_id que não é desta casa é recusado', async () => {
  const r = await autorizarGET({ ...BOM, client_id: 'inventado' });
  igual(r.estado, 400, `devolveu ${r.estado}`);
});

await prova('⚠ um endereço de retorno que não é da Amazon é RECUSADO', async () => {
  // ⚠ Este é o buraco clássico: quem conheça o `client_id` — que não é segredo —
  // manda a autorização para um sítio dele e fica com o código.
  for (const uri of [
    'https://exemplo.pt/roubar',
    'http://pitangui.amazon.com/api/skill/link/X',        // sem TLS
    'https://pitangui.amazon.com.exemplo.pt/x',           // sufixo colado
    'https://evil.com/?x=pitangui.amazon.com',
    'https://amazon.com/api/skill/link/X',                // anfitrião parecido
  ]) {
    const r = await autorizarGET({ ...BOM, redirect_uri: uri });
    igual(r.estado, 400, `«${uri}» devolveu ${r.estado}`);
  }
});

console.log('\n── quem pode autorizar ──');

await prova('⚠ a palavra-passe errada é recusada, e não diz se o endereço existe', async () => {
  const antes = await contarLigacoes();
  const r = await autorizarPOST({ ...BOM, email: 'rita.conta@exemplo.pt', palavra: 'errada' });
  igual(r.estado, 401, `devolveu ${r.estado}`);
  // ⚠ A MESMA mensagem de um endereço que não existe: duas diferentes dizem a
  // quem tentar quais os endereços desta casa, um de cada vez.
  const r2 = await autorizarPOST({ ...BOM, email: 'ninguem@exemplo.pt', palavra: 'errada' });
  igual(r2.estado, 401, `o inexistente devolveu ${r2.estado}`);
  const msg = (c) => (String(c).match(/class="erro">([^<]*)</) || [])[1] || '';
  igual(msg(r.corpo), msg(r2.corpo), 'as duas mensagens são diferentes');
  igual(await contarLigacoes(), antes, 'escreveu uma ligação');
});

await prova('⚠ uma criança não liga altifalantes', async () => {
  const antes = await contarLigacoes();
  // A criança não tem e-mail — entra pelo login. Nem por um nem por outro.
  const r = await autorizarPOST({ ...BOM, email: leo.login, palavra: '4731' });
  igual(r.estado, 401, `devolveu ${r.estado}`);
  igual(await contarLigacoes(), antes, 'a criança criou uma ligação');
});

await prova('⚠ um adulto da casa B não autoriza com as credenciais da casa A', async () => {
  const antes = await contarLigacoes();
  const r = await autorizarPOST({
    ...BOM, email: 'beatriz.conta@exemplo.pt', palavra: 'palavra-de-provas-3',
  });
  igual(r.estado, 401, `devolveu ${r.estado}`);
  igual(await contarLigacoes(), antes, 'a Beatriz ligou-se à casa A');
});

let primeiroCodigo = '';

await prova('a Rita autoriza — e volta com um código e o estado dela', async () => {
  const r = await autorizarPOST({ ...BOM, email: 'rita.conta@exemplo.pt', palavra: 'palavra-de-provas-1' });
  igual(r.estado, 302, `devolveu ${r.estado}`);
  if (r.destino.indexOf(RETORNO) !== 0) throw new Error(`mandou para ${r.destino}`);
  // ⚠ O `state` volta tal e qual: é o que prova à Amazon que a resposta é desta
  // viagem e não de outra.
  if (!/[?&]state=estado-123(&|$)/.test(r.destino)) throw new Error('não devolveu o state');
  primeiroCodigo = codigoDe(r.destino);
  if (primeiroCodigo.length < 20) throw new Error(`o código é curto: «${primeiroCodigo}»`);
});

console.log('\n── a troca ──');

await prova('⚠ sem o client_secret certo, não há token', async () => {
  const r = await token({
    grant_type: 'authorization_code', code: primeiroCodigo,
    redirect_uri: RETORNO, client_id: credA.client_id, client_secret: 'errado',
  });
  igual(r.estado, 401, `devolveu ${r.estado}`);
  igual(r.d.error, 'invalid_client', `disse «${r.d.error}»`);
});

await prova('⚠ nem com o segredo da OUTRA casa', async () => {
  const r = await token({
    grant_type: 'authorization_code', code: primeiroCodigo,
    redirect_uri: RETORNO, client_id: credB.client_id, client_secret: credB.client_secret,
  });
  // As credenciais são boas, mas são da casa B — e o código é da casa A.
  igual(r.estado, 400, `devolveu ${r.estado}`);
  igual(r.d.error, 'invalid_grant', `disse «${r.d.error}»`);
});

await prova('⚠ nem com um endereço de retorno diferente do que pediu o código', async () => {
  // Sem esta amarra, um código apanhado a meio trocava-se a partir de outro sítio.
  const r = await token({
    grant_type: 'authorization_code', code: primeiroCodigo,
    redirect_uri: 'https://layla.amazon.com/api/skill/link/OUTRO',
    client_id: credA.client_id, client_secret: credA.client_secret,
  });
  igual(r.estado, 400, `devolveu ${r.estado}`);
  igual(r.d.error, 'invalid_grant', `disse «${r.d.error}»`);
});

let acesso = '';
let renovar = '';

await prova('com tudo certo, dá um token de acesso e um de renovação', async () => {
  const r = await token({
    grant_type: 'authorization_code', code: primeiroCodigo,
    redirect_uri: RETORNO, client_id: credA.client_id, client_secret: credA.client_secret,
  });
  igual(r.estado, 200, `devolveu ${r.estado} · ${JSON.stringify(r.d).slice(0, 120)}`);
  igual(r.d.token_type, 'Bearer', `o tipo é «${r.d.token_type}»`);
  igual(r.d.scope, 'casa.escrever', `o âmbito é «${r.d.scope}»`);
  if (!r.d.access_token) throw new Error('não veio token de acesso');
  if (!r.d.refresh_token) throw new Error('não veio token de renovação');
  if (!(Number(r.d.expires_in) > 0)) throw new Error(`expires_in é ${r.d.expires_in}`);
  acesso = r.d.access_token;
  renovar = r.d.refresh_token;
});

await prova('⚠ o mesmo código NÃO serve duas vezes', async () => {
  const r = await token({
    grant_type: 'authorization_code', code: primeiroCodigo,
    redirect_uri: RETORNO, client_id: credA.client_id, client_secret: credA.client_secret,
  });
  igual(r.estado, 400, `devolveu ${r.estado}`);
  igual(r.d.error, 'invalid_grant', `disse «${r.d.error}»`);
});

await prova('⚠ as credenciais também servem no cabeçalho Basic', async () => {
  // ⚠ A consola da Amazon tem um campo «Client Authentication Scheme» com duas
  // opções. A primeira versão só lia o corpo, e escolher a outra dava um
  // `invalid_client` — que parece um segredo mal copiado e manda quem o vê
  // procurar no sítio errado. Servem as duas, como o RFC 6749 manda.
  const par = Buffer.from(`${credA.client_id}:${credA.client_secret}`, 'binary').toString('base64');
  const r = await fetch(`${raiz}/api/alexa/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${par}`,
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(renovar)}`,
  });
  const d = await r.json().catch(() => ({}));
  igual(r.status, 200, `devolveu ${r.status} · ${JSON.stringify(d).slice(0, 100)}`);
  if (!d.access_token) throw new Error('não veio token');
});

await prova('⚠ e um Basic com o segredo errado é recusado na mesma', async () => {
  const par = Buffer.from(`${credA.client_id}:errado`, 'binary').toString('base64');
  const r = await fetch(`${raiz}/api/alexa/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${par}`,
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(renovar)}`,
  });
  const d = await r.json().catch(() => ({}));
  igual(r.status, 401, `devolveu ${r.status}`);
  igual(d.error, 'invalid_client', `disse «${d.error}»`);
});

await prova('o token de renovação dá um token de acesso novo', async () => {
  const r = await token({
    grant_type: 'refresh_token', refresh_token: renovar,
    client_id: credA.client_id, client_secret: credA.client_secret,
  });
  igual(r.estado, 200, `devolveu ${r.estado}`);
  if (!r.d.access_token) throw new Error('não veio token novo');
});

await prova('⚠ um tipo de pedido que não conhecemos é recusado', async () => {
  const r = await token({
    grant_type: 'password', username: 'rita.conta@exemplo.pt', password: 'palavra-de-provas-1',
    client_id: credA.client_id, client_secret: credA.client_secret,
  });
  igual(r.estado, 400, `devolveu ${r.estado}`);
  igual(r.d.error, 'unsupported_grant_type', `disse «${r.d.error}»`);
});

console.log('\n── e o que o token consegue fazer ──');

const comOToken = async (rota, corpo, metodo) => {
  const r = await fetch(`${raiz}${rota}`, {
    method: metodo || 'POST',
    headers: { Authorization: acesso, 'Content-Type': 'application/json' },
    body: metodo === 'GET' ? undefined : JSON.stringify(corpo || {}),
  });
  const t = await r.text();
  let d = {};
  try { d = JSON.parse(t); } catch { d = { bruto: t }; }
  return { estado: r.status, d };
};

await prova('o token acrescenta um artigo à lista — que é para o que serve', async () => {
  const r = await comOToken('/api/alexa/artigo', { artigo: 'leite pela voz' });
  igual(r.estado, 200, `devolveu ${r.estado} · ${JSON.stringify(r.d).slice(0, 120)}`);
  const linha = await admin.collection('artigos').getOne(r.d.id);
  igual(linha.rotulo, 'leite pela voz', `ficou «${linha.rotulo}»`);
  igual(String(linha.casa), casaA.id, 'entrou na casa errada');
});

await prova('⚠ e NÃO lê a saúde — com um episódio LÁ DENTRO, que é o que faltava', async () => {
  // ⚠ ESTA PROVA PASSOU EM VAZIO DURANTE TODO O TEMPO EM QUE O BURACO ESTEVE
  // ABERTO, e é a lição mais cara deste ficheiro.
  //
  // Ela era isto:
  //
  //     for (const c of ['episodios_saude', ...]) {
  //       const r = await comOToken(`/api/collections/${c}/records`, null, 'GET');
  //       if (r.d.totalItems) throw new Error(...);        // 0 linhas → passa
  //     }
  //
  // A casa destas provas NUNCA criava um episódio de saúde: a palavra só
  // aparecia nesta linha. `totalItems` era 0 por não haver nada lá, não por a
  // regra recusar. E o token era `membro.newAuthToken()` — uma sessão de adulto
  // que lia a saúde toda da casa. Medido a 27/09/2026 numa casa de simulação
  // com dados: devolvia a consulta da criança com as notas clínicas.
  //
  // Um guarda que não lê nada passa sempre. Agora põe-se lá um episódio, e
  // confere-se primeiro que ele SE VÊ com uma sessão de adulto — senão esta
  // prova volta a medir o vazio calada.
  const episodio = await admin.collection('episodios_saude').create({
    casa: casaA.id, membro: leo.id, especialidade: 'Pediatria',
    medico: 'Dra. Provas', dia: '2026-09-20 10:00:00', notas: 'NOTAS CLINICAS',
  });

  const comARita = new PocketBase(URL);
  comARita.autoCancellation(false);
  await comARita.collection('membros').authWithPassword('rita.conta@exemplo.pt', 'palavra-de-provas-1');
  const daRita = await fetch(`${raiz}/api/collections/episodios_saude/records`, {
    headers: { Authorization: comARita.authStore.token },
  }).then((r) => r.json());
  if (!daRita.totalItems) {
    throw new Error('a Rita não vê o episódio que acabei de criar — sem isto, o resto não mede nada');
  }

  for (const c of ['episodios_saude', 'notas_saude', 'receitas_saude', 'anexos', 'alergias_saude', 'tomas_saude']) {
    const r = await comOToken(`/api/collections/${c}/records`, null, 'GET');
    const n = r.d && r.d.totalItems;
    if (n) throw new Error(`${c} devolveu ${n} linhas ao token de voz`);
  }

  await admin.collection('episodios_saude').delete(episodio.id);
});

await prova('⚠ e não escreve dinheiro — não há rota nenhuma por onde', async () => {
  for (const rota of ['/api/alexa/despesa', '/api/alexa/envelope', '/api/alexa/cofre', '/api/alexa/saude']) {
    const r = await comOToken(rota, { valor: 10 });
    igual(r.estado, 404, `${rota} respondeu ${r.estado}`);
  }
});

console.log('\n── a ligação está fechada a quem não é o servidor ──');

await prova('⚠ nem um administrador da casa lê as ligações nem as credenciais', async () => {
  const daRita = new PocketBase(URL);
  daRita.autoCancellation(false);
  await daRita.collection('membros').authWithPassword('rita.conta@exemplo.pt', 'palavra-de-provas-1');
  for (const c of ['alexa_ligacoes', 'credenciais_alexa']) {
    let passou = false;
    try { await daRita.collection(c).getFullList(); passou = true; } catch (e) { /* é o que se quer */ }
    if (passou) throw new Error(`um adulto leu a ${c}`);
    // E nem por adivinha, um caractere de cada vez.
    let filtrou = false;
    try { await daRita.collection(c).getList(1, 1, { filter: 'id != ""' }); filtrou = true; } catch (e) { /* idem */ }
    if (filtrou) throw new Error(`o filtro da ${c} respondeu`);
  }
});

resumo();
