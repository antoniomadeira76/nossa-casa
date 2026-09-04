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
// ── A saúde vai, e só para casa ──────────────────────────────────────────────
//
// `episodios_saude` e `anexos` existem no servidor e têm 16 provas. O travão
// era um «não» inteiro, atrás de cinco pontos de conformidade — são dados
// clínicos de menores, categoria especial no RGPD.
//
// Passou a ser uma CONDIÇÃO, em 03/09/2026: sobe se o servidor viver na casa, e
// não sobe se ele estiver na internet. A regra é o `eEnderecoDeCasa`, em
// `src/endereco.js`, e o travão é o `recusaSaude` no fim deste ficheiro.
//
// «Sobe tudo», por decisão do dono da casa no mesmo dia: as consultas E os
// anexos, com a fotografia. O que fica de fora são as notas, as receitas e as
// decisões, e não por escolha — não têm coleção no servidor.
//
// ⚠ Os dois sobem por caminhos DIFERENTES, e é uma restrição técnica: a
// consulta vai pela fila e o anexo não pode, porque a fila serializa em JSON e
// um ficheiro não é JSON. Ver `anexoDeSaude` e `criarComFicheiro`.

// Sem extensão, que é como o Metro resolve.
//
// ⚠ Cheguei a pôr `.js` aqui para o Node ESM conseguir importar este ficheiro
// numa prova de aceitação. Está escrito em `provar-gerir-casa-pela-app.mjs`
// porque é que não se faz: «mudar a app para agradar à prova é ao contrário. A
// prova é que se adapta.» As provas resolvem-no com um `registerHooks`.
import * as servidor from './pocketbase';
import { eEnderecoDeCasa, PORQUE_NAO_SOBE } from './endereco';

export { eEnderecoDeCasa, PORQUE_NAO_SOBE };

// O que NUNCA sobe, aconteça o que acontecer.
//
// ⚠ Duas saíram desta lista em 03/09/2026, e por razões diferentes:
//
//   `health`      os episódios sobem quando o servidor vive na casa. A
//                 condição é o `eEnderecoDeCasa`, e o travão o `recusaSaude`.
//   `healthDocs`  os anexos passaram a subir com a FOTOGRAFIA, por decisão do
//                 dono da casa — «sobe tudo». Vão para `anexos`, com o
//                 ficheiro, pelo mesmo travão.
//
// E mais três saíram em 04/09/2026, pela razão que aqui estava escrita: não
// tinham coleção no servidor. «Não é que não subam — é que não há para onde.»
// Agora há: `notas_saude`, `receitas_saude` e `decisoes_saude`, com 24 provas
// em `provar-notas-saude.mjs` e a MESMA condição de visibilidade dos anexos.
//
// O que fica é o `healthGone` — uma lista de ids apagados localmente, que é
// estado de dispositivo e não dado da casa.
export const NUNCA_SINCRONIZA = ['healthGone'];

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
    // A fotografia da conta Google, se houver. É uma URL, não um ficheiro: a
    // imagem vive na Google, e copiá-la para o servidor da casa seria guardar
    // um dado pessoal que não é preciso guardar.
    avatar: m.avatar || null,
    figura: m.figura || null,
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

// ─── Onde é que a saúde pode ir ──────────────────────────────────────────────
//
// A REGRA vive em `src/endereco.js`, pura e sem importar nada — é a única
// forma de a provar sem arrastar o SDK do PocketBase, que é ESM e que o jest
// desta app não transforma. Aqui fica só a ligação dela ao servidor real.
export const saudeSincroniza = () => ligado() && eEnderecoDeCasa(servidor.enderecoDoServidor());


// ─── Guarda ──────────────────────────────────────────────────────────────────
//
// Uma rede de segurança, não uma decisão de desenho: qualquer escrita de saúde
// passa por aqui, e se o servidor não for de casa isto rebenta — em testes
// antes de rebentar na vida de alguém.
// ⚠ A lista é EXPLÍCITA e não um `/saude/.test(colecao)`. Uma coleção nova de
// saúde tem de ser acrescentada aqui à mão, e é isso que se quer: o travão que
// se aplica sozinho a nomes que combinam é o travão que um dia deixa passar
// `anexos`, que não tem «saude» no nome.
const SAUDE = ['episodios_saude', 'anexos', 'notas_saude', 'receitas_saude', 'decisoes_saude'];

export function recusaSaude(colecao) {
  if (SAUDE.includes(colecao)) {
    if (!saudeSincroniza()) throw new Error(PORQUE_NAO_SOBE);
  }
  return colecao;
}

// ─── A saúde, quando pode ────────────────────────────────────────────────────
//
// Passa pela FILA, como o dinheiro e ao contrário da gestão da casa: uma
// consulta marcada no corredor do hospital, sem rede, não se perde por isso.
//
// A visibilidade não se decide aqui. As regras de `episodios_saude` são as do
// servidor, com 16 provas em provar-saude.mjs — incluindo a que garante que uma
// criança não recebe a sua própria ficha.
// ⚠ Tenta DIRETO e só cai na fila se falhar, ao contrário do dinheiro. A razão
// é o anexo: um anexo é uma relação para o episódio, e sem o `id` que o
// servidor lhe deu não há relação nenhuma — o anexo ficaria órfão do outro
// lado, que é o que o TAREFAS.md proíbe pelo nome.
//
// A fila não devolve o registo criado (devolve quantas subiram), portanto uma
// consulta que vá só pela fila nunca aprende o seu `id`. Direto, aprende — e
// sem rede continua a não se perder, porque a fila fica como rede de segurança.
//
// Devolve `{ id }` quando o servidor respondeu, ou `{ pendente: true }` quando
// ficou na fila. Quem chama guarda o `id` se o houver.
export async function episodioDeSaude({ casa, membro, especialidade, medico, dia, hora, notas }) {
  recusaSaude('episodios_saude');
  const linha = {
    casa, membro, especialidade, medico: medico || '', dia, hora: hora || '', notas: notas || '',
  };
  try {
    const r = await servidor.pb.collection('episodios_saude').create(linha);
    return { id: r.id };
  } catch (e) {
    await servidor.escrever.criar('episodios_saude', linha);
    return { pendente: true };
  }
}

// ─── Um anexo, com o ficheiro ────────────────────────────────────────────────
//
// ⚠ NÃO passa pela fila, ao contrário do episódio, e a razão é técnica e não de
// desenho: a fila serializa em JSON e um ficheiro não é JSON. Ver
// `criarComFicheiro` em `src/pocketbase.js`.
//
// Portanto isto ou sobe ou rebenta. Quem chama — o `addHealthDoc` da loja —
// guarda a fotografia no dispositivo ANTES de tentar, e marca o documento como
// «por subir» se falhar. A fotografia nunca se perde por não haver rede, e a
// app não finge que já está no servidor.
//
// O `tipo` do servidor é minúsculo e sem acento (`exame`, `receita`,
// `relatorio`) — é um `select` com esses três valores. A loja fala «Exame»,
// «Receita», «Relatório». A tradução é aqui, e não nos dois sítios.
const TIPO_NO_SERVIDOR = { Exame: 'exame', Receita: 'receita', 'Relatório': 'relatorio' };

export async function anexoDeSaude({ casa, episodio, tipo, titulo, uri, blob, nome, mime }) {
  recusaSaude('anexos');
  if (!episodio) throw new Error('Um anexo sem episódio não se grava — seria um exame órfão.');
  return servidor.escrever.criarComFicheiro('anexos', {
    casa, episodio, titulo,
    tipo: TIPO_NO_SERVIDOR[tipo] || 'exame',
  }, (uri || blob) ? { campo: 'ficheiro', uri, blob, nome, tipo: mime } : null);
}

// ─── O que pende de uma consulta: notas, receitas e decisões ─────────────────
//
// ⚠ Estas TRÊS passam pela fila, ao contrário do anexo, e podem: não levam
// ficheiro nenhum, e portanto serializam em JSON sem problema. Uma nota escrita
// no corredor do hospital, sem rede, não se perde por isso.
//
// Mas tentam DIRETO primeiro, como o episódio, e pela mesma razão: a nota
// precisa de aprender o seu `id` no servidor para depois se poder alterar. Uma
// nota que fosse só pela fila ficava lá, correta, e inalterável do outro lado.
//
// Devolvem `{ id }` quando o servidor respondeu, `{ pendente: true }` quando
// ficaram na fila. Quem chama guarda o `id` se o houver.
const criarOuEnfileirar = async (colecao, linha) => {
  recusaSaude(colecao);
  try {
    const r = await servidor.pb.collection(colecao).create(linha);
    return { id: r.id };
  } catch (e) {
    await servidor.escrever.criar(colecao, linha);
    return { pendente: true };
  }
};

export async function notaDeSaude({ casa, episodio, autor, texto }) {
  if (!episodio) throw new Error('Uma nota sem consulta não se grava — não seria de nada.');
  // ⚠ O `autor` vai e é obrigatório: o servidor exige `autor = @request.auth.id`
  // na criação, e sem ele a escrita é recusada. É de propósito — sem essa
  // condição bastava criar a nota já assinada por outra pessoa, e a regra que
  // diz «só o autor altera» não valia nada.
  if (!autor) throw new Error('Uma nota tem de ter autor — é ele quem a pode alterar.');
  return criarOuEnfileirar('notas_saude', { casa, episodio, autor, texto: texto || '' });
}

// Alterar e apagar são DIRETOS, sem fila.
//
// ⚠ E é uma decisão, não um esquecimento: a fila só sabe criar. Enfileirar uma
// alteração exigia guardar a ordem entre criar e alterar, e duas alterações da
// mesma nota fora de ordem deixavam o texto antigo a ganhar. Sem rede, a
// alteração fica só no dispositivo e sobe na próxima — que é o mesmo que
// acontece hoje, e é honesto.
export async function alterarNotaDeSaude(idNoServidor, texto) {
  recusaSaude('notas_saude');
  if (!idNoServidor) return { pendente: true };
  return servidor.pb.collection('notas_saude').update(idNoServidor, {
    texto, editada_em: new Date().toISOString(),
  });
}

export async function apagarNotaDeSaude(idNoServidor) {
  recusaSaude('notas_saude');
  if (!idNoServidor) return { pendente: true };
  return servidor.pb.collection('notas_saude').delete(idNoServidor);
}

export async function receitaDeSaude({ casa, episodio, nome, dose, quantidade, unidade, expiraEm, decisao }) {
  if (!episodio) throw new Error('Uma receita sem consulta não se grava.');
  return criarOuEnfileirar('receitas_saude', {
    casa, episodio, nome, dose: dose || '', quantidade: quantidade || '',
    unidade: unidade || '', expira_em: expiraEm || null, decisao: decisao || '',
  });
}

// A decisão de uma consulta é UMA. O servidor tem um índice único no
// `episodio`, portanto criar a segunda é recusado — e é isso que faz dois
// telefones concordarem em vez de criarem uma linha cada um.
//
// Daí o `atualizar` em vez de `criar`: procura-se a que existe e altera-se.
export async function decisaoDeSaude({ casa, episodio, tipo, estado, nota }) {
  recusaSaude('decisoes_saude');
  if (!episodio) throw new Error('Uma decisão sem consulta não se grava.');
  const linha = {
    casa, episodio, tipo: tipo || '', estado: estado || 'pendente',
    nota: nota || '', atualizada_em: new Date().toISOString(),
  };
  try {
    const ja = await servidor.pb.collection('decisoes_saude')
      .getFirstListItem(`episodio="${episodio}"`).catch(() => null);
    if (ja) return { id: (await servidor.pb.collection('decisoes_saude').update(ja.id, linha)).id };
    return { id: (await servidor.pb.collection('decisoes_saude').create(linha)).id };
  } catch (e) {
    await servidor.escrever.criar('decisoes_saude', linha);
    return { pendente: true };
  }
}

// O aspeto do próprio membro — a cor do avatar.
//
// Passa por aqui, e não pelo `pocketbase` directamente, porque a loja só
// conhece esta porta: importa o `./sync` em atraso e nunca o cliente. Manter a
// regra poupa à loja saber que servidor está do outro lado.
export const guardarAspeto = (campos) => servidor.auth.guardarAspeto(campos);
export const trazerFotografiaDaGoogle = () => servidor.auth.trazerFotografiaDaGoogle();
