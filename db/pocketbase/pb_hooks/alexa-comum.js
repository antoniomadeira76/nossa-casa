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
//
// ⚠ E a forma não chega: isto tem de ser uma DATA.
//
// A primeira versão era só a expressão regular, e `2026-02-31` passava. O campo
// `eventos.dia` é um `date` do PocketBase com `required`: uma data impossível
// não se analisa, fica vazia, e o `required` recusa-a — mas só na escrita, já
// depois de a chave do pedido estar reservada. O resultado medido era o pior
// possível: zero eventos escritos, uma reserva órfã, e todos os reenvios
// seguintes respondidos com 200 e «Estou a tratar disso.», para sempre.
//
// Constrói-se a data e confere-se que o ano, o mês e o dia voltam iguais. O 31
// de Fevereiro volta como 3 de Março, e não volta igual.
const diaValido = (v) => {
  const d = texto(v, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [ano, mes, dia] = d.split('-').map(Number);
  const q = new Date(Date.UTC(ano, mes - 1, dia));
  if (q.getUTCFullYear() !== ano || q.getUTCMonth() + 1 !== mes || q.getUTCDate() !== dia) return null;
  return d;
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

// ── Escrever, e desfazer a reserva se a escrita falhar ───────────────────────
//
// ⚠ Sem isto, uma chave fica PRESA PARA SEMPRE.
//
// Reservar antes de escrever é o que torna isto idempotente sob concorrência —
// mas abre um buraco na outra ponta: se a escrita rebentar, a reserva fica lá,
// com a `linha` vazia. A partir daí todos os reenvios da mesma chave caem no
// «já está reservado» e respondem 200 com uma frase tranquilizadora, sem nunca
// escreverem nada. Medido em 27/09/2026 com um `dia` de `2026-02-31`: zero
// eventos, uma reserva órfã, e a Alexa a dizer «estou a tratar disso» sempre.
//
// A inversão da ordem que corrigiu a escrita duplicada transformava uma escrita
// falhada num silêncio permanente. Uma reserva só vale enquanto a escrita valer.
const guardar = (reserva, registo, aviso) => {
  try {
    $app.save(registo);
  } catch (err) {
    // A reserva morre com a escrita: a chave fica livre para o reenvio tentar
    // outra vez, que é o que a Alexa vai fazer.
    if (reserva && reserva.registo) {
      try { $app.delete(reserva.registo); } catch (e2) { /* o melhor que se podia */ }
    }
    $app.logger().error('Alexa: a escrita falhou', 'erro', String(err));
    // ⚠ E a mensagem é em português, não o erro cru do PocketBase: quem a ouve
    // é uma pessoa na cozinha, pela voz de um altifalante.
    throw new BadRequestError(aviso);
  }
  // Aponta-se a reserva à linha criada. ⚠ Se ISTO falhar, a chave fica presa do
  // mesmo modo — por isso a reserva também se desfaz, e um reenvio escreve de
  // novo. Duas linhas iguais vêem-se e apagam-se; um silêncio não.
  if (reserva && reserva.registo) {
    try {
      reserva.registo.set('linha', registo.id);
      $app.save(reserva.registo);
    } catch (err) {
      try { $app.delete(reserva.registo); } catch (e2) { /* idem */ }
    }
  }
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
//
// ⚠ E abre UMA, não cinco.
//
// A primeira versão era «procura; se falhar, cria», e entre as duas não havia
// índice nem transacção. Medido em 27/09/2026: quinze pedidos simultâneos com
// chaves distintas, numa casa sem lista, deixaram **cinco listas abertas**. Os
// artigos espalhavam-se por listas que a app não mostra — o `src/sync.js`
// escolhe UMA (`.find(l => !l.fechada_em)`) — e sumiam sem erro nenhum.
//
// Não há como travar isto no esquema: o `acrescentar-campos.mjs` sabe pôr
// índices em coleções NOVAS, e a `listas_compras` é antiga. Trava-se aqui, e a
// função cura o que encontrar: se a corrida abriu mais do que uma, fica a
// primeira por `id` — ordem estável, igual para todos os pedidos — e as outras
// desaparecem, desde que estejam vazias. Vazias estão: nasceram há
// milissegundos, na mesma corrida.
function listaAberta(casa) {
  const abertas = () => {
    try {
      return $app.findRecordsByFilter('listas_compras',
        'casa = {:c} && fechada_em = ""', 'id', 0, 0, { c: casa });
    } catch (err) {
      return [];
    }
  };

  let lista = abertas();
  if (!lista.length) {
    const col = $app.findCollectionByNameOrId('listas_compras');
    const r = new Record(col);
    r.set('casa', casa);
    $app.save(r);
    lista = abertas();
    if (!lista.length) return r;     // não se releu: fica a que se acabou de criar
  }

  for (let i = 1; i < lista.length; i++) {
    const extra = lista[i];
    try {
      // ⚠ Só se apaga uma lista VAZIA e sem nada escolhido. Uma lista com um
      // artigo, uma loja ou um dia marcado é trabalho de alguém.
      const artigos = $app.findRecordsByFilter('artigos', 'lista = {:l}', '', 1, 0, { l: extra.id });
      const tocada = artigos.length || extra.get('loja') || extra.get('comprador')
        || extra.getString('planeada_para') || extra.get('total');
      if (!tocada) $app.delete(extra);
    } catch (err) { /* fica: mais vale uma lista a mais do que apagar trabalho */ }
  }

  return lista[0];
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
  quemFala, jaFeito, reservar, guardar, fraseDe, jaRespondido,
  chaveDePedido, texto, diaValido, horaValida, listaAberta,
};
