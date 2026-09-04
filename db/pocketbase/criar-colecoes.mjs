// Cria as coleções da Nossa Casa no PocketBase, traduzindo db/postgres/01-esquema.sql.
import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.PB_URL || 'http://127.0.0.1:8095');
// As credenciais do superutilizador vêm do ambiente. Os valores por omissão
// são os do servidor de desenvolvimento e estão aqui para estes scripts
// correrem sem preparação nenhuma — mas num servidor a sério o administrador é
// outro, e a palavra-passe não deve estar escrita num ficheiro versionado.
//   PB_ADMIN=... PB_ADMIN_PASS=... node <este ficheiro>
//
// ⚠ `SUPER` e não `ADMIN`. Mais abaixo há um `const ADMIN` que é a REGRA do
// papel de administrador (`@request.auth.papel = "admin"`), usada em sete
// regras de coleção. Dois `const ADMIN` no mesmo módulo é um SyntaxError, e
// este ficheiro deixou de analisar — «Identifier 'ADMIN' has already been
// declared».
//
// Ou seja: desde o commit que tirou as credenciais do código (90e219d), o
// script que CRIA as coleções nunca mais correu. As 141 provas continuaram
// verdes porque corriam contra as coleções criadas ANTES disso — uma base de
// dados que já não se sabia recriar. Descoberto em 03/09/2026, ao tentar
// aplicar a correção da visibilidade da saúde.
const SUPER = process.env.PB_ADMIN || 'admin@nossacasa.local';
const SUPER_PASS = process.env.PB_ADMIN_PASS || 'casa-de-testes-123';
await pb.collection('_superusers').authWithPassword(SUPER, SUPER_PASS);

const txt = (name, o = {}) => ({ name, type: 'text', ...o });
const num = (name, o = {}) => ({ name, type: 'number', ...o });
const bool = (name, o = {}) => ({ name, type: 'bool', ...o });
const data = (name, o = {}) => ({ name, type: 'date', ...o });
const sel = (name, values, o = {}) => ({ name, type: 'select', values, maxSelect: 1, ...o });
const rel = (name, collectionId, o = {}) => ({ name, type: 'relation', collectionId, maxSelect: 1, cascadeDelete: false, ...o });
const fich = (name, o = {}) => ({ name, type: 'file', maxSelect: 1, maxSize: 8388608, ...o });

const ids = {};

// Recriar do zero é o que torna isto repetível. Apagar pela ordem inversa,
// porque as relações impedem apagar uma coleção que outra ainda refere.
//
// ⚠ `credenciais_agenda` está na lista e é preciso: foi acrescentada depois,
// por outro script, e ninguém a pôs aqui. Sem ela a limpeza parava a meio —
// «Failed to delete collection probably due to existing reference in
// credenciais_agenda» — e deixava a base num estado que este ficheiro já não
// sabia reconstruir.
const NOSSAS = [
  // vistas primeiro: dependem das coleções de base
  'v_cofre_saldo', 'v_envelope_gasto', 'v_acerto_saldo', 'v_pontos_por_pagar',
  'credenciais_agenda',
  // ⚠ As três novas ANTES dos `episodios_saude`: apagam-se pela ordem inversa
  // das relações, e as três apontam para ele. Fora de ordem, a limpeza para com
  // «existing reference» e deixa a base a meio — foi o que a
  // `credenciais_agenda` ensinou.
  'notas_saude', 'receitas_saude', 'decisoes_saude',
  // ⚠ `eventos` subiu para AQUI, antes dos `episodios_saude`. Ganhou uma
  // relação para eles («a agenda aprende a saúde»), e uma coleção não se apaga
  // enquanto outra a referir: em baixo na lista, a limpeza parava com «existing
  // reference in eventos». É o mesmo erro que a `credenciais_agenda` ensinou.
  'eventos',
  'anexos', 'episodios_saude', 'especialidades', 'manutencoes', 'categorias_equip',
  'metas', 'acertos', 'transferencias', 'artigos', 'listas_compras', 'lojas',
  'meses', 'preferencias', 'equipamentos', 'cofre_movimentos', 'despesas',
  'envelopes', 'tarefas_feitas', 'tarefas', 'membros', 'casas'];

// ── Uma casa habitada não se apaga ───────────────────────────────────────────
//
// ⚠ Este script apagava e recriava TUDO, `membros` e `casas` incluídos. Numa
// base vazia é isso que o torna repetível; numa casa a sério apaga a conta de
// quem lá vive e, com ela, a autorização da agenda da Google — que só se
// recupera indo outra vez à Google.
//
// Aprendi-o da pior maneira, em 03/09/2026: corri-o para aplicar uma mudança
// de regra, com a casa «Madeira» lá dentro. As coleções foram-se. A casa, o
// membro e as credenciais sobreviveram por ACIDENTE — a limpeza parou no erro
// da `credenciais_agenda` antes de chegar a `membros`. Um acidente não é uma
// salvaguarda.
//
// Agora, se já existe uma casa com membros, reaproveitam-se as duas coleções e
// só se recria o resto. As REGRAS aplicam-se de qualquer modo, que é a razão
// pela qual alguém corre isto depois do primeiro dia.
//
// Para uma reconstrução total e deliberada: PB_RECRIAR=1.
const casasVivas = await pb.collection('casas').getFullList().catch(() => []);
const membrosVivos = await pb.collection('membros').getFullList().catch(() => []);
const casaHabitada = !process.env.PB_RECRIAR && casasVivas.length > 0 && membrosVivos.length > 0;
if (casaHabitada) {
  console.log(`Casa habitada: «${casasVivas[0].nome}», ${membrosVivos.length} membro(s).`);
  console.log('Reaproveito `casas` e `membros`; recrio o resto e aplico as regras.');
  console.log('Para apagar tudo mesmo: PB_RECRIAR=1 npm run db:colecoes\n');
}
// ⚠ `credenciais_agenda` também se preserva, e custou aprendê-lo. Pu-la na
// lista de limpeza para a ordem de apagamento funcionar, e na primeira
// execução apagou-a — levando o `refresh_token` da agenda da Google. Esse não
// se recupera de uma cópia: recupera-se voltando à Google a autorizar.
//
// Preservar `membros` e `casas` e não isto era guardar a conta e perder o que
// a conta tinha autorizado.
const PRESERVAR = casaHabitada ? ['membros', 'casas', 'credenciais_agenda'] : [];

const existentes = await pb.collections.getFullList();
for (const nome of NOSSAS) {
  if (PRESERVAR.includes(nome)) continue;
  const c = existentes.find(x => x.name === nome);
  if (c) await pb.collections.delete(c.id);
}
if (casaHabitada) {
  ids.casas = existentes.find(x => x.name === 'casas').id;
  ids.membros = existentes.find(x => x.name === 'membros').id;
}

const criar = async (def) => {
  let c;
  try { c = await pb.collections.create(def); }
  catch (e) {
    console.error(`FALHOU ${def.name}:`, JSON.stringify(e.response?.data || e.message));
    throw e;
  }
  ids[def.name] = c.id;
  return c;
};

// ── Uma coleção preservada continua a receber o esquema ──────────────────────
//
// ⚠ Isto faltava, e é um defeito com forma de silêncio. Numa casa habitada, o
// `casas` e o `membros` são PRESERVADOS — não se apagam, para não levar a conta
// de quem lá vive e a autorização da agenda. Mas «preservado» estava a
// significar «intocado»: os campos novos que este ficheiro define nunca lhes
// chegavam.
//
// Encontrei-o em 04/09/2026 ao acrescentar `pontos_ligados` ao `casas` e ao
// baixar o mínimo do `valor_ponto`. Corri o script, ele disse «criadas», e as
// duas alterações não estavam lá. Numa base vazia funcionava; na casa a sério —
// a única que interessa — não fazia nada.
//
// Agora os campos aplicam-se por `update` quando a coleção é preservada, tal
// como as regras do `membros` já se aplicavam. Fundem-se pelo nome: o que já lá
// está mantém-se, o que é novo entra, e o que mudou de limites é substituído.
const aplicarCampos = async (nome, campos) => {
  const c = (await pb.collections.getFullList()).find(x => x.name === nome);
  if (!c) return;
  const porNome = new Map(c.fields.map(f => [f.name, f]));
  for (const novo of campos) porNome.set(novo.name, { ...porNome.get(novo.name), ...novo });
  await pb.collections.update(c.id, { fields: [...porNome.values()] });
  ids[nome] = c.id;
};

// ── A casa ───────────────────────────────────────────────────────────────────
// Sem regras ainda: membros ainda não existe para as poder referir.
const CAMPOS_DA_CASA = [
    txt('nome', { required: true }),
    num('rendimento_mensal', { min: 0 }),
    // §4: o valor do ponto é validado no SERVIDOR, não só no campo.
    //
    // ⚠ Mínimo 0, e não 0,01. Os pontos passaram a ser opcionais em
    // 04/09/2026, e com eles o valor pode ser zero: uma casa pode querer os
    // pontos como CONTAGEM e não como dinheiro. Eu baixei o mínimo no ecrã e
    // deixei o servidor em 0,01 — a escolha de 0 € era aceite no telefone e
    // recusada ao subir, que é a mesma forma de falha silenciosa do
    // `tarefas_feitas`. Os dois lados dizem agora a mesma coisa.
    num('valor_ponto', { min: 0, max: 5 }),
    num('dia_pagamento', { min: 0, max: 6, onlyInt: true }),
    bool('divide_meias'),
    // O interruptor dos pontos. Ausente lê-se como LIGADO, do lado do cliente,
    // porque é o que a app fazia antes de ele existir.
    bool('pontos_ligados'),
];

if (casaHabitada) await aplicarCampos('casas', CAMPOS_DA_CASA);
else await criar({ name: 'casas', type: 'base', fields: CAMPOS_DA_CASA });

// ── Membros ──────────────────────────────────────────────────────────────────
// Coleção de AUTENTICAÇÃO. É a peça central da tradução: o PocketBase já faz
// hash das palavras-passe com bcrypt e verifica-as no servidor, portanto o PIN
// de uma criança é a palavra-passe dela — e §3.2 fica satisfeita sem escrever
// criptografia nenhuma. O valor correto nunca chega ao dispositivo.
const REGRAS_MEMBROS = {
  listRule: 'casa = @request.auth.casa',
  viewRule: 'casa = @request.auth.casa',
  createRule: '@request.auth.papel = "admin" && casa = @request.auth.casa',
  updateRule: '@request.auth.papel = "admin" && casa = @request.auth.casa',
  deleteRule: '@request.auth.papel = "admin" && casa = @request.auth.casa',
};
if (casaHabitada) {
  // A coleção fica; as regras aplicam-se, que é para isso que se corre isto.
  await pb.collections.update(ids.membros, REGRAS_MEMBROS);
} else await criar({
  name: 'membros', type: 'auth',
  // Os adultos entram por e-mail. As crianças não têm e-mail nem conta própria
  // — §8 pede que assim continue — por isso entram por `login`, um
  // identificador interno «casa_nome». O campo de identidade tem de ser único
  // em toda a coleção, e `nome` não pode ser: duas casas podem ter um Léo.
  passwordAuth: { enabled: true, identityFields: ['email', 'login'] },
  fields: [
    txt('nome', { required: true }),
    txt('login', { required: true }),
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    sel('papel', ['admin', 'adulto', 'crianca'], { required: true }),
    txt('cor'),
    // O género gramatical é uma propriedade da pessoa, não coisa que se
    // adivinhe do nome — a app tinha três sítios a fazer `nome === 'Rita'` e
    // um deles escrevia «Saúde do Mia». Fica ao lado do nome, no servidor,
    // porque é a casa que sabe como cada membro quer ser tratado.
    bool('fem'),
  ],
  indexes: ['CREATE UNIQUE INDEX idx_membro_login ON membros (login)'],
  listRule: 'casa = @request.auth.casa',
  viewRule: 'casa = @request.auth.casa',
  // Um administrador acrescenta membros à SUA casa, e mais ninguém. Estava
  // `null` — só superutilizador —, o que impedia a app de ter um ecrã de
  // membros: quem administra a casa não conseguia acrescentar nem a própria
  // filha. As guardas do que se pode criar continuam nos hooks (qualidade do
  // PIN, palavra-passe de adulto, e-mail só para adultos).
  createRule: '@request.auth.papel = "admin" && casa = @request.auth.casa',
  updateRule: '@request.auth.papel = "admin" && casa = @request.auth.casa',
  deleteRule: '@request.auth.papel = "admin" && casa = @request.auth.casa',
});

// Os campos de sistema da autenticação vêm com `password` a exigir 8 caracteres
// e `email` obrigatório. Um PIN tem quatro dígitos, e uma criança não tem
// e-mail — §8 pede que assim continue. Ajustam-se depois de criar.
if (!casaHabitada) {
  const c = (await pb.collections.getFullList()).find(x => x.name === 'membros');
  await pb.collections.update(c.id, {
    fields: c.fields.map(f => {
      if (f.name === 'password') return { ...f, min: 4 };
      if (f.name === 'email') return { ...f, required: false };
      return f;
    }),
  });
}

// ── Entrar com Google ────────────────────────────────────────────────────────
// O PocketBase trata do OAuth2; nós só lhe damos as credenciais. Elas vêm do
// ambiente e nunca do código — ver .env.example e docs/GOOGLE_CALENDAR_SETUP.md.
//
// Repare no que NÃO se ativa: `createRule` de `membros` continua nulo, portanto
// entrar com Google não cria conta. Num app familiar não há inscrição livre —
// um administrador acrescenta o membro com o e-mail, e o Google só confirma que
// é mesmo essa pessoa. Quem chegar sem convite é recusado, e é o que se quer.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const c = (await pb.collections.getFullList()).find(x => x.name === 'membros');
  await pb.collections.update(c.id, {
    oauth2: {
      enabled: true,
      providers: [{
        name: 'google',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }],
      // O nome vem do perfil Google; o resto é da casa e não se deixa mapear.
      mappedFields: { name: 'nome' },
    },
  });
  console.log('OAuth do Google: ativado');
} else {
  // ⚠ Isto dizia «fica desativado», e é falso: este ramo não faz NADA. O que
  // já estivesse configurado na coleção `membros` fica como estava — e numa
  // casa habitada a coleção é preservada, portanto a entrada pela Google
  // continua a funcionar. A frase antiga fez-me acreditar que eu tinha
  // desligado a entrada do dono da casa, em 04/09/2026, e ir confirmar custou
  // uma volta. Uma mensagem que descreve o que o código não fez é um defeito.
  console.log('OAuth do Google: sem credenciais no ambiente — deixo como está');
}

await pb.collections.update(ids.casas, {
  listRule: 'id = @request.auth.casa',
  viewRule: 'id = @request.auth.casa',
  updateRule: 'id = @request.auth.casa && @request.auth.papel = "admin"',
});

// Atalhos usados em quase todas as regras.
const DA_CASA = 'casa = @request.auth.casa';

// ⚠ O `DA_CASA` sozinho NÃO CHEGA quando a linha tem relações.
//
// O campo `casa` é escolhido por quem escreve: uma regra que verifique só a
// etiqueta que o autor pôs deixa apontar as relações para dentro de outra casa.
// Este defeito apareceu CINCO vezes entre 04 e 05/09/2026, sempre com a mesma
// forma, e sempre encontrado por acaso — até o dono da casa perguntar porque é
// que eu não olhava com atenção e resolvia de vez.
//
// A resposta é esta função, e a prova genérica em
// `provar-relacoes-ancoradas.mjs`, que ENUMERA as coleções em vez de as listar.
//
// Uma relação vazia passa: `= ""` é como o PocketBase diz «não preenchida».
const daCasaTambem = (...campos) =>
  campos.map(c => `(${c} = "" || ${c}.casa = @request.auth.casa)`).join(' && ');
const ADULTO = '@request.auth.papel != "crianca"';
const ADMIN = '@request.auth.papel = "admin"';

// ── Agenda ───────────────────────────────────────────────────────────────────
//
// ⚠ Isto tinha `partilhado`, um BOOLEANO, e a app tem TRÊS níveis desde que os
// eventos ganharam o `visibilidade`: `so-eu`, `adultos`, `familia`. O booleano
// não sabe dizer o do meio, e o do meio é o que mais importa:
//
//   a consulta de uma criança entra na agenda como «adultos» — os dois adultos
//   vêem-na, a criança não, e é isso que o ecrã da Saúde promete em letras.
//
// Com um booleano, essa consulta ou passava a `partilhado: true` e a criança
// via a própria consulta, ou ficava em `false` e o outro adulto deixava de a
// ver. As duas hipóteses são erradas, e a primeira é uma fuga.
//
// Por isso o campo é um `select` com os três valores, e a regra abaixo é a
// TRADUÇÃO LITERAL do `podeVerEvento` do cliente:
//
//   o dono vê sempre o seu           autor = @request.auth.id
//   `familia`  qualquer membro       visibilidade = "familia"
//   `adultos`  só quem não é criança visibilidade = "adultos" && papel != crianca
//   `so-eu`    mais ninguém          (nenhum dos ramos acima)
//
// Não havia dados a migrar: nada escrevia nesta coleção. O `partilhado` sai em
// vez de ficar a acumular um segundo sítio onde a visibilidade vive.
const EVENTO_VISIVEL = `${DA_CASA} && (autor = @request.auth.id`
  + ` || visibilidade = "familia"`
  + ` || (visibilidade = "adultos" && ${ADULTO}))`;

// ⚠ E as RELAÇÕES têm de ser da mesma casa, não só a linha.
//
// O `casa` da linha é escolhido por quem escreve, e sozinho não prova nada — é
// o buraco que os anexos tinham desde o primeiro dia. Aqui há duas relações que
// apontam para dentro da casa, e as provas mostraram que as duas passavam:
//
//   `responsavel`  uma adulta de outra casa punha o nome do Léo num evento dela
//   `episodio`     e ligava um evento dela a uma consulta desta casa
//
// Nenhuma das duas devolvia dados nossos — mas as duas escrevem no nosso lado
// da relação a partir de fora, e é a mesma forma de defeito. Uma relação vazia
// passa: `= ""` é como o PocketBase diz «não preenchida».
//
// ⚠ Em DUAS partes, e é obrigatório: a regra não pode nomear um campo que a
// coleção ainda não tem. O `episodio` só se acrescenta mais abaixo, e pôr o
// `episodio = ""` aqui rebentava com «invalid left operand "episodio" —
// unknown field». A segunda metade entra com o campo.
const RESPONSAVEL_DA_CASA = `(responsavel = "" || responsavel.casa = @request.auth.casa)`;
const EPISODIO_DA_CASA = `(episodio = "" || episodio.casa = @request.auth.casa)`;

await criar({
  name: 'eventos', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    data('dia', { required: true }),
    txt('hora'),
    txt('titulo', { required: true }),
    // Quem o evento diz respeito — o «quem» da linha da agenda.
    rel('responsavel', ids.membros),
    // O DONO. O `podeVerEvento` do cliente chama-lhe `owner`, e é ele que a
    // regra usa: numa consulta de criança o dono é o adulto que marcou, de
    // propósito, senão a criança veria a própria consulta por ser dona dela.
    rel('autor', ids.membros, { required: true }),
    sel('visibilidade', ['so-eu', 'adultos', 'familia']),
    txt('etiqueta'),
    // ⚠ O `episodio` NÃO está aqui, e não é esquecimento: os
    // `episodios_saude` só se criam mais abaixo neste ficheiro, portanto o
    // `ids.episodios_saude` ainda é `undefined` nesta linha — e o PocketBase
    // aceitaria uma relação para o vazio sem se queixar. O campo acrescenta-se
    // depois de eles existirem; procure «a agenda aprende a saúde».
  ],
  // §5: um evento privado de outro membro NÃO é devolvido. Filtrar no cliente
  // era vazar com atraso.
  listRule: EVENTO_VISIVEL,
  viewRule: EVENTO_VISIVEL,
  // ⚠ Criar exige ADULTO e ser o próprio autor. Uma criança não põe eventos na
  // agenda da casa, e ninguém cria um evento em nome de outra pessoa.
  createRule: `${DA_CASA} && ${ADULTO} && autor = @request.auth.id && ${RESPONSAVEL_DA_CASA}`,
  // Alterar e apagar: só o dono. É mais apertado do que o cliente, que deixa
  // qualquer adulto corrigir a hora de uma reunião de pais — e essa folga fica
  // por decidir, não se abre aqui por omissão.
  updateRule: `${DA_CASA} && autor = @request.auth.id && ${RESPONSAVEL_DA_CASA}`,
  deleteRule: `${DA_CASA} && autor = @request.auth.id`,
});

// ── Tarefas ──────────────────────────────────────────────────────────────────
await criar({
  name: 'tarefas', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    txt('titulo', { required: true }),
    rel('atribuido_a', ids.membros),
    sel('recorrencia', ['uma_vez', 'diaria', 'dias_semana']),
    num('pontos', { min: 0, max: 20, onlyInt: true }),
    num('urgencia', { min: 0, max: 2, onlyInt: true }),
    data('prazo'),
  ],
  listRule: DA_CASA, viewRule: DA_CASA,
  // ⚠ `atribuido_a` tem de ser da casa, não só a linha. Sem isto, uma adulta de
  // outra casa atribuía uma tarefa a uma criança desta — a mesma forma de
  // defeito dos anexos e dos eventos, na terceira coleção. Provado em
  // provar-agenda-e-tarefas.mjs.
  createRule: `${DA_CASA} && ${ADULTO} && (atribuido_a = "" || atribuido_a.casa = @request.auth.casa)`,
  updateRule: `${DA_CASA} && ${ADULTO} && (atribuido_a = "" || atribuido_a.casa = @request.auth.casa)`,
  deleteRule: `${DA_CASA} && ${ADULTO}`,
});

// ADITIVA: uma linha por (tarefa, dia). Os pontos só contam com confirmada_em.
await criar({
  name: 'tarefas_feitas', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('tarefa', ids.tarefas, { required: true, cascadeDelete: true }),
    data('data', { required: true }),
    rel('marcada_por', ids.membros, { required: true }),
    rel('confirmada_por', ids.membros),
    data('confirmada_em'),
  ],
  indexes: ['CREATE UNIQUE INDEX idx_tarefa_dia ON tarefas_feitas (tarefa, data)'],
  listRule: DA_CASA, viewRule: DA_CASA,
  // §4: qualquer membro conclui, mas só a si atribuída — E um adulto conclui
  // qualquer uma.
  //
  // ⚠ A segunda metade faltava, e a app fazia-a: o `tapTask` deixa um adulto
  // dar uma tarefa por feita, seja de quem for, e é assim que uma mãe marca a
  // tarefa que viu o filho fazer. Sem ela, a marcação de um adulto sobre a
  // tarefa de uma criança era recusada pelo servidor e caía na fila — ficava
  // marcada no telefone dela e por fazer no dele, em silêncio. Apanhado pela
  // prova de ponta a ponta em 04/09/2026.
  //
  // O `marcada_por = @request.auth.id` fica em qualquer caso: ninguém marca em
  // nome de outra pessoa, e é isso que impede uma criança de marcar a tarefa da
  // irmã assinando com o nome dela.
  // ⚠ `tarefa.casa` e não só `casa`. Pela TERCEIRA vez o mesmo defeito de
  // forma: o `casa` da linha é escolhido por quem escreve e não prova nada.
  // Aconteceu nos anexos, nos eventos, e aqui — e aqui só apareceu depois de
  // eu alargar a regra a «ou é adulto», porque a vizinha de outra casa TAMBÉM
  // é adulta. A regra apertada escondia-o.
  //
  // A lição, escrita onde se lê: quando uma regra fala de uma RELAÇÃO, tem de
  // perguntar de que casa é a relação, não de que casa se diz a linha.
  createRule: `${DA_CASA} && tarefa.casa = @request.auth.casa`
    + ` && marcada_por = @request.auth.id`
    + ` && (tarefa.atribuido_a = @request.auth.id || ${ADULTO})`,
  // a confirmação que valida os pontos exige adulto
  updateRule: `${DA_CASA} && tarefa.casa = @request.auth.casa && ${ADULTO}`,
  deleteRule: `${DA_CASA} && tarefa.casa = @request.auth.casa && ${ADULTO}`,
});

// ── Dinheiro ─────────────────────────────────────────────────────────────────
await criar({
  name: 'envelopes', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    txt('nome', { required: true }),
    num('limite_base', { min: 0 }),
    txt('cor'),
  ],
  // §5: «invisíveis a perfis de criança — AUSENTES DA RESPOSTA».
  listRule: `${DA_CASA} && ${ADULTO}`,
  viewRule: `${DA_CASA} && ${ADULTO}`,
  createRule: `${DA_CASA} && ${ADMIN}`,
  updateRule: `${DA_CASA} && ${ADMIN}`,
  deleteRule: `${DA_CASA} && ${ADMIN}`,
});

await criar({
  name: 'despesas', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('envelope', ids.envelopes, { required: true }),
    num('valor', { required: true }),
    txt('descricao'),
    data('data'),
    rel('pagador', ids.membros, { required: true }),
    bool('divide_meias'),
    // Corrigir é ANULAR e recriar, nunca editar o valor.
    txt('anula_id'),
    // §6: chave de idempotência. Um reenvio colide em vez de duplicar.
    txt('idem_key'),
  ],
  indexes: ['CREATE UNIQUE INDEX idx_despesa_idem ON despesas (casa, idem_key)'],
  listRule: `${DA_CASA} && ${ADULTO}`,
  viewRule: `${DA_CASA} && ${ADULTO}`,
  // ⚠ `envelope.casa` e `pagador.casa`, e não só o `casa` da linha. Pela QUINTA
  // vez o mesmo defeito de forma: o `casa` da linha é escolhido por quem
  // escreve e não prova nada. Uma adulta de outra casa lançava uma despesa
  // contra um envelope DESTA — e o orçamento desta casa mostrava-a gasta.
  createRule: `${DA_CASA} && ${ADULTO} && pagador.papel != "crianca"`
    + ` && envelope.casa = @request.auth.casa && pagador.casa = @request.auth.casa`,
  updateRule: null,     // não se edita uma despesa; anula-se
  deleteRule: null,
});

// INVARIANTE #2: tabela de inserções. Sem updateRule nem deleteRule — não há
// regra que os permita, portanto o servidor recusa-os.
await criar({
  name: 'cofre_movimentos', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('membro', ids.membros, { required: true }),
    sel('tipo', ['semanada', 'bonus', 'retirada'], { required: true }),
    num('valor', { required: true }),
    txt('motivo'),
    rel('autorizado_por', ids.membros),
    data('data'),
    txt('idem_key'),
  ],
  indexes: ['CREATE UNIQUE INDEX idx_cofre_idem ON cofre_movimentos (casa, idem_key)'],
  // Adultos inserem; a criança lê o SEU cofre e mais nada.
  listRule: `${DA_CASA} && (${ADULTO} || membro = @request.auth.id)`,
  viewRule: `${DA_CASA} && (${ADULTO} || membro = @request.auth.id)`,
  createRule: `${DA_CASA} && ${ADULTO} && membro.papel = "crianca"`,
  updateRule: null,
  deleteRule: null,
});

// ── Equipamentos ─────────────────────────────────────────────────────────────
await criar({
  name: 'equipamentos', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    txt('nome', { required: true }),
    txt('categoria'),
    data('comprado_em'),
    txt('loja'),
    num('preco', { min: 0 }),
    data('garantia_ate'),
    txt('manutencao'),
    data('manutencao_ate'),
    fich('fatura'),
    fich('foto'),
  ],
  listRule: `${DA_CASA} && ${ADULTO}`,
  viewRule: `${DA_CASA} && ${ADULTO}`,
  createRule: `${DA_CASA} && ${ADULTO}`,
  updateRule: `${DA_CASA} && ${ADULTO}`,
  deleteRule: `${DA_CASA} && ${ADULTO}`,
});

console.log('criadas:', Object.keys(ids).join(', '));

// ── Preferências ─────────────────────────────────────────────────────────────
// Por membro: a Rita pode ter violeta e o Tomás cião ao mesmo tempo.
await criar({
  name: 'preferencias', type: 'base',
  fields: [
    rel('membro', ids.membros, { required: true, cascadeDelete: true }),
    num('esquema_cor', { min: 0, max: 5, onlyInt: true }),
    sel('aspeto', ['claro', 'escuro', 'sistema']),
    bool('resumo_ativo'),
    txt('resumo_hora'),
    num('aviso_prazo_dias', { min: 0, max: 7, onlyInt: true }),
  ],
  indexes: ['CREATE UNIQUE INDEX idx_pref_membro ON preferencias (membro)'],
  // As preferências são de cada um e de mais ninguém.
  listRule: 'membro = @request.auth.id',
  viewRule: 'membro = @request.auth.id',
  createRule: 'membro = @request.auth.id',
  updateRule: 'membro = @request.auth.id',
  deleteRule: 'membro = @request.auth.id',
});

// ── Compras ──────────────────────────────────────────────────────────────────
await criar({
  name: 'lojas', type: 'base',
  fields: [rel('casa', ids.casas, { required: true, cascadeDelete: true }), txt('nome', { required: true })],
  listRule: DA_CASA, viewRule: DA_CASA,
  createRule: `${DA_CASA} && ${ADULTO}`, updateRule: `${DA_CASA} && ${ADULTO}`, deleteRule: `${DA_CASA} && ${ADULTO}`,
});

await criar({
  name: 'listas_compras', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('loja', ids.lojas), rel('comprador', ids.membros),
    data('planeada_para'), data('fechada_em'),
  ],
  // A lista é de todos: as crianças também pedem artigos.
  listRule: DA_CASA, viewRule: DA_CASA,
  createRule: `${DA_CASA} && ${ADULTO} && ${daCasaTambem('loja', 'comprador')}`,
  updateRule: `${DA_CASA} && ${ADULTO} && ${daCasaTambem('loja', 'comprador')}`,
  deleteRule: `${DA_CASA} && ${ADULTO}`,
});

await criar({
  name: 'artigos', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('lista', ids.listas_compras, { required: true, cascadeDelete: true }),
    txt('rotulo', { required: true }),
    num('seccao', { min: 0, max: 3, onlyInt: true }),
    rel('pedido_por', ids.membros),
    sel('estado', ['por_comprar', 'confirmado', 'sem_stock']),
    num('estimativa', { min: 0 }), num('preco_real', { min: 0 }),
    bool('habitual'),
  ],
  // O estado vive na linha do artigo. Se fosse uma lista de identificadores
  // confirmados, dois telefones na mesma loja anulavam-se; assim, fundem-se.
  listRule: DA_CASA, viewRule: DA_CASA,
  createRule: `${DA_CASA} && ${daCasaTambem('lista', 'pedido_por')}`,
  updateRule: `${DA_CASA} && ${daCasaTambem('lista', 'pedido_por')}`,
  deleteRule: `${DA_CASA} && ${ADULTO}`,
});

// ── Dinheiro, o resto ────────────────────────────────────────────────────────
await criar({
  name: 'meses', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    data('mes', { required: true }), num('rendimento', { min: 0 }),
    { name: 'limites', type: 'json', maxSize: 20000 },
    data('fechado_em'),
  ],
  listRule: `${DA_CASA} && ${ADULTO}`, viewRule: `${DA_CASA} && ${ADULTO}`,
  createRule: `${DA_CASA} && ${ADMIN}`, updateRule: `${DA_CASA} && ${ADMIN}`, deleteRule: null,
});

// ADITIVA: valor sempre positivo, o sinal vem da direção.
await criar({
  name: 'transferencias', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('de_envelope', ids.envelopes, { required: true }),
    rel('para_envelope', ids.envelopes, { required: true }),
    num('valor', { min: 0.01, required: true }), data('mes'),
    rel('por', ids.membros, { required: true }), txt('idem_key'),
  ],
  indexes: ['CREATE UNIQUE INDEX idx_transf_idem ON transferencias (casa, idem_key)'],
  listRule: `${DA_CASA} && ${ADULTO}`, viewRule: `${DA_CASA} && ${ADULTO}`,
  // ⚠ Os DOIS envelopes têm de ser da casa. Sem isto, uma administradora de
  // outra casa movia dinheiro entre os envelopes desta — apanhado pela prova do
  // orçamento em 05/09/2026, e é a quinta vez que este defeito aparece.
  createRule: `${DA_CASA} && ${ADMIN} && por = @request.auth.id`
    + ` && de_envelope.casa = @request.auth.casa`
    + ` && para_envelope.casa = @request.auth.casa`,
  updateRule: null, deleteRule: null,
});

// ADITIVA: pagamento parcial é permitido, o resto continua em dívida.
await criar({
  name: 'acertos', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('de_membro', ids.membros, { required: true }),
    rel('para_membro', ids.membros, { required: true }),
    num('valor', { min: 0.01, required: true }), data('data'), txt('idem_key'),
  ],
  indexes: ['CREATE UNIQUE INDEX idx_acerto_idem ON acertos (casa, idem_key)'],
  listRule: `${DA_CASA} && ${ADULTO}`, viewRule: `${DA_CASA} && ${ADULTO}`,
  createRule: `${DA_CASA} && ${ADULTO} && de_membro.papel != "crianca" && para_membro.papel != "crianca"`,
  updateRule: null, deleteRule: null,
});

await criar({
  name: 'metas', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    txt('nome', { required: true }), num('alvo', { min: 0 }), num('atual', { min: 0 }), txt('quando'),
  ],
  listRule: `${DA_CASA} && ${ADULTO}`, viewRule: `${DA_CASA} && ${ADULTO}`,
  createRule: `${DA_CASA} && ${ADMIN}`, updateRule: `${DA_CASA} && ${ADMIN}`, deleteRule: `${DA_CASA} && ${ADMIN}`,
});

// ── Listas da casa ───────────────────────────────────────────────────────────
for (const nome of ['categorias_equip', 'especialidades']) {
  await criar({
    name: nome, type: 'base',
    fields: [rel('casa', ids.casas, { required: true, cascadeDelete: true }), txt('nome', { required: true })],
    listRule: `${DA_CASA} && ${ADULTO}`, viewRule: `${DA_CASA} && ${ADULTO}`,
    createRule: `${DA_CASA} && ${ADMIN}`, updateRule: `${DA_CASA} && ${ADMIN}`, deleteRule: `${DA_CASA} && ${ADMIN}`,
  });
}

await criar({
  name: 'manutencoes', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('equipamento', ids.equipamentos, { required: true, cascadeDelete: true }),
    txt('descricao', { required: true }), data('a_fazer_ate'), data('feita_em'),
  ],
  listRule: `${DA_CASA} && ${ADULTO}`, viewRule: `${DA_CASA} && ${ADULTO}`,
  createRule: `${DA_CASA} && ${ADULTO} && ${daCasaTambem('equipamento')}`,
  updateRule: `${DA_CASA} && ${ADULTO} && ${daCasaTambem('equipamento')}`,
  deleteRule: `${DA_CASA} && ${ADULTO}`,
});

// ── Saúde ────────────────────────────────────────────────────────────────────
//
// §5 chama a esta «a regra mais restritiva do sistema, e a que mais tem de ser
// testada». São duas regras, não uma:
//
//   ficha de ADULTO   → só o próprio. Nem o companheiro, nem a administração.
//   ficha de CRIANÇA  → os adultos da casa. A criança NÃO lê a sua.
//
// ⚠ A criança lia a sua, e era uma DIVERGÊNCIA de três pontas. O `podeVerSaude`
// do cliente diz que não lê, o ecrã da Saúde promete «invisíveis às próprias»
// em letras — e esta regra devolvia-a. Duas contra uma, mas o que decide não é
// a contagem: o INVARIANTE #3 diz que o dado não pode CHEGAR ao dispositivo, e
// aqui chegava. O telemóvel do Léo recebia a ficha dele e era só a interface a
// esconder--lha, que é exatamente a forma de falha que o invariante existe para
// impedir. Resolvido em 03/09/2026, por decisão do dono da casa: o servidor
// deixa de a devolver.
//
// A condição diz agora: tenho de ser adulto, E o registo é meu ou de uma
// criança. Um adulto nunca cai no segundo ramo por outro adulto.
//
// Repare que ficou IGUAL à condição de escrita, logo abaixo. Era a leitura da
// criança que fazia as duas diferirem; sem ela, quem pode ver é exatamente quem
// pode escrever, e há uma regra a menos para manter em dois sítios.
//
// §5 acrescenta que «a transição de papel tem de reavaliar a visibilidade
// retroativamente». Isto fá-lo sem migrar nada: a regra lê `membro.papel` a
// cada consulta, portanto uma criança que passe a adulta deixa de ter a ficha
// visível aos pais no instante seguinte.
//
// ⚠ Isto NÃO dispensa a conformidade. Ver db/README.md: são dados clínicos de
// menores, e há cinco pontos por resolver antes da primeira linha real.
const SAUDE_VISIVEL =
  `${DA_CASA} && ${ADULTO} && (membro = @request.auth.id || membro.papel = "crianca")`;

await criar({
  name: 'episodios_saude', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('membro', ids.membros, { required: true, cascadeDelete: true }),
    txt('especialidade', { required: true }),
    txt('medico'),
    data('dia', { required: true }),
    txt('hora'),
    txt('notas'),
  ],
  listRule: SAUDE_VISIVEL,
  viewRule: SAUDE_VISIVEL,
  // Escrever é a MESMA condição de ler, desde que a criança deixou de ler a
  // sua. Quem registra e quem vê são os adultos da casa.
  createRule: `${DA_CASA} && (membro = @request.auth.id && ${ADULTO} || ${ADULTO} && membro.papel = "crianca")`,
  updateRule: `${DA_CASA} && (membro = @request.auth.id && ${ADULTO} || ${ADULTO} && membro.papel = "crianca")`,
  deleteRule: `${DA_CASA} && (membro = @request.auth.id && ${ADULTO} || ${ADULTO} && membro.papel = "crianca")`,
});

// ── A agenda aprende a saúde ─────────────────────────────────────────────────
//
// O campo que faltava aos `eventos`, acrescentado agora que os
// `episodios_saude` existem. É o «nenhum exame órfão» dito ao contrário: a
// consulta É o evento, e o cliente já os liga pelo `healthId` — sem este campo
// a ligação perdia-se ao subir, e do outro lado ficava um evento «Consulta
// Dentista» que não correspondia a episódio nenhum.
//
// ⚠ Acrescenta-se por `update` e não na criação porque a ordem deste ficheiro
// põe os eventos primeiro. E o `eventos` teve de subir na lista de limpeza
// (`NOSSAS`), para ser apagado ANTES do `episodios_saude` que agora refere —
// senão a limpeza para com «existing reference in eventos», que é o mesmo erro
// que a `credenciais_agenda` ensinou.
{
  const ev = (await pb.collections.getFullList()).find(x => x.name === 'eventos');
  await pb.collections.update(ev.id, {
    fields: [...ev.fields,
      rel('episodio', ids.episodios_saude, { cascadeDelete: true })],
    // ⚠ E as regras de escrita ganham AGORA a segunda metade do guarda das
    // relações. Sem esta linha, o campo existia e ninguém verificava de que
    // casa era o episódio — que é precisamente o buraco que se está a fechar.
    createRule: `${DA_CASA} && ${ADULTO} && autor = @request.auth.id`
      + ` && ${RESPONSAVEL_DA_CASA} && ${EPISODIO_DA_CASA}`,
    updateRule: `${DA_CASA} && autor = @request.auth.id`
      + ` && ${RESPONSAVEL_DA_CASA} && ${EPISODIO_DA_CASA}`,
  });
}

// ── O que pende de um episódio ───────────────────────────────────────────────
//
// Anexos, notas, receitas e decisões. Todos herdam a visibilidade do episódio a
// que pertencem — nunca soltos, para não haver um caminho por onde escapem — e
// todos usam ESTA condição, uma só, e não uma cópia por coleção.
//
// ⚠ `episodio.casa` e não `casa`. Custou um buraco a sério, encontrado pela
// prova nova em 04/09/2026 e presente nos `anexos` desde o primeiro dia:
//
//   a regra era `casa = @request.auth.casa && adulto && (episodio.membro = eu
//   || episodio.membro.papel = "crianca")`
//
// O `casa` é o da PRÓPRIA LINHA, e quem escreve escolhe-o. Uma adulta de outra
// casa punha a casa dela na linha, apontava o `episodio` para a consulta de uma
// criança desta, e passava: é adulta, e a criança é criança. A regra nunca
// perguntava de que casa era o EPISÓDIO.
//
// Ler a consulta ela não conseguia. Pendurar-lhe um exame conseguia — e depois
// lê-lo, porque o anexo era dela. Onze provas dos anexos nunca tentaram isto.
//
// Prendendo ao `episodio.casa`, o vínculo é ao dado e não à etiqueta que quem
// escreve põe na linha. O `casa` da linha fica, por ser útil a consultas e por
// ser o que o `cascadeDelete` da casa usa — mas já não é ele que autoriza.
const PELO_EPISODIO =
  `episodio.casa = @request.auth.casa && ${ADULTO}`
  + ` && (episodio.membro = @request.auth.id || episodio.membro.papel = "crianca")`;

await criar({
  name: 'anexos', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('episodio', ids.episodios_saude, { required: true, cascadeDelete: true }),
    sel('tipo', ['exame', 'receita', 'relatorio']),
    txt('titulo', { required: true }),
    fich('ficheiro'),
  ],
  listRule: PELO_EPISODIO,
  viewRule: PELO_EPISODIO,
  createRule: PELO_EPISODIO,
  updateRule: PELO_EPISODIO,
  deleteRule: PELO_EPISODIO,
});

// ── O que pende de uma consulta: notas, receitas e decisões ──────────────────
//
// Estas três viviam SÓ no dispositivo — `healthNotes`, `healthRecipes` e
// `healthDecisions` na loja — e não por escolha de privacidade: não tinham para
// onde ir. A consulta e os anexos sobem desde 03/09/2026; a nota que a Rita
// escreve no telefone dela não chegava ao Tomás, e não por ser privada, mas por
// não sair daquele telefone.
//
// ⚠ Usam o `PELO_EPISODIO` definido acima, o mesmo dos `anexos` — não uma cópia
// dele. Uma nota de uma consulta é o mesmo dado clínico que a consulta: se a
// ficha não é visível, a nota também não pode ser. Escrever a condição outra
// vez era criar um segundo sítio onde ela pode divergir, e foi assim que a
// criança chegou a ler a própria ficha.
//
// As notas de uma consulta.
//
// ⚠ Só o AUTOR altera ou apaga a sua nota, e a regra é do servidor — não é o
// cliente a esconder o lápis. Uma nota é o relato de uma pessoa sobre o que
// ouviu na consulta; o outro adulto reescrevê-la em silêncio é pior do que não
// a poder corrigir. E `autor = @request.auth.id` na criação impede escrever uma
// nota em nome de outra pessoa, que seria a mesma coisa pela porta do lado.
await criar({
  name: 'notas_saude', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('episodio', ids.episodios_saude, { required: true, cascadeDelete: true }),
    rel('autor', ids.membros, { required: true }),
    txt('texto', { required: true, max: 2000 }),
    data('editada_em'),
  ],
  listRule: PELO_EPISODIO,
  viewRule: PELO_EPISODIO,
  createRule: `${PELO_EPISODIO} && autor = @request.auth.id`,
  updateRule: `${PELO_EPISODIO} && autor = @request.auth.id`,
  deleteRule: `${PELO_EPISODIO} && autor = @request.auth.id`,
});

// As receitas de uma consulta, com a decisão de cada uma.
//
// A `decisao` é o que o adulto decidiu fazer com ela — comprar, já tem, não
// comprar — e é por receita, não por consulta.
await criar({
  name: 'receitas_saude', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('episodio', ids.episodios_saude, { required: true, cascadeDelete: true }),
    txt('nome', { required: true }),
    txt('dose'),
    txt('quantidade'),
    txt('unidade'),
    data('expira_em'),
    txt('decisao'),
  ],
  listRule: PELO_EPISODIO,
  viewRule: PELO_EPISODIO,
  createRule: PELO_EPISODIO,
  updateRule: PELO_EPISODIO,
  deleteRule: PELO_EPISODIO,
});

// A decisão sobre a consulta: resolvida, ou por resolver.
//
// ⚠ Uma por episódio, e o `episodio` é ÚNICO por isso. Sem a unicidade, dois
// telefones que decidam ao mesmo tempo criavam duas linhas e o ecrã escolhia
// uma ao acaso — o mesmo problema que os saldos têm, e aqui a resposta não pode
// ser somar: uma decisão é um estado, não um movimento. Então prende-se no
// servidor, que é o único sítio onde os dois telefones se encontram.
await criar({
  name: 'decisoes_saude', type: 'base',
  fields: [
    rel('casa', ids.casas, { required: true, cascadeDelete: true }),
    rel('episodio', ids.episodios_saude, { required: true, cascadeDelete: true }),
    txt('tipo'),
    sel('estado', ['resolvido', 'pendente']),
    txt('nota'),
    data('atualizada_em'),
  ],
  indexes: ['CREATE UNIQUE INDEX idx_decisao_por_episodio ON decisoes_saude (episodio)'],
  listRule: PELO_EPISODIO,
  viewRule: PELO_EPISODIO,
  createRule: PELO_EPISODIO,
  updateRule: PELO_EPISODIO,
  deleteRule: PELO_EPISODIO,
});

// ── Vistas: os saldos ────────────────────────────────────────────────────────
// INVARIANTE #2 posto em estrutura. O saldo é uma SOMA calculada pelo servidor,
// não uma coluna que alguém escreve. Uma vista não tem escrita nenhuma, portanto
// não há sequer como a escrever por engano.
const vista = (name, viewQuery, regra) => criar({
  name, type: 'view', fields: [], viewQuery, listRule: regra, viewRule: regra,
});

// O analisador de vistas do PocketBase estropia quebras de linha dentro de
// subconsultas — descobri-o com um erro que substituía o WHERE por
// «__pb_discard__». Por isso cada consulta vai numa linha só, por feia que fique.

// O adulto vê os cofres das crianças; a criança vê o seu.
await vista('v_cofre_saldo',
  "SELECT m.id AS id, m.id AS membro, m.casa AS casa, COALESCE((SELECT SUM(cm.valor) FROM cofre_movimentos cm WHERE cm.membro = m.id), 0) AS saldo FROM membros m WHERE m.papel = 'crianca'",
  `${DA_CASA} && (${ADULTO} || membro = @request.auth.id)`);

// Gasto por envelope, excluindo as despesas anuladas.
await vista('v_envelope_gasto',
  "SELECT e.id AS id, e.id AS envelope, e.casa AS casa, e.nome AS nome, COALESCE((SELECT SUM(d.valor) FROM despesas d WHERE d.envelope = e.id AND (d.anula_id IS NULL OR d.anula_id = '')), 0) AS gasto FROM envelopes e",
  `${DA_CASA} && ${ADULTO}`);

// Positivo = tem a receber. Negativo = deve.
await vista('v_acerto_saldo',
  "SELECT m.id AS id, m.id AS membro, m.casa AS casa, (COALESCE((SELECT SUM(d.valor / 2) FROM despesas d WHERE d.pagador = m.id AND d.divide_meias = TRUE AND (d.anula_id IS NULL OR d.anula_id = '')), 0) + COALESCE((SELECT SUM(a.valor) FROM acertos a WHERE a.de_membro = m.id), 0) - COALESCE((SELECT SUM(a2.valor) FROM acertos a2 WHERE a2.para_membro = m.id), 0)) AS saldo FROM membros m WHERE m.papel != 'crianca'",
  `${DA_CASA} && ${ADULTO}`);

// Pontos confirmados que ainda não entraram numa semanada posterior.
await vista('v_pontos_por_pagar',
  "SELECT m.id AS id, m.id AS membro, m.casa AS casa, COALESCE((SELECT SUM(t.pontos) FROM tarefas_feitas tf JOIN tarefas t ON t.id = tf.tarefa WHERE tf.marcada_por = m.id AND tf.confirmada_em IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cofre_movimentos cm WHERE cm.membro = m.id AND cm.tipo = 'semanada' AND cm.data > tf.confirmada_em)), 0) AS pontos FROM membros m WHERE m.papel = 'crianca'",
  `${DA_CASA} && (${ADULTO} || membro = @request.auth.id)`);
console.log('vistas:', ['v_cofre_saldo','v_envelope_gasto','v_acerto_saldo','v_pontos_por_pagar'].join(', '));
