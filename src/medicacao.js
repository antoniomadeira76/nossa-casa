// A medicação a partir da receita: o plano de tomas, e o que dele se calcula.
//
// Puro e sem React, como o `contas-fixas.js`: a ficha, a folha das tomas e a
// agenda leem o MESMO plano. 12/09/2026 — a sexta das dez funcionalidades.
//
// Uma receita traz `frequency` (tomas por dia), `durationDays` e `boxSize`
// (unidades na caixa). Zero em qualquer dos dois primeiros é «sem plano».
import { parseKey, dkey, pad2, plural, dmyDeChave } from './format';

// A chave por que as tomas de uma receita se guardam na loja.
//
// ⚠ Uma receita que subiu troca de id na leitura seguinte — de `rx-…` para
// `srv-<id>` — e as tomas ficavam órfãs debaixo do id antigo. Guardam-se pelo
// id do servidor mal ele exista, que é o id com que a receita volta.
export const chaveDaReceita = (r) => (r && r.idServidor ? `srv-${r.idServidor}` : (r && r.id) || null);

// O dia (chave `dAAAA-MM-DD`) e a hora («08:10») de um instante ISO, no fuso
// de quem olha — uma toma às 23:30 é do dia em que se tomou, não do dia UTC.
export const diaDoInstante = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return dkey(d.getFullYear(), d.getMonth(), d.getDate());
};
export const horaDoInstante = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

// O plano: começa no dia da consulta (`inicio`, chave) e dura `durationDays`.
// Devolve `null` sem plano. `caixaAcabaEm` é o ÚLTIMO dia coberto pela caixa
// quando ela não chega ao fim — é o aviso «acaba a 28/09, antes da receita».
export const planoDaReceita = (receita, inicio) => {
  const frequencia = Math.max(0, Math.round(Number(receita && receita.frequency) || 0));
  const duracao = Math.max(0, Math.round(Number(receita && receita.durationDays) || 0));
  const caixa = Math.max(0, Math.round(Number(receita && receita.boxSize) || 0));
  const o = parseKey(inicio);
  if (!frequencia || !duracao || !o) return null;
  const dia = (n) => {
    const d = new Date(o.y, o.m, o.d + n);
    return dkey(d.getFullYear(), d.getMonth(), d.getDate());
  };
  const doses = frequencia * duracao;
  const dias = Array.from({ length: duracao }, (_, i) => dia(i));
  const caixaChega = !caixa || caixa >= doses;
  const caixaAcabaEm = caixaChega ? null : dia(Math.max(0, Math.floor(caixa / frequencia) - 1));
  return {
    frequencia, duracao, caixa, doses, inicio, fim: dia(duracao - 1), dias,
    caixaChega, caixaAcabaEm,
    descricao: [
      `${plural(frequencia, 'toma', 'tomas')} por dia`,
      `${plural(duracao, 'dia', 'dias')}`,
      caixa ? `caixa de ${caixa}` : null,
    ].filter(Boolean).join(' · '),
    aviso: caixaChega ? null
      : `A caixa acaba a ${dmyDeChave(caixaAcabaEm)}, antes de a receita terminar (${dmyDeChave(dia(duracao - 1))}).`,
  };
};

// As tomas de um dia, das mais recentes para as mais antigas.
export const tomasDoDia = (tomas, dia) => (tomas || [])
  .filter(tm => diaDoInstante(tm.quando) === dia)
  .sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
