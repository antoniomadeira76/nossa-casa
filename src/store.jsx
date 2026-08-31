import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TASKS, ITEMS, EVENTS, EQUIP, ENV_BASE, MEMBERS, ROLES, HEALTH, HEALTH_DOCS, VAULT, DE } from './data';
import { TODAY_KEY, dueInfo, daysUntil, warrantyDaysLeft, chaveDeDMY } from './format';
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
export const CAMPOS_COM_MEMBRO = [
  { chave: 'newTasks', forma: 'lista', campos: ['who'] },
  { chave: 'taskEdits', forma: 'mapa', campos: ['who'] },
  { chave: 'added', forma: 'lista', campos: ['owner', 'responsible'] },
  { chave: 'eventEdits', forma: 'mapa', campos: ['owner', 'responsible'] },
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
  const trocaValor = (registo, campos) => {
    if (!registo || typeof registo !== 'object') return registo;
    let mexido = null;
    for (const c of campos) {
      if (registo[c] === antigo) (mexido = mexido || { ...registo })[c] = novo;
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

  for (const { chave, forma, campos } of CAMPOS_COM_MEMBRO) {
    const v = fora[chave];
    if (!v) continue;
    if (forma === 'lista') fora[chave] = v.map(r => trocaValor(r, campos));
    else if (forma === 'objeto') fora[chave] = trocaValor(v, campos);
    else if (forma === 'mapa') {
      fora[chave] = Object.fromEntries(
        Object.entries(v).map(([k, r]) => [k, trocaValor(r, campos)]));
    } else if (forma === 'mapaDeListas') {
      fora[chave] = Object.fromEntries(Object.entries(v)
        .map(([k, lista]) => [k, (lista || []).map(r => trocaValor(r, campos))]));
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

// Só isto é gravado. O resto — separador ativo, folha aberta, rascunhos — é UI.
const DATA_KEYS = [
  'done', 'pending', 'status', 'registered', 'acertoMovs', 'vaultMoves', 'paidPts', 'extraLog',
  'envMove', 'added', 'newTasks', 'taskEdits', 'taskGone', 'newItems', 'itemGone',
  'newEquip', 'equipGone', 'equipEdits', 'schemeByUser', 'themeByUser', 'importDone', 'notif',
  'rotate', 'urg', 'due', 'monthName', 'monthLimits', 'monthZero', 'clearedSeeds',
  'eventGone', 'eventEdits', 'roles', 'pins', 'pointValue', 'payDay', 'splitHalf',
  'rendimento', 'stores', 'shopPlan', 'shopHistory', 'health', 'specialities', 'equipCats', 'registo',
  'recurringReset', 'healthNotes', 'healthRecipes', 'healthDecisions', 'healthDocs', 'healthGone',
  'googleCalendarImported', // Google Calendar imports
  'membros', 'nomeDaCasa', 'deDemonstracao',
];

// Versão do formato gravado. Sobe sempre que a forma de um campo persistido
// muda, e MIGRATIONS ganha a entrada correspondente. Sem isto, dados antigos
// eram lidos com a forma nova e ganhavam silenciosamente ao código.
export const SCHEMA = 6;

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
  monthName: 'Agosto', monthLimits: null, monthZero: false,
  clearedSeeds: false, eventGone: {}, eventEdits: {},
  roles: { ...ROLES },
  pins: {},                       // sem PIN de fábrica — o adulto define
  pointValue: 0.10, payDay: 0, splitHalf: true,
  rendimento: 3200,              // o que entra por mês; os envelopes saem daqui
  stores: ['Continente de Belém', 'Pingo Doce da Ajuda', 'Mercado de Alcântara'],
  shopPlan: {
    who: Object.keys(MEMBERS).filter(n => !MEMBERS[n].kid)[1] || Object.keys(MEMBERS)[0],
    day: 'd2026-08-23', time: '10:30', store: 0,   // domingo
  },
  shopHistory: [], health: [], specialities: ['Medicina geral', 'Dentista', 'Pediatria', 'Oftalmologia'],
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
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          let saved = JSON.parse(raw);
          const v = saved && typeof saved.v === 'number' ? saved.v : 0;
          // Gravado por uma versão mais recente: não sabemos ler, e ler mal é
          // pior do que não ler. Fica-se pelas predefinições.
          if (saved && v <= SCHEMA) {
            for (let n = v + 1; n <= SCHEMA; n++) {
              if (MIGRATIONS[n]) saved = MIGRATIONS[n](saved);
            }
            const patch = {};
            DATA_KEYS.forEach(k => { if (saved[k] !== undefined) patch[k] = saved[k]; });
            set(patch);
          }
        }
      } catch (e) { /* armazenamento indisponível — segue em memória */ }
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
  // shared: true para "Adicionar", false para "Adicionar Só para Mim"
  const importGoogleEvents = (events, user, shared = true) => {
    set(x => {
      const newAdded = events.map(ev => ({
        id: `gcal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        day: ev.date, // dd/mm/yyyy → 2026-08-27
        time: ev.time || '',
        title: ev.title,
        who: user,
        owner: user,
        shared: shared,
        source: 'Google Calendar',
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
    artigo, oNome, aoNome, deNome,
    nomeDaCasa: s.nomeDaCasa || 'Bengui',
    deDemonstracao: s.deDemonstracao !== false,
    canSeeHealth, allHealth, healthOf, allHealthDocs, docsOf, nextHealth,
    garantiasAExpirar, receitasAExpirar, consultasProximas,
    tapTask, isAdmin, canChangeRole, setRole, setPin, pinError, isRecurring,
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
