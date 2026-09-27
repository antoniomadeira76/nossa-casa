// As rotas da Alexa — fase 1 do `docs/alexa.md`.
//
//   node db/pocketbase/provar-alexa.mjs
//
// Três escritas por voz, e o que interessa provar não é que elas escrevem — é
// tudo o que elas RECUSAM. A Alexa não sabe quem está a falar, e a fase 1
// responde a isso escolhendo trabalho onde a identidade não é precisa: por voz
// só entra o que já é público dentro de casa, e só na direcção de escrever.
//
// Cada prova tenta o que a especificação diz que não pode acontecer.
import PocketBase from 'pocketbase';
import { URL, PREFIXO, comecar, criarCasa, criarMembro, prova, igual, resumo } from './provas.mjs';

const { pb: admin } = await comecar();

const casaA = await criarCasa(admin, 'alexa-A', { valor_ponto: 0.1 });
const casaB = await criarCasa(admin, 'alexa-B', { valor_ponto: 0.1 });

const rita = await criarMembro(admin, casaA, 'Rita', 'admin', {
  email: 'rita.alexa@exemplo.pt', password: 'palavra-de-provas-1',
  passwordConfirm: 'palavra-de-provas-1', verified: true,
});
const tomas = await criarMembro(admin, casaA, 'Tomas', 'adulto', {
  email: 'tomas.alexa@exemplo.pt', password: 'palavra-de-provas-2',
  passwordConfirm: 'palavra-de-provas-2', verified: true,
});
// ⚠ A criança entra pelo LOGIN e a palavra-passe tem de ter 4 dígitos — o hook
// do PIN exige-o, e é aí que esta prova se enganou da primeira vez.
const leo = await criarMembro(admin, casaA, 'Leo', 'crianca', {
  password: '4731', passwordConfirm: '4731',
});
const beatriz = await criarMembro(admin, casaB, 'Beatriz', 'admin', {
  email: 'beatriz.alexa@exemplo.pt', password: 'palavra-de-provas-3',
  passwordConfirm: 'palavra-de-provas-3', verified: true,
});

const telemovel = async (identidade, senha) => {
  const c = new PocketBase(URL);
  c.autoCancellation(false);
  await c.collection('membros').authWithPassword(identidade, senha);
  return c;
};

const daRita = await telemovel('rita.alexa@exemplo.pt', 'palavra-de-provas-1');
const doTomas = await telemovel('tomas.alexa@exemplo.pt', 'palavra-de-provas-2');
const doLeo = await telemovel(leo.login, '4731');
const daBeatriz = await telemovel('beatriz.alexa@exemplo.pt', 'palavra-de-provas-3');

// ── A credencial da VOZ ──────────────────────────────────────────────────────
//
// ⚠ Esta prova autenticava-se com o token do telemóvel — `authWithPassword` na
// coleção `membros` — e isso deixou de servir em 27/09/2026, por uma boa razão.
//
// Até esse dia, o token que a Amazon recebia ERA o token do telemóvel: uma
// sessão de adulto, boa em todo o `/api/collections/…`, que lia a saúde das
// crianças e a mudava. As rotas passaram a exigir a coleção `alexa_vozes`, e
// com isso esta prova ficou a bater numa porta que já não é a dela: 21 vermelhos
// com 403, todos a dizerem a mesma coisa.
//
// Podia ter-se mudado o `requireAuth` de volta e ficava tudo verde. Seria
// exactamente o erro: a prova tem de usar a credencial que o altifalante USA, e
// essa vem do fluxo do Account Linking, que é o que este ajudante percorre.
const RETORNO_AMAZON = 'https://pitangui.amazon.com/api/skill/link/PROVAS';
const emForm = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
const raizDoServidor = URL.replace(/\/+$/, '');

const credenciaisDe = async (casa) => admin.collection('credenciais_alexa').create({
  casa: casa.id,
  client_id: `provas-alexa-${casa.id}`,
  client_secret: `segredo-de-provas-${casa.id}`,
});
const credA = await credenciaisDe(casaA);
const credB = await credenciaisDe(casaB);

// Devolve o `access_token` da voz, ou o ESTADO da recusa — que é o que interessa
// quando quem tenta é uma criança.
const vozDe = async (cred, email, palavra) => {
  const r1 = await fetch(`${raizDoServidor}/api/alexa/autorizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: emForm({
      client_id: cred.client_id, redirect_uri: RETORNO_AMAZON, state: 'xyz',
      response_type: 'code', email, palavra,
    }),
    redirect: 'manual',
  });
  const codigo = ((r1.headers.get('location') || '').match(/[?&]code=([^&]+)/) || [])[1];
  if (!codigo) return { token: '', estado: r1.status, corpo: await r1.text() };

  const r2 = await fetch(`${raizDoServidor}/api/alexa/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: emForm({
      grant_type: 'authorization_code', code: codigo, redirect_uri: RETORNO_AMAZON,
      client_id: cred.client_id, client_secret: cred.client_secret,
    }),
  });
  const d = await r2.json().catch(() => ({}));
  return { token: d.access_token || '', estado: r2.status, corpo: JSON.stringify(d) };
};

const vozDaRita = await vozDe(credA, 'rita.alexa@exemplo.pt', 'palavra-de-provas-1');
const vozDoTomas = await vozDe(credA, 'tomas.alexa@exemplo.pt', 'palavra-de-provas-2');
const vozDaBeatriz = await vozDe(credB, 'beatriz.alexa@exemplo.pt', 'palavra-de-provas-3');

// ⚠ Sem isto, as provas que afirmam um «não» passam com um token vazio — que é
// a mesma armadilha que deixou o buraco aberto: medir a ausência de meios e
// chamar-lhe ausência de poder.
for (const [quem, v] of [['Rita', vozDaRita], ['Tomás', vozDoTomas], ['Beatriz', vozDaBeatriz]]) {
  if (!v.token) {
    console.error(`Não consegui um token da voz para a ${quem}: ${v.estado} · ${String(v.corpo).slice(0, 200)}`);
    process.exitCode = 1;
  }
}

// ⚠ `fetch` directo, e não o cliente: uma rota recusada devolve um `status`,
// não atira. O ajudante `recusado()` não serve aqui — passaria sempre.
//
// E o token vai cru no `Authorization`, sem `Bearer`.
const chamar = async (rota, token, corpo) => {
  const r = await fetch(`${URL.replace(/\/+$/, '')}/api/alexa/${rota}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: token } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(corpo || {}),
  });
  const t = await r.text();
  let d = {};
  try { d = JSON.parse(t); } catch { d = { bruto: t }; }
  return { estado: r.status, d };
};

const contar = async (colecao, casa) =>
  (await admin.collection(colecao).getFullList({ filter: `casa = "${casa.id}"` })).length;

const ROTAS = ['artigo', 'evento', 'tarefa'];
const CORPO = {
  artigo: { artigo: 'leite meio-gordo' },
  evento: { titulo: 'almoço com a avó', dia: '2026-09-28', hora: '13:00' },
  tarefa: { titulo: 'regar as plantas' },
};

console.log('\n── quem pode falar ──');

await prova('⚠ sem sessão, as três rotas recusam com 401', async () => {
  for (const rota of ROTAS) {
    const r = await chamar(rota, null, CORPO[rota]);
    igual(r.estado, 401, `${rota} devolveu ${r.estado}`);
  }
});

await prova('⚠ uma criança não consegue sequer uma credencial da voz', async () => {
  // ⚠ Esta prova mudou de sítio em 27/09/2026, e a mudança é o ponto.
  //
  // Antes, mandava o token do TELEMÓVEL do Léo às três rotas e exigia 403. Hoje
  // isso continua a dar 403 — mas por ser um token da coleção errada, e não por
  // ser de uma criança. Ficaria verde para sempre, e deixaria de medir o que diz.
  //
  // A pergunta certa é a de cima: uma criança consegue ligar um altifalante a
  // esta casa? Não — e a recusa é na porta, não lá dentro.
  const tentativa = await vozDe(credA, leo.login, '4731');
  if (tentativa.token) throw new Error('o Léo conseguiu uma credencial da voz');
});

await prova('⚠ nem o token do telemóvel da criança entra nas rotas', async () => {
  // A outra ponta, que continua a valer: uma sessão de `membros` não serve nas
  // rotas da voz, seja de quem for. 403 e não 401 — a sessão é válida, só não é
  // da coleção que estas rotas reconhecem.
  const antes = {
    artigos: await contar('artigos', casaA),
    eventos: await contar('eventos', casaA),
    tarefas: await contar('tarefas', casaA),
  };
  for (const rota of ROTAS) {
    const r = await chamar(rota, doLeo.authStore.token, CORPO[rota]);
    igual(r.estado, 403, `${rota} devolveu ${r.estado} — a criança passou`);
  }
  igual(await contar('artigos', casaA), antes.artigos, 'a criança escreveu um artigo');
  igual(await contar('eventos', casaA), antes.eventos, 'a criança escreveu um evento');
  igual(await contar('tarefas', casaA), antes.tarefas, 'a criança escreveu uma tarefa');
});

await prova('⚠ e quem SAI da casa deixa de falar na hora, com o token já emitido', async () => {
  // A revogação que só a identidade separada torna possível de provar, e que é
  // a que pode mesmo acontecer.
  //
  // ⚠ Tentei primeiro pelo papel — pôr um adulto a criança com o token vivo — e
  // a casa recusou duas vezes, com razão nas duas: «Um perfil de criança não
  // leva e-mail» e depois «Um adulto não passa a criança». Essa transição não
  // existe aqui, portanto uma prova sobre ela estaria a medir um caminho
  // imaginário. O que existe é alguém deixar de ser membro.
  //
  // Sem identidade separada isto não se conseguia provar: o token era do
  // membro, e apagá-lo levava a sessão do telemóvel com ele — a prova não
  // distinguia a revogação da voz da revogação de tudo.
  const sai = await criarMembro(admin, casaA, 'Sai', 'adulto', {
    email: 'sai.alexa@exemplo.pt', password: 'palavra-de-provas-9',
    passwordConfirm: 'palavra-de-provas-9', verified: true,
  });
  const voz = await vozDe(credA, 'sai.alexa@exemplo.pt', 'palavra-de-provas-9');
  if (!voz.token) throw new Error(`não consegui a credencial: ${voz.estado} · ${String(voz.corpo).slice(0, 160)}`);

  const antes = await chamar('artigo', voz.token, { artigo: 'enquanto ca estava' });
  igual(antes.estado, 200, `antes de sair devolveu ${antes.estado}`);

  await admin.collection('membros').delete(sai.id);

  // A identidade da voz cai com o membro, por `cascadeDelete`.
  const sobrou = await admin.collection('alexa_vozes')
    .getFirstListItem(`membro = "${sai.id}"`).catch(() => null);
  if (sobrou) throw new Error('a identidade da voz sobreviveu ao membro apagado');

  const depois = await chamar('artigo', voz.token, { artigo: 'depois de sair' });
  igual(depois.estado, 401, `depois de sair devolveu ${depois.estado}`);
});

await prova('um adulto que não administra a casa pode falar', async () => {
  // ⚠ Isto é de propósito, e diverge do `/api/casa/limpar`, que exige `admin`.
  // O token de um altifalante representa um adulto da casa; obrigar a ser
  // administrador queria dizer que o Tomás não podia pôr leite na lista.
  const r = await chamar('artigo', vozDoTomas.token, { artigo: 'pão de forma' });
  igual(r.estado, 200, `devolveu ${r.estado}`);
});

console.log('\n── a casa é a de quem fala ──');

await prova('⚠ um token da casa B não escreve na casa A', async () => {
  // O caso que mais importa: a `casa` vem do MEMBRO autenticado e nunca do
  // corpo. Se viesse do corpo, bastava mudar um campo.
  const antesA = {
    artigos: await contar('artigos', casaA),
    eventos: await contar('eventos', casaA),
    tarefas: await contar('tarefas', casaA),
  };
  for (const rota of ROTAS) {
    const r = await chamar(rota, vozDaBeatriz.token, { ...CORPO[rota], casa: casaA.id });
    igual(r.estado, 200, `${rota} devolveu ${r.estado} — a Beatriz devia poder escrever na SUA casa`);
  }
  igual(await contar('artigos', casaA), antesA.artigos, 'a casa A ganhou um artigo da casa B');
  igual(await contar('eventos', casaA), antesA.eventos, 'a casa A ganhou um evento da casa B');
  igual(await contar('tarefas', casaA), antesA.tarefas, 'a casa A ganhou uma tarefa da casa B');
  if (await contar('artigos', casaB) === 0) throw new Error('a casa B não recebeu nada');
});

console.log('\n── o que a voz escreve ──');

await prova('⚠ um evento por voz sai SEMPRE visível para a família', async () => {
  const r = await chamar('evento', vozDaRita.token,
    { titulo: 'jantar de família', dia: '2026-09-29', visibilidade: 'so-eu' });
  igual(r.estado, 200, `devolveu ${r.estado}`);
  // ⚠ Mesmo pedindo `so-eu` no corpo: a rota não lê visibilidade nenhuma do
  // pedido. Um evento privado ditado em voz alta já não é privado.
  const linha = await admin.collection('eventos').getOne(r.d.id);
  igual(linha.visibilidade, 'familia', 'a visibilidade não é de família');
  igual(linha.autor, rita.id, 'o autor não é quem falou');
});

await prova('⚠ e a resposta DIZ a visibilidade, para ninguém supor que é privada', async () => {
  const r = await chamar('evento', vozDaRita.token,
    { titulo: 'consulta no dentista', dia: '2026-09-30', hora: '09:30' });
  if (!/visível para a família/.test(String(r.d.frase))) {
    throw new Error(`a frase não diz a visibilidade: «${r.d.frase}»`);
  }
});

await prova('⚠ uma data com o prefixo `d` da loja local é RECUSADA', async () => {
  // ⚠ O `docs/alexa.md` tinha isto ao contrário — dizia que a app lê
  // `d2026-09-06` e que era essa «a chave certa». O `d` é da LOJA LOCAL, e o
  // campo `eventos.dia` é uma data do PocketBase: `d2026-09-06` lá dentro é
  // uma data inválida. O `AMAZON.DATE` dá exactamente o que se escreve.
  const r = await chamar('evento', vozDaRita.token,
    { titulo: 'passeio', dia: 'd2026-10-01' });
  igual(r.estado, 400, `devolveu ${r.estado} — aceitou uma data inválida`);
});

await prova('⚠ e uma data vaga do AMAZON.DATE também', async () => {
  // «esta semana» dá `2026-W40`, «em outubro» dá `2026-10`. Nada disso é um dia.
  for (const dia of ['2026-W40', '2026-10', '2026-W40-WE', 'amanhã']) {
    const r = await chamar('evento', vozDaRita.token, { titulo: 'passeio', dia });
    igual(r.estado, 400, `«${dia}» devolveu ${r.estado}`);
  }
});

await prova('uma hora vaga do AMAZON.TIME dá um evento de dia inteiro', async () => {
  // `MO`, `AF`, `EV`, `NI` — manhã, tarde, noite, madrugada. Melhor sem hora do
  // que com uma hora inventada.
  const r = await chamar('evento', vozDaRita.token,
    { titulo: 'arrumar a garagem', dia: '2026-10-02', hora: 'AF' });
  igual(r.estado, 200, `devolveu ${r.estado}`);
  const linha = await admin.collection('eventos').getOne(r.d.id);
  igual(linha.hora, '', `guardou a hora «${linha.hora}»`);
});

await prova('uma tarefa por voz não leva pontos nem responsável', async () => {
  const r = await chamar('tarefa', vozDaRita.token, { titulo: 'marcar a revisão' });
  igual(r.estado, 200, `devolveu ${r.estado}`);
  const linha = await admin.collection('tarefas').getOne(r.d.id);
  igual(linha.pontos, 0, 'a tarefa nasceu com pontos');
  igual(String(linha.atribuido_a || ''), '', 'a tarefa nasceu atribuída');
});

await prova('um artigo por voz entra na lista aberta, sem posto', async () => {
  const r = await chamar('artigo', vozDaRita.token, { artigo: 'ovos' });
  igual(r.estado, 200, `devolveu ${r.estado}`);
  const linha = await admin.collection('artigos').getOne(r.d.id);
  igual(linha.rotulo, 'ovos', 'o rótulo não é o que se disse');
  igual(linha.estado, 'por_comprar', 'o estado não é «por comprar»');
  // ⚠ Zero quer dizer «nunca arrastado», e é isso que um artigo novo é.
  igual(linha.posto, 0, `nasceu com posto ${linha.posto}`);
  const lista = await admin.collection('listas_compras').getOne(linha.lista);
  igual(String(lista.fechada_em || ''), '', 'entrou numa lista já fechada');
});

console.log('\n── o reenvio ──');

await prova('o mesmo requestId duas vezes, em sequência, escreve UMA linha', async () => {
  const pedido = { artigo: 'arroz agulha', requestId: 'amzn1.echo-api.request.provas-1' };
  const antes = await contar('artigos', casaA);
  const um = await chamar('artigo', vozDaRita.token, pedido);
  const dois = await chamar('artigo', vozDaRita.token, pedido);
  igual(um.estado, 200, `o primeiro devolveu ${um.estado}`);
  igual(dois.estado, 200, `o reenvio devolveu ${dois.estado}`);
  igual(await contar('artigos', casaA), antes + 1, 'o reenvio escreveu outra linha');
  igual(dois.d.id, um.d.id, 'o reenvio devolveu outra linha');
  igual(dois.d.frase, um.d.frase, 'o reenvio disse outra coisa');
  igual(dois.d.repetido, true, 'o reenvio não se declarou repetido');
});

await prova('⚠ e AO MESMO TEMPO também — que é como a Alexa reenvia', async () => {
  // ⚠ Esta é a prova que faltava, e a falta dela escondeu um defeito a sério.
  //
  // A versão sequencial acima passava com a idempotência avariada: a primeira
  // implementação lia, escrevia o artigo e só depois registava o pedido, e a
  // janela entre a leitura e o registo nunca estava fechada. Medido em
  // 27/09/2026: dois pedidos em voo ao mesmo tempo escreviam DOIS artigos,
  // cinco vezes em cinco; doze em paralelo escreviam doze.
  //
  // E a Alexa reenvia precisamente porque a primeira resposta ainda não chegou
  // — ou seja, o caso concorrente é o NORMAL, não o excepcional.
  for (const volta of [1, 2, 3]) {
    const pedido = { artigo: `bacalhau ${volta}`, requestId: `amzn1.echo-api.request.par-${volta}` };
    const antes = await contar('artigos', casaA);
    const [um, dois] = await Promise.all([
      chamar('artigo', vozDaRita.token, pedido),
      chamar('artigo', vozDaRita.token, pedido),
    ]);
    igual(um.estado, 200, `volta ${volta}: o primeiro devolveu ${um.estado}`);
    igual(dois.estado, 200, `volta ${volta}: o segundo devolveu ${dois.estado}`);
    igual(await contar('artigos', casaA), antes + 1,
      `volta ${volta}: os dois pedidos simultâneos escreveram duas linhas`);
  }
});

await prova('⚠ e doze ao mesmo tempo continuam a escrever UMA', async () => {
  const pedido = { artigo: 'grão-de-bico', requestId: 'amzn1.echo-api.request.doze' };
  const antes = await contar('artigos', casaA);
  const rs = await Promise.all(Array.from({ length: 12 },
    () => chamar('artigo', vozDaRita.token, pedido)));
  for (const r of rs) igual(r.estado, 200, `um dos doze devolveu ${r.estado}`);
  igual(await contar('artigos', casaA), antes + 1,
    `doze pedidos simultâneos escreveram ${await contar('artigos', casaA) - antes} linhas`);
});

await prova('⚠ o mesmo requestId noutra INTENÇÃO é recusado, não confundido', async () => {
  // ⚠ A chave é `(casa, request_id)` e não inclui a intenção. Sem esta recusa,
  // pedir «marca a consulta» com um `requestId` já gasto devolvia 200 com a
  // frase da ordem ANTERIOR e o `id` de uma linha de outra coleção — e o evento
  // nunca existia. Quem está na cozinha ouvia a confirmação de outra coisa.
  const chave = 'amzn1.echo-api.request.trocada';
  const antesEventos = await contar('eventos', casaA);
  const a = await chamar('artigo', vozDaRita.token, { artigo: 'detergente', requestId: chave });
  igual(a.estado, 200, `o artigo devolveu ${a.estado}`);
  const b = await chamar('evento', vozDaRita.token,
    { titulo: 'consulta', dia: '2026-10-07', requestId: chave });
  igual(b.estado, 400, `o evento com a chave gasta devolveu ${b.estado}`);
  igual(await contar('eventos', casaA), antesEventos, 'escreveu um evento que não devia');
});

await prova('⚠ uma chave demasiado longa é recusada, não cortada', async () => {
  // ⚠ Cortá-la aos 200 fazia duas chaves diferentes colapsarem numa: o segundo
  // artigo nunca entrava e a Alexa confirmava o primeiro. Uma escrita
  // descartada em silêncio, com confirmação falada por cima.
  const base = 'Z'.repeat(200);
  const antes = await contar('artigos', casaA);
  const cafe = await chamar('artigo', vozDaRita.token, { artigo: 'café', requestId: base + 'aaa' });
  igual(cafe.estado, 400, `a chave de 203 devolveu ${cafe.estado}`);
  igual(await contar('artigos', casaA), antes, 'escreveu apesar de recusar a chave');
});

await prova('e o mesmo requestId noutra casa não colide', async () => {
  // O índice é `(casa, request_id)`: duas casas podem receber o mesmo pedido.
  const pedido = { artigo: 'arroz agulha', requestId: 'amzn1.echo-api.request.provas-1' };
  const r = await chamar('artigo', vozDaBeatriz.token, pedido);
  igual(r.estado, 200, `devolveu ${r.estado}`);
  igual(r.d.repetido, undefined, 'tomou o pedido da casa A por seu');
});

await prova('⚠ uma escrita falhada NÃO deixa a chave presa', async () => {
  // ⚠ Este é o defeito que a inversão da ordem introduziu, e é o mais feio de
  // todos: reservar antes de escrever torna isto idempotente sob concorrência,
  // mas se a escrita rebentar a reserva fica lá com a `linha` vazia — e todos
  // os reenvios passam a responder 200 com «Estou a tratar disso.», sem nunca
  // escreverem nada. Medido em 27/09/2026 com um dia de `2026-02-31`.
  //
  // Duas defesas, e esta prova exige as duas: a data impossível é recusada à
  // entrada (o `2026-02-31` volta como 3 de Março e não volta igual), e uma
  // escrita que falhe apaga a reserva para o reenvio poder tentar outra vez.
  const chave = 'amzn1.echo-api.request.envenenada';
  const antes = await contar('eventos', casaA);

  const mau = await chamar('evento', vozDaRita.token,
    { titulo: 'consulta', dia: '2026-02-31', requestId: chave });
  igual(mau.estado, 400, `o 31 de Fevereiro devolveu ${mau.estado}`);
  igual(await contar('eventos', casaA), antes, 'escreveu com uma data impossível');

  // E a mesma chave, com um dia que existe, tem de PASSAR — se a reserva
  // tivesse ficado presa, isto devolvia 200 sem escrever nada.
  const bom = await chamar('evento', vozDaRita.token,
    { titulo: 'consulta', dia: '2026-03-02', requestId: chave });
  igual(bom.estado, 200, `a segunda tentativa devolveu ${bom.estado}`);
  igual(await contar('eventos', casaA), antes + 1, 'a chave ficou presa: não escreveu nada');
  if (bom.d.repetido) throw new Error('respondeu como reenvio a um pedido que nunca foi escrito');
});

await prova('⚠ e as outras datas impossíveis também', async () => {
  for (const dia of ['2026-13-01', '2026-00-10', '2026-04-31', '2025-02-29', '2026-11-00']) {
    const r = await chamar('evento', vozDaRita.token, { titulo: 'x', dia });
    igual(r.estado, 400, `«${dia}» devolveu ${r.estado}`);
  }
  // E um dia que existe mesmo num ano bissexto passa.
  const r = await chamar('evento', vozDaRita.token, { titulo: 'bissexto', dia: '2028-02-29' });
  igual(r.estado, 200, `o 29 de Fevereiro de 2028 devolveu ${r.estado}`);
});

console.log('\n── quem NÃO é desta casa ──');

await prova('⚠ uma sessão de outra coleção de autenticação é recusada', async () => {
  // ⚠ O `users` é a coleção por omissão do PocketBase, que este projeto nunca
  // usa — e tem `createRule: ""`, ou seja, inscrição pública. Um estranho
  // registava-se, autenticava-se, e o token passava o `requireAuth()` (que não
  // dizia a coleção) E o travão da criança, porque um registo de `users` não
  // tem campo `papel`. O que o travava era o `if (!casa)`: um acaso do esquema,
  // não uma decisão. Agora as rotas dizem `requireAuth('membros')`.
  const email = `intruso.alexa.${Date.now()}@exemplo.pt`;

  // ⚠ PRIMEIRA tranca: ninguém se inscreve na `users`. Fechada em 27/09/2026,
  // nos dois sítios — a tabela `REGRAS` do `acrescentar-campos.mjs` e o fim do
  // `criar-colecoes.mjs`, para uma base nova não voltar a nascer aberta.
  const deFora = new PocketBase(URL);
  deFora.autoCancellation(false);
  let inscreveu = false;
  try {
    await deFora.collection('users').create({
      email: `publico.${Date.now()}@exemplo.pt`,
      password: 'palavra-longa-9', passwordConfirm: 'palavra-longa-9',
    });
    inscreveu = true;
  } catch (e) { /* é o que se quer */ }
  if (inscreveu) throw new Error('a coleção `users` continua a aceitar inscrição pública');

  // ⚠ SEGUNDA tranca, e é a que interessa provar: mesmo que uma conta exista
  // — criada pelo superutilizador, ou vinda de uma base antiga que nasceu com
  // a `users` aberta —, o token dela não entra nas rotas da casa.
  const estranho = new PocketBase(URL);
  estranho.autoCancellation(false);
  await admin.collection('users').create({
    email, password: 'palavra-longa-9', passwordConfirm: 'palavra-longa-9', verified: true,
  });
  await estranho.collection('users').authWithPassword(email, 'palavra-longa-9');
  const token = estranho.authStore.token;
  const antes = await contar('artigos', casaA);
  for (const rota of ROTAS) {
    const r = await chamar(rota, token, CORPO[rota]);
    // ⚠ 403 e não 401, e a diferença diz a coisa certa: a sessão É válida — o
    // estranho autenticou-se mesmo —, só não é da coleção que esta casa
    // reconhece. Não é «não sei quem és», é «sei quem és e não entras».
    igual(r.estado, 403, `${rota} devolveu ${r.estado} a um token de outra coleção`);
  }
  igual(await contar('artigos', casaA), antes, 'o estranho escreveu');
  // ⚠ A limpeza procura a conta pelo E-MAIL, e não pelo `authStore.record.id`.
  //
  // A primeira versão usava o id do `authStore` e falhava em silêncio: ficou
  // uma conta de intruso na casa a sério, e só se viu ao contar as linhas
  // depois da bateria. Uma prova que deixa resíduo na casa é pior do que uma
  // prova que não corre — e o `casa-de-provas.mjs` não a apanha, porque a
  // `users` não pertence a casa nenhuma e não está na limpeza do prefixo.
  try {
    const conta = await admin.collection('users').getFirstListItem(`email = "${email}"`);
    await admin.collection('users').delete(conta.id);
  } catch (e) {
    throw new Error(`não consegui apagar a conta de intruso ${email}: ${e.message}`);
  }
});

console.log('\n── o que a voz ouve mal ──');

await prova('⚠ quebras de linha e caracteres de controlo não entram no rótulo', async () => {
  // ⚠ Entravam intactos: um rótulo com 32 quebras em 120 caracteres ficava tal
  // e qual, e a linha do Modo Compras desenha o nome INTEIRO, sem
  // `numberOfLines`, por decisão escrita — uma linha de 48 px passava a 33.
  const sujo = 'leite\n\n\nmeio\tgordo\r\n\u0000\u001B[31mvermelho‮odagro';
  const r = await chamar('artigo', vozDaRita.token, { artigo: sujo });
  igual(r.estado, 200, `devolveu ${r.estado}`);
  const linha = await admin.collection('artigos').getOne(r.d.id);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\n\r\t]/.test(linha.rotulo)) {
    throw new Error(`guardou controlos: ${JSON.stringify(linha.rotulo)}`);
  }
  // ⚠ O U+202E inverte o sentido de leitura, e o rótulo vai parar a uma página
  // que se partilha por endereço público.
  if (/[​-‏‪-‮⁦-⁩﻿]/.test(linha.rotulo)) {
    throw new Error(`guardou marcas invisíveis: ${JSON.stringify(linha.rotulo)}`);
  }
  // E o que se disse continua lá, legível, sem espaços em catadupa.
  if (!/^leite meio gordo\b/.test(linha.rotulo)) throw new Error(`ficou «${linha.rotulo}»`);
  if (/ {2}/.test(linha.rotulo)) throw new Error(`ficou com espaços a dobrar: «${linha.rotulo}»`);
});

await prova('⚠ e um rótulo longo corta-se por LETRAS, sem partir um emoji ao meio', async () => {
  // ⚠ O corte era por unidade UTF-16 e partia pares substitutos: «a»×59 mais
  // um emoji ficava com um U+FFFD no fim — e era isso que a Alexa dizia.
  const r = await chamar('artigo', vozDaRita.token, { artigo: 'a'.repeat(59) + '🥛' });
  igual(r.estado, 200, `devolveu ${r.estado}`);
  const linha = await admin.collection('artigos').getOne(r.d.id);
  if (/�/.test(linha.rotulo)) throw new Error('partiu o emoji ao meio (U+FFFD)');
  igual(Array.from(linha.rotulo).length, 60, `ficou com ${Array.from(linha.rotulo).length} letras`);
});

console.log('\n── a coleção dos pedidos está fechada ──');

await prova('⚠ nem um administrador da casa lê os pedidos por voz pela API', async () => {
  // ⚠ As cinco regras estão a `null`, que no PocketBase quer dizer «só
  // superutilizadores» — e `""` quer dizer «toda a gente, sem sessão nenhuma».
  // A diferença entre as duas é uma tecla, e nenhuma prova a vigiava: trocar um
  // pelo outro numa corrida do `db:campos` deixava tudo verde.
  //
  // É o mesmo cuidado que a `credenciais_agenda` já tem, e pela mesma razão.
  for (const [nome, fn] of [
    ['list', () => daRita.collection('alexa_pedidos').getFullList()],
    ['view', () => daRita.collection('alexa_pedidos').getList(1, 1)],
    ['create', () => daRita.collection('alexa_pedidos').create({ casa: casaA.id, membro: rita.id, request_id: 'x' })],
  ]) {
    let passou = false;
    try { await fn(); passou = true; } catch (e) { /* é o que se quer */ }
    if (passou) throw new Error(`um adulto conseguiu ${nome} na alexa_pedidos`);
  }
});

await prova('⚠ e nem por adivinha, um caractere de cada vez', async () => {
  // O canal que o `provar-agenda-google.mjs` já defende: um filtro que responda
  // «encontrei» ou «não encontrei» é uma leitura, letra a letra.
  let passou = false;
  try {
    await daRita.collection('alexa_pedidos').getList(1, 1, { filter: 'request_id ~ "a%"' });
    passou = true;
  } catch (e) { /* é o que se quer */ }
  if (passou) throw new Error('o filtro respondeu — dá para adivinhar o conteúdo');
});

console.log('\n── o que a voz NUNCA faz ──');

// ⚠ Isto era uma lista NEGRA de palavras («despesa|envelope|cofre|saude|…»)
// procurada no JSON da resposta, e era VAZIA por construção: as três rotas
// devolvem literais de forma fixa, e os campos hostis que se injectavam nem
// sequer eram lidos — o `e.bindBody` recebe um `DynamicModel` com os campos
// declarados e mais nenhum. Apagava-se a defesa toda dos hooks e ela continuava
// verde.
//
// E era frágil ao contrário: o rótulo do artigo entra na frase, e a frase entra
// na resposta. Um «acrescentar creme para a alergia» punha esta prova de
// segurança vermelha por causa da lista de compras.
//
// Uma lista BRANCA de chaves diz a mesma coisa e não se engana nos dois
// sentidos: a resposta é exactamente este conjunto de campos, e nada mais sai.
const CHAVES = {
  artigo: ['id', 'rotulo', 'frase'],
  evento: ['id', 'titulo', 'dia', 'hora', 'visibilidade', 'frase'],
  tarefa: ['id', 'titulo', 'frase'],
};

await prova('⚠ cada rota devolve exactamente os campos dela, e mais nenhum', async () => {
  for (const rota of ROTAS) {
    const r = await chamar(rota, vozDaRita.token, CORPO[rota]);
    igual(r.estado, 200, `${rota} devolveu ${r.estado}`);
    const veio = Object.keys(r.d).sort().join(',');
    const esperado = [...CHAVES[rota]].sort().join(',');
    igual(veio, esperado, `${rota} devolveu «${veio}»`);
  }
});

await prova('⚠ e um campo injectado no pedido não entra na linha escrita', async () => {
  // Se o `bindBody` alguma vez passar a aceitar campos livres, é aqui que se vê.
  const r = await chamar('artigo', vozDaRita.token, {
    artigo: 'açúcar', envelope: 'Mercearia', valor: 10, estimativa: 999,
    visibilidade: 'adultos', posto: 5, casa: casaB.id, lista: 'inventada',
  });
  igual(r.estado, 200, `devolveu ${r.estado}`);
  const linha = await admin.collection('artigos').getOne(r.d.id);
  igual(String(linha.casa), casaA.id, 'a casa veio do corpo');
  igual(linha.estimativa, 0, `a estimativa injectada pegou: ${linha.estimativa}`);
  igual(linha.visibilidade, 'familia', `a visibilidade injectada pegou: ${linha.visibilidade}`);
  igual(linha.posto, 0, `o posto injectado pegou: ${linha.posto}`);
});

// ⚠ «Não existe rota de leitura nenhuma» SAIU daqui, e não por deixar de
// importar — por ser impossível de provar deste lado.
//
// Ela pedia GET a `/api/alexa/lista`, `/agenda`, `/tarefas`… à espera de 404.
// Medido: um GET a um caminho registado como POST devolve exactamente o mesmo
// 404 `{"message":"File not found."}` que um caminho que não existe de todo.
// Não há 405. A prova não distinguia «não existe» de «existe e é POST», e um
// `routerAdd('POST', '/api/alexa/lista', …)` que devolvesse a lista inteira
// deixava-a verde. Sondava ainda `tarefas`, quando a rota se chama `tarefa`.
//
// Passou a ser um guarda que ENUMERA as rotas a partir do código:
// `__tests__/a-voz-so-escreve.test.js`. O que se vê de fora não chega.

resumo();
