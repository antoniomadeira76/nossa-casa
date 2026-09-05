// Ligação entre a loja local e o servidor.
//
// A loja continua a ser a fonte de verdade do que o ecrã mostra: a app tem de
// funcionar sem rede, e funcionava assim antes de existir servidor. O que isto
// acrescenta é o que faltava para dois telemóveis servirem a mesma casa.
//
// ── Porque é que só o dinheiro vai por aqui, para já ─────────────────────────
//
// O INVARIANTE #2 diz que saldos são somas de movimentos, nunca campos
// escritos. Localmente isso já é verdade. Entre dois telemóveis passa a ser o
// que separa uma app que funciona a dois de uma que perde dinheiro: se a Rita
// e o Tomás creditarem 5 € cada um e cada telemóvel gravar «saldo = 5», o
// resultado é 5. Se cada um gravar «+5», é 10.
//
// Por isso as operações de dinheiro vão para o servidor como INSERÇÕES com
// chave de idempotência — nunca como substituições — e o saldo lê-se das
// vistas, que não têm caminho de escrita. As tarefas, as compras e a agenda
// continuam locais por enquanto: são remendos sobre sementes (`taskEdits`,
// `taskGone`) e não linhas, e traduzi-los é outro trabalho. Dizer que estão
// ligados quando não estão seria pior do que a lacuna.
//
// ── A saúde vai, e só para casa ──────────────────────────────────────────────
//
// `episodios_saude` e `anexos` existem no servidor e têm 16 provas. O travão
// era um «não» inteiro, atrás de cinco pontos de conformidade — são dados
// clínicos de menores, categoria especial no RGPD.
//
// Passou a ser uma CONDIÇÃO, em 03/09/2026: sobe se o servidor viver na casa, e
// não sobe se ele estiver na internet. A regra é o `eEnderecoDeCasa`, em
// `src/endereco.js`, e o travão é o `recusaSaude` no fim deste ficheiro.
//
// «Sobe tudo», por decisão do dono da casa no mesmo dia: as consultas E os
// anexos, com a fotografia. O que fica de fora são as notas, as receitas e as
// decisões, e não por escolha — não têm coleção no servidor.
//
// ⚠ Os dois sobem por caminhos DIFERENTES, e é uma restrição técnica: a
// consulta vai pela fila e o anexo não pode, porque a fila serializa em JSON e
// um ficheiro não é JSON. Ver `anexoDeSaude` e `criarComFicheiro`.

// Sem extensão, que é como o Metro resolve.
//
// ⚠ Cheguei a pôr `.js` aqui para o Node ESM conseguir importar este ficheiro
// numa prova de aceitação. Está escrito em `provar-gerir-casa-pela-app.mjs`
// porque é que não se faz: «mudar a app para agradar à prova é ao contrário. A
// prova é que se adapta.» As provas resolvem-no com um `registerHooks`.
import * as servidor from './pocketbase';
import { eEnderecoDeCasa, PORQUE_NAO_SOBE } from './endereco';
// ⚠ O `format` é seguro de importar aqui: não importa `react-native`, e por
// isso as provas em Node conseguem carregar este ficheiro. Uma importação que
// arraste o RN parte todas elas — já aconteceu com o `Platform`.
import { chaveDeDMY, dmyDeChave } from './format';

export { eEnderecoDeCasa, PORQUE_NAO_SOBE };

// O que NUNCA sobe, aconteça o que acontecer.
//
// ⚠ Duas saíram desta lista em 03/09/2026, e por razões diferentes:
//
//   `health`      os episódios sobem quando o servidor vive na casa. A
//                 condição é o `eEnderecoDeCasa`, e o travão o `recusaSaude`.
//   `healthDocs`  os anexos passaram a subir com a FOTOGRAFIA, por decisão do
//                 dono da casa — «sobe tudo». Vão para `anexos`, com o
//                 ficheiro, pelo mesmo travão.
//
// E mais três saíram em 04/09/2026, pela razão que aqui estava escrita: não
// tinham coleção no servidor. «Não é que não subam — é que não há para onde.»
// Agora há: `notas_saude`, `receitas_saude` e `decisoes_saude`, com 24 provas
// em `provar-notas-saude.mjs` e a MESMA condição de visibilidade dos anexos.
//
// O que fica é o `healthGone` — uma lista de ids apagados localmente, que é
// estado de dispositivo e não dado da casa.
export const NUNCA_SINCRONIZA = ['healthGone'];

export const ligado = () => servidor.estaLigado();

// Quem está ligado, do lado do servidor. Devolve null quando a app corre
// local — e é isso que faz cada função abaixo não fazer nada em vez de
// rebentar.
export const sessao = () => {
  if (!ligado() || !servidor.auth.valida()) return null;
  const m = servidor.auth.membro();
  return m ? { membro: m.id, casa: m.casa, nome: m.nome } : null;
};

// ─── Ler ─────────────────────────────────────────────────────────────────────
//
// Traz a casa e devolve-a já na forma que a loja usa. Não filtra nada por
// visibilidade: quem decide o que existe para quem pergunta são as regras das
// coleções. Se este código filtrasse, o dado já teria chegado ao dispositivo.
// Os membros do servidor, na forma que a app usa. O servidor guarda `papel` e
// `fem`; a app pensa em `kid` e usa a inicial para o avatar.
//
// A inicial deriva do nome em vez de ser um campo: um campo separado é uma
// segunda verdade sobre a mesma coisa, e mais cedo ou mais tarde discordam.
export const membrosDoServidor = (linhas) => Object.fromEntries(
  (linhas || []).map(m => [m.nome, {
    id: m.id,
    initial: String(m.nome || '?').trim().charAt(0).toUpperCase(),
    email: m.email || null,
    kid: m.papel === 'crianca',
    papel: m.papel,
    fem: !!m.fem,
    cor: m.cor || null,
    // A fotografia da conta Google, se houver. É uma URL, não um ficheiro: a
    // imagem vive na Google, e copiá-la para o servidor da casa seria guardar
    // um dado pessoal que não é preciso guardar.
    avatar: m.avatar || null,
    figura: m.figura || null,
  }]));

// ── Duas traduções de data, e são as duas o mesmo defeito à espera ──────────
//
// O servidor devolve datas ISO («2026-09-20 10:00:00.000Z»); a loja usa chaves
// («d2026-09-20»). Uma tradução em cada sentido, num sítio só, para não haver
// dois `slice(0, 10)` a divergir.
const chaveDeISO = (iso) => {
  const d = String(iso || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? `d${d}` : null;
};
const isoDeChave = (chave) => String(chave || '').replace(/^d/, '') || null;

// A recorrência: a loja fala português corrido, o servidor tem um `select`.
//
// ⚠ Se esta tabela ficar incompleta, o PocketBase recusa o valor — ao contrário
// dos campos desconhecidos, que ele ignora em silêncio. Uma recusa é melhor
// notícia, mas continua a ser uma tarefa que não sobe.
const RECORRENCIA_NO_SERVIDOR = {
  'Uma vez': 'uma_vez', 'Todos os dias': 'diaria', 'Dias de semana': 'dias_semana',
};
const RECORRENCIA_NA_LOJA = Object.fromEntries(
  Object.entries(RECORRENCIA_NO_SERVIDOR).map(([a, b]) => [b, a]));

// As três listas da casa, e a coleção de cada uma. A chave é a da LOJA.
export const LISTA_NO_SERVIDOR = {
  specialities: 'especialidades',
  equipCats: 'categorias_equip',
  stores: 'lojas',
};

export async function puxarCasa() {
  if (!ligado()) return null;
  const casa = await servidor.ler.casa();

  // Movimentos de cofre: a coleção é aditiva, e a loja também. Um para um.
  const nomeDoMembro = Object.fromEntries((casa.membros || []).map(m => [m.id, m.nome]));
  const vaultMoves = (casa.cofre_movimentos || []).map(m => ({
    id: m.id,
    kid: nomeDoMembro[m.membro] || m.membro,
    delta: Number(m.valor) || 0,
    kind: m.tipo,
    label: m.motivo || m.tipo,
    sub: nomeDoMembro[m.autorizado_por] ? `autorizado por ${nomeDoMembro[m.autorizado_por]}` : '',
    // O servidor devolve ISO; a loja usa a chave `d2026-08-20`.
    day: (m.data || m.created || '').slice(0, 10)
      .replace(/^(\d{4})-(\d{2})-(\d{2})$/, 'd$1-$2-$3'),
  }));

  // ── O mês aberto ──────────────────────────────────────────────────────────
  //
  // ⚠ É ele que define o INTERVALO por onde tudo o resto se filtra. Sem isto os
  // totais eram somas de SEMPRE, e fechar o mês escrevia zero por cima delas —
  // o que funcionava enquanto eram campos locais e deixou de funcionar quando
  // passaram a ser linhas no servidor: as linhas ficavam, e a leitura seguinte
  // trazia o total todo de volta. O mês fechado reabria sozinho.
  //
  // Sem nenhum mês aberto, o intervalo é «tudo» — é o que uma casa acabada de
  // ligar tem, e é melhor mostrar o que há do que esconder tudo.
  const mesAberto = (casa.meses || []).find(m => !m.fechado_em) || null;
  const inicioDoMes = mesAberto ? String(mesAberto.mes).slice(0, 10) : null;
  const noMes = (data) => {
    if (!inicioDoMes) return true;
    const d = String(data || '').slice(0, 10);
    return d >= inicioDoMes;
  };

  // O que foi gasto NESTE mês: a soma das despesas não anuladas cuja data cai
  // depois de o mês ter aberto. A vista do servidor também soma; isto é para o
  // ecrã ter o número sem uma segunda ida.
  const registered = (casa.despesas || [])
    .filter(d => !d.anula_id && noMes(d.data || d.created))
    .reduce((n, d) => n + (Number(d.valor) || 0), 0);

  const aCasa = (casa.casas || [])[0] || null;

  // ── A agenda ──────────────────────────────────────────────────────────────
  //
  // ⚠ NÃO se filtra nada aqui por visibilidade. Quem decide que eventos
  // existem para quem pergunta são as regras da coleção — três níveis, com 11
  // provas em provar-agenda-e-tarefas.mjs. Se este código filtrasse, o dado
  // privado já teria chegado ao dispositivo, que é o INVARIANTE #3 ao
  // contrário.
  const added = (casa.eventos || []).map(e => ({
    // O id É o do servidor. As sobreposições da loja (`eventEdits`,
    // `eventGone`) são mapas indexados por id, e usar o mesmo id nos dois
    // lados é o que as faz continuar a funcionar sem mudar um ecrã.
    id: e.id,
    idServidor: e.id,
    day: chaveDeISO(e.dia),
    time: e.hora || '',
    title: e.titulo,
    who: nomeDoMembro[e.responsavel] || '',
    owner: nomeDoMembro[e.autor] || '',
    visibilidade: e.visibilidade || 'so-eu',
    tag: e.etiqueta || '',
    // A consulta a que pertence, quando é de saúde.
    ...(e.episodio ? { healthId: e.episodio } : {}),
  })).filter(e => e.day);

  // ── As tarefas ────────────────────────────────────────────────────────────
  //
  // A tarefa vem numa linha, mas a app lê a urgência e o prazo de MAPAS
  // (`s.urg[id]`, `s.due[id]`). Enche-se os dois, com o id do servidor por
  // chave: os ecrãs não mudam nada e a ordenação continua a funcionar.
  const newTasks = (casa.tarefas || []).map(t => ({
    id: t.id,
    idServidor: t.id,
    title: t.titulo,
    who: nomeDoMembro[t.atribuido_a] || '',
    recur: RECORRENCIA_NA_LOJA[t.recorrencia] || 'Uma vez',
    pts: Number(t.pontos) || 0,
  }));

  const urg = {};
  const due = {};
  for (const t of casa.tarefas || []) {
    // 1 é «normal», que é o que a loja usa por omissão.
    urg[t.id] = Number.isFinite(Number(t.urgencia)) ? Number(t.urgencia) : 1;
    const chave = chaveDeISO(t.prazo);
    if (chave) due[t.id] = { key: chave, time: String(t.prazo).slice(11, 16) || '18:00' };
  }

  // ── E o que está feito HOJE ───────────────────────────────────────────────
  //
  // ⚠ `tarefas_feitas` é ADITIVA — uma linha por (tarefa, dia), com índice
  // único no servidor. É o INVARIANTE #2 em estrutura: dois telefones que
  // marquem a mesma tarefa no mesmo dia colidem no índice em vez de se
  // anularem.
  //
  // A loja tem `done[id]`, que é «feita hoje» — o `recurringReset` limpa-o à
  // meia-noite. Portanto só as linhas de hoje entram.
  const hoje = new Date().toISOString().slice(0, 10);
  const done = {};
  const feitas = {};
  for (const f of casa.tarefas_feitas || []) {
    const dia = String(f.data || '').slice(0, 10);
    // Guarda-se o id da LINHA para se poder desmarcar: sem ele, desmarcar no
    // servidor não tinha o que apagar.
    feitas[`${f.tarefa}|${dia}`] = { id: f.id, confirmada: !!f.confirmada_em };
    if (dia === hoje) done[f.tarefa] = true;
  }

  // ── As regras da casa ─────────────────────────────────────────────────────
  //
  // Viviam só no telefone de quem as mudou: a Rita desligava os pontos e o
  // Tomás continuava a vê-los; ela mudava o valor do ponto e os dois telefones
  // pagavam semanadas diferentes.
  //
  // ⚠ `?? ` e não `||`. O `divide_meias` a false e o `valor_ponto` a 0 são
  // valores VÁLIDOS — com `||` os dois viravam o valor por omissão, e desligar
  // a divisão a meias no servidor não pegava no cliente. É o mesmo cuidado que
  // o `pontos_ligados` precisa, e por isso ele também está aqui.
  const regras = aCasa ? {
    rendimento: Number(aCasa.rendimento_mensal) || 0,
    pointValue: Number(aCasa.valor_ponto ?? 0.1),
    payDay: Number(aCasa.dia_pagamento ?? 0),
    splitHalf: aCasa.divide_meias !== false,
    // Ausente lê-se como ligado: é o que a app fazia antes de o campo existir,
    // e um `!!` desligava os pontos a quem já os usava, em silêncio.
    pontosLigados: aCasa.pontos_ligados !== false,
  } : null;

  // ── As três listas da casa ────────────────────────────────────────────────
  //
  // Especialidades médicas, categorias de equipamento e lojas. Têm todas a
  // mesma forma no servidor — `casa` e `nome` — e por isso uma tradução só.
  //
  // ⚠ A loja guarda-as como listas de TEXTO, e é isso que todos os ecrãs leem.
  // Mudar isso para objetos com id obrigava a mexer em oito ecrãs por uma razão
  // que não é deles. Em vez disso guarda-se um mapa `nome → id` à parte, que é
  // o que permite renomear e apagar do lado do servidor.
  const listas = {};
  const listasIds = {};
  for (const [naLoja, colecao] of Object.entries(LISTA_NO_SERVIDOR)) {
    const linhas = casa[colecao] || [];
    if (!linhas.length) continue;
    listas[naLoja] = linhas.map(l => l.nome);
    listasIds[naLoja] = Object.fromEntries(linhas.map(l => [l.nome, l.id]));
  }

  // ── O orçamento ───────────────────────────────────────────────────────────
  //
  // Os envelopes eram SEMENTES NO CÓDIGO (`ENV_BASE`): a lista nunca veio do
  // servidor, e criar um envelope acrescentava uma chave a um mapa de limites.
  const envelopesDaCasa = (casa.envelopes || []).map(e => ({
    id: e.id,
    name: e.nome,
    limit: Number(e.limite_base) || 0,
    color: e.cor || null,
  }));

  // ⚠ E o `envMove` — o ajuste de cada envelope dentro do mês — era um SALDO
  // ESCRITO: um mapa `nome → número` que cada telefone reescrevia por inteiro.
  // É o INVARIANTE #2 ao contrário, e a consequência é a do CLAUDE.md: se a
  // Rita mover 50 € da Mercearia para o Lazer e o Tomás mover 30 € do Lazer
  // para a Casa, o último a gravar apaga o outro.
  //
  // Passa a ser a SOMA das `transferencias`, que são aditivas e têm chave de
  // idempotência. Uma soma não se anula.
  const nomeDoEnvelope = Object.fromEntries(envelopesDaCasa.map(e => [e.id, e.name]));
  const envMove = {};
  // ⚠ Só as DESTE mês, pela mesma razão do `registered`: o ajuste de um
  // envelope é uma redistribuição dentro de um mês, e arrastá-la para o
  // seguinte era começar o mês com o orçamento já mexido.
  for (const t of (casa.transferencias || []).filter(x => noMes(x.mes || x.created))) {
    const de = nomeDoEnvelope[t.de_envelope];
    const para = nomeDoEnvelope[t.para_envelope];
    const valor = Number(t.valor) || 0;
    if (de) envMove[de] = (envMove[de] || 0) - valor;
    if (para) envMove[para] = (envMove[para] || 0) + valor;
  }

  // ── As compras ────────────────────────────────────────────────────────────
  //
  // A lista ABERTA é a que não tem `fechada_em`. Pode não haver nenhuma — a
  // casa entre duas idas às compras não tem lista, e isso é um estado válido.
  const aberta = (casa.listas_compras || []).find(l => !l.fechada_em) || null;
  const nomeDaLoja = Object.fromEntries((casa.lojas || []).map(l => [l.id, l.nome]));

  const artigosDaLista = (casa.artigos || []).filter(a => aberta && a.lista === aberta.id);

  const newItems = artigosDaLista.map(a => ({
    id: a.id,
    idServidor: a.id,
    label: a.rotulo,
    section: Number(a.seccao) || 0,
    habitual: !!a.habitual,
    est: Number(a.estimativa) || 0,
  }));

  // ⚠ O `estado` vem DA LINHA de cada artigo, e não de uma lista à parte. É
  // isso que faz dois telefones na mesma loja fundirem-se em vez de se
  // anularem — o comentário da coleção `artigos` já o dizia antes de eu o
  // fazer errado.
  const status = {};
  for (const a of artigosDaLista) {
    const naLoja = ESTADO_NA_LOJA[a.estado];
    if (naLoja && naLoja !== 'open') status[a.id] = naLoja;
  }

  const shopPlan = aberta ? {
    idServidor: aberta.id,
    // O ecrã guarda o ÍNDICE da loja na lista `stores`, não o nome. Traduz-se
    // aqui; se a loja tiver saído da lista, fica -1 e o ecrã diz «por escolher».
    store: (listas.stores || []).indexOf(nomeDaLoja[aberta.loja]),
    who: nomeDoMembro[aberta.comprador] || null,
    day: chaveDeISO(aberta.planeada_para),
  } : null;

  // ── Os equipamentos ───────────────────────────────────────────────────────
  //
  // A forma da loja: `name`, `cat`, `bought`, `shop`, `price`, `warrantyEnd`,
  // `maint`, `maintDate`. O `daysLeft` NÃO vem — é derivado da garantia e do
  // dia de hoje, e um número gravado fica errado amanhã.
  const newEquip = (casa.equipamentos || []).map(e => ({
    id: e.id,
    idServidor: e.id,
    name: e.nome,
    cat: e.categoria || '',
    bought: dmyDeISO(e.comprado_em),
    shop: e.loja || '',
    price: Number(e.preco) || 0,
    warrantyEnd: dmyDeISO(e.garantia_ate),
    maint: e.manutencao || '',
    maintDate: dmyDeISO(e.manutencao_ate),
  }));

  // ── As preferências de quem está ligado ───────────────────────────────────
  //
  // ⚠ Vem UMA linha, ou nenhuma: a regra devolve só a de quem pergunta. Por
  // isso os mapas `schemeByUser` e `themeByUser` enchem-se numa chave só — a
  // desta pessoa — e não se toca nas dos outros, que este dispositivo possa ter
  // guardado localmente.
  const minhaPref = (casa.preferencias || [])[0] || null;
  const euSou = minhaPref ? nomeDoMembro[minhaPref.membro] : null;
  const preferencias = (minhaPref && euSou) ? {
    nome: euSou,
    esquema: Number(minhaPref.esquema_cor) || 0,
    aspeto: minhaPref.aspeto || 'sistema',
    notif: {
      digest: minhaPref.resumo_ativo !== false,
      hour: minhaPref.resumo_hora || '20:00',
      lead: Number(minhaPref.aviso_prazo_dias ?? 1),
    },
  } : null;

  // O mês, na forma da loja. O `monthLimits` é o `limites` da linha — um objeto
  // `nome do envelope → limite`, guardado como JSON.
  const mes = mesAberto ? {
    idServidor: mesAberto.id,
    inicio: chaveDeISO(mesAberto.mes),
    monthLimits: mesAberto.limites || null,
    rendimento: Number(mesAberto.rendimento) || 0,
  } : null;

  return {
    vaultMoves,
    registered,
    newEquip,
    preferencias,
    mes,
    regras,
    listas,
    listasIds,
    envelopesDaCasa,
    envMove,
    newItems,
    status,
    shopPlan,
    added,
    newTasks,
    urg,
    due,
    done,
    feitas,
    // O servidor manda: se responder, é esta a casa e são estes os membros.
    // Sem servidor, a app fica com a família de demonstração — e diz-o.
    membros: membrosDoServidor(casa.membros),
    nomeDaCasa: aCasa ? aCasa.nome : null,
    casaId: aCasa ? aCasa.id : null,
    _servidor: casa,
  };
}

// ─── Escrever ────────────────────────────────────────────────────────────────
//
// Cada uma destas é uma inserção. Nenhuma substitui um total.
// A chave de idempotência é posta pela camada de cliente quando falta, e é o
// que impede uma semanada de ser paga duas vezes quando a fila reenvia depois
// de uma reconexão.

// ⚠ Os nomes são os das coleções, não os da loja local. Escrevi-os de
// cabeça à primeira — `descricao` em vez de `motivo`, `dia` em vez de
// `data`, `envelope_de` em vez de `de_envelope` — e o PocketBase ignora
// campos que não conhece **em silêncio**: a escrita passava e os dados
// caíam. Só a prova de dois telemóveis apanhou. Antes de mexer aqui,
// confirme os campos contra db/pocketbase/criar-colecoes.mjs.

export async function movimentoDeCofre({ casa, membro, tipo, valor, motivo, data, autorizadoPor }) {
  if (!ligado()) return { enviadas: 0, pendentes: 0 };
  return servidor.escrever.criar('cofre_movimentos', {
    casa, membro, tipo, valor, motivo, data, autorizado_por: autorizadoPor,
  });
}

export async function despesa({ casa, envelope, valor, pagador, descricao, data, divideMeias }) {
  if (!ligado()) return { enviadas: 0, pendentes: 0 };
  return servidor.escrever.criar('despesas', {
    casa, envelope, valor, pagador, descricao, data, divide_meias: divideMeias,
  });
}

export async function transferenciaEntreEnvelopes({ casa, de, para, valor, mes, por }) {
  if (!ligado()) return { enviadas: 0, pendentes: 0 };
  return servidor.escrever.criar('transferencias', {
    casa, de_envelope: de, para_envelope: para, valor, mes, por,
  });
}

export async function acerto({ casa, de, para, valor, data }) {
  if (!ligado()) return { enviadas: 0, pendentes: 0 };
  return servidor.escrever.criar('acertos', {
    casa, de_membro: de, para_membro: para, valor, data,
  });
}

// ─── A agenda e as tarefas ───────────────────────────────────────────────────
//
// ⚠ Estas tentam DIRETO e só caem na fila se falhar, como o episódio de saúde
// e ao contrário do dinheiro. A razão é a mesma: quem chama precisa do `id` que
// o servidor deu, para depois poder alterar e apagar. A fila devolve quantas
// subiram, não o registo — uma tarefa que fosse só pela fila nunca aprendia o
// seu id, e ficava a ser um objeto local disfarçado de partilhado.
//
// Sem rede continuam a não se perder: a fila fica como rede de segurança.
const criarOuEnfileirarCasa = async (colecao, linha) => {
  if (!ligado()) return { pendente: true };
  try {
    const r = await servidor.pb.collection(colecao).create(linha);
    return { id: r.id };
  } catch (e) {
    await servidor.escrever.criar(colecao, linha);
    return { pendente: true };
  }
};

// ⚠ Os nomes são os das COLEÇÕES. `titulo` e não `title`, `atribuido_a` e não
// `who`, `etiqueta` e não `tag`. O PocketBase ignora em silêncio o que não
// conhece — foi assim que o `medico` e as `notas` de uma consulta caíram.
export async function eventoDaCasa({ casa, dia, hora, titulo, responsavel, autor, visibilidade, etiqueta, episodio }) {
  return criarOuEnfileirarCasa('eventos', {
    casa,
    dia: isoDeChave(dia),
    hora: hora || '',
    titulo,
    responsavel: responsavel || null,
    autor,
    // O servidor tem um `select` com os três; sem valor, o mais restritivo.
    visibilidade: visibilidade || 'so-eu',
    etiqueta: etiqueta || '',
    episodio: episodio || null,
  });
}

export async function alterarEvento(idNoServidor, campos) {
  if (!ligado() || !idNoServidor) return { pendente: true };
  const linha = {};
  if ('dia' in campos) linha.dia = isoDeChave(campos.dia);
  if ('hora' in campos) linha.hora = campos.hora || '';
  if ('titulo' in campos) linha.titulo = campos.titulo;
  if ('visibilidade' in campos) linha.visibilidade = campos.visibilidade;
  if ('responsavel' in campos) linha.responsavel = campos.responsavel || null;
  return servidor.pb.collection('eventos').update(idNoServidor, linha);
}

export async function apagarEvento(idNoServidor) {
  if (!ligado() || !idNoServidor) return { pendente: true };
  return servidor.pb.collection('eventos').delete(idNoServidor);
}

export async function tarefaDaCasa({ casa, titulo, atribuidoA, recorrencia, pontos, urgencia, prazo }) {
  return criarOuEnfileirarCasa('tarefas', {
    casa,
    titulo,
    atribuido_a: atribuidoA || null,
    recorrencia: RECORRENCIA_NO_SERVIDOR[recorrencia] || 'uma_vez',
    // ⚠ Os pontos podem ser 0 — são opcionais desde 04/09/2026 — e o servidor
    // aceita 0 a 20. Um `|| 0` aqui é correto; um `|| 1` seria pôr pontos onde
    // ninguém os pediu.
    pontos: Number(pontos) || 0,
    urgencia: Number.isFinite(Number(urgencia)) ? Number(urgencia) : 1,
    prazo: prazo ? isoDeChave(prazo) : null,
  });
}

export async function alterarTarefa(idNoServidor, campos) {
  if (!ligado() || !idNoServidor) return { pendente: true };
  const linha = {};
  if ('titulo' in campos) linha.titulo = campos.titulo;
  if ('atribuidoA' in campos) linha.atribuido_a = campos.atribuidoA || null;
  if ('pontos' in campos) linha.pontos = Number(campos.pontos) || 0;
  if ('urgencia' in campos) linha.urgencia = Number(campos.urgencia) || 0;
  if ('recorrencia' in campos) linha.recorrencia = RECORRENCIA_NO_SERVIDOR[campos.recorrencia] || 'uma_vez';
  if ('prazo' in campos) linha.prazo = campos.prazo ? isoDeChave(campos.prazo) : null;
  return servidor.pb.collection('tarefas').update(idNoServidor, linha);
}

export async function apagarTarefa(idNoServidor) {
  if (!ligado() || !idNoServidor) return { pendente: true };
  return servidor.pb.collection('tarefas').delete(idNoServidor);
}

// ── Marcar e desmarcar uma tarefa ────────────────────────────────────────────
//
// ⚠ Marcar CRIA UMA LINHA; desmarcar APAGA-A. Nunca se escreve um booleano
// «feita» na tarefa, e é o INVARIANTE #2: dois telefones que marquem a mesma
// tarefa no mesmo dia colidem no índice único em vez de se anularem, e o
// histórico de quem fez o quê e quando fica.
//
// Uma colisão no índice NÃO é erro para quem chama: quer dizer que já estava
// marcada, que é o estado que se pediu. Devolve-se o que lá está.
export async function marcarTarefaFeita({ casa, tarefa, dia, marcadaPor }) {
  if (!ligado()) return { pendente: true };
  const data = isoDeChave(dia);
  try {
    const r = await servidor.pb.collection('tarefas_feitas').create({
      casa, tarefa, data, marcada_por: marcadaPor });
    return { id: r.id };
  } catch (e) {
    // Já marcada por outro telefone? Procura-se a linha e devolve-se.
    const ja = await servidor.pb.collection('tarefas_feitas')
      .getFirstListItem(`tarefa="${tarefa}" && data>="${data} 00:00:00" && data<="${data} 23:59:59"`)
      .catch(() => null);
    if (ja) return { id: ja.id, jaEstava: true };
    await servidor.escrever.criar('tarefas_feitas', {
      casa, tarefa, data, marcada_por: marcadaPor });
    return { pendente: true };
  }
}

export async function desmarcarTarefaFeita(idDaLinha) {
  if (!ligado() || !idDaLinha) return { pendente: true };
  return servidor.pb.collection('tarefas_feitas').delete(idDaLinha);
}

// A confirmação de um adulto é o que faz os pontos contarem — está no esquema
// desde o início (`confirmada_em`) e a app ainda não a usa. Fica a porta
// aberta, e uma criança não a pode empurrar: a regra exige adulto.
export async function confirmarTarefaFeita(idDaLinha, porQuem) {
  if (!ligado() || !idDaLinha) return { pendente: true };
  return servidor.pb.collection('tarefas_feitas').update(idDaLinha, {
    confirmada_por: porQuem, confirmada_em: new Date().toISOString(),
  });
}

// ─── A casa e quem lá vive ───────────────────────────────────────────────────
//
// Ao contrário do dinheiro, isto NÃO passa pela fila: são operações que a
// pessoa está a fazer e cujo resultado tem de ver já — se falharem, deve
// saber porquê em vez de ficarem pendentes em silêncio. Por isso escrevem
// direto e deixam o erro subir.
//
// Quem pode o quê é decidido pelo servidor, não aqui: `casas.updateRule` e
// `membros.createRule` exigem administração da mesma casa, e há cinco provas
// em provar-regras.mjs. Repetir a verificação neste ficheiro daria a impressão
// errada de que é o cliente que protege.

// ── As três listas da casa, para o servidor ──────────────────────────────────
//
// Uma função por operação e não uma por lista: as três coleções têm a mesma
// forma, e três cópias de cada função eram três sítios onde a quarta lista que
// alguém acrescentasse se ia esquecer.
//
// ⚠ Todas exigem ADMINISTRAÇÃO no servidor (`createRule: casa && admin`), e é
// mais apertado do que a app — que deixa qualquer adulto criar uma
// especialidade. É divergência conhecida e fica dita: se um adulto que não
// administra criar uma, ela fica no telefone dele. Corrigir isto é escolher um
// dos dois lados, e é decisão do dono da casa.
const colecaoDaLista = (chave) => {
  const c = LISTA_NO_SERVIDOR[chave];
  if (!c) throw new Error(`Lista desconhecida: ${chave}`);
  return c;
};

export async function acrescentarNaLista(chave, { casa, nome }) {
  if (!ligado()) return { pendente: true };
  return criarOuEnfileirarCasa(colecaoDaLista(chave), { casa, nome });
}

export async function renomearNaLista(chave, id, nome) {
  if (!ligado() || !id) return { pendente: true };
  return servidor.pb.collection(colecaoDaLista(chave)).update(id, { nome });
}

export async function apagarDaLista(chave, id) {
  if (!ligado() || !id) return { pendente: true };
  return servidor.pb.collection(colecaoDaLista(chave)).delete(id);
}

// ── O mês ────────────────────────────────────────────────────────────────────
//
// ⚠ Fechar o mês fazia `registered: 0` e `envMove: {}` — escrever zero por cima
// de duas somas. Enquanto tudo era local isso funcionava por acidente: o total
// era um campo, e zerá-lo zerava-o.
//
// A partir do momento em que as despesas e as transferências são LINHAS no
// servidor, deixa de funcionar: as linhas continuam lá, e a leitura seguinte
// traz o total todo de volta. O mês fechado reabria sozinho.
//
// O modelo certo é o que a coleção `meses` já previa: uma linha por mês, e o
// mês ABERTO é o que não tem `fechado_em`. Os totais passam a ser as somas
// FILTRADAS por esse mês — nunca zeradas, porque não há nada a zerar.
//
// O `mes` é o primeiro dia do mês, para as comparações serem de datas e não de
// texto.
export async function abrirMes({ casa, mes, rendimento, limites }) {
  return criarOuEnfileirarCasa('meses', {
    casa, mes: isoDeChave(mes),
    rendimento: Number(rendimento) || 0,
    limites: limites || {},
  });
}

export async function alterarMes(idNoServidor, campos) {
  if (!ligado() || !idNoServidor) return { pendente: true };
  const linha = {};
  if ('rendimento' in campos) linha.rendimento = Number(campos.rendimento) || 0;
  if ('limites' in campos) linha.limites = campos.limites || {};
  // Fechar é pôr a data: o mês deixa de ser o aberto, e os totais do seguinte
  // começam do zero por serem OUTRA soma — não por alguém os ter apagado.
  if ('fechadoEm' in campos) linha.fechado_em = campos.fechadoEm ? isoDeChave(campos.fechadoEm) : null;
  return servidor.pb.collection('meses').update(idNoServidor, linha);
}

// ── As preferências de cada um ───────────────────────────────────────────────
//
// ⚠ Esta é a única coleção que NÃO é da casa: a regra é `membro =
// @request.auth.id` nas cinco operações, e é mais apertada do que a casa. Cada
// um vê e escreve as suas, e mais ninguém — nem quem administra.
//
// Há um índice único no `membro`: uma linha por pessoa. Portanto isto é um
// UPSERT — procura-se a que existe e altera-se, e só se cria quando não há.
// Criar às cegas colidia no índice, e a segunda escrita de cada sessão falhava.
//
// Os valores do `aspeto` são os MESMOS dos dois lados — `claro`, `escuro`,
// `sistema` — e por isso não há tabela de tradução. Se um dia divergirem, é
// aqui que a tradução entra, e não em dois sítios.
export async function preferenciasDoMembro({ membro, esquemaCor, aspeto, resumoAtivo, resumoHora, avisoPrazoDias }) {
  if (!ligado() || !membro) return { pendente: true };
  const linha = { membro };
  if (esquemaCor !== undefined) linha.esquema_cor = Number(esquemaCor) || 0;
  if (aspeto !== undefined) linha.aspeto = aspeto;
  if (resumoAtivo !== undefined) linha.resumo_ativo = !!resumoAtivo;
  if (resumoHora !== undefined) linha.resumo_hora = resumoHora || '';
  if (avisoPrazoDias !== undefined) linha.aviso_prazo_dias = Number(avisoPrazoDias) || 0;

  // ⚠ Direto, sem fila. Uma preferência é um ESTADO, não um movimento: duas
  // escritas fora de ordem deixavam a antiga a ganhar, e a fila só sabe criar.
  const ja = await servidor.pb.collection('preferencias')
    .getFirstListItem(`membro="${membro}"`).catch(() => null);
  if (ja) return servidor.pb.collection('preferencias').update(ja.id, linha);
  return servidor.pb.collection('preferencias').create(linha);
}

// ── Os equipamentos ──────────────────────────────────────────────────────────
//
// ⚠ As datas fazem DUAS traduções, e é onde este género de coisa se parte: a
// loja guarda-as como texto «dd/mm/aaaa», a chave interna é `d2026-09-20`, e o
// servidor quer ISO. Num sítio só, e nos dois sentidos.
//
// O `daysLeft` das sementes NÃO sobe: é derivado da garantia e da data de hoje,
// e guardá-lo era gravar um número que fica errado ao dia seguinte.
//
// ⚠ E os campos `fatura` e `foto` da coleção ficam por usar: a app ainda não
// tem onde escolher a fotografia de uma fatura. Quando tiver, tem de ir pelo
// `criarComFicheiro` como o anexo de saúde — a fila serializa em JSON, e um
// ficheiro não é JSON.
const isoDeDMY = (dmy) => {
  const k = chaveDeDMY(dmy);
  return k ? isoDeChave(k) : null;
};
const dmyDeISO = (iso) => {
  const k = chaveDeISO(iso);
  return k ? dmyDeChave(k) : '';
};

export async function equipamentoDaCasa({ casa, nome, categoria, compradoEm, loja, preco, garantiaAte, manutencao, manutencaoAte }) {
  return criarOuEnfileirarCasa('equipamentos', {
    casa, nome,
    categoria: categoria || '',
    comprado_em: isoDeDMY(compradoEm),
    loja: loja || '',
    preco: Number(preco) || 0,
    garantia_ate: isoDeDMY(garantiaAte),
    manutencao: manutencao || '',
    manutencao_ate: isoDeDMY(manutencaoAte),
  });
}

export async function alterarEquipamento(idNoServidor, campos) {
  if (!ligado() || !idNoServidor) return { pendente: true };
  const linha = {};
  if ('nome' in campos) linha.nome = campos.nome;
  if ('categoria' in campos) linha.categoria = campos.categoria || '';
  if ('compradoEm' in campos) linha.comprado_em = isoDeDMY(campos.compradoEm);
  if ('loja' in campos) linha.loja = campos.loja || '';
  if ('preco' in campos) linha.preco = Number(campos.preco) || 0;
  if ('garantiaAte' in campos) linha.garantia_ate = isoDeDMY(campos.garantiaAte);
  if ('manutencao' in campos) linha.manutencao = campos.manutencao || '';
  if ('manutencaoAte' in campos) linha.manutencao_ate = isoDeDMY(campos.manutencaoAte);
  return servidor.pb.collection('equipamentos').update(idNoServidor, linha);
}

export async function apagarEquipamento(idNoServidor) {
  if (!ligado() || !idNoServidor) return { pendente: true };
  return servidor.pb.collection('equipamentos').delete(idNoServidor);
}

// ── As compras ───────────────────────────────────────────────────────────────
//
// ⚠ O `estado` de um artigo vai NA LINHA dele, e o esquema já avisava porquê,
// no comentário da coleção `artigos`:
//
//   «O estado vive na linha do artigo. Se fosse uma lista de identificadores
//    confirmados, dois telefones na mesma loja anulavam-se; assim, fundem-se.»
//
// O cliente tinha exactamente a lista que o comentário proíbe — um mapa
// `status` que cada telefone reescrevia por inteiro. Dois adultos a dividir os
// corredores anulavam o trabalho um do outro. É a mesma forma do `envMove`.
//
// A loja fala «open | done | sem stock»; o servidor tem um `select` com
// `por_comprar | confirmado | sem_stock`. A tradução é aqui, e nos dois
// sentidos, para não haver duas tabelas a divergir.
const ESTADO_NO_SERVIDOR = {
  open: 'por_comprar', done: 'confirmado', 'sem stock': 'sem_stock',
};
const ESTADO_NA_LOJA = Object.fromEntries(
  Object.entries(ESTADO_NO_SERVIDOR).map(([a, b]) => [b, a]));

export async function listaDeCompras({ casa, loja, comprador, planeadaPara }) {
  return criarOuEnfileirarCasa('listas_compras', {
    casa, loja: loja || null, comprador: comprador || null,
    planeada_para: planeadaPara ? isoDeChave(planeadaPara) : null,
  });
}

export async function alterarListaDeCompras(idNoServidor, campos) {
  if (!ligado() || !idNoServidor) return { pendente: true };
  const linha = {};
  if ('loja' in campos) linha.loja = campos.loja || null;
  if ('comprador' in campos) linha.comprador = campos.comprador || null;
  if ('planeadaPara' in campos) linha.planeada_para = campos.planeadaPara ? isoDeChave(campos.planeadaPara) : null;
  // Fechar a conta é pôr a data: a lista deixa de ser a aberta.
  if ('fechadaEm' in campos) linha.fechada_em = campos.fechadaEm ? isoDeChave(campos.fechadaEm) : null;
  return servidor.pb.collection('listas_compras').update(idNoServidor, linha);
}

export async function artigoDeCompras({ casa, lista, rotulo, seccao, pedidoPor, habitual, estimativa }) {
  if (!lista) throw new Error('Um artigo sem lista não se grava — não teria onde aparecer.');
  return criarOuEnfileirarCasa('artigos', {
    casa, lista, rotulo,
    seccao: Number.isFinite(Number(seccao)) ? Number(seccao) : 0,
    pedido_por: pedidoPor || null,
    estado: 'por_comprar',
    habitual: !!habitual,
    estimativa: Number(estimativa) || 0,
  });
}

// ⚠ Marcar um artigo ALTERA A LINHA dele — não escreve numa lista à parte. É
// isso que faz dois telefones na mesma loja fundirem-se: cada um altera os
// artigos que apanhou, e nenhum reescreve os do outro.
export async function marcarArtigo(idNoServidor, estado, precoReal) {
  if (!ligado() || !idNoServidor) return { pendente: true };
  return servidor.pb.collection('artigos').update(idNoServidor, {
    estado: ESTADO_NO_SERVIDOR[estado] || 'por_comprar',
    ...(precoReal !== undefined ? { preco_real: Number(precoReal) || 0 } : {}),
  });
}

export async function apagarArtigo(idNoServidor) {
  if (!ligado() || !idNoServidor) return { pendente: true };
  return servidor.pb.collection('artigos').delete(idNoServidor);
}

// ── Os envelopes, para o servidor ────────────────────────────────────────────
//
// ⚠ O envelope é a DEFINIÇÃO — nome, limite, cor. O que se move entre eles não
// se escreve aqui: vai por `transferenciaEntreEnvelopes`, que é aditiva. Pôr um
// «saldo» no envelope era o INVARIANTE #2 ao contrário.
export async function criarEnvelope({ casa, nome, limite, cor }) {
  return criarOuEnfileirarCasa('envelopes', {
    casa, nome, limite_base: Number(limite) || 0, cor: cor || '',
  });
}

export async function alterarEnvelope(idNoServidor, campos) {
  if (!ligado() || !idNoServidor) return { pendente: true };
  const linha = {};
  if ('nome' in campos) linha.nome = campos.nome;
  if ('limite' in campos) linha.limite_base = Number(campos.limite) || 0;
  if ('cor' in campos) linha.cor = campos.cor || '';
  return servidor.pb.collection('envelopes').update(idNoServidor, linha);
}

export async function apagarEnvelope(idNoServidor) {
  if (!ligado() || !idNoServidor) return { pendente: true };
  return servidor.pb.collection('envelopes').delete(idNoServidor);
}

// ── As regras da casa, para o servidor ───────────────────────────────────────
//
// ⚠ Os nomes são os da COLEÇÃO: `valor_ponto`, `dia_pagamento`,
// `divide_meias`, `pontos_ligados`, `rendimento_mensal`. A loja fala
// `pointValue`, `payDay`, `splitHalf`, `pontosLigados`, `rendimento`. A
// tradução é aqui, num sítio só — e o PocketBase ignora em silêncio o que não
// conhece, portanto um nome errado aqui é uma regra que a casa julga ter
// mudado e não mudou.
const REGRA_NO_SERVIDOR = {
  rendimento: 'rendimento_mensal',
  pointValue: 'valor_ponto',
  payDay: 'dia_pagamento',
  splitHalf: 'divide_meias',
  pontosLigados: 'pontos_ligados',
};

export async function regrasDaCasa(casaId, campos) {
  if (!ligado() || !casaId) return { pendente: true };
  const linha = {};
  for (const [naLoja, noServidor] of Object.entries(REGRA_NO_SERVIDOR)) {
    if (naLoja in campos) linha[noServidor] = campos[naLoja];
  }
  if (!Object.keys(linha).length) return { pendente: true };
  // ⚠ Direto, sem fila. Uma regra da casa é um ESTADO, não um movimento: duas
  // alterações fora de ordem deixavam a antiga a ganhar, e a fila só sabe
  // criar. Sem rede fica no telefone e sobe na próxima — que é honesto.
  return servidor.pb.collection('casas').update(casaId, linha);
}

export async function renomearCasa(casaId, nome) {
  if (!ligado()) throw new Error('Sem ligação ao servidor.');
  return servidor.pb.collection('casas').update(casaId, { nome });
}

export async function acrescentarMembro({ casa, nome, papel, email, pin, palavraPasse, fem, cor }) {
  if (!ligado()) throw new Error('Sem ligação ao servidor.');
  // O `login` leva o id da casa: `nome` não serve de identificador porque duas
  // casas podem ter um Léo, e o campo é único em toda a coleção.
  const segredo = papel === 'crianca' ? pin : palavraPasse;
  // `verified` NÃO vai aqui. Só um superutilizador o pode escrever, e mandá-lo
  // fazia a criação inteira falhar com «Values don't match» — um erro que não
  // diz uma palavra sobre o campo que o causou. A prova contra o servidor
  // apanhou-o; nenhuma leitura de código o veria.
  //
  // Não faz falta: a `authRule` da coleção é vazia, portanto entrar não exige
  // verificação. Se um dia exigir, o que resolve é um convite por e-mail — e
  // isso é outro trabalho, não um campo a mais nesta chamada.
  return servidor.pb.collection('membros').create({
    casa, nome, papel, fem: !!fem, cor: cor || null,
    login: `${casa}_${String(nome).toLowerCase().replace(/\s+/g, '-')}`,
    ...(papel === 'crianca' ? {} : { email }),
    password: segredo, passwordConfirm: segredo,
  });
}

export async function editarMembro(id, campos) {
  if (!ligado()) throw new Error('Sem ligação ao servidor.');
  return servidor.pb.collection('membros').update(id, campos);
}

// Remover é o que mais pode correr mal, e o servidor é que sabe: recusa se a
// casa ficar sem administração (hook), e recusa se houver linhas obrigatórias
// a apontar para o membro — tarefas feitas, movimentos, despesas. Essa segunda
// recusa é uma feature: o histórico da casa não se apaga por alguém sair.
export async function removerMembro(id) {
  if (!ligado()) throw new Error('Sem ligação ao servidor.');
  return servidor.pb.collection('membros').delete(id);
}

// O que está à espera de rede. O ecrã pode mostrá-lo; o importante é que
// nada se perde por estar offline.
export const pendentes = () => servidor.escrever.pendentes();
export const esvaziar = () => servidor.escrever.esvaziar();

// ─── Onde é que a saúde pode ir ──────────────────────────────────────────────
//
// A REGRA vive em `src/endereco.js`, pura e sem importar nada — é a única
// forma de a provar sem arrastar o SDK do PocketBase, que é ESM e que o jest
// desta app não transforma. Aqui fica só a ligação dela ao servidor real.
export const saudeSincroniza = () => ligado() && eEnderecoDeCasa(servidor.enderecoDoServidor());


// ─── Guarda ──────────────────────────────────────────────────────────────────
//
// Uma rede de segurança, não uma decisão de desenho: qualquer escrita de saúde
// passa por aqui, e se o servidor não for de casa isto rebenta — em testes
// antes de rebentar na vida de alguém.
// ⚠ A lista é EXPLÍCITA e não um `/saude/.test(colecao)`. Uma coleção nova de
// saúde tem de ser acrescentada aqui à mão, e é isso que se quer: o travão que
// se aplica sozinho a nomes que combinam é o travão que um dia deixa passar
// `anexos`, que não tem «saude» no nome.
const SAUDE = ['episodios_saude', 'anexos', 'notas_saude', 'receitas_saude', 'decisoes_saude'];

export function recusaSaude(colecao) {
  if (SAUDE.includes(colecao)) {
    if (!saudeSincroniza()) throw new Error(PORQUE_NAO_SOBE);
  }
  return colecao;
}

// ─── A saúde, quando pode ────────────────────────────────────────────────────
//
// Passa pela FILA, como o dinheiro e ao contrário da gestão da casa: uma
// consulta marcada no corredor do hospital, sem rede, não se perde por isso.
//
// A visibilidade não se decide aqui. As regras de `episodios_saude` são as do
// servidor, com 16 provas em provar-saude.mjs — incluindo a que garante que uma
// criança não recebe a sua própria ficha.
// ⚠ Tenta DIRETO e só cai na fila se falhar, ao contrário do dinheiro. A razão
// é o anexo: um anexo é uma relação para o episódio, e sem o `id` que o
// servidor lhe deu não há relação nenhuma — o anexo ficaria órfão do outro
// lado, que é o que o TAREFAS.md proíbe pelo nome.
//
// A fila não devolve o registo criado (devolve quantas subiram), portanto uma
// consulta que vá só pela fila nunca aprende o seu `id`. Direto, aprende — e
// sem rede continua a não se perder, porque a fila fica como rede de segurança.
//
// Devolve `{ id }` quando o servidor respondeu, ou `{ pendente: true }` quando
// ficou na fila. Quem chama guarda o `id` se o houver.
export async function episodioDeSaude({ casa, membro, especialidade, medico, dia, hora, notas }) {
  recusaSaude('episodios_saude');
  const linha = {
    casa, membro, especialidade, medico: medico || '', dia, hora: hora || '', notas: notas || '',
  };
  try {
    const r = await servidor.pb.collection('episodios_saude').create(linha);
    return { id: r.id };
  } catch (e) {
    await servidor.escrever.criar('episodios_saude', linha);
    return { pendente: true };
  }
}

// ─── Um anexo, com o ficheiro ────────────────────────────────────────────────
//
// ⚠ NÃO passa pela fila, ao contrário do episódio, e a razão é técnica e não de
// desenho: a fila serializa em JSON e um ficheiro não é JSON. Ver
// `criarComFicheiro` em `src/pocketbase.js`.
//
// Portanto isto ou sobe ou rebenta. Quem chama — o `addHealthDoc` da loja —
// guarda a fotografia no dispositivo ANTES de tentar, e marca o documento como
// «por subir» se falhar. A fotografia nunca se perde por não haver rede, e a
// app não finge que já está no servidor.
//
// O `tipo` do servidor é minúsculo e sem acento (`exame`, `receita`,
// `relatorio`) — é um `select` com esses três valores. A loja fala «Exame»,
// «Receita», «Relatório». A tradução é aqui, e não nos dois sítios.
const TIPO_NO_SERVIDOR = { Exame: 'exame', Receita: 'receita', 'Relatório': 'relatorio' };

export async function anexoDeSaude({ casa, episodio, tipo, titulo, uri, blob, nome, mime }) {
  recusaSaude('anexos');
  if (!episodio) throw new Error('Um anexo sem episódio não se grava — seria um exame órfão.');
  return servidor.escrever.criarComFicheiro('anexos', {
    casa, episodio, titulo,
    tipo: TIPO_NO_SERVIDOR[tipo] || 'exame',
  }, (uri || blob) ? { campo: 'ficheiro', uri, blob, nome, tipo: mime } : null);
}

// ─── O que pende de uma consulta: notas, receitas e decisões ─────────────────
//
// ⚠ Estas TRÊS passam pela fila, ao contrário do anexo, e podem: não levam
// ficheiro nenhum, e portanto serializam em JSON sem problema. Uma nota escrita
// no corredor do hospital, sem rede, não se perde por isso.
//
// Mas tentam DIRETO primeiro, como o episódio, e pela mesma razão: a nota
// precisa de aprender o seu `id` no servidor para depois se poder alterar. Uma
// nota que fosse só pela fila ficava lá, correta, e inalterável do outro lado.
//
// Devolvem `{ id }` quando o servidor respondeu, `{ pendente: true }` quando
// ficaram na fila. Quem chama guarda o `id` se o houver.
const criarOuEnfileirar = async (colecao, linha) => {
  recusaSaude(colecao);
  try {
    const r = await servidor.pb.collection(colecao).create(linha);
    return { id: r.id };
  } catch (e) {
    await servidor.escrever.criar(colecao, linha);
    return { pendente: true };
  }
};

export async function notaDeSaude({ casa, episodio, autor, texto }) {
  if (!episodio) throw new Error('Uma nota sem consulta não se grava — não seria de nada.');
  // ⚠ O `autor` vai e é obrigatório: o servidor exige `autor = @request.auth.id`
  // na criação, e sem ele a escrita é recusada. É de propósito — sem essa
  // condição bastava criar a nota já assinada por outra pessoa, e a regra que
  // diz «só o autor altera» não valia nada.
  if (!autor) throw new Error('Uma nota tem de ter autor — é ele quem a pode alterar.');
  return criarOuEnfileirar('notas_saude', { casa, episodio, autor, texto: texto || '' });
}

// Alterar e apagar são DIRETOS, sem fila.
//
// ⚠ E é uma decisão, não um esquecimento: a fila só sabe criar. Enfileirar uma
// alteração exigia guardar a ordem entre criar e alterar, e duas alterações da
// mesma nota fora de ordem deixavam o texto antigo a ganhar. Sem rede, a
// alteração fica só no dispositivo e sobe na próxima — que é o mesmo que
// acontece hoje, e é honesto.
export async function alterarNotaDeSaude(idNoServidor, texto) {
  recusaSaude('notas_saude');
  if (!idNoServidor) return { pendente: true };
  return servidor.pb.collection('notas_saude').update(idNoServidor, {
    texto, editada_em: new Date().toISOString(),
  });
}

export async function apagarNotaDeSaude(idNoServidor) {
  recusaSaude('notas_saude');
  if (!idNoServidor) return { pendente: true };
  return servidor.pb.collection('notas_saude').delete(idNoServidor);
}

export async function receitaDeSaude({ casa, episodio, nome, dose, quantidade, unidade, expiraEm, decisao }) {
  if (!episodio) throw new Error('Uma receita sem consulta não se grava.');
  return criarOuEnfileirar('receitas_saude', {
    casa, episodio, nome, dose: dose || '', quantidade: quantidade || '',
    unidade: unidade || '', expira_em: expiraEm || null, decisao: decisao || '',
  });
}

// A decisão de uma consulta é UMA. O servidor tem um índice único no
// `episodio`, portanto criar a segunda é recusado — e é isso que faz dois
// telefones concordarem em vez de criarem uma linha cada um.
//
// Daí o `atualizar` em vez de `criar`: procura-se a que existe e altera-se.
export async function decisaoDeSaude({ casa, episodio, tipo, estado, nota }) {
  recusaSaude('decisoes_saude');
  if (!episodio) throw new Error('Uma decisão sem consulta não se grava.');
  const linha = {
    casa, episodio, tipo: tipo || '', estado: estado || 'pendente',
    nota: nota || '', atualizada_em: new Date().toISOString(),
  };
  try {
    const ja = await servidor.pb.collection('decisoes_saude')
      .getFirstListItem(`episodio="${episodio}"`).catch(() => null);
    if (ja) return { id: (await servidor.pb.collection('decisoes_saude').update(ja.id, linha)).id };
    return { id: (await servidor.pb.collection('decisoes_saude').create(linha)).id };
  } catch (e) {
    await servidor.escrever.criar('decisoes_saude', linha);
    return { pendente: true };
  }
}

// O aspeto do próprio membro — a cor do avatar.
//
// Passa por aqui, e não pelo `pocketbase` directamente, porque a loja só
// conhece esta porta: importa o `./sync` em atraso e nunca o cliente. Manter a
// regra poupa à loja saber que servidor está do outro lado.
export const guardarAspeto = (campos) => servidor.auth.guardarAspeto(campos);
// O PIN de uma criança vai por uma ROTA, não por um update da coleção: o
// PocketBase exige `oldPassword` para mudar uma palavra-passe, e quem põe o PIN
// de uma criança não sabe o antigo. Ver `pb_hooks/pin.pb.js`.
export const definirPin = (membroId, pin) => servidor.auth.definirPin(membroId, pin);
export const trazerFotografiaDaGoogle = () => servidor.auth.trazerFotografiaDaGoogle();
