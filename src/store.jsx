import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TASKS, ITEMS, EVENTS, EQUIP, ENV_BASE, MEMBERS, ROLES, HEALTH, HEALTH_DOCS, VAULT, DE } from './data';
import { TODAY_KEY, TODAY, MONTHS, dueInfo, daysUntil, warrantyDaysLeft, chaveDeDMY,
         chaveRelativa } from './format';
import { observacao, precosDe, estimativaDe, compararLojas } from './precos';
// A camada do servidor entra por importação dinâmica, não estática. Duas
// razões: o SDK do PocketBase é ESM e uma importação estática arrastava-o
// para dentro dos testes — a suite de regressões deixou de carregar inteira,
// de 119 testes para 18, assim que a loja passou a falar com o servidor. E
// numa app que corre local, carregar um cliente de rede que nunca é usado é
// peso a mais no arranque.
let sync = null;
const carregarSync = async () => {
  if (sync) return sync;
  try { sync = await import('./sync'); } catch { sync = null; }
  return sync;
};

// ── Visibilidade da saúde (INVARIANTE #3) ───────────────────────────────────
// Puras e exportadas de propósito: uma regra de visibilidade que só se
// verifica a olho, no ecrã, não é uma regra — é uma esperança. Assim há uma
// prova em __tests__ que corre sem React e sem interface, e que falha se
// alguém alargar o filtro sem dar por isso.
//
// A ficha de um adulto é só dele; as das crianças são visíveis aos adultos e
// invisíveis às próprias. Esta é a regra do cliente — a do servidor está em
// docs/seguranca.html, tem 15 provas, e é a que conta.
export const podeVerSaude = (member, viewer) =>
  MEMBERS[member] && MEMBERS[member].kid
    ? !!(MEMBERS[viewer] && !MEMBERS[viewer].kid)
    : member === viewer;

// As receitas com prazo a acabar que este membro pode ver.
export const receitasAExpirarDe = (docs, viewer, limite = 30) => (docs || [])
  .filter(d => d.kind === 'Receita' && d.expires && podeVerSaude(d.member, viewer))
  .map(d => ({ ...d, dias: daysUntil(d.expires) }))
  .filter(d => d.dias !== null && d.dias <= limite)
  .sort((a, b) => a.dias - b.dias);

// As consultas já marcadas para os próximos dias que este membro pode ver.
export const consultasProximasDe = (consultas, viewer, limite = 7) => (consultas || [])
  .filter(h => podeVerSaude(h.member, viewer))
  .map(h => ({ ...h, dias: daysUntil(h.day) }))
  .filter(h => h.dias !== null && h.dias >= 0 && h.dias <= limite)
  .sort((a, b) => a.dias - b.dias);

// ── Visibilidade de um evento (INVARIANTE #3) ───────────────────────────────
//
// Três níveis, e não dois. Havia `shared: true/false` — ou a casa toda, ou
// mais ninguém — e faltava o do meio, que é o que uma família precisa mais
// vezes: uma consulta, uma reunião na escola, uma conta a pagar. Coisas que os
// dois adultos têm de saber e que não têm de aparecer na agenda de uma criança
// de sete anos.
//
// Puras e exportadas de propósito, como o `podeVerSaude`: uma regra de
// visibilidade que só se verifica a olho, no ecrã, não é uma regra — é uma
// esperança.
//
// ⚠ Esta é a regra do CLIENTE. O INVARIANTE #3 diz que a que conta é a do
// servidor: um evento que este filtro esconde continua a chegar ao
// dispositivo. Quando os eventos passarem para o PocketBase, a coleção
// `eventos` precisa da regra equivalente — está por fazer, e está dito.
export const VISIBILIDADES = [
  { chave: 'familia', rotulo: 'Toda a família',
    detalhe: 'Aparece na agenda de todos, incluindo as crianças.' },
  { chave: 'adultos', rotulo: 'Só os adultos',
    detalhe: 'Os adultos da casa veem; as crianças não.' },
  { chave: 'so-eu', rotulo: 'Só eu',
    detalhe: 'Mais ninguém o vê, nem o outro adulto.' },
];

// A forma antiga era um booleano. Um evento gravado antes disto não tem
// `visibilidade`, e ler `undefined` como «só eu» esconderia metade da agenda
// da casa de um dia para o outro.
export const visibilidadeDe = (evento) => {
  if (!evento) return 'so-eu';
  if (evento.visibilidade) return evento.visibilidade;
  return evento.shared ? 'familia' : 'so-eu';
};

// Quem pode MUDAR um evento, que não é o mesmo que quem o vê.
//
// Um adulto muda o que vê: numa casa de dois, obrigar a Rita a pedir ao Tomás
// para corrigir a hora de uma reunião de pais é atrito sem ganho — os dois já
// veem o evento e os dois vão à reunião.
//
// Uma criança muda só o que é seu. A agenda da casa não é dela para arrumar,
// e é a mesma linha que o resto da app já traça.
export const podeEditarEvento = (evento, viewer, quadro = MEMBERS) => {
  if (!podeVerEvento(evento, viewer, quadro)) return false;
  if (evento.owner === viewer) return true;
  return !!(quadro[viewer] && !quadro[viewer].kid);
};

export const podeVerEvento = (evento, viewer, quadro = MEMBERS) => {
  if (!evento) return false;
  if (evento.owner === viewer) return true;             // o dono vê sempre o seu
  const v = visibilidadeDe(evento);
  if (v === 'familia') return true;
  if (v === 'adultos') return !!(quadro[viewer] && !quadro[viewer].kid);
  return false;
};

// ── PIN ─────────────────────────────────────────────────────────────────────
// O PIN era gravado em claro: o armazenamento local tinha `{"Léo": "2470"}`,
// legível por qualquer coisa com acesso à página. O db/README.md diz «resumo,
// não o valor», e o servidor faz isso; o cliente não fazia.
//
// Isto não é criptografia — é uma app local, e não há segredo a guardar do
// dono do dispositivo. É para o PIN de uma criança não ficar à vista de quem
// abra as ferramentas do navegador. O nome entra no resumo para que o mesmo
// PIN em dois membros dê resumos diferentes.
export const resumoPin = (nome, pin) => {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  const texto = `nossa-casa/pin/${nome}/${pin}`;
  for (let i = 0; i < texto.length; i++) {
    h1 = Math.imul(h1 ^ texto.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 + texto.charCodeAt(i) + i, 0x85ebca6b) >>> 0;
  }
  return `h${h1.toString(36)}${h2.toString(36)}`;
};

// ── Renomear um membro ───────────────────────────────────────────────────────
//
// Na loja local o nome NÃO é um rótulo: é a chave que liga tarefas, eventos,
// cofres, fichas de saúde, PIN, papéis e esquemas de cor. Mudá-lo é uma
// migração, e uma migração incompleta perde dados em silêncio — uma tarefa
// atribuída a um nome que já não existe deixa de aparecer no filtro e não dá
// erro nenhum.
//
// Por isso os sítios estão numa tabela, e não espalhados por um punhado de
// `.replace`. As duas listas foram levantadas do estado a sério, com uma
// sonda que anda pelo objeto todo — não de cabeça.
//
// O que NÃO se reescreve, de propósito: o texto que as pessoas escreveram.
// Uma tarefa chamada «Levar o Léo à escola» fica com esse título, e o registo
// da casa continua a dizer o que aconteceu na altura. Reescrever o que alguém
// escreveu é presumir que todos os «Léo» daquele texto são este Léo.

// Mapas cuja CHAVE é o nome do membro.
export const MAPAS_POR_MEMBRO = [
  'membros', 'roles', 'pins', 'paidPts', 'schemeByUser', 'themeByUser', 'importDone',
];

// Campos cujo VALOR é o nome de um membro. `lista` percorre um array, `mapa`
// percorre os valores de um objeto, `mapaDeListas` percorre as listas dentro
// de um objeto.
//
// `listas` é para campos que guardam VÁRIOS nomes — os responsáveis de um
// evento. Sem isto, renomear um membro deixava o nome antigo lá dentro e o
// evento passava a nomear alguém que já não existe. É o mesmo defeito que a
// tabela existe para evitar, uma forma abaixo.
export const CAMPOS_COM_MEMBRO = [
  { chave: 'newTasks', forma: 'lista', campos: ['who'] },
  { chave: 'taskEdits', forma: 'mapa', campos: ['who'] },
  { chave: 'added', forma: 'lista', campos: ['owner'], listas: ['responsaveis'] },
  { chave: 'eventEdits', forma: 'mapa', campos: ['owner'], listas: ['responsaveis'] },
  { chave: 'vaultMoves', forma: 'lista', campos: ['kid'] },
  { chave: 'health', forma: 'lista', campos: ['member'] },
  { chave: 'healthDocs', forma: 'lista', campos: ['member'] },
  { chave: 'healthNotes', forma: 'mapaDeListas', campos: ['author'] },
  { chave: 'shopPlan', forma: 'objeto', campos: ['who'] },
];

// Devolve o estado com o membro renomeado. Pura de propósito: assim prova-se
// sem React, e serve de migração se um dia for preciso.
//
// O PIN sai. O resumo é calculado com o nome lá dentro — é isso que faz o
// mesmo PIN em dois membros dar resumos diferentes — portanto um PIN gravado
// para «Léo» não valida para «Leonardo», e não há forma de o recalcular sem o
// valor em claro, que ninguém tem. Sai, e o ecrã diz que sai.
export const renomearNoEstado = (estado, antigo, novo) => {
  // Sem isto, renomear para o mesmo nome apagava o PIN à mesma: a troca de
  // chave era inofensiva, mas a linha que limpa o PIN não olhava para o nome
  // antigo. A loja nunca chegava aqui — devolve cedo — e a prova chegou.
  if (antigo === novo) return estado;
  const fora = { ...estado };
  const trocaChave = (obj) => {
    if (!obj || typeof obj !== 'object' || !(antigo in obj)) return obj;
    const { [antigo]: valor, ...resto } = obj;
    return { ...resto, [novo]: valor };
  };
  const trocaValor = (registo, campos, listas = []) => {
    if (!registo || typeof registo !== 'object') return registo;
    let mexido = null;
    for (const c of campos || []) {
      if (registo[c] === antigo) (mexido = mexido || { ...registo })[c] = novo;
    }
    for (const c of listas) {
      const xs = registo[c];
      if (Array.isArray(xs) && xs.includes(antigo)) {
        (mexido = mexido || { ...registo })[c] = xs.map(x => (x === antigo ? novo : x));
      }
    }
    return mexido || registo;
  };

  for (const chave of MAPAS_POR_MEMBRO) fora[chave] = trocaChave(fora[chave]);

  // O PIN não sobrevive à mudança de nome, e a inicial acompanha-a.
  if (fora.pins) { const { [novo]: _fora, ...resto } = fora.pins; fora.pins = resto; }
  if (fora.membros && fora.membros[novo]) {
    fora.membros = { ...fora.membros, [novo]: { ...fora.membros[novo],
      initial: String(novo).trim().charAt(0).toUpperCase() } };
  }

  for (const { chave, forma, campos, listas } of CAMPOS_COM_MEMBRO) {
    const v = fora[chave];
    if (!v) continue;
    if (forma === 'lista') fora[chave] = v.map(r => trocaValor(r, campos, listas));
    else if (forma === 'objeto') fora[chave] = trocaValor(v, campos, listas);
    else if (forma === 'mapa') {
      fora[chave] = Object.fromEntries(
        Object.entries(v).map(([k, r]) => [k, trocaValor(r, campos, listas)]));
    } else if (forma === 'mapaDeListas') {
      fora[chave] = Object.fromEntries(Object.entries(v)
        .map(([k, lista]) => [k, (lista || []).map(r => trocaValor(r, campos, listas))]));
    }
  }
  return fora;
};

// Pontos de partida da demonstração. Uma criança acrescentada à casa começa a
// zero — não herda o histórico de ninguém.
const PONTOS_INICIAIS = { 'Léo': 14, 'Mia': 11 };

// Despesas partilhadas por acertar, na demonstração. As 14 despesas do mês
// estão nos dados; o valor está aqui até o cálculo real das partilhas existir.
const ACERTO_INICIAL = 86.5;

const KEY = 'nossa-casa/v1';

// A cópia de segurança de antes da última migração. Uma só, sempre a última —
// ver o bloco que a escreve, no carregamento.
const BACKUP = `${KEY}.antes-da-migracao`;

// As chaves que versões anteriores usaram para o mesmo e deixaram atrás.
// Limpam-se no arranque: eram uma por migração, e nenhuma saía.
const BACKUPS_ANTIGOS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(n => `${KEY}.antes-de-v${n}`);

// Só isto é gravado. O resto — separador ativo, folha aberta, rascunhos — é UI.
const DATA_KEYS = [
  'done', 'pending', 'status', 'registered', 'acertoMovs', 'vaultMoves', 'paidPts', 'extraLog',
  'envMove', 'added', 'newTasks', 'taskEdits', 'taskGone', 'newItems', 'itemGone',
  'newEquip', 'equipGone', 'equipEdits', 'schemeByUser', 'themeByUser', 'importDone', 'notif',
  'rotate', 'urg', 'due', 'monthName', 'monthLimits', 'monthZero', 'clearedSeeds',
  'eventGone', 'eventEdits', 'roles', 'pins', 'pointValue', 'payDay', 'splitHalf',
  'rendimento', 'stores', 'shopPlan', 'shopHistory', 'precos', 'precoPago', 'health', 'specialities', 'equipCats', 'registo',
  'recurringReset', 'healthNotes', 'healthRecipes', 'healthDecisions', 'healthDocs', 'healthGone',
  'googleCalendarImported', // Google Calendar imports
  'membros', 'nomeDaCasa', 'deDemonstracao',
];

// Versão do formato gravado. Sobe sempre que a forma de um campo persistido
// muda, e MIGRATIONS ganha a entrada correspondente. Sem isto, dados antigos
// eram lidos com a forma nova e ganhavam silenciosamente ao código.
export const SCHEMA = 13;

// Uma migração por salto de versão: recebe o objeto lido e devolve-o corrigido.
export const MIGRATIONS = {
  // v1 → v2: o cofre deixou de ser um saldo escrito e as sementes deixaram de
  // ser gravadas. Se o saldo antigo divergir das sementes, a diferença fica
  // como movimento de acerto — dinheiro nunca desaparece numa migração.
  2: (o) => {
    const seedOf = (kid) => VAULT.reduce((n, m) => (m.kid === kid ? n + m.delta : n), 0);
    const seedIds = new Set(VAULT.map(m => m.id));
    // as sementes que estavam gravadas saem; ficam só os movimentos do utilizador
    const mine = (o.vaultMoves || []).filter(m => !seedIds.has(m.id));
    const acertos = [];
    for (const [kid, saldo] of Object.entries(o.vault || {})) {
      const diff = Math.round((saldo - seedOf(kid)) * 100) / 100;
      if (diff !== 0) acertos.push({
        id: `vm-acerto-${kid}`, kid, delta: diff, kind: 'semanada',
        day: TODAY_KEY, label: 'Acerto de saldo anterior',
        sub: 'da versão anterior da app',
      });
    }
    const { vault, ...resto } = o;
    return { ...resto, vaultMoves: [...mine, ...acertos] };
  },

  // v2 → v3: os registos de saúde gravados tinham `date` com o texto do
  // formulário; as sementes têm `day` em chave. Passam todos a `day`. Um
  // registo cuja data não se consiga ler mantém o texto no sítio da chave —
  // fica visível e mal ordenado, o que é melhor do que desaparecer.
  3: (o) => ({
    ...o,
    health: (o.health || []).map((h) => {
      const { date, ...resto } = h;
      if (resto.day) return resto;
      return { ...resto, day: chaveDeDMY(date) || date, time: resto.time || '' };
    }),
  }),

  // v3 → v4: os PIN estavam gravados em claro. Quem já tinha um passa a
  // resumo; o valor antigo deixa de existir em disco a seguir a isto.
  4: (o) => ({
    ...o,
    pins: Object.fromEntries(Object.entries(o.pins || {})
      .map(([n, p]) => [n, /^[0-9]{4}$/.test(String(p)) ? resumoPin(n, p) : p])),
  }),

  // v4 → v5: o acerto entre adultos era um booleano `settled` mais o montante
  // somado ao livro dos pontos das crianças. Passa a ser uma lista de
  // movimentos, como o cofre e os envelopes. Quem já tinha acertado leva um
  // movimento pelo valor todo, para não ver a dívida ressuscitar.
  5: (o) => {
    const { settled, ...resto } = o;
    return {
      ...resto,
      acertoMovs: o.acertoMovs
        || (settled ? [{ valor: ACERTO_INICIAL, data: null, nota: 'acerto anterior' }] : []),
    };
  },

  // v5 → v6: quem já tinha limpado as sementes ficou com o DINHEIRO da
  // demonstração. A limpeza corre uma vez, na transição, e essas casas já
  // tinham transitado — continuavam a mostrar «Disponível 383,00 € de
  // 1 770,00 €», que são os gastos e os limites da família inventada.
  //
  // A condição é estreita de propósito: só quem limpou as sementes E nunca
  // definiu limites próprios. Quem tem `monthLimits` escolheu-os, e isso não
  // se toca — apagar o orçamento de alguém para corrigir um defeito meu seria
  // trocar um erro por outro pior.
  6: (o) => (o.clearedSeeds && !o.monthLimits
    ? { ...o, ...SEM_DINHEIRO_SEMEADO() }
    : o),

  // v6 → v7: a visibilidade de um evento era `shared: true/false` e passa a
  // três níveis. A tradução é direta e não muda o que ninguém vê: o que era
  // partilhado passa a «toda a família», o que não era passa a «só eu». O
  // nível do meio é novo e ninguém o tem ainda.
  7: (o) => ({
    ...o,
    added: (o.added || []).map(e => {
      // Os eventos que o «Guardar evento» gravou no campo errado. Existem, têm
      // título e data, e nunca apareceram em lado nenhum porque a app lê
      // `day` e eles tinham `date`. Recuperam-se em vez de ficarem órfãos —
      // alguém os escreveu de propósito.
      const { date, ...resto } = e;
      const comDia = e.day ? resto
        : date ? { ...resto, day: /^d/.test(String(date)) ? date : `d${date}` }
        : resto;
      return comDia.visibilidade ? comDia
        : { ...comDia, visibilidade: comDia.shared ? 'familia' : 'so-eu' };
    }),
    eventEdits: Object.fromEntries(Object.entries(o.eventEdits || {})
      .map(([k, e]) => [k, e && e.shared !== undefined && !e.visibilidade
        ? { ...e, visibilidade: e.shared ? 'familia' : 'so-eu' } : e])),
  }),

  // v7 → v8: o responsável de um evento era UM nome; passa a ser uma lista.
  // Uma reunião de pais é dos dois, e as sementes já o diziam — em texto
  // livre, porque a folha só deixava escolher um.
  //
  // Sem esta migração, os eventos já gravados ficavam com o nome no campo
  // antigo: a tabela do renomear deixaria de o percorrer, e renomear um membro
  // deixava o evento a nomear alguém que já não existe. Em silêncio, como
  // sempre.
  8: (o) => {
    const converter = (e) => {
      if (!e || typeof e !== 'object' || e.responsaveis) return e;
      const { responsible, ...resto } = e;
      return responsible ? { ...resto, responsaveis: [responsible] } : resto;
    };
    return {
      ...o,
      added: (o.added || []).map(converter),
      eventEdits: Object.fromEntries(Object.entries(o.eventEdits || {})
        .map(([k, e]) => [k, converter(e)])),
    };
  },

  // v12 → v13: as três lojas da demonstração saem de uma casa a sério.
  //
  // «Continente de Belém», «Pingo Doce da Ajuda», «Mercado de Alcântara» são
  // sementes — lojas de Lisboa escritas no código para a demonstração ter algo
  // que mostrar. Numa casa de verdade são o palpite de outra pessoa sobre onde
  // essa família faz compras.
  //
  // ⚠ Só saem se estiverem INTACTAS: a lista tem de ser exactamente aquelas
  // três, na mesma ordem. Quem lhes mexeu — acrescentou, renomeou, tirou uma —
  // fez uma escolha, e uma migração não desfaz escolhas.
  //
  // O `shopPlan.store` é um ÍNDICE nesta lista. Fica em zero, que é o que uma
  // casa nova tem, e o `lojaDoPlano()` responde «nenhuma» enquanto a lista
  // estiver vazia — daí as seis leituras diretas terem passado por lá.
  13: (o) => {
    const SEMENTES = ['Continente de Belém', 'Pingo Doce da Ajuda', 'Mercado de Alcântara'];
    const lista = o.stores;
    if (!Array.isArray(lista) || lista.length !== SEMENTES.length) return o;
    if (!lista.every((nome, i) => nome === SEMENTES[i])) return o;
    // Numa casa de demonstração ficam: é lá que servem para algo.
    if (!o.clearedSeeds) return o;
    return { ...o, stores: [] };
  },

  // v11 → v12: o plano de compras apontava para quem não existe.
  //
  // Visto no ecrã das Compras: «Compras de domingo · Domingo, 23/08» com um
  // avatar «?» ao lado. Duas coisas erradas, as duas gravadas da semente:
  //
  //   who   «Tomás» — o segundo adulto da casa de DEMONSTRAÇÃO. Numa casa que
  //         não o tem, `MEMBROS['Tomás']` é `undefined`, o avatar sai «?» e a
  //         cor sai cinzenta. É a mesma família dos nomes escritos à mão que
  //         se tiraram do código — este estava nos DADOS, e por isso sobreviveu.
  //   day   `d2026-08-23`, a data fixa antiga. Corrigi a semente e não os
  //         dados de quem já tinha a app aberta, como no `monthName`.
  //
  // O responsável passa a ser o primeiro adulto da casa — não se adivinha um
  // nome, lê-se o quadro. E o dia, se já passou, passa a ser o próximo domingo:
  // a ida às compras da casa é ao domingo, e um plano para um dia que já lá vai
  // não é um plano.
  12: (o) => {
    const plano = o.shopPlan;
    if (!plano) return o;
    const quadro = o.membros || {};
    const nomes = Object.keys(quadro);
    const adultos = nomes.filter(n => !quadro[n].kid);
    const naCasa = nomes.includes(plano.who);

    // Sem quadro gravado não se mexe no responsável: apagá-lo seria pior do
    // que deixá-lo — a casa vem do servidor e o nome pode ser válido lá.
    const who = (nomes.length && !naCasa) ? (adultos[0] || nomes[0]) : plano.who;

    const hoje = new Date(TODAY.y, TODAY.m, TODAY.d);
    const p = /^d(\d{4})-(\d{2})-(\d{2})$/.exec(plano.day || '');
    const passou = p && new Date(+p[1], +p[2] - 1, +p[3]) < hoje;
    const day = passou ? chaveRelativa((7 - hoje.getDay()) % 7) : plano.day;

    return (who === plano.who && day === plano.day)
      ? o
      : { ...o, shopPlan: { ...plano, who, day } };
  },

  // v10 → v11: o mês do orçamento numa casa que nunca abriu um mês.
  //
  // O `monthName` da semente era `'Agosto'` escrito à mão. Corrigi a semente,
  // mas quem já tinha a app aberta ficou com o valor gravado: o Dinheiro dizia
  // «Conta conjunta · Agosto de 2026» e o Início «Orçamento de Agosto», a 1 de
  // setembro.
  //
  // `monthZero: true` é a marca de uma casa que ainda não abriu mês nenhum —
  // é o que o `SEM_DINHEIRO_SEMEADO` põe, e o «Abrir Mês» é que o desliga.
  // Nessas, o nome do mês não é uma escolha de ninguém, é um resto. Numa casa
  // que JÁ abriu um mês não se toca: aí o nome é o que um adulto decidiu, e
  // sobrepor-lhe o relógio seria desfazer uma acção.
  11: (o) => (o.monthZero && o.monthName !== MONTHS[TODAY.m]
    ? { ...o, monthName: MONTHS[TODAY.m] }
    : o),

  // v8 → v9: a recuperação do `date` outra vez, porque a primeira não chegou
  // a correr onde era precisa.
  //
  // A migração 7 faz exactamente isto, e está certa. Só que foi escrita DEPOIS
  // de a loja desta casa já estar estampada com 8 — e uma migração numerada
  // abaixo da versão gravada nunca corre. Quatro eventos ficaram com
  // `date: '2026-08-14'` e nenhum `day`, e portanto invisíveis em todos os
  // ecrãs: existem, têm título e data, e a app não os mostra.
  //
  // Corrigir a 7 no lugar não serviria de nada, pela mesma razão. Tem de ser
  // um número NOVO. A operação é idempotente: numa loja onde a 7 correu, não
  // há `date` nenhum e isto não toca em nada.
  // v9 → v10: a lista de esquemas mudou, e a escolha é guardada por ÍNDICE.
  //
  // Sem isto, reordenar `SCHEMES` mudava a cor de toda a gente em silêncio:
  // quem estava em violeta (índice 1) acordava em cião, e a única pista era a
  // app estar de outra cor. Não dá erro, não dá aviso — muda e pronto.
  //
  //   antes  0 Azul Sóbrio  1 Violeta  2 Cião  3 Verde  4 Grafite  5 Céu
  //   agora  0 Violeta      1 Cião     2 Céu   3 Rosa   4 Menta    5 Cinza
  //
  // Os três que saíram vão para o mais próximo do que era: o Azul Sóbrio para
  // o Céu, o Verde para o Menta, o Grafite para o Cinza. Ninguém fica com uma
  // cor que não escolheria.
  10: (o) => {
    const NOVO = { 0: 2, 1: 0, 2: 1, 3: 4, 4: 5, 5: 2 };
    return {
      ...o,
      schemeByUser: Object.fromEntries(Object.entries(o.schemeByUser || {})
        .map(([quem, i]) => [quem, NOVO[i] ?? 0])),
    };
  },

  9: (o) => {
    const comDia = (e) => {
      if (!e || typeof e !== 'object' || e.day || !e.date) return e;
      const { date, ...resto } = e;
      return { ...resto, day: /^d/.test(String(date)) ? date : `d${date}` };
    };
    return {
      ...o,
      added: (o.added || []).map(comDia),
      eventEdits: Object.fromEntries(Object.entries(o.eventEdits || {})
        .map(([k, e]) => [k, comDia(e)])),
    };
  },
};

// O próximo domingo, para o plano de compras da demonstração.
//
// A ida às compras da casa é ao domingo, e a semente tinha o dia escrito —
// `d2026-08-23`. Fora dessa semana, o ecrã mostrava um plano para um dia que
// já tinha passado.
const proximoDomingo = () => {
  const hoje = new Date(TODAY.y, TODAY.m, TODAY.d);
  // getDay(): 0 é domingo. Se hoje for domingo, é hoje.
  return chaveRelativa((7 - hoje.getDay()) % 7);
};

export const DEMO = () => ({
  done: TASKS.reduce((a, t) => (a[t.id] = !!t.done, a), {}),
  pending: {}, status: {}, registered: 0, acertoMovs: [],
  vaultMoves: [],
  paidPts: Object.fromEntries(Object.keys(MEMBERS).filter(n => MEMBERS[n].kid).map(n => [n, 0])),
  extraLog: {},
  envMove: {}, added: [], newTasks: [], taskEdits: {}, taskGone: {},
  newItems: [], itemGone: {}, newEquip: [], equipGone: {}, equipEdits: {},
  schemeByUser: {}, themeByUser: {}, importDone: {},
  notif: { digest: true, hour: '20:00', lead: 1 },
  rotate: {},
  urg: TASKS.reduce((a, t) => (a[t.id] = t.urg ?? 1, a), {}),
  due: TASKS.reduce((a, t) => (t.due && (a[t.id] = { key: t.due, time: t.dueTime }), a), {}),
  // Era `'Agosto'` escrito à mão. A 1 de setembro o cabeçalho do Dinheiro
  // dizia «Conta conjunta · Agosto de 2026» e o Início «Orçamento de Agosto»,
  // com o resto da app já em setembro.
  monthName: MONTHS[TODAY.m], monthLimits: null, monthZero: false,
  clearedSeeds: false, eventGone: {}, eventEdits: {},
  roles: { ...ROLES },
  pins: {},                       // sem PIN de fábrica — o adulto define
  pointValue: 0.10, payDay: 0, splitHalf: true,
  rendimento: 3200,              // o que entra por mês; os envelopes saem daqui
  stores: ['Continente de Belém', 'Pingo Doce da Ajuda', 'Mercado de Alcântara'],
  shopPlan: {
    who: Object.keys(MEMBERS).filter(n => !MEMBERS[n].kid)[1] || Object.keys(MEMBERS)[0],
    // O próximo domingo, e não `'d2026-08-23'`. A data fixa passou, e o ecrã
    // dizia «Compras de domingo · Domingo, 23/08» numa semana que começava a
    // 31/08 — um plano para um dia que já lá vai.
    day: proximoDomingo(), time: '10:30', store: 0,
  },
  shopHistory: [],
  // O histórico de preços da casa: uma observação por artigo, loja e dia.
  // Aditivo, nunca reescrito — ver src/precos.js.
  precos: [],
  // O que se escreveu NESTA ida às compras, por artigo. É um rascunho: vira
  // observações quando a conta se fecha, e limpa-se a seguir. Sem isto, o
  // preço escrito no corredor dos frescos desaparecia ao mudar de secção.
  precoPago: {},
  health: [], specialities: ['Medicina geral', 'Dentista', 'Pediatria', 'Oftalmologia'],
  equipCats: ['Eletrodomésticos', 'Aquecimento', 'Informática', 'Outros'],
  registo: [],
  recurringReset: {}, // taskId -> TODAY_KEY when reset
  healthNotes: {}, // healthId -> [{ author, date, text }]
  healthRecipes: {}, // healthId -> [{ id, name, dosage, quantity, unit, expiresAt, decision }]
  healthDecisions: {}, // healthId -> { type, status, note }
  googleCalendarImported: {}, // eventId -> true (track which Google Calendar events were imported)

  // Quem vive nesta casa. Era uma constante importada de data.js, e a app
  // inteira assumia estas quatro pessoas — 40 leituras diretas e 57 sítios com
  // os nomes escritos à mão. Com servidor vêm de lá; sem ele, ficam estas e a
  // casa fica marcada como demonstração.
  membros: { ...MEMBERS },
  nomeDaCasa: 'Bengui',
  deDemonstracao: true,
});

// O dinheiro que uma casa sem sementes tem: nenhum.
//
// `clearedSeeds` limpava as tarefas, os eventos, as compras e a saúde, e
// deixava o DINHEIRO — os gastos e os limites de `ENV_BASE` vivem lá e não
// passam por essa bandeira. Uma casa acabada de ligar ao servidor mostrava
// «Disponível 383,00 € de 1 770,00 €»: os 1 387 € gastos pela família de
// demonstração contra os limites que ela tinha. Um número inventado no sítio
// onde a app é mais lida.
//
// As CATEGORIAS ficam — Mercearia, Casa & contas — porque são um ponto de
// partida razoável e mudam-se na Gestão. O que sai são os valores.
export const SEM_DINHEIRO_SEMEADO = () => ({
  monthZero: true,                                     // nada gasto ainda
  monthLimits: Object.fromEntries(ENV_BASE.map(e => [e.name, 0])),
  rendimento: 0,
  registered: 0,
});

// Casa nova: os mesmos campos, todos vazios
export const BLANK = () => ({
  ...DEMO(), done: {}, urg: {}, due: {}, vaultMoves: [],
  clearedSeeds: true, shopHistory: [], health: [],
  healthNotes: {}, healthRecipes: {}, healthDecisions: {}, googleCalendarImported: {},
  ...SEM_DINHEIRO_SEMEADO(),
});

const Ctx = createContext(null);
const reducer = (s, patch) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) });

export function StoreProvider({ children }) {
  const [state, set] = useReducer(reducer, null, DEMO);
  const ready = useRef(false);
  // Se se pode escrever no disco. Fica falso quando ler os dados correu mal:
  // gravar por cima do que não se conseguiu ler é como se apaga uma casa.
  const gravavelRef = useRef(true);
  // O que falhou, para poder ser dito em vez de adivinhado.
  const falhaAoMigrarRef = useRef(null);
  const sig = useRef('');
  // Nome local → identificador do servidor. Vazio enquanto a app correr só
  // local, que é o caso quando não há EXPO_PUBLIC_PB_URL.
  const mapaServidor = useRef({ casa: null, membros: {}, envelopes: {} });

  // Ler a casa do servidor. Corre no arranque E outra vez depois de alguém
  // entrar — que é o que faltava.
  //
  // No arranque não há sessão ainda: as regras das coleções recusam, a leitura
  // volta vazia, e a app fica com a casa de demonstração. Se isto não voltasse
  // a correr depois da entrada, quem entrasse pela Google ficava com o seu
  // nome de utilizador e o quadro da família de demonstração — e a app
  // rebentava em `MEMBERS[user].kid`, porque esse utilizador não está lá.
  // Foi exatamente o que aconteceu: ecrã branco, `Cannot read properties of
  // undefined (reading 'kid')`.
  const lerDoServidor = async () => {
    try {
      const s = await carregarSync();
      const casa = s && await s.puxarCasa();
      if (!casa) return false;
      mapaServidor.current = {
        casa: casa.casaId,
        membros: Object.fromEntries((casa._servidor.membros || []).map(m => [m.nome, m.id])),
        envelopes: Object.fromEntries((casa._servidor.envelopes || []).map(e => [e.nome, e.id])),
      };
      // O servidor manda: se respondeu com membros, são estes e mais nenhuns.
      // Sem servidor, a app fica com a família de demonstração — e o Perfil
      // di-lo, para ninguém confundir uma com a outra.
      //
      // Os PAPÉIS vêm com eles. Isto faltava, e o efeito era exatamente o
      // contrário do esperado: o servidor dizia que o António administra a
      // casa, `s.roles` continuava a ser o da demonstração — onde não há
      // nenhum António — e `isAdmin` respondia que não. Quem administra a casa
      // entrava e não via a Gestão, que é o único sítio onde a podia gerir.
      if (Object.keys(casa.membros || {}).length) {
        const papeis = Object.fromEntries(Object.entries(casa.membros)
          .map(([nome, m]) => [nome, m.papel || (m.kid ? 'crianca' : 'adulto')]));
        set(x => ({
          membros: casa.membros,
          roles: papeis,
          nomeDaCasa: casa.nomeDaCasa,
          deDemonstracao: false,

          // Quando o servidor responde com uma casa a sério, a demonstração
          // acaba. As sementes ficavam: o Início mostrava tarefas do Léo e do
          // Tomás, e eventos com o avatar a `?`, numa casa onde nenhum deles
          // vive. Os membros vinham do servidor e as tarefas de uma família
          // inventada — duas casas ao mesmo tempo, no mesmo ecrã.
          //
          // Só as SEMENTES saem. O que a pessoa criou — `newTasks`, `added`,
          // `newItems`, o cofre — não é semente e fica. E isto acontece uma
          // vez: quem já tinha limpado continua limpo, e quem quiser a
          // demonstração de volta tem «Repor dados de demonstração» no Perfil.
          ...(x.clearedSeeds ? {} : {
            clearedSeeds: true,
            ...SEM_DINHEIRO_SEMEADO(),
            registo: [{ t: 'A casa passou a ser a do servidor; os dados de demonstração saíram',
                        at: Date.now() }, ...x.registo],
          }),
        }));
      }
      // Os movimentos de cofre do servidor substituem os locais: são a mesma
      // coisa vista de outro sítio, e o servidor tem os dos dois telemóveis.
      // Um saldo nunca é escrito — continua a ser a soma.
      if (casa.vaultMoves.length) set({ vaultMoves: casa.vaultMoves });
      return true;
    } catch (e) {
      return false;     // servidor indisponível — a app fica local
    }
  };

  // ler ao arrancar
  useEffect(() => {
    (async () => {
      // ⚠ Uma migração que atire NÃO pode apagar a casa.
      //
      // Isto era um `try` só, com `catch` a dizer «armazenamento indisponível»,
      // e o `ready.current = true` logo abaixo, fora dele. O caminho que isso
      // abria:
      //
      //   1. uma migração atira (um campo com forma inesperada, um descuido)
      //   2. o catch engole o erro — e a mensagem manda olhar para o disco
      //   3. o `set(patch)` nunca corre: a app fica com o estado INICIAL
      //   4. `ready` fica verdadeiro
      //   5. o efeito de gravação escreve o estado inicial por cima de tudo,
      //      já com `v: SCHEMA` — e a migração nunca volta a correr
      //
      // Eventos, movimentos do cofre, histórico de preços: tudo, em silêncio,
      // sem uma linha no ecrã. Uma casa não se perde por um `catch` genérico.
      //
      // Agora são três passos separados, e o único que pode seguir em frente
      // sem dados é a leitura do disco falhar — aí não havia nada para perder.
      let raw = null;
      try { raw = await AsyncStorage.getItem(KEY); }
      catch (e) { /* armazenamento indisponível — segue em memória */ }

      // As cópias que as versões anteriores deixaram, uma por migração. Saem
      // sem cerimónia: a única que serve para recuperar é a última, e essa
      // passou a viver numa chave fixa.
      for (const antiga of BACKUPS_ANTIGOS) {
        try { await AsyncStorage.removeItem(antiga); } catch (e) { /* segue */ }
      }

      if (raw) {
        let saved = null;
        try { saved = JSON.parse(raw); } catch (e) { saved = null; }
        const v = saved && typeof saved.v === 'number' ? saved.v : 0;

        // Gravado por uma versão mais recente: não sabemos ler, e ler mal é
        // pior do que não ler. Fica-se pelas predefinições — mas também não
        // se grava por cima, senão uma abertura na versão antiga estragava a
        // casa de quem já anda na nova.
        if (saved && v > SCHEMA) {
          gravavelRef.current = false;
        } else if (saved) {
          // A cópia do que está no disco, ANTES de lhe mexer. É baratíssima e
          // é a diferença entre um erro de migração ser um susto ou uma perda.
          //
          // ⚠ Uma chave FIXA, e não `.antes-de-v${v}`.
          //
          // Com a versão no nome, cada migração deixava uma cópia nova e
          // nenhuma saía: `antes-de-v9`, `antes-de-v10`, `antes-de-v11`… um
          // monte de casas velhas a ocupar o armazenamento do telemóvel para
          // sempre. Já se via uma no navegador ao fim de uma tarde.
          //
          // Uma cópia só, sempre a última: é a que serve para recuperar de uma
          // migração que corra mal, e as anteriores só existiriam para
          // recuperar de um erro que já passou. A versão vai dentro do próprio
          // conteúdo, no campo `v` — não precisa de estar no nome.
          if (v < SCHEMA) {
            try { await AsyncStorage.setItem(BACKUP, raw); }
            catch (e) { /* sem espaço: segue, o resto já protege */ }
          }
          try {
            for (let n = v + 1; n <= SCHEMA; n++) {
              if (MIGRATIONS[n]) saved = MIGRATIONS[n](saved);
            }
            const patch = {};
            DATA_KEYS.forEach(k => { if (saved[k] !== undefined) patch[k] = saved[k]; });
            set(patch);
          } catch (e) {
            // NÃO se grava. O disco fica como está, com a cópia ao lado, e a
            // app corre em memória até alguém corrigir a migração.
            gravavelRef.current = false;
            falhaAoMigrarRef.current = { deVersao: v, paraVersao: SCHEMA, erro: String(e && e.message || e) };
            if (typeof console !== 'undefined' && console.error) {
              console.error(`[Nossa Casa] A migração de v${v} para v${SCHEMA} falhou. `
                + `Os dados no disco NÃO foram tocados e há uma cópia em `
                + `«${BACKUP}». A app corre em memória até isto ser corrigido.`, e);
            }
          }
        }
      }
      ready.current = true;

      // Depois do local, o servidor — nesta ordem de propósito: a app tem de
      // desenhar já com o que tem em disco, e a rede é um extra que chega
      // quando chegar. Sem ligação, isto não faz nada e a app corre como
      // sempre correu.
      await lerDoServidor();
    })();
  }, []);

  // gravar a cada alteração, sem escrever igual duas vezes
  useEffect(() => {
    if (!ready.current) return;
    // ⚠ A guarda que faltava. Sem ela, uma migração falhada era seguida por
    // uma gravação do estado INICIAL por cima dos dados.
    if (!gravavelRef.current) return;
    const out = { v: SCHEMA, savedAt: new Date().toISOString() };
    DATA_KEYS.forEach(k => { out[k] = state[k]; });
    const payload = JSON.stringify(out);
    const s = payload.replace(/"savedAt":"[^"]*",?/, '');
    if (s === sig.current) return;
    sig.current = s;
    AsyncStorage.setItem(KEY, payload).catch(() => {});
  }, [state]);

  const api = useMemo(() => build(state, set, mapaServidor, lerDoServidor), [state]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useStore = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore fora do StoreProvider');
  return v;
};

// ─── derivações. Tudo o que a interface lê passa por aqui.
// `lerDoServidor` vem de fora porque vive no fornecedor, onde estão os efeitos
// e a referência ao mapa do servidor. Passá-lo é mais honesto do que duplicá-lo
// aqui — havia duas cópias a divergir à espera de acontecer.
function build(s, set, mapaServidor = { current: { casa: null, membros: {}, envelopes: {} } },
               lerDoServidor = async () => false) {
  // Quem vive nesta casa. Vinha de listas escritas à mão — `['Léo', 'Mia']` em
  // seis sítios, `['Rita', 'Tomás', 'Léo', 'Mia']` noutros seis. Acrescentar
  // alguém à casa dava-lhe um avatar e mais nada: não aparecia no filtro das
  // tarefas, não tinha cofre, não podia ser responsável por um evento.
  const quadro = s.membros || MEMBERS;
  const membrosDaCasa = Object.keys(quadro);
  const criancas = membrosDaCasa.filter(n => quadro[n]?.kid);
  const adultos = membrosDaCasa.filter(n => !quadro[n]?.kid);

  // Concordância de género a partir do quadro da casa. O `DE` do data.js lê a
  // constante dos quatro membros e devolve «do» para toda a gente que não
  // esteja lá — uma Ana acrescentada à casa ficava «do Ana».
  const artigo = (n) => (quadro[n]?.fem ? 'a' : 'o');
  const oNome = (n) => `${quadro[n]?.fem ? 'A' : 'O'} ${n}`;
  const aoNome = (n) => `${quadro[n]?.fem ? 'à' : 'ao'} ${n}`;
  const deNome = (n) => (quadro[n]?.fem ? 'da' : 'do');

  // O acerto de contas entre os adultos da casa. O valor devido é uma soma de
  // movimentos, como manda o invariante 2: o que estava escrito era
  // `settled: true` mais o montante somado a `paidPts['Tomás']` — um campo
  // booleano que dois telefones se anulavam a escrever, e euros arrumados no
  // livro dos pontos das crianças, que o fecho do mês limpava.
  //
  // Quem deve a quem sai da ordem dos adultos da casa e não de dois nomes.
  // Numa casa de um adulto não há nada a acertar, e a secção não aparece.
  const acertoPago = (s.acertoMovs || []).reduce((a, m) => a + (m.valor || 0), 0);
  const acerto = adultos.length < 2 ? null : {
    devedor: adultos[1],
    credor: adultos[0],
    base: s.clearedSeeds ? 0 : ACERTO_INICIAL,
    pago: acertoPago,
    valor: Math.max(0, (s.clearedSeeds ? 0 : ACERTO_INICIAL) - acertoPago),
  };
  const acertado = !acerto || acerto.valor === 0;

  // Traduzir um nome local para o identificador do servidor. Devolve null
  // quando a app corre local — e é isso que faz as escritas não acontecerem
  // em vez de rebentarem.
  const idDoMembro = (nome) => mapaServidor.current.membros[nome] || null;
  const idDoEnvelope = (nome) => mapaServidor.current.envelopes[nome] || null;
  const isRecurring = (t) => t.recur === 'Todos os dias' || t.recur === 'Dias de semana';

  const allTasks = () => {
    const base = [...(s.clearedSeeds ? [] : TASKS), ...s.newTasks]
      .filter(t => !s.taskGone[t.id])
      .map(t => ({ ...t, ...(s.taskEdits[t.id] || {}) }))
      .map(t => ({
        ...t,
        // A rotação passa a tarefa à criança seguinte da casa, seja qual for
        // o tamanho da família. Estava a escolher entre dois nomes fixos.
        who: s.rotate[t.id] && criancas.includes(t.who)
          ? criancas[(criancas.indexOf(t.who) + 1) % criancas.length] : t.who,
        urgency: s.urg[t.id] ?? 1,
        dueKey: (s.due[t.id] || {}).key,
        dueTime: (s.due[t.id] || {}).time,
      }));
    // ordem: urgência primeiro, e o número é a posição na lista
    return base.sort((a, b) => a.urgency - b.urgency);
  };

  const allItems = () => [...(s.clearedSeeds ? [] : ITEMS), ...s.newItems].filter(i => !s.itemGone[i.id]);
  const allEvents = () => [...(s.clearedSeeds ? [] : EVENTS), ...s.added, ...s.health.map(h => h.event).filter(Boolean)]
    .filter(e => e && !s.eventGone[e.id])
    .map(e => ({ ...e, ...(s.eventEdits[e.id] || {}) }));
  // Como allTasks: sementes do código, sobrepostas pelas edições do utilizador.
  // As sementes são só de leitura, por isso editar é gravar um remendo.
  const allEquip = () => [...(s.clearedSeeds ? [] : EQUIP), ...s.newEquip]
    .filter(e => !s.equipGone[e.id])
    .map(e => ({ ...e, ...((s.equipEdits || {})[e.id] || {}) }));
  const editEquip = (id, campos) => set(x => ({
    equipEdits: { ...(x.equipEdits || {}), [id]: { ...((x.equipEdits || {})[id] || {}), ...campos } },
  }));
  const removeEquip = (id) => set(x => ({ equipGone: { ...x.equipGone, [id]: true } }));

  const budget = s.monthLimits
    ? Object.values(s.monthLimits).reduce((a, b) => a + b, 0)
    : ENV_BASE.reduce((a, e) => a + e.limit, 0);
  const envelopes = ENV_BASE.map(e => ({
    ...e,
    used: (s.monthZero ? 0 : e.used) + (e.name === 'Mercearia' ? s.registered : 0),
    limit: (s.monthLimits ? s.monthLimits[e.name] : e.limit) + (s.envMove[e.name] || 0),
  }));

  // O gasto é a soma dos envelopes, nunca um número à parte. Estava escrito à
  // mão como 1687,40, e os envelopes somam 1387,00 — 300,40 € de diferença.
  // O «Disponível» dava 82,60 € onde a referência mostra 383,00 €, e como o
  // cabeçalho do Início mostra esse número, a app dizia-o errado em todo o
  // lado. É o INVARIANTE #2 noutra roupagem: um total que devia ser uma soma
  // foi escrito, e divergiu da coisa que devia resumir.
  const spent = envelopes.reduce((a, e) => a + e.used, 0);

  const canSeeHealth = podeVerSaude;

  const allHealth = () => [...(s.clearedSeeds ? [] : HEALTH), ...(s.health || [])]
    .filter(h => !(s.healthGone || {})[h.id]);
  const healthOf = (member, viewer) => (canSeeHealth(member, viewer)
    ? allHealth().filter(h => h.member === member).sort((a, b) => (b.day || '').localeCompare(a.day || ''))
    : []);
  const allHealthDocs = () => [...(s.clearedSeeds ? [] : HEALTH_DOCS), ...(s.healthDocs || [])];
  const docsOf = (member, viewer) => (canSeeHealth(member, viewer)
    ? allHealthDocs().filter(d => d.member === member)
    : []);
  // A próxima consulta a contar de hoje, ou nada se já passaram todas.
  const nextHealth = (member, viewer) => healthOf(member, viewer)
    .filter(h => h.day >= TODAY_KEY)
    .sort((a, b) => a.day.localeCompare(b.day))[0] || null;

  // ── O que precisa de atenção no Início ───────────────────────────────────
  // As três listas que faltavam ao «Precisa de Si». As duas de saúde passam
  // por canSeeHealth como todo o resto: a Rita não vê as receitas nem as
  // consultas do Tomás no ecrã dela (INVARIANTE #3). Não é uma decisão de
  // interface — a lista nem sequer as contém.
  const garantiasAExpirar = () => allEquip()
    .map(e => ({ ...e, dias: warrantyDaysLeft(e) }))
    .filter(e => e.dias >= 0 && e.dias <= 90)
    .sort((a, b) => a.dias - b.dias);

  const receitasAExpirar = (viewer) => receitasAExpirarDe(allHealthDocs(), viewer);
  const consultasProximas = (viewer) => consultasProximasDe(allHealth(), viewer);

  // Saldo do cofre: soma, nunca leitura de um campo (INVARIANTE #2).
  // Sementes do código + o que o utilizador acrescentou, como em allTasks.
  const allVaultMoves = () => [...(s.clearedSeeds ? [] : VAULT), ...(s.vaultMoves || [])];
  const vaultMoves = (kid) => allVaultMoves()
    .filter(m => m.kid === kid)
    .sort((a, b) => (b.day || '').localeCompare(a.day || ''));
  const vaultOf = (kid) => allVaultMoves()
    .reduce((n, m) => (m.kid === kid ? n + m.delta : n), 0);
  // Pagar parte ou a totalidade do acerto. Um movimento, somado — nunca
  // `settled = true`. Dois telefones a acertar metade cada um dão a conta
  // saldada; a escrita de um booleano dava metade paga e a dívida fechada.
  const pagarAcerto = (valor, nota) => {
    const v = Math.round(Number(valor) * 100) / 100;
    if (!(v > 0)) return;
    set(x => ({ acertoMovs: [...(x.acertoMovs || []), { valor: v, data: TODAY_KEY, nota: nota || '' }] }));
  };

  // Acrescenta um movimento. Nunca substitui o saldo.
  //
  // Vai também para o servidor, como inserção com chave de idempotência. É
  // aqui que o INVARIANTE #2 deixa de ser uma regra local e passa a valer
  // entre telemóveis: se cada um gravasse «saldo = X», dois créditos de 5 €
  // dariam 5. Assim dão 10. A escrita passa por uma fila, portanto sem rede
  // fica pendente em vez de se perder, e a chave impede que reenviar a fila
  // pague a semanada duas vezes.
  const vaultAdd = (kid, delta, kind, label, sub, day = TODAY_KEY) => {
    set(x => ({
      vaultMoves: [...(x.vaultMoves || []), {
        id: 'vm-' + Date.now() + '-' + Math.round(Math.random() * 1e6),
        kid, delta, kind, label, sub, day,
      }],
    }));
    // A fila guarda a escrita; falhar aqui não pode estragar o ecrã, que já
    // tem o movimento. Sem servidor, `sync` é null e isto não faz nada.
    if (sync) {
      const ses = sync.sessao();
      if (ses) sync.movimentoDeCofre({
        casa: ses.casa, membro: idDoMembro(kid), tipo: kind,
        valor: delta, motivo: label, data: day.replace(/^d/, ''),
        autorizadoPor: ses.membro,
      }).catch(() => {});
    }
  };

  const kidPts = criancas.reduce((a, k) => {
    // Os pontos de partida são semente da demonstração; uma criança nova
    // começa a zero, que é o correto — não herda o histórico de ninguém.
    const base = s.clearedSeeds ? 0 : (PONTOS_INICIAIS[k] || 0);
    a[k] = base + allTasks().filter(t => t.who === k && s.done[t.id] && !TASKS.some(x => x.id === t.id && x.done)).reduce((n, t) => n + (t.pts || 0), 0);
    return a;
  }, {});

  // Tarefa: por fazer → (criança) a confirmar → (adulto) concluída
  // Recorrentes: rastrear quando foram resetadas hoje para reassumir amanhã
  const tapTask = (id, byChild) => set(x => {
    const task = allTasks().find(t => t.id === id);
    const done = !!x.done[id], pend = !!x.pending[id];
    const isRecur = task && isRecurring(task);

    if (byChild) return pend || done
      ? { pending: { ...x.pending, [id]: false }, done: { ...x.done, [id]: false } }
      : { pending: { ...x.pending, [id]: true } };

    if (pend) {
      return {
        pending: { ...x.pending, [id]: false },
        done: { ...x.done, [id]: true },
        ...(isRecur ? { recurringReset: { ...x.recurringReset, [id]: TODAY_KEY } } : {}),
      };
    }

    return {
      done: { ...x.done, [id]: !done },
      pending: { ...x.pending, [id]: false },
      ...(isRecur && !done ? { recurringReset: { ...x.recurringReset, [id]: TODAY_KEY } } : {}),
    };
  });

  // Editar e apagar um evento.
  //
  // `eventGone` e `eventEdits` já eram aplicados na leitura desde sempre — e
  // nenhum ecrã os escrevia. Infraestrutura sem porta: um evento com a hora
  // errada ficava com a hora errada, e um evento a mais ficava para sempre.
  //
  // Os remendos vão para `eventEdits` em vez de reescreverem o evento: as
  // sementes vivem no código e não se podem alterar, e um evento criado na app
  // é tratado da mesma maneira para não haver dois caminhos.
  const editarEvento = (id, campos) => set(x => ({
    eventEdits: { ...x.eventEdits, [id]: { ...(x.eventEdits[id] || {}), ...campos } },
  }));

  // Apagar é marcar como ido, não tirar da lista. As sementes não se conseguem
  // remover de outra maneira, e assim os dois casos comportam-se igual.
  const removerEvento = (id) => set(x => ({
    eventGone: { ...x.eventGone, [id]: true },
    registo: [{ t: 'Um evento foi apagado da agenda', at: Date.now() }, ...x.registo],
  }));

  // Os eventos da casa que JÁ NÃO EXISTEM na agenda da Google.
  //
  // O apagar tinha um sentido só: apagado aqui, apagado lá. Ao contrário não
  // acontecia nada — um evento apagado na Google ficava nesta casa a apitar à
  // hora de uma coisa que já não existe, que é o mesmo defeito visto do outro
  // lado do espelho.
  //
  // ⚠ SÓ se consideram os eventos cujo dia cai DENTRO da janela que foi lida.
  //
  // Sem esse cuidado, um evento marcado para daqui a dois meses — fora dos
  // trinta dias que se pedem à Google — parecia apagado só por não vir na
  // resposta, e a app oferecia-se para o apagar. Perguntar antes salva a casa
  // de perder o evento, mas uma pergunta errada repetida a cada entrada é uma
  // forma lenta de ensinar alguém a dizer «sim» sem ler.
  //
  // Devolve os eventos, e não só os identificadores: quem pergunta tem de
  // poder dizer QUAIS.
  const eventosQueSairamDaGoogle = (idsNaGoogle, dias = 30) => {
    const presentes = new Set(idsNaGoogle || []);
    const hoje = new Date(TODAY.y, TODAY.m, TODAY.d);
    const fim = new Date(hoje.getTime() + dias * 86400000);
    return allEvents().filter(e => {
      if (!e.idGoogle || presentes.has(e.idGoogle)) return false;
      const p = /^d(\d{4})-(\d{2})-(\d{2})$/.exec(e.day || '');
      if (!p) return false;                       // sem dia legível, não se toca
      const quando = new Date(+p[1], +p[2] - 1, +p[3]);
      return quando >= hoje && quando < fim;
    });
  };

  // Os eventos da Google que esta casa CRIOU.
  //
  // Sem isto o ciclo fechava-se em cima de si próprio: agenda-se na app, o
  // evento vai para a agenda da Google, e da vez seguinte a importação lê-o de
  // lá e oferece-o como novidade. Quem aceitasse ficava com o mesmo almoço
  // duas vezes na agenda da casa, e sem maneira de perceber porquê.
  //
  // O identificador da Google já era guardado — em `eventEdits[id].idGoogle`,
  // para editar e apagar do lado de lá. Só faltava alguém o LER na direcção
  // contrária. É aqui, e não nas folhas, para a Agenda e o aviso automático
  // usarem a mesma resposta.
  const idsGoogleDaCasa = () => {
    const ids = new Set();
    for (const e of s.added || []) if (e && e.idGoogle) ids.add(e.idGoogle);
    for (const e of Object.values(s.eventEdits || {})) if (e && e.idGoogle) ids.add(e.idGoogle);
    return ids;
  };

  // ── Preços ────────────────────────────────────────────────────────────────
  const definirPrecoPago = (idArtigo, valor) => set(x => {
    const texto = String(valor == null ? '' : valor).trim().replace(',', '.');
    const v = Number(texto);
    // `Number('')` é ZERO, e `Number.isFinite(0)` é verdadeiro: apagar o campo
    // gravava «este artigo custou 0 €» em vez de tirar o rascunho. O campo
    // vazio distingue-se do zero pelo TEXTO, não pelo número — e o zero
    // escrito é legítimo, porque há artigos oferecidos.
    if (texto === '' || !Number.isFinite(v) || v < 0) {
      const { [idArtigo]: _fora, ...resto } = x.precoPago || {};
      return { precoPago: resto };
    }
    return { precoPago: { ...(x.precoPago || {}), [idArtigo]: Math.round(v * 100) / 100 } };
  });

  // Fechar a conta transforma o rascunho em histórico. É aqui, e não a cada
  // tecla: uma observação por dígito escrito enchia o histórico de preços que
  // nunca existiram.
  // O dia do plano de compras: o próximo domingo, enquanto ninguém escolher
  // outro que ainda esteja para vir.
  //
  // Era só o valor gravado, e por isso envelhecia: numa segunda-feira o ecrã
  // dizia «Compras de domingo · Domingo, 23/08» — um plano para um dia que já
  // lá ia. Uma migração corrige isso UMA vez; na semana seguinte volta.
  //
  // A ida às compras desta casa é ao domingo. Enquanto o dia gravado estiver
  // no passado, o que se mostra é o próximo domingo — e no dia em que alguém
  // marcar outra data, essa data manda, porque é uma escolha.
  const diaDoPlano = () => {
    const guardado = s.shopPlan ? s.shopPlan.day : null;
    const hoje = new Date(TODAY.y, TODAY.m, TODAY.d);
    const p = /^d(\d{4})-(\d{2})-(\d{2})$/.exec(guardado || '');
    if (p && new Date(+p[1], +p[2] - 1, +p[3]) >= hoje) return guardado;
    // getDay(): 0 é domingo. Se hoje for domingo, é hoje.
    return chaveRelativa((7 - hoje.getDay()) % 7);
  };

  // A loja do plano de compras, ou nada.
  //
  // Seis sítios liam `s.stores[s.shopPlan.store]` à mão. Numa casa sem lojas
  // — e uma casa nova não tem nenhuma — isso é ler uma posição que não existe,
  // e o ecrã escrevia «undefined» a seguir à hora. Aqui a resposta é uma só, e
  // é `null` quando não há loja escolhida.
  const lojaDoPlano = () => {
    const lista = s.stores || [];
    const i = s.shopPlan ? s.shopPlan.store : null;
    return (typeof i === 'number' && lista[i]) ? lista[i] : null;
  };

  // ⚠ Sem loja não se grava histórico de preços.
  //
  // O histórico é «o que esta casa pagou, NAS lojas dela»: uma observação com
  // `loja: null` não responde a pergunta nenhuma — o `precosDe` filtra as que
  // não têm loja, portanto ficaria a ocupar espaço e a não contar para nada.
  // Melhor não a escrever do que escrever lixo.
  const registarPrecos = (artigos, loja, dia = TODAY_KEY) => set(x => {
    if (!loja) return {};
    const novas = (artigos || [])
      .filter(a => (x.precoPago || {})[a.id] > 0)
      .map(a => observacao({ rotulo: a.label, loja, valor: x.precoPago[a.id], dia }));
    // A chave da observação leva o artigo, o dia e o valor: registar a mesma
    // compra duas vezes não duplica o histórico.
    const jaLa = new Set((x.precos || []).map(o => o.id));
    return {
      precos: [...(x.precos || []), ...novas.filter(o => !jaLa.has(o.id))],
      precoPago: {},
    };
  });

  const isAdmin = (name) => s.roles[name] === 'admin';

  // Papéis: só criança→adulto e adulto↔admin. Nunca adulto→criança.
  const canChangeRole = (from, to) => {
    if (from === to) return false;
    if (to === 'crianca') return false;
    if (from === 'crianca' && to === 'admin') return false;
    return true;
  };

  const setRole = (name, role) => set(x => {
    const admins = Object.entries(x.roles).filter(([n, r]) => r === 'admin' && n !== name);
    if (x.roles[name] === 'admin' && role !== 'admin' && admins.length === 0) return {};
    return {
      roles: { ...x.roles, [name]: role },
      registo: [{ t: `${name} passou a ${role === 'admin' ? 'administração' : 'adulto'}`, at: Date.now() }, ...x.registo],
    };
  });

  // O avatar do próprio membro: a fotografia da conta, ou a inicial numa cor.
  //
  // ── Porque é uma escolha e não a fotografia sempre que ela existe ───────────
  //
  // Nem toda a gente quer a cara na app da casa, e quem entrou com a Google não
  // pediu por isso que a fotografia do perfil dela passasse a estar em cada
  // linha de tarefa. A fotografia fica GUARDADA — é grátis — mas quem a mostra
  // é esta escolha.
  //
  // A cor não é decoração: é o que distingue as pessoas no filtro da agenda, no
  // ponto do calendário e na barra da ficha de saúde. Duas iguais na mesma casa
  // tornam esses sítios ilegíveis, por isso a folha não deixa escolher uma que
  // já é de outro membro.
  //
  // Escreve LOCAL primeiro e no servidor a seguir, como tudo o resto nesta app
  // menos a limpeza da casa. Um avatar que não chega ao servidor é um avatar
  // que o outro telemóvel não vê — não é uma casa em dois estados.
  const definirAvatar = async (name, { cor, figura, usarFoto } = {}) => {
    set(x => ({
      membros: { ...x.membros, [name]: { ...x.membros[name],
        ...(cor !== undefined ? { cor } : {}),
        ...(figura !== undefined ? { figura } : {}),
        ...(usarFoto !== undefined ? { usarFoto: !!usarFoto } : {}) } },
    }));
    // A fotografia no servidor é o ENDEREÇO dela, e esse não muda com a
    // escolha — o que muda é mostrá-la ou não, e isso é deste aparelho. A COR
    // é que é da casa inteira: é ela que distingue as pessoas no filtro da
    // agenda e no ponto do calendário, e tem de ser a mesma nos dois telemóveis.
    if (cor === undefined && figura === undefined) return null;
    const sy = await carregarSync();
    if (!sy || !sy.ligado()) return null;
    try {
      await sy.guardarAspeto({
        ...(cor !== undefined ? { cor: cor || '' } : {}),
        ...(figura !== undefined ? { figura: figura || '' } : {}),
      });
      return null;
    } catch (e) { return e.message || 'O avatar não chegou ao servidor.'; }
  };

  // Ir buscar a fotografia da conta Google.
  //
  // Devolve `null` quando correu bem, e a mensagem quando não. Guarda no
  // membro o ENDEREÇO — a imagem fica na Google — e liga-a: quem carregou num
  // botão que diz «trazer a fotografia» quer vê-la, e obrigar a um segundo
  // toque a seguir seria fazer de conta que não se percebeu.
  const trazerFotografia = async (name) => {
    const sy = await carregarSync();
    if (!sy || !sy.ligado()) return 'A app está a correr sem servidor.';
    try {
      const foto = await sy.trazerFotografiaDaGoogle();
      set(x => ({ membros: { ...x.membros, [name]: {
        ...x.membros[name], avatar: foto, usarFoto: true } } }));
      return null;
    } catch (e) {
      return e.message || 'Não foi possível trazer a fotografia.';
    }
  };

  // PIN: recusa dígitos iguais, sequências, e reutilização
  const pinError = (name, pin) => {
    if (!/^\d{4}$/.test(pin)) return 'O PIN tem de ter 4 dígitos.';
    if (/^(\d)\1{3}$/.test(pin)) return 'Não pode ter os quatro dígitos iguais.';
    const seq = '0123456789';
    if (seq.includes(pin) || seq.split('').reverse().join('').includes(pin)) return 'Não pode ser uma sequência.';
    // Os PIN gravados são resumos, portanto compara-se resumo com resumo —
    // cada um calculado com o nome do dono, que é o que os torna distintos.
    const repetido = Object.entries(s.pins)
      .find(([n, p]) => n !== name && p === resumoPin(n, pin));
    if (repetido) return `Já é o PIN ${DE(repetido[0])} ${repetido[0]}.`;
    return null;
  };

  const setPin = (name, pin) => {
    const err = pinError(name, pin);
    if (err) return err;
    set(x => ({ pins: { ...x.pins, [name]: resumoPin(name, pin) } }));
    return null;
  };

  // Verificar é comparar resumos, nunca o valor. O ecrã de entrada fazia
  // `p === s.pins[kid]`, contra o PIN em claro.
  const verificarPin = (name, pin) => !!s.pins[name] && s.pins[name] === resumoPin(name, pin);

  // ─── Gerir a casa: nome, e quem lá vive ────────────────────────────────────
  //
  // Estas quatro escrevem no SERVIDOR primeiro e na loja só depois — ao
  // contrário de tudo o resto aqui, e de propósito. O resto da app são
  // remendos sobre sementes locais; isto é a composição da casa. Se o servidor
  // recusar — a casa a ficar sem administração, um nome repetido, histórico a
  // apontar para quem sai — o ecrã tem de dizer porquê, e não mostrar uma casa
  // que o servidor não tem.
  //
  // Sem servidor não fazem nada: a casa que se vê é a de demonstração, e
  // configurar uma amostra não configura nada. Cada uma devolve uma frase de
  // erro ou `null`, como o `setPin` já fazia.
  const podeGerirCasa = () => !!(sync && !s.deDemonstracao && mapaServidor.current.casa);

  const SEM_SERVIDOR = 'Esta é a casa de demonstração. Ligue-se ao servidor da '
    + 'família para acrescentar ou remover membros.';

  // O PocketBase responde em inglês e com o vocabulário das coleções. Quem
  // está a tentar tirar alguém da casa não precisa de saber o que é uma
  // «required relation reference» — precisa de saber que o histórico fica.
  const RECUSAS = [
    [/required relation reference|relation reference/i,
      'Não é possível remover: a casa tem registos em nome deste membro — tarefas, '
      + 'movimentos ou despesas. O histórico da casa não se apaga por alguém sair.'],
    [/last admin|sem administra|administrador/i,
      'A casa não pode ficar sem administração. Dê a administração a outro adulto primeiro.'],
    [/value must be unique|already exists|unique/i,
      'Já existe alguém com esse nome nesta casa.'],
    [/failed to authenticate|not allowed|forbidden|403/i,
      'O servidor recusou: só a administração da casa pode fazer esta alteração.'],
  ];
  const emPortugues = (e) => {
    const bruto = [e?.message, JSON.stringify(e?.data || e?.response || {})].join(' ');
    for (const [padrao, frase] of RECUSAS) if (padrao.test(bruto)) return frase;
    return e?.message ? `O servidor recusou: ${e.message}` : 'O servidor recusou a alteração.';
  };

  const SEM_ADMIN = 'A casa não pode ficar sem administração. Dê a administração '
    + 'a outro adulto primeiro.';

  // Verdade com ou sem rede, e por isso verificada antes da guarda do
  // servidor. `novoPapel` a null quer dizer «este membro sai da casa».
  const deixaCasaSemAdmin = (nome, novoPapel) => {
    if ((s.roles[nome] || 'crianca') !== 'admin') return false;
    if (novoPapel === 'admin') return false;
    return Object.entries(s.roles).filter(([n, r]) => r === 'admin' && n !== nome).length === 0;
  };

  const nomeDeCasaInvalido = (nome) => {
    const n = String(nome || '').trim();
    if (!n) return 'A casa precisa de um nome.';
    if (n.length > 40) return 'O nome da casa não pode passar de 40 caracteres.';
    return null;
  };

  const renomearCasa = async (nome) => {
    const err = nomeDeCasaInvalido(nome);
    if (err) return err;
    if (!podeGerirCasa()) return SEM_SERVIDOR;
    const n = String(nome).trim();
    try {
      await sync.renomearCasa(mapaServidor.current.casa, n);
    } catch (e) { return emPortugues(e); }
    set(x => ({
      nomeDaCasa: n,
      registo: [{ t: `A casa passou a chamar-se ${n}`, at: Date.now() }, ...x.registo],
    }));
    return null;
  };

  // Validação local antes de incomodar o servidor. O servidor volta a validar
  // — é ele que protege — mas uma recusa que se vê sem rede vê-se mais depressa.
  const membroInvalido = ({ nome, papel, email, segredo }, aExcluir = null) => {
    const n = String(nome || '').trim();
    if (!n) return 'O membro precisa de um nome.';
    if (n.length > 30) return 'O nome não pode passar de 30 caracteres.';
    if (quadro[n] && n !== aExcluir) return `Já existe ${DE(n) === 'da' ? 'uma' : 'um'} ${n} nesta casa.`;
    if (!['crianca', 'adulto', 'admin'].includes(papel)) return 'Escolha o papel do membro.';
    if (papel === 'crianca') {
      const errPin = pinError(n, String(segredo || ''));
      if (errPin) return errPin;
    } else {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || '').trim()))
        return 'Um adulto entra com a conta Google, e precisa do endereço de e-mail.';
      if (String(segredo || '').length < 8)
        return 'A palavra-passe do servidor tem de ter pelo menos 8 caracteres.';
    }
    return null;
  };

  const acrescentarMembro = async ({ nome, papel, email, fem, segredo }) => {
    const err = membroInvalido({ nome, papel, email, segredo });
    if (err) return err;
    if (!podeGerirCasa()) return SEM_SERVIDOR;
    const n = String(nome).trim();
    let criado;
    try {
      criado = await sync.acrescentarMembro({
        casa: mapaServidor.current.casa, nome: n, papel,
        email: papel === 'crianca' ? null : String(email).trim(),
        fem: !!fem, cor: null,
        pin: papel === 'crianca' ? segredo : undefined,
        palavraPasse: papel === 'crianca' ? undefined : segredo,
      });
    } catch (e) { return emPortugues(e); }
    // O id vem do servidor; sem ele, a próxima escrita de dinheiro deste
    // membro não sabia para onde ir.
    if (criado?.id) mapaServidor.current.membros[n] = criado.id;
    set(x => ({
      membros: { ...x.membros, [n]: {
        id: criado?.id || null,
        initial: n.charAt(0).toUpperCase(),
        email: papel === 'crianca' ? null : String(email).trim(),
        kid: papel === 'crianca', papel, fem: !!fem, cor: null,
      } },
      roles: { ...x.roles, [n]: papel },
      // O PIN local é um resumo, como o de toda a gente. O servidor guarda o
      // seu; são dois segredos do mesmo valor, não um copiado do outro.
      pins: papel === 'crianca' ? { ...x.pins, [n]: resumoPin(n, String(segredo)) } : x.pins,
      registo: [{ t: `${n} entrou na casa`, at: Date.now() }, ...x.registo],
    }));
    return null;
  };

  // Muda o que se pode mudar sem partir nada: papel, concordância, e-mail,
  // cor. O NOME não está aqui de propósito — na loja local o nome é a chave
  // que liga tarefas, eventos, cofres e fichas de saúde, e mudá-lo é uma
  // migração, não uma edição.
  const editarMembro = async (nome, campos) => {
    if (!quadro[nome]) return 'Esse membro não existe nesta casa.';
    if (campos.papel && campos.papel !== (s.roles[nome] || 'crianca')) {
      if (!canChangeRole(s.roles[nome] || 'crianca', campos.papel))
        return 'Essa mudança de papel não é permitida.';
      if (deixaCasaSemAdmin(nome, campos.papel)) return SEM_ADMIN;
    }
    if (!podeGerirCasa()) return SEM_SERVIDOR;
    const id = mapaServidor.current.membros[nome];
    if (!id) return 'Esse membro ainda não existe no servidor.';
    try {
      await sync.editarMembro(id, {
        ...(campos.papel ? { papel: campos.papel } : {}),
        ...(campos.fem !== undefined ? { fem: !!campos.fem } : {}),
        ...(campos.email !== undefined ? { email: campos.email } : {}),
        ...(campos.cor !== undefined ? { cor: campos.cor } : {}),
      });
    } catch (e) { return emPortugues(e); }
    set(x => ({
      membros: { ...x.membros, [nome]: { ...x.membros[nome],
        ...(campos.papel ? { papel: campos.papel, kid: campos.papel === 'crianca' } : {}),
        ...(campos.fem !== undefined ? { fem: !!campos.fem } : {}),
        ...(campos.email !== undefined ? { email: campos.email } : {}),
        ...(campos.cor !== undefined ? { cor: campos.cor } : {}),
      } },
      ...(campos.papel ? { roles: { ...x.roles, [nome]: campos.papel } } : {}),
      registo: [{ t: `${nome}: dados alterados`, at: Date.now() }, ...x.registo],
    }));
    return null;
  };

  // Mudar o nome de um membro. É a operação mais invasiva das cinco: no
  // servidor são dois campos, e aqui é uma migração de todo o estado gravado
  // — ver `renomearNoEstado`, que é onde vive a tabela dos sítios.
  //
  // A ordem é servidor primeiro. Ao contrário, uma recusa do servidor deixava
  // a app com um nome que a casa não tem, e todas as escritas seguintes desse
  // membro iam para um identificador que já não lhe corresponde.
  const renomearMembro = async (antigo, novo) => {
    if (!quadro[antigo]) return 'Esse membro não existe nesta casa.';
    const n = String(novo || '').trim();
    if (!n) return 'O membro precisa de um nome.';
    if (n === antigo) return null;                  // nada a fazer
    if (n.length > 30) return 'O nome não pode passar de 30 caracteres.';
    if (quadro[n]) return `Já existe ${quadro[n].fem ? 'uma' : 'um'} ${n} nesta casa.`;
    if (!podeGerirCasa()) return SEM_SERVIDOR;
    const id = mapaServidor.current.membros[antigo];
    if (!id) return 'Esse membro ainda não existe no servidor.';
    try {
      // O `login` acompanha o nome: é derivado dele, e deixá-lo para trás
      // punha a criança a entrar com um nome que já não é o dela.
      await sync.editarMembro(id, {
        nome: n,
        login: `${mapaServidor.current.casa}_${n.toLowerCase().replace(/\s+/g, '-')}`,
      });
    } catch (e) { return emPortugues(e); }
    delete mapaServidor.current.membros[antigo];
    mapaServidor.current.membros[n] = id;
    set(x => ({
      ...renomearNoEstado(x, antigo, n),
      registo: [{ t: `${antigo} passou a chamar-se ${n}`, at: Date.now() }, ...x.registo],
    }));
    return null;
  };

  const removerMembro = async (nome) => {
    if (!quadro[nome]) return 'Esse membro não existe nesta casa.';
    if (deixaCasaSemAdmin(nome, null)) return SEM_ADMIN;
    if (!podeGerirCasa()) return SEM_SERVIDOR;
    const id = mapaServidor.current.membros[nome];
    if (!id) return 'Esse membro ainda não existe no servidor.';
    try {
      await sync.removerMembro(id);
    } catch (e) { return emPortugues(e); }
    delete mapaServidor.current.membros[nome];
    set(x => {
      const { [nome]: _fora, ...restantes } = x.membros;
      const { [nome]: _semPapel, ...papeis } = x.roles;
      const { [nome]: _semPin, ...pinsRestantes } = x.pins;
      return {
        membros: restantes, roles: papeis, pins: pinsRestantes,
        registo: [{ t: `${nome} saiu da casa`, at: Date.now() }, ...x.registo],
      };
    });
    return null;
  };

  // Health: agregar métodos para gestão de saúde
  // Um registo de saúde tem a forma das sementes: `day` em chave e `time`.
  // Escrevia `date` com o texto cru do formulário, e como o ecrã lia `date` e
  // as sementes têm `day`, o ecrã acabou apontado só aos registos gravados —
  // que estavam sempre vazios. Daí dizer «1 consulta» num cartão e «Sem
  // registos de saúde.» duas linhas abaixo. Uma forma só, e o problema não
  // volta a poder existir.
  const addHealthRecord = (member, data, specialty, time) => {
    const id = 'hlth-' + Date.now();
    const day = chaveDeDMY(data) || data;
    set(x => ({
      health: [...(x.health || []), {
        id, member, day, specialty, time: time || '',
        createdAt: new Date().toISOString(),
      }],
    }));
    return id;
  };

  const addHealthNote = (healthId, author, text) => {
    set(x => ({
      healthNotes: {
        ...x.healthNotes,
        [healthId]: [...(x.healthNotes[healthId] || []), {
          id: 'note-' + Date.now(),
          author,
          date: new Date().toISOString(),
          text,
        }],
      },
    }));
  };

  const addRecipe = (healthId, name, dosage, quantity, unit, expiresAt) => {
    set(x => ({
      healthRecipes: {
        ...x.healthRecipes,
        [healthId]: [...(x.healthRecipes[healthId] || []), {
          id: 'rx-' + Date.now(),
          name, dosage, quantity, unit,
          expiresAt,
          decision: null,
        }],
      },
    }));
  };

  const setRecipeDecision = (healthId, recipeId, decision) => {
    set(x => ({
      healthRecipes: {
        ...x.healthRecipes,
        [healthId]: (x.healthRecipes[healthId] || []).map(r =>
          r.id === recipeId ? { ...r, decision } : r
        ),
      },
    }));
  };

  const setHealthDecision = (healthId, type, status, note) => {
    set(x => ({
      healthDecisions: {
        ...x.healthDecisions,
        [healthId]: { type, status, note, updatedAt: new Date().toISOString() },
      },
    }));
  };

  const addSpecialty = (name) => {
    set(x => ({
      specialities: [...(x.specialities || []), name],
    }));
  };

  const removeSpecialty = (name) => {
    set(x => ({
      specialities: (x.specialities || []).filter(s => s !== name),
    }));
  };

  const renameSpecialty = (oldName, newName) => {
    set(x => ({
      specialities: (x.specialities || []).map(s => s === oldName ? newName : s),
    }));
  };

  // Google Calendar: importar eventos
  // events: array de { id, title, date, time, description, isRecurring }
  // `visibilidade`: um dos três níveis, como em qualquer outro evento. Era um
  // booleano, e por isso a importação era o único sítio da app onde não se
  // podia dizer «só os adultos».
  const importGoogleEvents = (events, user, visibilidade = 'familia') => {
    set(x => {
      const newAdded = events.map(ev => ({
        id: `gcal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        // O mesmo defeito que o «Guardar evento» tinha: a app lê chaves
        // (`d2026-08-27`) e isto punha `2026-08-27`. Os eventos importados
        // gravavam-se e não apareciam.
        day: /^d/.test(String(ev.date)) ? ev.date : `d${ev.date}`,
        time: ev.time || '',
        title: ev.title,
        who: user,
        owner: user,
        visibilidade,
        source: 'Google Calendar',
        // ⚠ O identificador da Google guarda-se, e não se guardava.
        //
        // Sem ele, um evento trazido da agenda podia ser editado e apagado na
        // app e a Google nunca saber: a mesma reunião, com duas horas
        // diferentes, em dois sítios, sem nada a dizer qual está certa. E o
        // «Apagar» dizia «sai da agenda de quem o via», deixava-o na Google, e
        // no dia seguinte ele estava lá a apitar.
        //
        // Com ele, um evento importado segue exactamente o mesmo caminho de um
        // criado aqui — as folhas já leem `evento.idGoogle` para editar e
        // apagar do lado de lá, e o confirmar de apagar já diz que sai das
        // duas agendas quando ele existe.
        idGoogle: ev.id,
        isRecurring: ev.isRecurring || false,
      }));

      const imported = {};
      events.forEach(ev => { imported[ev.id] = true; });

      return {
        added: [...(x.added || []), ...newAdded],
        googleCalendarImported: { ...(x.googleCalendarImported || {}), ...imported },
      };
    });
  };

  return {
    s, set,
    allTasks, allItems, allEvents, allEquip, editEquip, removeEquip,
    budget, spent, remaining: budget - spent, envelopes, kidPts,
    vaultOf, vaultMoves, vaultAdd,
    verificarPin,
    // Os membros da casa. Quem consome isto NUNCA deve importar MEMBERS de
    // data.js: essas são as sementes da demonstração, não a casa de quem está
    // a usar a app.
    membros: s.membros || MEMBERS,
    membrosDaCasa, criancas, adultos, acerto, acertado, pagarAcerto,
    precos: s.precos || [],
    definirPrecoPago, registarPrecos,
    // O que se sabe do preço deste artigo, na loja onde se vai comprar.
    precoDe: (artigo, loja) => estimativaDe(s.precos || [], artigo, loja),
    precosDeArtigo: (rotulo) => precosDe(s.precos || [], rotulo),
    // Qual das lojas sai mais barata para esta lista — ou `null`, que é a
    // resposta certa enquanto não houver o que comparar.
    compararLojas: (artigos) => compararLojas(s.precos || [], artigos, s.stores || []),
    podeVerEvento: (e, viewer) => podeVerEvento(e, viewer, quadro),
    podeEditarEvento: (e, viewer) => podeEditarEvento(e, viewer, quadro),
    editarEvento, removerEvento, idsGoogleDaCasa, eventosQueSairamDaGoogle,
    lojaDoPlano, diaDoPlano,
    artigo, oNome, aoNome, deNome,
    nomeDaCasa: s.nomeDaCasa || 'Bengui',
    deDemonstracao: s.deDemonstracao !== false,
    canSeeHealth, allHealth, healthOf, allHealthDocs, docsOf, nextHealth,
    garantiasAExpirar, receitasAExpirar, consultasProximas,
    tapTask, isAdmin, canChangeRole, setRole, setPin, pinError, isRecurring, definirAvatar, trazerFotografia,
    podeGerirCasa, renomearCasa, acrescentarMembro, editarMembro, renomearMembro, removerMembro,
    lerDoServidor,
    dueOf: (t) => (t.dueKey ? dueInfo(t.dueKey, t.dueTime) : null),
    resetDemo: () => { AsyncStorage.removeItem(KEY).catch(() => {}); set(DEMO()); },
    startBlank: () => set(BLANK()),
    // Health feature methods
    addHealthRecord, addHealthNote, addRecipe, setRecipeDecision, setHealthDecision,
    addSpecialty, removeSpecialty, renameSpecialty,
    // Google Calendar import
    importGoogleEvents,
  };
}
