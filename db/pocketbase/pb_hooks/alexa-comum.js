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

// ── O reenvio ────────────────────────────────────────────────────────────────
//
// A Alexa reenvia o pedido quando a resposta demora, e duas linhas de «leite»
// na lista são um defeito que se vê. O `requestId` dela é a chave.
//
// ⚠ Um reenvio devolve a MESMA frase que a Alexa já disse em voz alta. Se
// devolvesse um erro, quem está na cozinha ouvia «não consegui» depois de já
// ter ouvido «acrescentei» — e ia acrescentar outra vez à mão.
const jaFeito = (casa, requestId) => {
  if (!requestId) return null;
  try {
    return $app.findFirstRecordByFilter('alexa_pedidos',
      'casa = {:c} && request_id = {:r}', { c: casa, r: requestId });
  } catch (err) {
    return null;   // não existe — é a primeira vez
  }
};

const registar = (casa, membroId, requestId, intencao, linhaId, resposta) => {
  if (!requestId) return;
  try {
    const col = $app.findCollectionByNameOrId('alexa_pedidos');
    const r = new Record(col);
    r.set('casa', casa);
    r.set('membro', membroId);
    r.set('request_id', requestId);
    r.set('intencao', intencao);
    r.set('linha', linhaId);
    r.set('resposta', resposta);
    $app.save(r);
  } catch (err) {
    // O índice único recusou: dois pedidos iguais chegaram ao mesmo tempo. A
    // linha já foi escrita por quem chegou primeiro, e perder o registo do
    // segundo é melhor do que rebentar uma resposta que já está certa.
    $app.logger().info('Alexa: pedido repetido', 'casa', casa, 'requestId', requestId);
  }
};

// ── O corpo do pedido ────────────────────────────────────────────────────────
const texto = (v, quanto) => String(v || '').trim().slice(0, quanto || 200);

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

// ── A lista de compras ───────────────────────────────────────────────────────
//
// A lista ABERTA é a que não tem `fechada_em`. Pode não haver nenhuma: a casa
// entre duas idas às compras não tem lista, e isso é um estado válido.
//
// Quando não há, esta abre uma. Quem fala é um adulto — que é quem pode abrir
// listas —, e recusar um «acrescenta leite» porque a casa está entre compras
// seria uma resposta que ninguém percebe de pé na cozinha.
const listaAberta = (casa) => {
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
};

module.exports = { quemFala, jaFeito, registar, texto, diaValido, horaValida, listaAberta };
