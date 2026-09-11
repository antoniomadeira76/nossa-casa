// O estado de uma conta fixa, dito numa pastilha.
//
// Puro e sem React, como o `compras-estado.js`: o Dinheiro e a folha de gerir
// a conta dizem a MESMA coisa sobre o mesmo dia, e um texto escrito em dois
// ecrãs é a primeira coisa a divergir. O Jest importa-o sem montar nada.
//
// `c` é uma conta tal como `contasDoMes()` a devolve: com `paga` e `dias` (os
// dias até ao vencimento deste mês, negativos se já passou).
import { plural } from './format';

// Devolve `{ texto, tom }` ou `null` quando não há nada a dizer — uma conta
// por pagar que vence daqui a três semanas não precisa de pastilha.
//
//   ok    paga
//   warn  vence hoje, ou dentro de uma semana
//   err   já venceu e não está paga
export const estadoDaConta = (c) => {
  if (!c) return null;
  if (c.paga) return { texto: 'paga', tom: 'ok' };
  if (typeof c.dias !== 'number') return null;
  // ⚠ `plural`: «atrasada 1 dias» é a classe de defeito que já apareceu em
  // seis sítios desta casa.
  if (c.dias < 0) return { texto: `atrasada ${plural(-c.dias, 'dia', 'dias')}`, tom: 'err' };
  if (c.dias === 0) return { texto: 'vence hoje', tom: 'warn' };
  if (c.dias <= 7) return { texto: `em ${plural(c.dias, 'dia', 'dias')}`, tom: 'warn' };
  return null;
};

// O total do que a lista mostra — a soma das linhas, nunca uma contagem ao lado.
export const totalDasContas = (contas) => (contas || []).reduce((n, c) => n + (Number(c.valor) || 0), 0);
