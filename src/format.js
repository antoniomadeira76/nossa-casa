// Euro em PT-PT: milhares com espaço estreito, decimal com vírgula,
// e espaço INQUEBRÁVEL antes do € para o símbolo nunca ficar órfão de linha.
export const EUR = (n) => {
  const v = Math.abs(Number(n) || 0);
  const [i, d] = v.toFixed(2).split('.');
  const th = i.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  return (Number(n) < 0 ? '−' : '') + th + ',' + d + '\u00A0€';
};

export const pad2 = (n) => String(n).padStart(2, '0');

export const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
export const WD = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
export const WD_SHORT = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

// Chave de dia: ordenável como texto
export const dkey = (y, m, d) => `d${y}-${pad2(m + 1)}-${pad2(d)}`;
export const parseKey = (k) => {
  const m = /^d(\d{4})-(\d{2})-(\d{2})$/.exec(k || '');
  return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null;
};

export const TODAY = { y: 2026, m: 7, d: 20 };
export const TODAY_KEY = dkey(TODAY.y, TODAY.m, TODAY.d);
export const TOMORROW_KEY = dkey(TODAY.y, TODAY.m, TODAY.d + 1);

const wdIndex = (o) => (new Date(o.y, o.m, o.d).getDay() + 6) % 7;

export const dayLabel = (key) => {
  const o = parseKey(key);
  if (!o) return '';
  const date = `${pad2(o.d)}/${pad2(o.m + 1)}${o.y === TODAY.y ? '' : '/' + o.y}`;
  if (key === TODAY_KEY) return `Hoje · ${WD[wdIndex(o)]}, ${date}`;
  if (key === TOMORROW_KEY) return `Amanhã · ${WD[wdIndex(o)]}, ${date}`;
  return `${WD[wdIndex(o)]}, ${date}`;
};

// Sem hora não é meia-noite — devolve vazio
export const evTime = (t) => (!t || t === '00:00') ? '' : t;

// Prazo de uma tarefa: quanto falta, ou quanto está atrasada
export const dueInfo = (dueKey, dueTime) => {
  const o = parseKey(dueKey);
  if (!o) return null;
  const now = new Date(TODAY.y, TODAY.m, TODAY.d, 14, 30);
  const [hh, mm] = (dueTime || '23:59').split(':').map(Number);
  const due = new Date(o.y, o.m, o.d, hh, mm);
  const diffMin = Math.round((due - now) / 60000);
  const days = Math.floor(Math.abs(diffMin) / 1440);
  if (diffMin < 0) {
    return { late: true, text: days >= 1 ? `atrasada ${days} dia${days > 1 ? 's' : ''}` : 'atrasada hoje' };
  }
  if (diffMin < 1440) {
    const h = Math.floor(diffMin / 60), m = diffMin % 60;
    return { soon: true, text: `hoje às ${dueTime} · falta ${h}h${pad2(m)}` };
  }
  return { text: days === 1 ? `amanhã às ${dueTime}` : `${dayLabel(dueKey).split(' · ').pop()} às ${dueTime}` };
};

export const plural = (n, sing, plur) => `${n} ${n === 1 ? sing : plur}`;

// Dias até uma data, contra o TODAY da app — nunca contra o relógio.
// Aceita as duas formas que a app usa: a chave interna (`d2026-09-10`) e o que
// o utilizador escreve (`10/09/2026`). São dois formatos porque as sementes
// são código e os formulários são texto; ter duas funções para isso foi o que
// deixou a Saúde com `new Date(2026, 7, 27)` escrito à mão — uma terceira
// ideia de «hoje», sete dias à frente do resto da app, que mostrava uma
// receita a expirar como válida durante uma semana.
export const daysUntil = (v) => {
  const s = String(v || '');
  const o = parseKey(s);
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  const alvo = o ? [o.y, o.m, o.d] : dmy ? [+dmy[3], +dmy[2] - 1, +dmy[1]] : null;
  if (!alvo) return null;
  return Math.round(
    (Date.UTC(alvo[0], alvo[1], alvo[2]) - Date.UTC(TODAY.y, TODAY.m, TODAY.d)) / 86400000
  );
};

// Dias até ao fim da garantia, contra o TODAY da app — não contra o relógio.
// Vive aqui porque os Equipamentos e o Dinheiro contam as mesmas garantias;
// duplicá-lo fez com que só um dos dois visse os equipamentos novos.
export const warrantyDaysLeft = (e) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String((e && e.warrantyEnd) || ''));
  if (!m) return typeof (e && e.daysLeft) === 'number' ? e.daysLeft : 0;
  return Math.round(
    (Date.UTC(+m[3], +m[2] - 1, +m[1]) - Date.UTC(TODAY.y, TODAY.m, TODAY.d)) / 86400000
  );
};
