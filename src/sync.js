// Ligação entre a loja local e o servidor.
//
// A loja continua a ser a fonte de verdade do que o ecrã mostra: a app tem de
// funcionar sem rede, e funcionava assim antes de existir servidor. O que isto
// acrescenta é o que faltava para dois telemóveis servirem a mesma casa.
//
// ── Porque é que só o dinheiro vai por aqui, para já ─────────────────────────
//
// O INVARIANTE #2 diz que saldos são somas de movimentos, nunca campos
// escritos. Localmente isso já é verdade. Entre dois telemóveis passa a ser o
// que separa uma app que funciona a dois de uma que perde dinheiro: se a Rita
// e o Tomás creditarem 5 € cada um e cada telemóvel gravar «saldo = 5», o
// resultado é 5. Se cada um gravar «+5», é 10.
//
// Por isso as operações de dinheiro vão para o servidor como INSERÇÕES com
// chave de idempotência — nunca como substituições — e o saldo lê-se das
// vistas, que não têm caminho de escrita. As tarefas, as compras e a agenda
// continuam locais por enquanto: são remendos sobre sementes (`taskEdits`,
// `taskGone`) e não linhas, e traduzi-los é outro trabalho. Dizer que estão
// ligados quando não estão seria pior do que a lacuna.
//
// ── A saúde não vai, e não é esquecimento ────────────────────────────────────
//
// `episodios_saude` e `anexos` existem no servidor e têm 15 provas, mas o
// CLAUDE.md e o db/README.md põem-nos atrás de cinco pontos de conformidade
// por resolver: são dados clínicos de menores, categoria especial no RGPD.
// Enquanto isso não estiver feito, a saúde não sai deste dispositivo. Está
// escrito abaixo como um filtro, não como uma intenção.

import * as servidor from './pocketbase';

// O que NUNCA sobe, aconteça o que acontecer.
export const NUNCA_SINCRONIZA = ['health', 'healthNotes', 'healthRecipes',
  'healthDecisions', 'healthDocs', 'healthGone'];

export const ligado = () => servidor.estaLigado();

// Quem está ligado, do lado do servidor. Devolve null quando a app corre
// local — e é isso que faz cada função abaixo não fazer nada em vez de
// rebentar.
export const sessao = () => {
  if (!ligado() || !servidor.auth.valida()) return null;
  const m = servidor.auth.membro();
  return m ? { membro: m.id, casa: m.casa, nome: m.nome } : null;
};

// ─── Ler ─────────────────────────────────────────────────────────────────────
//
// Traz a casa e devolve-a já na forma que a loja usa. Não filtra nada por
// visibilidade: quem decide o que existe para quem pergunta são as regras das
// coleções. Se este código filtrasse, o dado já teria chegado ao dispositivo.
export async function puxarCasa() {
  if (!ligado()) return null;
  const casa = await servidor.ler.casa();

  // Movimentos de cofre: a coleção é aditiva, e a loja também. Um para um.
  const nomeDoMembro = Object.fromEntries((casa.membros || []).map(m => [m.id, m.nome]));
  const vaultMoves = (casa.cofre_movimentos || []).map(m => ({
    id: m.id,
    kid: nomeDoMembro[m.membro] || m.membro,
    delta: Number(m.valor) || 0,
    kind: m.tipo,
    label: m.motivo || m.tipo,
    sub: nomeDoMembro[m.autorizado_por] ? `autorizado por ${nomeDoMembro[m.autorizado_por]}` : '',
    // O servidor devolve ISO; a loja usa a chave `d2026-08-20`.
    day: (m.data || m.created || '').slice(0, 10)
      .replace(/^(\d{4})-(\d{2})-(\d{2})$/, 'd$1-$2-$3'),
  }));

  // O que foi gasto: a soma das despesas não anuladas. A vista do servidor
  // também o calcula; isto é para o ecrã ter o número sem uma segunda ida.
  const registered = (casa.despesas || [])
    .filter(d => !d.anula_id)
    .reduce((n, d) => n + (Number(d.valor) || 0), 0);

  return { vaultMoves, registered, _servidor: casa };
}

// ─── Escrever ────────────────────────────────────────────────────────────────
//
// Cada uma destas é uma inserção. Nenhuma substitui um total.
// A chave de idempotência é posta pela camada de cliente quando falta, e é o
// que impede uma semanada de ser paga duas vezes quando a fila reenvia depois
// de uma reconexão.

// ⚠ Os nomes são os das coleções, não os da loja local. Escrevi-os de
// cabeça à primeira — `descricao` em vez de `motivo`, `dia` em vez de
// `data`, `envelope_de` em vez de `de_envelope` — e o PocketBase ignora
// campos que não conhece **em silêncio**: a escrita passava e os dados
// caíam. Só a prova de dois telemóveis apanhou. Antes de mexer aqui,
// confirme os campos contra db/pocketbase/criar-colecoes.mjs.

export async function movimentoDeCofre({ casa, membro, tipo, valor, motivo, data, autorizadoPor }) {
  if (!ligado()) return { enviadas: 0, pendentes: 0 };
  return servidor.escrever.criar('cofre_movimentos', {
    casa, membro, tipo, valor, motivo, data, autorizado_por: autorizadoPor,
  });
}

export async function despesa({ casa, envelope, valor, pagador, descricao, data, divideMeias }) {
  if (!ligado()) return { enviadas: 0, pendentes: 0 };
  return servidor.escrever.criar('despesas', {
    casa, envelope, valor, pagador, descricao, data, divide_meias: divideMeias,
  });
}

export async function transferenciaEntreEnvelopes({ casa, de, para, valor, mes, por }) {
  if (!ligado()) return { enviadas: 0, pendentes: 0 };
  return servidor.escrever.criar('transferencias', {
    casa, de_envelope: de, para_envelope: para, valor, mes, por,
  });
}

export async function acerto({ casa, de, para, valor, data }) {
  if (!ligado()) return { enviadas: 0, pendentes: 0 };
  return servidor.escrever.criar('acertos', {
    casa, de_membro: de, para_membro: para, valor, data,
  });
}

// O que está à espera de rede. O ecrã pode mostrá-lo; o importante é que
// nada se perde por estar offline.
export const pendentes = () => servidor.escrever.pendentes();
export const esvaziar = () => servidor.escrever.esvaziar();

// ─── Guarda ──────────────────────────────────────────────────────────────────
//
// Uma rede de segurança, não uma decisão de desenho: se alguém acrescentar uma
// escrita de saúde a este ficheiro, isto rebenta em testes antes de rebentar
// na vida de alguém.
export function recusaSaude(colecao) {
  if (colecao === 'episodios_saude' || colecao === 'anexos') {
    throw new Error(
      'A saúde não sincroniza: cinco pontos de conformidade por resolver '
      + '(db/postgres/README.md). São dados clínicos de menores.');
  }
  return colecao;
}
