// O que sobe para a base de dados, o que não sobe, e porquê — campo a campo.
//
// ── Porque é que este ficheiro existe ────────────────────────────────────────
//
// Em 04/09/2026 medi que a base de dados tinha 31 coleções e o cliente escrevia
// em 10. As tarefas, a agenda, o orçamento e as regras da casa viviam só no
// telefone de quem as escreveu, e dois telefones nunca se viam.
//
// Corrigi-o por partes, e a cada parte ficava a mesma pergunta sem resposta
// escrita: e o resto? «Não sobe» era indistinguível de «esqueci-me», e a única
// forma de saber qual era ler o `sync.js` inteiro.
//
// ⚠ Isto é a resposta, e é a mesma forma de guarda que fechou as relações não
// ancoradas: em vez de eu me lembrar, ENUMERA-SE. Cada chave de `DATA_KEYS` tem
// de estar aqui, com um `como` e um `porque`. A prova em
// `__tests__/o-que-sobe.test.js` falha se faltar uma, se sobrar uma que já não
// exista, ou se um `porque` for curto demais para dizer alguma coisa.
//
// A consequência prática: quem acrescentar um campo à loja tem de decidir, ali
// e nesse momento, se ele é da casa ou do dispositivo. Não pode adiar sem que
// uma prova o diga.
//
// ── As três respostas possíveis ──────────────────────────────────────────────
//
//   'linhas'  sobe como LINHAS numa coleção aditiva ou própria. O servidor
//             manda, e dois telefones fundem-se em vez de se anularem.
//   'campo'   sobe como campo de uma linha que já existe (a casa, o membro).
//   'local'   NÃO sobe, e a razão está escrita. São três famílias: estado do
//             dispositivo, coisas derivadas de outra que já sobe, e o que
//             ainda não tem coleção.
export const O_QUE_SOBE = {
  // ── Tarefas ───────────────────────────────────────────────────────────────
  newTasks: ['linhas', 'A coleção `tarefas`, com título, atribuição, pontos, urgência e prazo.'],
  done: ['linhas', 'Uma linha por (tarefa, dia) em `tarefas_feitas`, com índice único. Marcar cria, desmarcar apaga — nunca um booleano na tarefa (INVARIANTE #2).'],
  feitas: ['local', 'O `id` da linha de `tarefas_feitas` por «tarefa|dia», guardado para se poder DESMARCAR. É um índice do que já subiu, não dado da casa — refaz-se a cada leitura.'],
  taskEdits: ['campo', 'As alterações de uma tarefa vão para a própria linha em `tarefas`. O mapa existe porque uma SEMENTE não se pode editar no sítio.'],
  urg: ['campo', 'A `urgencia` da linha da tarefa. O mapa é a forma que oito ecrãs leem, e enche-se a partir da linha.'],
  due: ['campo', 'O `prazo` da linha da tarefa, pela mesma razão do `urg`.'],
  taskGone: ['local', 'Lápides de sementes apagadas. Uma tarefa do servidor apaga-se LÁ; isto só marca as que vêm do ficheiro `data.js` e não existem em coleção nenhuma.'],
  taskOrder: ['local', 'A ordem à mão dentro do grupo de urgência. Ainda não tem campo no servidor — está por decidir se a ordem é da casa ou de quem olha para a lista.'],
  pending: ['local', 'Uma criança marcou e falta um adulto confirmar. No servidor isso é a AUSÊNCIA de `confirmada_em` na linha de `tarefas_feitas`; aqui é o passo intermédio da interface.'],
  rotate: ['local', 'Alternar uma tarefa entre as crianças. Sem campo no servidor — a rotação é semanal e derivável, e ainda não se decidiu se vale uma coluna.'],
  recurringReset: ['local', 'Quando uma tarefa recorrente foi reposta hoje. Deriva-se das linhas de `tarefas_feitas`; guardá-lo é uma otimização deste dispositivo.'],
  pontosDeTarefasApagadas: ['local', 'Pontos ganhos numa tarefa que foi apagada. O histórico verdadeiro são as linhas de `tarefas_feitas`, que ficam.'],

  // ── Agenda ────────────────────────────────────────────────────────────────
  added: ['linhas', 'A coleção `eventos`, com os três níveis de visibilidade impostos pelo servidor (INVARIANTE #3).'],
  eventEdits: ['campo', 'As alterações de um evento vão para a própria linha. O mapa existe pela mesma razão do `taskEdits`.'],
  eventGone: ['local', 'Lápides de eventos-semente. Um evento do servidor apaga-se lá.'],
  googleCalendarImported: ['local', 'Que eventos da Google já foram importados NESTE dispositivo, para não os oferecer duas vezes. A `credenciais_agenda` do servidor é outra coisa.'],

  // ── Dinheiro ──────────────────────────────────────────────────────────────
  vaultMoves: ['linhas', 'A coleção `cofre_movimentos`, aditiva e com chave de idempotência.'],
  envMove: ['linhas', 'A SOMA das `transferencias`. Era um saldo escrito, e dois telefones a mover dinheiro anulavam-se — o INVARIANTE #2 ao contrário.'],
  envelopesDaCasa: ['linhas', 'A coleção `envelopes`. Eram sementes no código, e a lista da casa não existia em lado nenhum.'],
  registered: ['linhas', 'A soma das `despesas` não anuladas. O número é derivado; o que sobe são as despesas.'],
  acertoMovs: ['linhas', 'A coleção `acertos`, aditiva. O acerto entre os dois adultos — dinheiro entre duas pessoas, o sítio onde discordar dói mais.', 'acerto'],
  paidPts: ['local', 'Quantos pontos de cada criança já foram pagos. Deriva-se dos `cofre_movimentos` do tipo semanada; guardá-lo aqui é o resumo, não a verdade.'],
  monthLimits: ['local', 'Os limites de cada envelope NESTE mês. A coleção `meses` tem um campo `limites`, e ligá-lo é o trabalho seguinte — está dito no TAREFAS.md.'],
  monthZero: ['local', 'Se o mês foi aberto e ainda nada se gastou. Deriva-se de haver ou não despesas no mês.'],
  monthName: ['local', 'O nome do mês a mostrar. É uma etiqueta do ecrã, calculada da data.'],
  extraLog: ['local', 'Registo de extras dados a uma criança. Deriva-se dos `cofre_movimentos` do tipo bónus.'],

  // ── Compras ───────────────────────────────────────────────────────────────
  newItems: ['linhas', 'A coleção `artigos`, ligada à `listas_compras` da ida às compras.'],
  status: ['linhas', 'O `estado` de cada artigo vive NA LINHA — por comprar, confirmado, sem stock. Era um mapa que cada telefone reescrevia, e o esquema já avisava: «se fosse uma lista de identificadores confirmados, dois telefones na mesma loja anulavam-se».'],
  shopPlan: ['campo', 'A `listas_compras` aberta: a loja, quem vai, e para quando.'],
  itemGone: ['local', 'Lápides de artigos-semente. Um artigo do servidor apaga-se lá.'],
  shopHistory: ['local', 'As últimas dez idas às compras. Deriva-se das `listas_compras` fechadas; é um resumo para o ecrã.'],
  precos: ['local', 'O histórico de preços por artigo e loja. Não tem coleção no servidor: são observações deste dispositivo, e a comparação entre lojas ainda é local. É a lacuna maior que resta nas compras.'],
  precoPago: ['local', 'O que se escreveu no corredor NESTA ida. É um rascunho: vira observações ao fechar a conta, e limpa-se.'],

  // ── Regras e listas da casa ───────────────────────────────────────────────
  roles: ['campo', 'O `papel` de cada membro. Decide o que o servidor DEVOLVE — mudá-lo só no cliente mudava a aparência e mais nada.', 'editarMembro'],
  pins: ['campo', 'A palavra-passe do membro, por uma rota própria: o PocketBase exige `oldPassword` e quem põe o PIN de uma criança não o sabe. O resumo local serve a entrada sem servidor.', 'definirPin'],
  pontosLigados: ['campo', 'O `pontos_ligados` da casa. A Rita desligava os pontos e o Tomás continuava a vê-los.'],
  pointValue: ['campo', 'O `valor_ponto` da casa. Os dois telefones pagavam semanadas de valores diferentes.'],
  payDay: ['campo', 'O `dia_pagamento` da casa: em que dia da semana a semanada se paga.'],
  splitHalf: ['campo', 'O `divide_meias` da casa: se cada despesa partilhada se divide a meias.'],
  rendimento: ['campo', 'O `rendimento_mensal` da casa, contra o qual os limites dos envelopes se medem.'],
  nomeDaCasa: ['campo', 'O `nome` da casa, que aparece no cabeçalho e no ecrã de entrada.'],
  membros: ['linhas', 'A coleção `membros`. O servidor manda: se responder, são estes e mais nenhuns.'],
  specialities: ['linhas', 'A coleção `especialidades`. Só quem administra a casa lhes mexe — decisão do dono em 05/09/2026: manda o servidor.'],
  equipCats: ['linhas', 'A coleção `categorias_equip`, uma das três listas da casa com a mesma forma.'],
  stores: ['linhas', 'A coleção `lojas`. Renomear GUARDA a linha — apagar levava atrás as listas de compras que a referem.'],
  listasIds: ['local', 'O `nome → id` das três listas da casa. É um índice do que já subiu, não dado — refaz-se a cada leitura.'],

  // ── Saúde ─────────────────────────────────────────────────────────────────
  health: ['linhas', 'A coleção `episodios_saude`, e só para um servidor que viva na casa (`eEnderecoDeCasa`).'],
  healthDocs: ['linhas', 'A coleção `anexos`, com o ficheiro, pelo mesmo travão.'],
  healthNotes: ['linhas', 'A coleção `notas_saude`. Só o autor altera ou apaga a sua, e a regra é do servidor.', 'notaDeSaude'],
  healthRecipes: ['linhas', 'A coleção `receitas_saude`, ligada ao episódio. A receita tem de chegar a quem for à farmácia, e não a quem a escreveu.', 'receitaDeSaude'],
  healthDecisions: ['linhas', 'A coleção `decisoes_saude`, com índice único por episódio: uma decisão é um estado, não um movimento, e não se pode somar.', 'decisaoDeSaude'],
  healthArchived: ['local', 'Que consultas estão arquivadas. Ainda não tem campo no servidor — arquivar é uma vista deste dispositivo sobre a lista, não uma propriedade da consulta.'],
  healthGone: ['local', 'Lápides de consultas-semente apagadas neste dispositivo.'],

  // ── Equipamentos ──────────────────────────────────────────────────────────
  newEquip: ['local', 'A coleção `equipamentos` existe no servidor e o cliente ainda não escreve nela. É a lacuna maior que resta, e está no TAREFAS.md.'],
  equipEdits: ['local', 'Pela mesma razão do `newEquip`: enquanto a coleção não for escrita, as alterações não têm para onde ir.'],
  equipGone: ['local', 'Lápides de equipamentos-semente, e pela mesma razão.'],

  // ── Do dispositivo, e de mais ninguém ─────────────────────────────────────
  schemeByUser: ['local', 'O esquema de cor escolhido. A coleção `preferencias` existe e é POR MEMBRO; ligá-la é trabalho de outro dia, e entretanto a cor é deste telefone.'],
  themeByUser: ['local', 'Claro ou escuro, pela mesma razão do `schemeByUser`.'],
  notif: ['local', 'Os avisos: resumo diário, hora, dias de antecedência. Também da `preferencias`, também por ligar.'],
  clearedSeeds: ['local', 'Se as sementes de demonstração já saíram deste dispositivo. É um facto sobre este telefone, não sobre a casa.'],
  importDone: ['local', 'Se a importação inicial já correu neste dispositivo.'],
  deDemonstracao: ['local', 'Se a app está a correr com a família de demonstração. É o oposto de ter servidor — por definição não sobe.'],
  registo: ['local', 'O registo de alterações da casa. Cada dispositivo escreve o seu; juntá-los precisa de uma coleção e de decidir o que fazer com as linhas repetidas.'],
};

// As três respostas possíveis, para a prova as poder verificar.
export const RESPOSTAS = ['linhas', 'campo', 'local'];
