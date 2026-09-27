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

await prova('⚠ uma criança é recusada nas três rotas, e nada é escrito', async () => {
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

await prova('um adulto que não administra a casa pode falar', async () => {
  // ⚠ Isto é de propósito, e diverge do `/api/casa/limpar`, que exige `admin`.
  // O token de um altifalante representa um adulto da casa; obrigar a ser
  // administrador queria dizer que o Tomás não podia pôr leite na lista.
  const r = await chamar('artigo', doTomas.authStore.token, { artigo: 'pão de forma' });
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
    const r = await chamar(rota, daBeatriz.authStore.token, { ...CORPO[rota], casa: casaA.id });
    igual(r.estado, 200, `${rota} devolveu ${r.estado} — a Beatriz devia poder escrever na SUA casa`);
  }
  igual(await contar('artigos', casaA), antesA.artigos, 'a casa A ganhou um artigo da casa B');
  igual(await contar('eventos', casaA), antesA.eventos, 'a casa A ganhou um evento da casa B');
  igual(await contar('tarefas', casaA), antesA.tarefas, 'a casa A ganhou uma tarefa da casa B');
  if (await contar('artigos', casaB) === 0) throw new Error('a casa B não recebeu nada');
});

console.log('\n── o que a voz escreve ──');

await prova('⚠ um evento por voz sai SEMPRE visível para a família', async () => {
  const r = await chamar('evento', daRita.authStore.token,
    { titulo: 'jantar de família', dia: '2026-09-29', visibilidade: 'so-eu' });
  igual(r.estado, 200, `devolveu ${r.estado}`);
  // ⚠ Mesmo pedindo `so-eu` no corpo: a rota não lê visibilidade nenhuma do
  // pedido. Um evento privado ditado em voz alta já não é privado.
  const linha = await admin.collection('eventos').getOne(r.d.id);
  igual(linha.visibilidade, 'familia', 'a visibilidade não é de família');
  igual(linha.autor, rita.id, 'o autor não é quem falou');
});

await prova('⚠ e a resposta DIZ a visibilidade, para ninguém supor que é privada', async () => {
  const r = await chamar('evento', daRita.authStore.token,
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
  const r = await chamar('evento', daRita.authStore.token,
    { titulo: 'passeio', dia: 'd2026-10-01' });
  igual(r.estado, 400, `devolveu ${r.estado} — aceitou uma data inválida`);
});

await prova('⚠ e uma data vaga do AMAZON.DATE também', async () => {
  // «esta semana» dá `2026-W40`, «em outubro» dá `2026-10`. Nada disso é um dia.
  for (const dia of ['2026-W40', '2026-10', '2026-W40-WE', 'amanhã']) {
    const r = await chamar('evento', daRita.authStore.token, { titulo: 'passeio', dia });
    igual(r.estado, 400, `«${dia}» devolveu ${r.estado}`);
  }
});

await prova('uma hora vaga do AMAZON.TIME dá um evento de dia inteiro', async () => {
  // `MO`, `AF`, `EV`, `NI` — manhã, tarde, noite, madrugada. Melhor sem hora do
  // que com uma hora inventada.
  const r = await chamar('evento', daRita.authStore.token,
    { titulo: 'arrumar a garagem', dia: '2026-10-02', hora: 'AF' });
  igual(r.estado, 200, `devolveu ${r.estado}`);
  const linha = await admin.collection('eventos').getOne(r.d.id);
  igual(linha.hora, '', `guardou a hora «${linha.hora}»`);
});

await prova('uma tarefa por voz não leva pontos nem responsável', async () => {
  const r = await chamar('tarefa', daRita.authStore.token, { titulo: 'marcar a revisão' });
  igual(r.estado, 200, `devolveu ${r.estado}`);
  const linha = await admin.collection('tarefas').getOne(r.d.id);
  igual(linha.pontos, 0, 'a tarefa nasceu com pontos');
  igual(String(linha.atribuido_a || ''), '', 'a tarefa nasceu atribuída');
});

await prova('um artigo por voz entra na lista aberta, sem posto', async () => {
  const r = await chamar('artigo', daRita.authStore.token, { artigo: 'ovos' });
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

await prova('⚠ o mesmo requestId duas vezes escreve UMA linha', async () => {
  // A Alexa reenvia quando a resposta demora, e duas linhas de «leite» na lista
  // são um defeito que se vê.
  const pedido = { artigo: 'arroz agulha', requestId: 'amzn1.echo-api.request.provas-1' };
  const antes = await contar('artigos', casaA);
  const um = await chamar('artigo', daRita.authStore.token, pedido);
  const dois = await chamar('artigo', daRita.authStore.token, pedido);
  igual(um.estado, 200, `o primeiro devolveu ${um.estado}`);
  igual(dois.estado, 200, `o reenvio devolveu ${dois.estado}`);
  igual(await contar('artigos', casaA), antes + 1, 'o reenvio escreveu outra linha');
  igual(dois.d.id, um.d.id, 'o reenvio devolveu outra linha');
  // ⚠ E devolve a MESMA frase que a Alexa já disse em voz alta. Um erro fazia
  // quem está na cozinha ouvir «não consegui» depois de ouvir «acrescentei».
  igual(dois.d.frase, um.d.frase, 'o reenvio disse outra coisa');
  igual(dois.d.repetido, true, 'o reenvio não se declarou repetido');
});

await prova('e o mesmo requestId noutra casa não colide', async () => {
  // O índice é `(casa, request_id)`: duas casas podem receber o mesmo pedido.
  const pedido = { artigo: 'arroz agulha', requestId: 'amzn1.echo-api.request.provas-1' };
  const r = await chamar('artigo', daBeatriz.authStore.token, pedido);
  igual(r.estado, 200, `devolveu ${r.estado}`);
  igual(r.d.repetido, undefined, 'tomou o pedido da casa A por seu');
});

console.log('\n── o que a voz NUNCA faz ──');

await prova('⚠ nenhuma rota devolve dinheiro nem saúde, por mais que se peça', async () => {
  const proibido = /despesa|envelope|cofre|saldo|acerto|orcament|orçament|saude|saúde|episodio|receita|alergia|medicac/i;
  for (const rota of ROTAS) {
    const r = await chamar(rota, daRita.authStore.token,
      { ...CORPO[rota], envelope: 'Mercearia', valor: 10, saude: true });
    const texto = JSON.stringify(r.d);
    if (proibido.test(texto)) throw new Error(`${rota} devolveu algo proibido: ${texto.slice(0, 200)}`);
  }
});

await prova('⚠ e não existe rota de leitura nenhuma', async () => {
  // Uma leitura por altifalante não sabe filtrar por quem ouve. Se alguém
  // acrescentar uma, esta prova fica vermelha e obriga a decidir outra vez.
  for (const rota of ['lista', 'agenda', 'tarefas', 'compras', 'ler', 'dinheiro', 'saude']) {
    const r = await fetch(`${URL.replace(/\/+$/, '')}/api/alexa/${rota}`, {
      method: 'GET', headers: { Authorization: daRita.authStore.token },
    });
    igual(r.status, 404, `/api/alexa/${rota} respondeu ${r.status}`);
  }
});

resumo();
