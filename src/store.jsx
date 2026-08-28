import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TASKS, ITEMS, EVENTS, EQUIP, ENV_BASE, MEMBERS, ROLES, HEALTH, HEALTH_DOCS } from './data';
import { TODAY_KEY, dueInfo } from './format';

const KEY = 'nossa-casa/v1';

// Só isto é gravado. O resto — separador ativo, folha aberta, rascunhos — é UI.
const DATA_KEYS = [
  'done', 'pending', 'status', 'registered', 'settled', 'vaultMoves', 'paidPts', 'extraLog',
  'envMove', 'added', 'newTasks', 'taskEdits', 'taskGone', 'newItems', 'itemGone',
  'newEquip', 'equipGone', 'schemeByUser', 'themeByUser', 'importDone', 'notif',
  'rotate', 'urg', 'due', 'monthName', 'monthLimits', 'monthZero', 'clearedSeeds',
  'eventGone', 'eventEdits', 'roles', 'pins', 'pointValue', 'payDay', 'splitHalf',
  'stores', 'shopPlan', 'shopHistory', 'health', 'specialities', 'equipCats', 'registo',
  'recurringReset', 'healthNotes', 'healthRecipes', 'healthDecisions', 'healthDocs', 'healthGone',
  'googleCalendarImported', // Google Calendar imports
];

// INVARIANTE #2: o cofre é a soma dos seus movimentos, nunca um campo escrito.
// Dois telefones que acrescentam movimentos somam; dois que escrevem um saldo
// anulam-se. Por isso não existe `vault` — existe `vaultMoves`.
const VAULT_SEED = () => [
  { id: 'vm-l0', kid: 'Léo', delta: 8.30, kind: 'semanada', day: 'd2026-08-02',
    label: 'Semanadas anteriores', sub: 'até 2 de agosto' },
  { id: 'vm-l1', kid: 'Léo', delta: -2.50, kind: 'retirada', day: 'd2026-08-09',
    label: 'Retirada — cromos', sub: 'autorizado pelo Tomás' },
  { id: 'vm-l2', kid: 'Léo', delta: 5.00, kind: 'bonus', day: 'd2026-08-14',
    label: 'Bónus — boletim escolar', sub: 'Rita' },
  { id: 'vm-l3', kid: 'Léo', delta: 1.60, kind: 'semanada', day: 'd2026-08-17',
    label: 'Semanada de 10 a 16 de agosto', sub: '16 pt · pago a 17/08' },
  { id: 'vm-m0', kid: 'Mia', delta: 7.40, kind: 'semanada', day: 'd2026-08-02',
    label: 'Semanadas anteriores', sub: 'até 2 de agosto' },
  { id: 'vm-m1', kid: 'Mia', delta: -1.00, kind: 'retirada', day: 'd2026-08-11',
    label: 'Retirada — gelado', sub: 'autorizado pela Rita' },
  { id: 'vm-m2', kid: 'Mia', delta: 1.40, kind: 'bonus', day: 'd2026-08-13',
    label: 'Bónus — arrumou o quarto', sub: 'Tomás' },
  { id: 'vm-m3', kid: 'Mia', delta: 1.10, kind: 'semanada', day: 'd2026-08-17',
    label: 'Semanada de 10 a 16 de agosto', sub: '11 pt · pago a 17/08' },
];

export const DEMO = () => ({
  done: TASKS.reduce((a, t) => (a[t.id] = !!t.done, a), {}),
  pending: {}, status: {}, registered: 0, settled: false,
  vaultMoves: VAULT_SEED(), paidPts: { 'Léo': 0, 'Mia': 0 }, extraLog: {},
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
  recurringReset: {}, // taskId -> TODAY_KEY when reset
  healthNotes: {}, // healthId -> [{ author, date, text }]
  healthRecipes: {}, // healthId -> [{ id, name, dosage, quantity, unit, expiresAt, decision }]
  healthDecisions: {}, // healthId -> { type, status, note }
  googleCalendarImported: {}, // eventId -> true (track which Google Calendar events were imported)
});

// Casa nova: os mesmos campos, todos vazios
export const BLANK = () => ({
  ...DEMO(), done: {}, urg: {}, due: {}, vaultMoves: [],
  clearedSeeds: true, monthZero: true, shopHistory: [], health: [],
  healthNotes: {}, healthRecipes: {}, healthDecisions: {}, googleCalendarImported: {},
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

  // Saúde. A ficha de um adulto é só dele; as das crianças são visíveis aos
  // adultos e invisíveis às próprias. Isto é a regra do cliente — a do
  // servidor está em docs/seguranca.html e é a que conta (INVARIANTE #3).
  const canSeeHealth = (member, viewer) =>
    MEMBERS[member] && MEMBERS[member].kid
      ? !!(MEMBERS[viewer] && !MEMBERS[viewer].kid)
      : member === viewer;

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

  // Saldo do cofre: soma, nunca leitura de um campo (INVARIANTE #2).
  const vaultMoves = (kid) => (s.vaultMoves || [])
    .filter(m => m.kid === kid)
    .sort((a, b) => (b.day || '').localeCompare(a.day || ''));
  const vaultOf = (kid) => (s.vaultMoves || [])
    .reduce((n, m) => (m.kid === kid ? n + m.delta : n), 0);
  // Acrescenta um movimento. Nunca substitui o saldo.
  const vaultAdd = (kid, delta, kind, label, sub, day = TODAY_KEY) => set(x => ({
    vaultMoves: [...(x.vaultMoves || []), {
      id: 'vm-' + Date.now() + '-' + Math.round(Math.random() * 1e6),
      kid, delta, kind, label, sub, day,
    }],
  }));

  const kidPts = ['Léo', 'Mia'].reduce((a, k) => {
    const base = s.clearedSeeds ? 0 : (k === 'Léo' ? 14 : 11);
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

  // Health: agregar métodos para gestão de saúde
  const addHealthRecord = (member, date, specialty) => {
    const id = 'hlth-' + Date.now();
    set(x => ({
      health: [...(x.health || []), {
        id, member, date, specialty,
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
    allTasks, allItems, allEvents, allEquip,
    budget, spent, remaining: budget - spent, envelopes, kidPts,
    vaultOf, vaultMoves, vaultAdd,
    canSeeHealth, allHealth, healthOf, allHealthDocs, docsOf, nextHealth,
    tapTask, isAdmin, canChangeRole, setRole, setPin, pinError, isRecurring,
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
