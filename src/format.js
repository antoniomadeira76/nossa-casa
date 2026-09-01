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

// A semana de hoje, de segunda a domingo. Três cabeçalhos falam dela — a
// Agenda, as Tarefas e as Compras — e a tira de dias da Agenda também.
// Estava escrita à mão em cada sítio, e não coincidiam: a Agenda dizia
// «20 – 26» (a semana a começar em hoje) onde a referência diz «17 – 23».
export const semanaDeHoje = () => {
  const hoje = new Date(TODAY.y, TODAY.m, TODAY.d);
  const seg = new Date(hoje);
  seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  const dom = new Date(seg);
  dom.setDate(seg.getDate() + 6);
  const mesmoMes = seg.getMonth() === dom.getMonth();
  return {
    seg, dom,
    // «17 – 23 de agosto de 2026»
    intervalo: mesmoMes
      ? `${seg.getDate()} – ${dom.getDate()} de ${MONTHS[seg.getMonth()].toLowerCase()} de ${dom.getFullYear()}`
      : `${seg.getDate()} de ${MONTHS[seg.getMonth()].toLowerCase()} – ${dom.getDate()} de ${MONTHS[dom.getMonth()].toLowerCase()} de ${dom.getFullYear()}`,
    // «Semana de 17/08»
    curta: `Semana de ${pad2(seg.getDate())}/${pad2(seg.getMonth() + 1)}`,
  };
};

// O que o utilizador escreve (`10/09/2026`) para a chave interna. Havia três
// sítios a fazer isto com `.split('/')` à mão, e um deles não fazia de todo —
// gravava o texto cru e o ecrã ficava com dois formatos de registo.
// Devolve null se não for uma data válida, para quem chama poder recusar.
export const chaveDeDMY = (v) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(v || '').trim());
  if (!m) return null;
  const [d, mes, a] = [+m[1], +m[2], +m[3]];
  if (mes < 1 || mes > 12 || d < 1 || d > 31) return null;
  return dkey(a, mes - 1, d);
};

// O inverso do `chaveDeDMY`. Faltava, e cada ecrã que guarda a data como texto
// escrevia o seu — ou, pior, não escrevia nenhum e ficava sem calendário.
export const dmyDeChave = (k) => {
  const p = parseKey(k);
  return p ? `${pad2(p.d)}/${pad2(p.m + 1)}/${p.y}` : '';
};

// O «hoje» da app.
//
// ── Era 20 de agosto de 2026, escrito à mão ──────────────────────────────────
//
// Vinha do protótipo, para as capturas de `docs/referencia` baterem sempre
// certo. Serviu enquanto a app não saía do computador; deixou de servir no dia
// em que alguém a usou: o cabeçalho dizia «Quinta, 20/08» a 1 de setembro, as
// tarefas de hoje eram as de há duas semanas, e uma garantia a expirar em três
// dias aparecia com doze.
//
// Agora vem do relógio. `EXPO_PUBLIC_HOJE=aaaa-mm-dd` fixa-o, e é isso que as
// provas e as capturas de referência usam — um teste que dependa do dia em que
// corre falha sozinho a certa altura, e ninguém sabe porquê.
//
// ⚠ É lido UMA vez, ao carregar o módulo. Uma app deixada aberta a passar a
// meia-noite continua no dia anterior até recarregar. É o comportamento que
// já existia e não se resolve com uma constante — resolve-se com um relógio
// que avisa, e isso é outra tarefa.
const HOJE_FIXO = (typeof process !== 'undefined' && process.env
  && process.env.EXPO_PUBLIC_HOJE) || null;

const agora = (() => {
  if (HOJE_FIXO) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(HOJE_FIXO);
    // Meio-dia, e não meia-noite: à meia-noite, um fuso a oeste de Greenwich
    // atira a data para o dia anterior.
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0);
  }
  return new Date();
})();

export const TODAY = { y: agora.getFullYear(), m: agora.getMonth(), d: agora.getDate() };
export const TODAY_KEY = dkey(TODAY.y, TODAY.m, TODAY.d);

// ⚠ Amanhã conta-se com um `Date`, não com `d + 1`.
//
// Era `dkey(TODAY.y, TODAY.m, TODAY.d + 1)`, e a 31 de agosto dava
// `d2026-08-32` — uma chave que o `parseKey` aceita pelo formato e que não
// corresponde a dia nenhum. Nunca se viu porque o «hoje» estava preso a 20 de
// agosto; passou a ser alcançável quatro vezes por ano no momento em que a
// data passou a ser real.
export const TOMORROW_KEY = (() => {
  const d = new Date(TODAY.y, TODAY.m, TODAY.d + 1);
  return dkey(d.getFullYear(), d.getMonth(), d.getDate());
})();

// ── Datas relativas a hoje ───────────────────────────────────────────────────
//
// Os dados de demonstração tinham as datas escritas à mão em torno de 20 de
// agosto de 2026, com o «hoje» preso na mesma data. Quando o «hoje» passou a
// vir do relógio, a demonstração ficou toda no passado: consultas «próximas»
// há duas semanas, garantias já expiradas, uma receita a expirar há um mês.
//
// Passam a ser DESLOCAMENTOS. `-18` é há dezoito dias, `+8` é daqui a oito, e
// a demonstração é coerente em qualquer dia em que alguém a abra.
//
// ⚠ Tudo isto conta com um `Date`, e não somando ao dia do mês. `dkey` não
// normaliza: somar 12 a 20 de agosto dava «d2026-08-32», que o `parseKey`
// aceita pelo formato e não é dia nenhum.
export const diaRelativo = (dias) => new Date(TODAY.y, TODAY.m, TODAY.d + dias);

// A chave interna: `d2026-09-09`.
export const chaveRelativa = (dias) => {
  const d = diaRelativo(dias);
  return dkey(d.getFullYear(), d.getMonth(), d.getDate());
};

// O que se escreve num campo de data: `09/09/2026`.
export const dmyRelativo = (dias) => {
  const d = diaRelativo(dias);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// O que se escreve numa frase: `9 de setembro`. As legendas das sementes do
// cofre dizem «Semanada de 10 a 16 de agosto» — texto com datas lá dentro, que
// tem de acompanhar os deslocamentos, senão a demonstração contradiz-se a si
// própria e isso é pior do que estar desactualizada.
export const diaEMesRelativo = (dias) => {
  const d = diaRelativo(dias);
  return `${d.getDate()} de ${MONTHS[d.getMonth()].toLowerCase()}`;
};

// «julho de 2027», para o prazo de uma meta.
export const mesEAnoRelativo = (dias) => {
  const d = diaRelativo(dias);
  return `${MONTHS[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
};

// E o curto, para «pago a 17/08».
export const ddmmRelativo = (dias) => {
  const d = diaRelativo(dias);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
};

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

// «Rita e Tomás», não «Rita, Tomás». O último separador em português é «e», e
// uma lista de responsáveis lê-se numa linha de evento — não é uma enumeração
// de dados.
export const listaEmPortugues = (nomes) => {
  const xs = (nomes || []).filter(Boolean);
  if (xs.length === 0) return '';
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`;
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
