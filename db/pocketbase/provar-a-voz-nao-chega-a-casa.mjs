// A VOZ NÃO CHEGA À CASA — o que o token da Alexa consegue alcançar.
//
//   node db/pocketbase/provar-a-voz-nao-chega-a-casa.mjs
//
// ── Porque é que esta prova existe ───────────────────────────────────────────
//
// Porque a que existia passava em VAZIO, e o buraco que ela devia tapar era o
// maior desta casa.
//
// Até 27/09/2026 o token que a Amazon recebia era `membro.newAuthToken()` — uma
// sessão de adulto a sério, boa em todo o `/api/collections/…`, que está na
// internet desde que o servidor foi exposto. A página de consentimento prometia,
// em letras: «Não lê nada, e não toca em dinheiro nem em saúde».
//
// Medido numa casa de simulação com um episódio lá dentro, o token lia a
// consulta da criança com as notas clínicas e renomeava-a com um PATCH.
//
// ⚠ E a prova que dizia cobrir isto — `provar-alexa-conta.mjs` — media a
// AUSÊNCIA DE DADOS e chamava-lhe ausência de acesso:
//
//     for (const c of ['episodios_saude', ...]) {
//       const r = await comOToken(`/api/collections/${c}/records`, null, 'GET');
//       if (r.d.totalItems) throw new Error(...);     // 0 linhas → passa
//     }
//
// A casa dela nunca criava um episódio de saúde. `totalItems` era 0 por não
// haver nada lá, não por a regra recusar.
//
// ── O que esta faz de diferente, e são três coisas ───────────────────────────
//
// 1. ENUMERA AS COLEÇÕES DO SERVIDOR, e não uma lista escrita à mão. Uma coleção
//    nova entra nesta prova sozinha, no dia em que for criada — que é o que
//    falta a uma lista, e é como se descobriu que a `provar-limpar-casa.mjs`
//    nunca tinha corrido.
//
// 2. RECUSA-SE A PASSAR EM VAZIO. Antes de afirmar o que quer que seja, mede o
//    que um ADULTO vê — e se o adulto também não vir nada, a prova FALHA a
//    dizer que não tem dados para medir. É a lição escrita: um guarda que não lê
//    nada passa sempre.
//
// 3. Confere a ESCRITA contando as linhas como superutilizador antes e depois.
//    Um 400 do PocketBase tanto pode ser a regra a recusar como um campo em
//    falta; o número de linhas não é ambíguo.
import PocketBase from 'pocketbase';
import { URL, comecar, criarCasa, criarMembro, prova, igual, resumo } from './provas.mjs';

const { pb: admin } = await comecar();
const raiz = URL.replace(/\/+$/, '');
const marca = `voz-${Date.now()}`;

const casa = await criarCasa(admin, marca, { valor_ponto: 0.1 });
const rita = await criarMembro(admin, casa, 'Rita', 'admin', {
  email: `${marca}@exemplo.pt`, password: 'palavra-de-provas-1',
  passwordConfirm: 'palavra-de-provas-1', verified: true,
});
const leo = await criarMembro(admin, casa, 'Leo', 'crianca', {
  password: '4731', passwordConfirm: '4731',
});

// ── Dados a sério, nas coleções que a página de consentimento nomeia ─────────
//
// ⚠ Isto é o coração da prova. Sem estas linhas ela mede o vazio — que foi
// exactamente como a anterior passou durante todo o tempo em que o buraco
// esteve aberto.
//
// ⚠ E NADA de `.catch(() => null)` aqui. A primeira versão desta prova tinha-os,
// e o resultado foi o mesmo defeito outra vez, uma camada mais abaixo: a
// `despesas` falhava por eu ter escrito `pago_por` em vez de `pagador`, a linha
// não nascia, e a prova media uma coleção vazia a dizer que media dinheiro.
// Se um destes rebentar, tem de rebentar alto.
const episodio = await admin.collection('episodios_saude').create({
  casa: casa.id, membro: leo.id, especialidade: 'Pediatria',
  medico: 'Dra. Prova', dia: '2026-09-20 10:00:00', notas: 'NOTAS CLINICAS DE PROVA',
});
await admin.collection('notas_saude').create({
  casa: casa.id, episodio: episodio.id, autor: rita.id, texto: 'nota clinica de prova',
});
await admin.collection('alergias_saude').create({
  casa: casa.id, membro: leo.id, nome: 'amendoim', gravidade: 'grave',
});

// ⚠ O `mes` é uma DATA, e não o texto «2026-09» que parece. Escrito assim, o
// PocketBase recusa com «Cannot be blank» — e foi ele que rebentou esta prova
// alto, que é exactamente o que se quer de um `create` sem rede por baixo.
await admin.collection('meses').create({
  casa: casa.id, mes: '2026-09-01 00:00:00.000Z', rendimento: 3000,
});
const envelope = await admin.collection('envelopes').create({
  casa: casa.id, nome: 'Mercearia', limite_base: 400,
});
await admin.collection('despesas').create({
  casa: casa.id, descricao: 'compras de prova', valor: 100.5, data: '2026-09-21 10:00:00',
  pagador: rita.id, envelope: envelope.id,
});

// A credencial da skill desta casa.
const cred = await admin.collection('credenciais_alexa').create({
  casa: casa.id, client_id: `${marca}-id`, client_secret: `${marca}-segredo`,
});

// ── O fluxo, exactamente como a Amazon o faz ─────────────────────────────────
const RETORNO = 'https://pitangui.amazon.com/api/skill/link/PROVAS';
const form = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

const r1 = await fetch(`${raiz}/api/alexa/autorizar`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: form({
    client_id: cred.client_id, redirect_uri: RETORNO, state: 'xyz', response_type: 'code',
    email: `${marca}@exemplo.pt`, palavra: 'palavra-de-provas-1',
  }),
  redirect: 'manual',
});
const codigo = ((r1.headers.get('location') || '').match(/[?&]code=([^&]+)/) || [])[1];

const r2 = await fetch(`${raiz}/api/alexa/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: form({
    grant_type: 'authorization_code', code: codigo, redirect_uri: RETORNO,
    client_id: cred.client_id, client_secret: `${marca}-segredo`,
  }),
});
const emitido = await r2.json().catch(() => ({}));
const TOKEN_VOZ = emitido.access_token || '';

// E um token de ADULTO, para servir de régua.
const comoRita = new PocketBase(URL);
comoRita.autoCancellation(false);
await comoRita.collection('membros').authWithPassword(`${marca}@exemplo.pt`, 'palavra-de-provas-1');
const TOKEN_ADULTO = comoRita.authStore.token;

// ⚠ O TOKEN TEM DE EXISTIR PARA AS PROVAS VALEREM, e isto não é zelo a mais.
//
// A primeira corrida desta prova, com a rota do token a devolver 400, deu TRÊS
// verdes: «a voz não lê nada», «a voz não escreve em nada», «a voz não renomeia
// a criança». As três verdadeiras, e as três inúteis — não havia token nenhum.
// Um pedido sem `Authorization` também não lê nem escreve nada.
//
// É o MESMO defeito que esta prova foi escrita para corrigir, uma camada acima:
// medir a ausência de meios e chamar-lhe ausência de poder. Por isso cada prova
// que afirma um «não» começa por exigir o token.
const exigeToken = () => {
  if (!TOKEN_VOZ) {
    throw new Error('não há token da voz — esta prova estaria a medir um pedido sem credencial nenhuma');
  }
};

const listar = async (colecao, token) => {
  const r = await fetch(`${raiz}/api/collections/${colecao}/records?perPage=1`, {
    headers: token ? { Authorization: token } : {},
  });
  const d = await r.json().catch(() => ({}));
  return { estado: r.status, n: (d && typeof d.totalItems === 'number') ? d.totalItems : 0 };
};

// ── As provas ────────────────────────────────────────────────────────────────

await prova('o fluxo emite um token — senão não há nada para medir', async () => {
  igual(r1.status, 302, `a autorização devolveu ${r1.status}`);
  if (!codigo) throw new Error('não veio código nenhum no retorno');
  igual(r2.status, 200, `o token devolveu ${r2.status}`);
  if (!TOKEN_VOZ) throw new Error('não veio access_token');
});

await prova('⚠ e o token é da coleção `alexa_vozes`, e NÃO uma sessão de membro', async () => {
  // O defeito de 27/09/2026 em uma linha. O corpo do JWT diz de que coleção é.
  const meio = TOKEN_VOZ.split('.')[1] || '';
  const dados = JSON.parse(Buffer.from(meio.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  const colecao = dados.collectionId || dados.collectionName || '';
  const membros = await admin.collections.getOne('membros');
  if (String(colecao) === String(membros.id)) {
    throw new Error('o token é da coleção `membros` — é uma sessão de adulto, que é o defeito');
  }
  const vozes = await admin.collections.getOne('alexa_vozes');
  igual(String(colecao), String(vozes.id), `o token é da coleção ${colecao}`);
});

await prova('⚠ a casa das provas TEM dados — senão esta prova mede o vazio', async () => {
  // A lição escrita: a prova anterior passava porque não havia nada para ler.
  // Esta falha, a dizer isso, em vez de passar calada.
  const deveTer = ['episodios_saude', 'membros', 'despesas'];
  const vazias = [];
  for (const c of deveTer) {
    const { n } = await listar(c, TOKEN_ADULTO);
    if (!n) vazias.push(c);
  }
  if (vazias.length) {
    throw new Error(`a Rita não vê nada em ${vazias.join(', ')} — sem dados, o resto desta prova não mede nada`);
  }
});

await prova('⚠ e a VOZ não lê NENHUMA coleção do servidor — enumeradas do disco, não de uma lista', async () => {
  exigeToken();
  // ⚠ Enumera do SERVIDOR. Uma coleção nova entra aqui sozinha no dia em que
  // for criada — que é o que falta a uma lista escrita à mão, e foi assim que
  // se descobriu que a `provar-limpar-casa.mjs` nunca tinha corrido.
  const todas = (await admin.collections.getFullList())
    .filter((c) => !c.system && !c.name.startsWith('_') && !c.name.startsWith('v_'));

  if (todas.length < 30) throw new Error(`só enumerei ${todas.length} coleções — algo está mal`);

  const fugas = [];
  let comDados = 0;
  for (const c of todas) {
    const adulto = await listar(c.name, TOKEN_ADULTO);
    if (adulto.n) comDados++;
    const voz = await listar(c.name, TOKEN_VOZ);
    if (voz.n) fugas.push(`${c.name}: a voz leu ${voz.n} linha(s) (a Rita vê ${adulto.n})`);
  }
  if (comDados < 3) {
    throw new Error(`só ${comDados} coleções têm dados — esta prova está a medir o vazio`);
  }
  if (fugas.length) throw new Error(`${todas.length} coleções · ${fugas.length} com fuga:\n      ${fugas.join('\n      ')}`);
});

await prova('⚠ nem ESCREVE em nenhuma — contado por linhas, que não é ambíguo', async () => {
  exigeToken();
  // Um 400 tanto pode ser a regra a recusar como um campo em falta. O número de
  // linhas antes e depois não se presta a interpretações.
  const todas = (await admin.collections.getFullList())
    .filter((c) => !c.system && !c.name.startsWith('_') && !c.name.startsWith('v_'));

  const escritas = [];
  for (const c of todas) {
    const antes = (await admin.collection(c.name).getList(1, 1)).totalItems;
    await fetch(`${raiz}/api/collections/${c.name}/records`, {
      method: 'POST',
      headers: { Authorization: TOKEN_VOZ, 'Content-Type': 'application/json' },
      body: JSON.stringify({ casa: casa.id, membro: leo.id, nome: 'escrito pela voz', rotulo: 'escrito pela voz' }),
    }).catch(() => null);
    const depois = (await admin.collection(c.name).getList(1, 1)).totalItems;
    if (depois > antes) escritas.push(`${c.name}: ${antes} → ${depois}`);
  }
  if (escritas.length) throw new Error(`a voz escreveu em ${escritas.length}:\n      ${escritas.join('\n      ')}`);
});

await prova('⚠ e não renomeia a criança — o PATCH que passava em 27/09/2026', async () => {
  exigeToken();
  const r = await fetch(`${raiz}/api/collections/membros/records/${leo.id}`, {
    method: 'PATCH',
    headers: { Authorization: TOKEN_VOZ, 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Leo ALTERADO PELA VOZ' }),
  });
  const agora = await admin.collection('membros').getOne(leo.id);
  igual(agora.nome, 'Leo', `o nome ficou «${agora.nome}» — o PATCH respondeu ${r.status}`);
});

await prova('mas a voz FALA — as três rotas continuam a servir', async () => {
  const chamar = async (rota, corpo) => {
    const r = await fetch(`${raiz}/api/alexa/${rota}`, {
      method: 'POST',
      headers: { Authorization: TOKEN_VOZ, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    return { estado: r.status, d: await r.json().catch(() => ({})) };
  };
  const a = await chamar('artigo', { artigo: 'leite pela voz', requestId: `${marca}-1` });
  igual(a.estado, 200, `o artigo devolveu ${a.estado} · ${JSON.stringify(a.d).slice(0, 120)}`);
  const t = await chamar('tarefa', { titulo: 'arrumar pela voz', requestId: `${marca}-2` });
  igual(t.estado, 200, `a tarefa devolveu ${t.estado} · ${JSON.stringify(t.d).slice(0, 120)}`);
  const v = await chamar('evento', { titulo: 'jantar pela voz', dia: '2026-10-01', hora: '20:00', requestId: `${marca}-3` });
  igual(v.estado, 200, `o evento devolveu ${v.estado} · ${JSON.stringify(v.d).slice(0, 120)}`);
});

await prova('⚠ e um token de ADULTO já não serve nas rotas da voz', async () => {
  // O contrário do defeito: as rotas passaram a exigir `alexa_vozes`, portanto a
  // sessão da app não entra por aqui. Se isto ficar verde com 200, o
  // `requireAuth` voltou para `membros` e o buraco voltou com ele.
  const r = await fetch(`${raiz}/api/alexa/artigo`, {
    method: 'POST',
    headers: { Authorization: TOKEN_ADULTO, 'Content-Type': 'application/json' },
    body: JSON.stringify({ artigo: 'pela sessão da app', requestId: `${marca}-4` }),
  });
  if (r.status === 200) throw new Error('a sessão de adulto entrou na rota da voz');
  // ⚠ 403 e não 401, e a diferença diz alguma coisa: o PocketBase distingue
  // «não trouxe credencial» (401) de «trouxe uma de OUTRA coleção» (403). É o
  // 403 que prova que a sessão da app foi vista, reconhecida, e recusada.
  igual(r.status, 403, `devolveu ${r.status}`);
});

await prova('⚠ e a identidade da voz morre com a ligação', async () => {
  exigeToken();
  // Revogação: desligar a conta na Alexa apaga a ligação, e a `alexa_vozes`
  // cai com ela por `cascadeDelete` — o token deixa de valer na hora.
  const voz = await admin.collection('alexa_vozes').getFirstListItem(`membro = "${rita.id}"`);
  const ligacao = await admin.collection('alexa_ligacoes').getFirstListItem(`membro = "${rita.id}"`);
  await admin.collection('alexa_ligacoes').delete(ligacao.id);

  const sobrou = await admin.collection('alexa_vozes').getOne(voz.id).catch(() => null);
  if (sobrou) throw new Error('a identidade da voz sobreviveu à ligação apagada');

  const r = await fetch(`${raiz}/api/alexa/artigo`, {
    method: 'POST',
    headers: { Authorization: TOKEN_VOZ, 'Content-Type': 'application/json' },
    body: JSON.stringify({ artigo: 'depois de desligada', requestId: `${marca}-5` }),
  });
  igual(r.status, 401, `o token ainda serviu: ${r.status}`);
});

resumo();
