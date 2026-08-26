import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TASKS, ITEMS, EVENTS, EQUIP, ENV_BASE, MEMBERS, ROLES } from './data';
import { TODAY_KEY, dueInfo } from './format';

const KEY = 'nossa-casa/v1';

// Só isto é gravado. O resto — separador ativo, folha aberta, rascunhos — é UI.
const DATA_KEYS = [
  'done', 'pending', 'status', 'registered', 'settled', 'vault', 'paidPts', 'extraLog',
  'envMove', 'added', 'newTasks', 'taskEdits', 'taskGone', 'newItems', 'itemGone',
  'newEquip', 'equipGone', 'schemeByUser', 'themeByUser', 'importDone', 'notif',
  'rotate', 'urg', 'due', 'monthName', 'monthLimits', 'monthZero', 'clearedSeeds',
  'eventGone', 'eventEdits', 'roles', 'pins', 'pointValue', 'payDay', 'splitHalf',
  'stores', 'shopPlan', 'shopHistory', 'health', 'specialities', 'equipCats', 'registo',
];

export const DEMO = () => ({
  done: TASKS.reduce((a, t) => (a[t.id] = !!t.done, a), {}),
  pending: {}, status: {}, registered: 0, settled: false,
  vault: { 'Léo': 12.4, 'Mia': 8.9 }, paidPts: { 'Léo': 0, 'Mia': 0 }, extraLog: {},
  envMove: {}, added: [], newTasks: [], taskEdits: {}, taskGone: {},
  newItems: [], itemGone: {}, newEquip: [], equipGone: {},
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
  stores: ['Continente de Belém', 'Pingo Doce da Ajuda', 'Mercado de Alcântara'],
  shopPlan: { who: 'Tomás', day: null, time: '10:30', store: 0 },
  shopHistory: [], health: [], specialities: ['Medicina geral', 'Dentista', 'Pediatria', 'Oftalmologia'],
  equipCats: ['Eletrodomésticos', 'Aquecimento', 'Informática', 'Outros'],
  registo: [],
});

// Casa nova: os mesmos campos, todos vazios
export const BLANK = () => ({
  ...DEMO(), done: {}, urg: {}, due: {}, vault: { 'Léo': 0, 'Mia': 0 },
  clearedSeeds: true, monthZero: true, shopHistory: [], health: [],
});

const Ctx = createContext(null);
const reducer = (s, patch) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) });

export function StoreProvider({ children }) {
  const [state, set] = useReducer(reducer, null, DEMO);
  const ready = useRef(false);
  const sig = useRef('');

  // ler ao arrancar
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && saved.v === 1) {
            const patch = {};
            DATA_KEYS.forEach(k => { if (saved[k] !== undefined) patch[k] = saved[k]; });
            set(patch);
          }
        }
      } catch (e) { /* armazenamento indisponível — segue em memória */ }
      ready.current = true;
    })();
  }, []);

  // gravar a cada alteração, sem escrever igual duas vezes
  useEffect(() => {
    if (!ready.current) return;
    const out = { v: 1, savedAt: new Date().toISOString() };
    DATA_KEYS.forEach(k => { out[k] = state[k]; });
    const payload = JSON.stringify(out);
    const s = payload.replace(/"savedAt":"[^"]*",?/, '');
    if (s === sig.current) return;
    sig.current = s;
    AsyncStorage.setItem(KEY, payload).catch(() => {});
  }, [state]);

  const api = useMemo(() => build(state, set), [state]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useStore = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore fora do StoreProvider');
  return v;
};

// ─── derivações. Tudo o que a interface lê passa por aqui.
function build(s, set) {
  const isRecurring = (t) => t.recur === 'Todos os dias' || t.recur === 'Dias de semana';

  const allTasks = () => {
    const base = [...(s.clearedSeeds ? [] : TASKS), ...s.newTasks]
      .filter(t => !s.taskGone[t.id])
      .map(t => ({ ...t, ...(s.taskEdits[t.id] || {}) }))
      .map(t => ({
        ...t,
        who: s.rotate[t.id] && ['Léo', 'Mia'].includes(t.who)
          ? (34 % 2 === 0 ? 'Léo' : 'Mia') : t.who,
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
  const allEquip = () => [...(s.clearedSeeds ? [] : EQUIP), ...s.newEquip].filter(e => !s.equipGone[e.id]);

  const budget = s.monthLimits
    ? Object.values(s.monthLimits).reduce((a, b) => a + b, 0)
    : ENV_BASE.reduce((a, e) => a + e.limit, 0);
  const spent = (s.monthZero ? 0 : 1687.4) + s.registered;

  const envelopes = ENV_BASE.map(e => ({
    ...e,
    used: (s.monthZero ? 0 : e.used) + (e.name === 'Mercearia' ? s.registered : 0),
    limit: (s.monthLimits ? s.monthLimits[e.name] : e.limit) + (s.envMove[e.name] || 0),
  }));

  const kidPts = ['Léo', 'Mia'].reduce((a, k) => {
    const base = s.clearedSeeds ? 0 : (k === 'Léo' ? 14 : 11);
    a[k] = base + allTasks().filter(t => t.who === k && s.done[t.id] && !TASKS.some(x => x.id === t.id && x.done)).reduce((n, t) => n + (t.pts || 0), 0);
    return a;
  }, {});

  // Tarefa: por fazer → (criança) a confirmar → (adulto) concluída
  const tapTask = (id, byChild) => set(x => {
    const done = !!x.done[id], pend = !!x.pending[id];
    if (byChild) return pend || done
      ? { pending: { ...x.pending, [id]: false }, done: { ...x.done, [id]: false } }
      : { pending: { ...x.pending, [id]: true } };
    if (pend) return { pending: { ...x.pending, [id]: false }, done: { ...x.done, [id]: true } };
    return { done: { ...x.done, [id]: !done }, pending: { ...x.pending, [id]: false } };
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
    const used = Object.entries(s.pins).find(([n, p]) => n !== name && p === pin);
    if (used) return `Já é o PIN do ${used[0]}.`;
    return null;
  };

  const setPin = (name, pin) => {
    const err = pinError(name, pin);
    if (err) return err;
    set(x => ({ pins: { ...x.pins, [name]: pin } }));
    return null;
  };

  return {
    s, set,
    allTasks, allItems, allEvents, allEquip,
    budget, spent, remaining: budget - spent, envelopes, kidPts,
    tapTask, isAdmin, canChangeRole, setRole, setPin, pinError, isRecurring,
    dueOf: (t) => (t.dueKey ? dueInfo(t.dueKey, t.dueTime) : null),
    resetDemo: () => { AsyncStorage.removeItem(KEY).catch(() => {}); set(DEMO()); },
    startBlank: () => set(BLANK()),
  };
}
