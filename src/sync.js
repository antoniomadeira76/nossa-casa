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
// Os membros do servidor, na forma que a app usa. O servidor guarda `papel` e
// `fem`; a app pensa em `kid` e usa a inicial para o avatar.
//
// A inicial deriva do nome em vez de ser um campo: um campo separado é uma
// segunda verdade sobre a mesma coisa, e mais cedo ou mais tarde discordam.
export const membrosDoServidor = (linhas) => Object.fromEntries(
  (linhas || []).map(m => [m.nome, {
    id: m.id,
    initial: String(m.nome || '?').trim().charAt(0).toUpperCase(),
    email: m.email || null,
    kid: m.papel === 'crianca',
    papel: m.papel,
    fem: !!m.fem,
    cor: m.cor || null,
  }]));

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

  const aCasa = (casa.casas || [])[0] || null;

  return {
    vaultMoves,
    registered,
    // O servidor manda: se responder, é esta a casa e são estes os membros.
    // Sem servidor, a app fica com a família de demonstração — e diz-o.
    membros: membrosDoServidor(casa.membros),
    nomeDaCasa: aCasa ? aCasa.nome : null,
    casaId: aCasa ? aCasa.id : null,
    _servidor: casa,
  };
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

// ─── A casa e quem lá vive ───────────────────────────────────────────────────
//
// Ao contrário do dinheiro, isto NÃO passa pela fila: são operações que a
// pessoa está a fazer e cujo resultado tem de ver já — se falharem, deve
// saber porquê em vez de ficarem pendentes em silêncio. Por isso escrevem
// direto e deixam o erro subir.
//
// Quem pode o quê é decidido pelo servidor, não aqui: `casas.updateRule` e
// `membros.createRule` exigem administração da mesma casa, e há cinco provas
// em provar-regras.mjs. Repetir a verificação neste ficheiro daria a impressão
// errada de que é o cliente que protege.

export async function renomearCasa(casaId, nome) {
  if (!ligado()) throw new Error('Sem ligação ao servidor.');
  return servidor.pb.collection('casas').update(casaId, { nome });
}

export async function acrescentarMembro({ casa, nome, papel, email, pin, palavraPasse, fem, cor }) {
  if (!ligado()) throw new Error('Sem ligação ao servidor.');
  // O `login` leva o id da casa: `nome` não serve de identificador porque duas
  // casas podem ter um Léo, e o campo é único em toda a coleção.
  const segredo = papel === 'crianca' ? pin : palavraPasse;
  // `verified` NÃO vai aqui. Só um superutilizador o pode escrever, e mandá-lo
  // fazia a criação inteira falhar com «Values don't match» — um erro que não
  // diz uma palavra sobre o campo que o causou. A prova contra o servidor
  // apanhou-o; nenhuma leitura de código o veria.
  //
  // Não faz falta: a `authRule` da coleção é vazia, portanto entrar não exige
  // verificação. Se um dia exigir, o que resolve é um convite por e-mail — e
  // isso é outro trabalho, não um campo a mais nesta chamada.
  return servidor.pb.collection('membros').create({
    casa, nome, papel, fem: !!fem, cor: cor || null,
    login: `${casa}_${String(nome).toLowerCase().replace(/\s+/g, '-')}`,
    ...(papel === 'crianca' ? {} : { email }),
    password: segredo, passwordConfirm: segredo,
  });
}

export async function editarMembro(id, campos) {
  if (!ligado()) throw new Error('Sem ligação ao servidor.');
  return servidor.pb.collection('membros').update(id, campos);
}

// Remover é o que mais pode correr mal, e o servidor é que sabe: recusa se a
// casa ficar sem administração (hook), e recusa se houver linhas obrigatórias
// a apontar para o membro — tarefas feitas, movimentos, despesas. Essa segunda
// recusa é uma feature: o histórico da casa não se apaga por alguém sair.
export async function removerMembro(id) {
  if (!ligado()) throw new Error('Sem ligação ao servidor.');
  return servidor.pb.collection('membros').delete(id);
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
