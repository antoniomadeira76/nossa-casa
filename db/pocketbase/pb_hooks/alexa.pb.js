/// <reference path="../pb_data/types.d.ts" />
//
// As rotas da skill da Alexa — fase 1 do `docs/alexa.md`.
//
// Três escritas, e nada mais:
//
//   POST /api/alexa/artigo   { artigo, requestId }              → acrescenta à lista
//   POST /api/alexa/evento   { titulo, dia, hora?, requestId }  → marca na agenda
//   POST /api/alexa/tarefa   { titulo, requestId }              → acrescenta tarefa
//
// ⚠ Não há rota de LEITURA, e é a decisão central desta fase.
//
// A Alexa não sabe quem está a falar: um altifalante na cozinha ouve os quatro
// e a Amazon entrega sempre a identidade do dispositivo. Por voz só entra o que
// já é público dentro de casa, e só na direcção de escrever — uma ordem mal
// ouvida acrescenta uma linha que se apaga na app; uma leitura mal dirigida não
// se desfaz. Nada de dinheiro, nada de saúde, nada de confirmar tarefas de
// crianças, e nenhum evento que não seja de família.
//
// O guarda que impede uma rota nova de aparecer aqui é
// `__tests__/a-voz-so-escreve.test.js`, que ENUMERA os `routerAdd` deste
// ficheiro. Não se prova de fora: um GET a uma rota POST devolve o mesmo 404
// que um caminho que não existe.
//
// ⚠ Um hook escreve com $app.save, que NÃO passa pelas regras da coleção. As
// regras continuam a valer para a app; aqui dentro a defesa é o `quemFala()`,
// e é por isso que ele é a primeira coisa de cada rota.
//
// ⚠ E o `require` é a PRIMEIRA linha de cada handler. Cada handler corre num
// contexto isolado e não vê o âmbito deste ficheiro: uma auxiliar escrita aqui
// fora dá `ReferenceError` a correr, que não se vê em leitura nenhuma. Fora dos
// handlers só há comentários e os `routerAdd`.
//
// ── A ordem das operações, que é o que torna isto idempotente ────────────────
//
// RESERVAR primeiro, escrever depois. A primeira versão fazia ao contrário —
// lia, escrevia, e só depois registava — e não era idempotente de todo: dois
// pedidos iguais em voo ao mesmo tempo escreviam os dois, medido cinco vezes em
// cinco. O índice único protegia o registo, não a lista.

// ── Acrescentar um artigo à lista de compras ─────────────────────────────────
//
//   «Alexa, diz à Nossa Casa para acrescentar leite meio-gordo.»
routerAdd('POST', '/api/alexa/artigo', (e) => {
  const A = require(`${__hooks}/alexa-comum.js`);
  const { membro, casa } = A.quemFala(e);

  const corpo = new DynamicModel({ artigo: '', requestId: '' });
  e.bindBody(corpo);

  const rotulo = A.texto(corpo.artigo, 60);
  if (!rotulo) throw new BadRequestError('Não percebi o que acrescentar.');

  const requestId = A.chaveDePedido(corpo.requestId);
  const reserva = A.reservar(casa, membro.id, requestId, 'artigo');
  if (!reserva.reservado) return e.json(200, A.jaRespondido(reserva, 'artigo', { rotulo }));

  const lista = A.listaAberta(casa);

  const col = $app.findCollectionByNameOrId('artigos');
  const r = new Record(col);
  r.set('casa', casa);
  r.set('lista', lista.id);
  r.set('rotulo', rotulo);
  r.set('pedido_por', membro.id);
  r.set('estado', 'por_comprar');
  // ⚠ A visibilidade diz-se, não se deixa em branco: um artigo sem ela lê-se
  // como `familia`, mas escrevê-la é o que garante que não muda de sentido se
  // o valor por omissão mudar um dia.
  r.set('visibilidade', 'familia');
  // ⚠ E NÃO se escreve `posto`. Os postos contam de 1 e zero quer dizer «nunca
  // arrastado» — que é o que um artigo novo é. Pôr `posto: 0` a fingir primeiro
  // lugar empatava a lista toda.
  A.guardar(reserva, r, 'Não consegui acrescentar isso à lista.');

  return e.json(200, { id: r.id, rotulo, frase: `Acrescentei ${rotulo} à lista.` });
}, $apis.requireAuth('membros'));

// ── Marcar um evento na agenda ───────────────────────────────────────────────
//
//   «Alexa, diz à Nossa Casa para marcar almoço com a avó amanhã às treze horas.»
routerAdd('POST', '/api/alexa/evento', (e) => {
  const A = require(`${__hooks}/alexa-comum.js`);
  const { membro, casa } = A.quemFala(e);

  const corpo = new DynamicModel({ titulo: '', dia: '', hora: '', requestId: '' });
  e.bindBody(corpo);

  const titulo = A.texto(corpo.titulo, 60);
  if (!titulo) throw new BadRequestError('Não percebi o que marcar.');

  const dia = A.diaValido(corpo.dia);
  if (!dia) throw new BadRequestError('Não percebi o dia. Diga uma data, como «amanhã» ou «dia doze».');

  const hora = A.horaValida(corpo.hora);

  const requestId = A.chaveDePedido(corpo.requestId);
  const reserva = A.reservar(casa, membro.id, requestId, 'evento');
  if (!reserva.reservado) {
    return e.json(200, A.jaRespondido(reserva, 'evento', { titulo, dia, hora, visibilidade: 'familia' }));
  }

  const col = $app.findCollectionByNameOrId('eventos');
  const r = new Record(col);
  r.set('casa', casa);
  r.set('dia', dia);
  r.set('hora', hora);
  r.set('titulo', titulo);
  // ⚠ O autor é quem fala, e não é negociável: a regra da coleção exige
  // `autor = @request.auth.id`. Aqui dentro as regras não correm, mas escrever
  // outra coisa faria um evento que a app não sabe alterar nem apagar.
  r.set('autor', membro.id);
  // ⚠ `familia`, escrito à mão e sempre.
  //
  // Um evento sem visibilidade NÃO é de família: a regra de leitura não casa
  // com nenhum ramo e ele fica visível só ao autor. E o `sync.js` põe `so-eu`
  // quando falta. Por voz, só se marcam eventos que toda a casa vê — quem
  // pedir um privado a um altifalante está a pedir uma contradição.
  r.set('visibilidade', 'familia');
  A.guardar(reserva, r, 'Não consegui marcar isso na agenda.');

  const quando = hora ? `${dia} às ${hora}` : dia;
  // A visibilidade DIZ-SE, para ninguém supor que ficou privado.
  return e.json(200, {
    id: r.id, titulo, dia, hora, visibilidade: 'familia',
    frase: `Marquei ${titulo} para ${quando}, visível para a família.`,
  });
}, $apis.requireAuth('membros'));

// ── Acrescentar uma tarefa ───────────────────────────────────────────────────
//
//   «Alexa, diz à Nossa Casa para acrescentar a tarefa regar as plantas.»
routerAdd('POST', '/api/alexa/tarefa', (e) => {
  const A = require(`${__hooks}/alexa-comum.js`);
  const { membro, casa } = A.quemFala(e);

  const corpo = new DynamicModel({ titulo: '', requestId: '' });
  e.bindBody(corpo);

  const titulo = A.texto(corpo.titulo, 60);
  if (!titulo) throw new BadRequestError('Não percebi a tarefa.');

  const requestId = A.chaveDePedido(corpo.requestId);
  const reserva = A.reservar(casa, membro.id, requestId, 'tarefa');
  if (!reserva.reservado) return e.json(200, A.jaRespondido(reserva, 'tarefa', { titulo }));

  const col = $app.findCollectionByNameOrId('tarefas');
  const r = new Record(col);
  r.set('casa', casa);
  r.set('titulo', titulo);
  // ⚠ Sem responsável e sem pontos, e é a decisão, não uma omissão.
  //
  // Pontos são dinheiro — a semanada sai deles. Atribuir por voz numa casa onde
  // a Alexa não distingue o Léo da Rita seria dar pontos a quem falasse mais
  // alto. Atribui-se e pontua-se na app, onde se vê quem é quem.
  A.guardar(reserva, r, 'Não consegui acrescentar essa tarefa.');

  return e.json(200, {
    id: r.id, titulo, frase: `Acrescentei a tarefa ${titulo}. Fica por atribuir.`,
  });
}, $apis.requireAuth('membros'));
