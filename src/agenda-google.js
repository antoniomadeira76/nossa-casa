// O que vai desta casa para a agenda da Google, e o que fica cá.
//
// ── A decisão ────────────────────────────────────────────────────────────────
//
// **Tudo o que a app marca em calendário vai para a Google.** Não é uma opção
// por evento nem uma caixa para ligar: é o comportamento. Decisão do dono da
// casa, 06/09/2026.
//
// Antes disto, só a folha «Agendar Evento» empurrava para a Google, e só quando
// quem marcava ligava um interruptor. Uma consulta marcada na Saúde nunca lá
// chegava — a app dizia «e o evento na agenda» e a agenda de quem interessa,
// a do telemóvel, não sabia dela.
//
// ── ⚠ E a tensão que isto levanta ────────────────────────────────────────────
//
// O módulo de saúde só sincroniza para um servidor DENTRO de casa
// (`eEnderecoDeCasa` em `sync.js`), porque são dados clínicos de menores —
// categoria especial no RGPD. Mandar «Consulta Dentista · Mia» para a Google é
// exactamente o que esse travão existe para impedir, por outra porta.
//
// A resposta, decidida pelo dono da casa: **o título neutro**. Para a Google
// vai «Consulta» e a hora, e mais nada — sem especialidade, sem médico, sem o
// nome de quem vai, sem descrição e sem convidados. O calendário serve para não
// faltar à hora; não precisa de dizer a quem é nem de quê.
//
// A especialidade, o médico, as notas e os anexos ficam onde já estavam: na app
// e no servidor de casa. Quem abre a app vê a consulta inteira; quem abre a
// agenda vê que às 15:00 há uma consulta.
//
// ── Porque é que isto é um ficheiro à parte ──────────────────────────────────
//
// Pelo mesmo motivo do `sessao.js`: o `pocketbase.js` traz o SDK do PocketBase,
// que é ESM, e o Jest não o consegue importar. Uma regra que só se verifica a
// olho, no ecrã, não é uma regra. Aqui é pura, e tem provas.

// Um evento é de saúde se pertence a um episódio ou traz a etiqueta.
//
// ⚠ As duas condições, e não só o `healthId`: o `Saude.jsx` manda os dois, mas
// um evento pode ganhar a etiqueta «Saúde» na folha de agendar sem episódio
// nenhum atrás — e esse leva a mesma discrição.
export const eDeSaude = (ev) => Boolean(ev && (ev.healthId || ev.tag === 'Saúde'));

// O título neutro, e a razão dele está em cima.
export const TITULO_NEUTRO = 'Consulta';

export const tituloParaGoogle = (ev) => (eDeSaude(ev)
  ? TITULO_NEUTRO
  : String((ev && (ev.title || ev.titulo)) || '').trim());

// ⚠ A descrição também não vai. «Criado na Nossa Casa por Rita» numa consulta
// da Mia diz de quem é a casa e quem marcou — menos do que o título completo,
// mas ainda é mais do que a hora.
export const descricaoParaGoogle = (ev, autor) => (eDeSaude(ev) || !autor
  ? undefined
  : `Criado na Nossa Casa por ${autor}.`);

// ⚠ E NINGUÉM é convidado para uma consulta.
//
// Convidar manda um convite por correio eletrónico, com o evento dentro. Uma
// consulta que convidasse o outro adulto punha os dados clínicos de um menor
// num e-mail — que é a porta mais larga de todas, e a que menos se controla
// depois de aberta.
//
// Quem tem de saber da consulta vê-a na app, onde a visibilidade é imposta pelo
// servidor (INVARIANTE #3).
export const convidadosParaGoogle = (ev, emails) => (eDeSaude(ev)
  ? []
  : (emails || []).filter(Boolean));

// O que se manda à Google, das duas formas que a app tem de descrever um
// evento — a da loja (`title`/`day`/`time`) e a do servidor (`titulo`/`dia`).
export const paraGoogle = (ev, { autor, emails } = {}) => ({
  titulo: tituloParaGoogle(ev),
  dia: (ev && (ev.day || ev.dia)) || '',
  hora: (ev && (ev.time || ev.hora)) || '',
  convidados: convidadosParaGoogle(ev, emails),
  descricao: descricaoParaGoogle(ev, autor),
});

// ── A fila ───────────────────────────────────────────────────────────────────
//
// ⚠ Uma escrita na Google que falha NÃO se pode engolir com um `.catch(() => {})`.
//
// Se «tudo o que se marca vai para a Google» é o comportamento, então uma rede
// em baixo não pode transformá-lo em «quase tudo». Pior: os casos que falham
// são invisíveis — a app fica certa, a agenda fica sem o evento, e ninguém
// descobre até faltar a uma consulta.
//
// É a mesma forma da fila de escritas do servidor (`escrever.esvaziar`): o que
// falha fica guardado e tenta outra vez. E é a mesma distinção que essa fila
// aprendeu à sua custa — uma RECUSA não é uma falha de rede. Um evento que a
// Google recusa (apagado do outro lado, autorização retirada) nunca vai passar,
// e uma fila que o guarde tenta-o a cada arranque, para sempre.

// As respostas da Google que não vale a pena repetir.
//
//   401/403  a autorização caiu ou foi retirada — pedir outra vez é trabalho de
//            quem entra, não desta fila.
//   404/410  o evento já lá não está. Para o apagar, é o resultado que se
//            queria; para o alterar, não há o que alterar.
//   400      o pedido está mal feito, e repeti-lo dá o mesmo.
export const naoVaiPassar = (e) => {
  const s = Number(e && e.status);
  if (Number.isFinite(s) && s) return s === 400 || s === 401 || s === 403 || s === 404 || s === 410;
  // Sem `status`, lê-se a mensagem: o `erroDaGoogle` põe lá o código.
  return /\b(400|401|403|404|410)\b/.test(String((e && e.message) || ''));
};

// Uma entrada nova na fila, sem repetidas para o mesmo evento.
//
// ⚠ Substitui-se em vez de acrescentar: se a Rita alterar a hora três vezes
// sem rede, o que interessa é a última. Três entradas mandavam três pedidos
// para dizer a mesma coisa, e o penúltimo podia chegar depois do último.
//
// A excepção é o `apagar`: apagar depois de criar não se substitui um ao
// outro — o `apagar` GANHA, e leva o `criar` à frente, porque um evento que se
// criou e apagou sem rede nunca precisou de existir do lado de lá.
// ⚠ E um tecto. A fila é uma rede de segurança para uma rede que caiu, e uma
// rede de segurança sem fundo é um saco: se alguma coisa a impedir de esvaziar,
// cresce até encher o disco do telemóvel. O mesmo motivo do `REGISTO_MAX`.
//
// Cem eventos por marcar chegam para uma família — e se lá estiverem cem, o
// problema não é o centésimo primeiro.
export const FILA_MAX = 100;

export const enfileirar = (fila, entrada) => {
  const restante = (fila || []).filter(x => x.id !== entrada.id);
  if (entrada.acao === 'apagar') {
    const anterior = (fila || []).find(x => x.id === entrada.id);
    // Criado e apagado sem nunca ter subido: não há nada para apagar lá.
    if (anterior && anterior.acao === 'criar' && !entrada.idGoogle) return restante;
  }
  // As mais antigas saem primeiro: o que ficou preso há mais tempo é o que tem
  // menos hipóteses de ainda interessar.
  return [...restante, entrada].slice(-FILA_MAX);
};
