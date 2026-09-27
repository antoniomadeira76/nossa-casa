/// <reference path="../pb_data/types.d.ts" />
//
// As auxiliares das rotas da Alexa — fase 1 do `docs/alexa.md`.
//
// ⚠ Isto NÃO acaba em `.pb.js`, e é de propósito: o PocketBase só carrega os
// `*.pb.js`, e este ficheiro é para ser `require`d de dentro dos handlers.
//
// Cada handler do JSVM corre num contexto isolado — não vê o âmbito do módulo
// que o registou. Uma função escrita ao lado das rotas dá
// `ReferenceError: ... is not defined` a correr, e não se vê em leitura
// nenhuma do código. Foi a lição do `agenda-google-comum.js`, e é a mesma aqui.

// ── As três verificações, as mesmas do `/api/casa/limpar` ────────────────────
//
// ⚠ Com uma diferença deliberada: o `limpar` exige `admin`, este exige apenas
// que não seja criança. O `docs/alexa.md` descrevia o `limpar` como «não é
// criança» e enganava-se — mas é esta a regra que a voz quer: o token de um
// altifalante representa um adulto da casa, não necessariamente quem administra.
//
// A terceira é a que importa contra o ataque de sempre: a casa vem do MEMBRO
// autenticado e nunca do corpo do pedido.
const quemFala = (e) => {
  const membro = e.auth;
  if (!membro) throw new UnauthorizedError('Entre primeiro.');

  if (membro.get('papel') === 'crianca') {
    throw new ForbiddenError('A voz da casa é dos adultos.');
  }
  const casa = membro.get('casa');
  if (!casa) throw new BadRequestError('Este membro não tem casa.');

  return { membro, casa: String(casa) };
};

// ── O texto que vem pela voz ─────────────────────────────────────────────────
//
// ⚠ Três coisas que a primeira versão deixava passar, todas medidas em
// 27/09/2026 contra o servidor a correr:
//
// 1. **Quebras de linha e caracteres de controlo entravam intactos.** Um rótulo
//    com 32 quebras em 120 caracteres ficava guardado tal e qual — e a linha do
//    Modo Compras desenha o nome INTEIRO, sem `numberOfLines`, por decisão
//    escrita: uma linha de 48 px passava a ter 33. Passavam também NUL, ESC com
//    sequência ANSI, e o U+202E, que inverte o sentido de leitura numa página
//    que se partilha por endereço público.
// 2. **O corte era por unidade UTF-16 e partia pares substitutos.** «a»×119
//    mais um emoji ficava com um U+FFFD no fim — e era isso que a Alexa dizia.
// 3. O corte silencioso não avisava ninguém.
//
// Agora: fora os controlos e os invisíveis, o espaço branco colapsa num só, e o
// corte conta PONTOS DE CÓDIGO (o `Array.from` parte por caractere de verdade).
const texto = (v, quanto) => {
  const cru = (v === null || v === undefined) ? '' : String(v);
  const limpo = cru
    // controlos C0 e C1, e o DEL
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
    // marcas de direcção e largura zero — invisíveis que mudam o que se lê
    .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
    // quebras de linha e tabulações viram espaço, e o espaço colapsa
    .replace(/\s+/g, ' ')
    .trim();
  const n = quanto || 200;
  const letras = Array.from(limpo);
  return letras.length > n ? letras.slice(0, n).join('').trim() : limpo;
};

// ⚠ O `AMAZON.DATE` não dá sempre um dia. Para «esta semana» dá `2026-W37`,
// para «em setembro» dá `2026-09`, e para «este fim-de-semana» dá `2026-W37-WE`.
// Nada disso é uma data, e o campo `eventos.dia` é um `date` do PocketBase.
//
// ⚠ E NÃO se lhe põe o prefixo `d`. O `docs/alexa.md` dizia o contrário e tinha
// a direcção trocada: o `d2026-09-06` é a chave da LOJA LOCAL (o `store.jsx`),
// traduzida num sítio só (`chaveDeISO`/`isoDeChave`, em `src/sync.js`). Escrito
// na coleção, `d2026-09-06` é uma data inválida.
const diaValido = (v) => {
  const d = texto(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
};

// ⚠ O `AMAZON.TIME` também responde coisas que não são horas: `MO` (manhã),
// `AF` (tarde), `EV` (noite), `NI` (madrugada). Sem hora, o evento é de dia
// inteiro — que é melhor do que inventar uma.
const horaValida = (v) => {
  const h = texto(v, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(h) ? h : '';
};

// ⚠ A chave de um pedido NÃO se corta.
//
// A primeira versão passava o `requestId` pelo `texto()`, que corta aos 200 —
// exactamente o `max` do campo. Medido: dois pedidos com chaves diferentes mas
// iguais nos primeiros 200 caracteres colapsavam num só, e o segundo artigo
// («chá») nunca entrava, com a Alexa a dizer que tinha entrado o primeiro
// («café»). Uma escrita descartada em silêncio, com confirmação falada por
// cima — que é a pior combinação possível.
//
// Uma chave ou serve inteira ou não serve. Os `requestId` da Amazon andam pelos
// 70 caracteres; 200 é folga larga, e quem passar disso leva uma recusa em vez
// de uma coincidência.
const chaveDePedido = (v) => {
  const cru = (v === null || v === undefined) ? '' : String(v).trim();
  if (!cru) return '';
  if (Array.from(cru).length > 200) {
    throw new BadRequestError('O identificador do pedido é demasiado longo.');
  }
  return cru;
};

// ── O reenvio ────────────────────────────────────────────────────────────────
//
// A Alexa reenvia o pedido quando a resposta demora, e duas linhas de «leite»
// na lista são um defeito que se vê. O `requestId` dela é a chave.
//
// ⚠ A primeira versão disto era «ler, escrever o artigo, e só depois registar o
// pedido», e NÃO ERA IDEMPOTENTE. Medido em 27/09/2026: dois pedidos iguais em
// voo ao mesmo tempo escreveram dois artigos, cinco vezes em cinco; com doze em
// paralelo, doze. O índice único protegia o registo, não a lista — e a janela
// entre a leitura e a escrita nunca estava fechada. O `docs/alexa.md` afirmava
// «um reenvio colide no índice único em vez de escrever outra vez», e era falso.
//
// ⚠ E a prova passava, porque fazia os dois pedidos EM SEQUÊNCIA. A Alexa
// reenvia precisamente porque o primeiro ainda não respondeu.
//
// Agora a ordem inverte-se: **primeiro reserva-se o pedido**, com o índice
// único a decidir quem chega primeiro, e só quem ganhou escreve. Quem perde lê
// a reserva do outro e responde o mesmo.
const RESERVA = 'alexa_pedidos';

// Devolve `{ reservado: true }` a quem pode escrever, ou `{ reservado: false,
// linha, intencao }` a quem chegou depois.
const reservar = (casa, membroId, requestId, intencao) => {
  if (!requestId) return { reservado: true, semChave: true };

  try {
    const col = $app.findCollectionByNameOrId(RESERVA);
    const r = new Record(col);
    r.set('casa', casa);
    r.set('membro', membroId);
    r.set('request_id', requestId);
    r.set('intencao', intencao);
    // Uma data para a retenção ser exprimível. Sem ela não se consegue escrever
    // «apagar o que tem mais de trinta dias», e a tabela cresce para sempre.
    r.set('criado_em', new Date().toISOString().replace('T', ' ').slice(0, 23) + 'Z');
    $app.save(r);
    return { reservado: true, registo: r };
  } catch (err) {
    // O índice único `(casa, request_id)` recusou: outro pedido com esta chave
    // chegou primeiro — ou já respondeu, ou ainda está a escrever.
    const antes = jaFeito(casa, requestId);
    if (!antes) throw err;    // não foi a chave: é outro erro, e não se engole
    return { reservado: false, registo: antes };
  }
};

const jaFeito = (casa, requestId) => {
  if (!requestId) return null;
  try {
    return $app.findFirstRecordByFilter(RESERVA,
      'casa = {:c} && request_id = {:r}', { c: casa, r: requestId });
  } catch (err) {
    return null;   // não existe — é a primeira vez
  }
};

// Depois de escrever, aponta-se a reserva à linha criada.
const apontar = (registo, linhaId) => {
  if (!registo) return;
  try { registo.set('linha', linhaId); $app.save(registo); } catch (err) { /* o registo é um extra */ }
};

// ⚠ A frase dita NÃO se guarda — refaz-se.
//
// Guardá-la punha títulos de eventos e nomes de artigos numa segunda cópia,
// numa coleção que não é de saúde, fora do `recusaSaude()` e de tudo o que o
// travão da saúde defende. Com a `intencao` e a `linha` relê-se o que foi
// escrito e diz-se outra vez o mesmo, a partir da fonte.
const fraseDe = (intencao, linhaId) => {
  const colecao = { artigo: 'artigos', evento: 'eventos', tarefa: 'tarefas' }[intencao];
  // Sem linha, quem reservou ainda está a escrever — ou desistiu a meio. Dizer
  // «já acrescentei» seria mentir; dizer «não consegui» faria acrescentar duas
  // vezes à mão. Diz-se o que é verdade.
  if (!colecao || !linhaId) return 'Estou a tratar disso.';
  try {
    const r = $app.findRecordById(colecao, linhaId);
    if (intencao === 'artigo') return `Acrescentei ${r.get('rotulo')} à lista.`;
    if (intencao === 'tarefa') return `Acrescentei a tarefa ${r.get('titulo')}. Fica por atribuir.`;
    const dia = String(r.getString('dia') || '').slice(0, 10);
    const hora = r.get('hora');
    const quando = hora ? `${dia} às ${hora}` : dia;
    return `Marquei ${r.get('titulo')} para ${quando}, visível para a família.`;
  } catch (err) {
    // A linha existiu e já não existe: alguém a apagou na app entre o pedido e
    // o reenvio. Isso é uma decisão da casa, e a voz não a desfaz.
    return 'Isso já tinha ficado feito.';
  }
};

// ── A lista de compras ───────────────────────────────────────────────────────
//
// A lista ABERTA é a que não tem `fechada_em`. Pode não haver nenhuma: a casa
// entre duas idas às compras não tem lista, e isso é um estado válido.
//
// Quando não há, esta abre uma. Quem fala é um adulto — que é quem pode abrir
// listas —, e recusar um «acrescenta leite» porque a casa está entre compras
// seria uma resposta que ninguém percebe de pé na cozinha.
function listaAberta(casa) {
  try {
    return $app.findFirstRecordByFilter('listas_compras',
      'casa = {:c} && fechada_em = ""', { c: casa });
  } catch (err) {
    const col = $app.findCollectionByNameOrId('listas_compras');
    const r = new Record(col);
    r.set('casa', casa);
    $app.save(r);
    return r;
  }
}

// A resposta a quem chegou depois.
//
// ⚠ Os valores saem da LINHA GUARDADA, nunca do pedido que acabou de chegar.
//
// A primeira versão ecoava o corpo do segundo pedido como se tivesse sido
// gravado: pedir «marca a consulta» com um `requestId` já usado devolvia 200,
// com `titulo`, `dia` e `visibilidade` do pedido novo — e zero eventos escritos.
// Quem estava na cozinha ouvia uma confirmação de uma coisa que não existia.
//
// ⚠ E a INTENÇÃO tem de bater certo. A chave é `(casa, request_id)` e não
// inclui a intenção: sem esta verificação, um `requestId` reutilizado noutra
// intenção devolvia a frase da ordem anterior e o `id` de uma linha de outra
// coleção.
const jaRespondido = (reserva, intencao, ecos) => {
  const guardado = reserva.registo;
  const qual = guardado ? String(guardado.get('intencao') || '') : '';
  if (qual && qual !== intencao) {
    throw new BadRequestError('Esse pedido já foi usado para outra coisa.');
  }
  const linhaId = guardado ? String(guardado.get('linha') || '') : '';
  const resposta = { id: linhaId, frase: fraseDe(intencao, linhaId), repetido: true };

  // Os mesmos campos da resposta original, lidos da linha — e vazios enquanto
  // quem reservou ainda não escreveu.
  for (const chave of Object.keys(ecos || {})) resposta[chave] = '';
  if (linhaId) {
    try {
      const col = { artigo: 'artigos', evento: 'eventos', tarefa: 'tarefas' }[intencao];
      const r = $app.findRecordById(col, linhaId);
      if (intencao === 'artigo') resposta.rotulo = r.get('rotulo');
      else resposta.titulo = r.get('titulo');
      if (intencao === 'evento') {
        resposta.dia = String(r.getString('dia') || '').slice(0, 10);
        resposta.hora = r.get('hora');
        resposta.visibilidade = r.get('visibilidade');
      }
    } catch (err) { /* a linha foi apagada na app: os ecos ficam vazios */ }
  }
  return resposta;
};

module.exports = {
  quemFala, jaFeito, reservar, apontar, fraseDe, jaRespondido,
  chaveDePedido, texto, diaValido, horaValida, listaAberta,
};
