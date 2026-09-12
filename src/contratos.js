// O estado de um contrato, dito numa pastilha, e a linha que o descreve.
//
// Puro e sem React, como o `contas-fixas.js`: a lista dos Equipamentos, a
// ficha do contrato e o «Precisa de Si» dizem a MESMA coisa sobre o mesmo dia.
//
// `c` é um contrato tal como `contratosDaCasa()` o devolve: com `dias` (até
// renovar, negativos se já passou; nulo sem data de renovação).
import { plural } from './format';

// Devolve `{ texto, tom }` ou `null` quando não há nada a dizer — um contrato
// que renova daqui a seis meses não precisa de pastilha.
//
//   warn  renova hoje, ou dentro de trinta dias (o prazo das garantias)
//   err   a data passou e ninguém mexeu no contrato
export const estadoDoContrato = (c) => {
  if (!c || typeof c.dias !== 'number') return null;
  if (c.dias < 0) return { texto: `passou há ${plural(-c.dias, 'dia', 'dias')}`, tom: 'err' };
  if (c.dias === 0) return { texto: 'renova hoje', tom: 'warn' };
  if (c.dias <= 30) return { texto: `renova em ${plural(c.dias, 'dia', 'dias')}`, tom: 'warn' };
  return null;
};

// «03/2027», para a fidelização — o dia não interessa a quem lê a lista.
export const mesEAno = (dmy) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dmy || ''));
  return m ? `${m[2]}/${m[3]}` : String(dmy || '');
};

// A segunda linha: «renova a 05/10/2026 · fidelização até 03/2027 · Tomás».
export const linhaDoContrato = (c) => [
  c && c.renovaEm ? `renova a ${c.renovaEm}` : null,
  c && c.fidelizacaoAte ? `fidelização até ${mesEAno(c.fidelizacaoAte)}` : null,
  c && c.responsavel ? c.responsavel : null,
].filter(Boolean).join(' · ');
