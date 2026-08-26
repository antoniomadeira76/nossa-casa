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
