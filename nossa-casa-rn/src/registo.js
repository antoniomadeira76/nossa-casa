// O registo de alterações da app. Cresce a cada versão.
// a = área · v = versão · k = 'feat' | 'fix'
export const REGISTO = [
  { v: '1.0.0', a: 'Sistema',      k: 'feat', t: 'Primeira versão: agenda, tarefas, compras e orçamento por envelopes.' },
  { v: '1.1.0', a: 'Compras',      k: 'feat', t: 'Modo de loja corredor a corredor, com total do carrinho ao vivo e fecho que registra a despesa no envelope.' },
  { v: '1.1.0', a: 'Tarefas',      k: 'feat', t: 'Semanada das crianças: pontos por tarefa, cofre por criança, e pagamento que soma ao saldo.' },
  { v: '1.2.0', a: 'Equipamentos', k: 'feat', t: 'Registo de equipamentos com fotografia da fatura, garantias com aviso, e manutenções agendadas.' },
  { v: '1.2.0', a: 'Dinheiro',     k: 'feat', t: 'Mover dinheiro entre envelopes, com o livre de cada um e pré-visualização dos limites resultantes.' },
  { v: '1.3.0', a: 'Saúde',        k: 'feat', t: 'Fichas de saúde por membro, com episódios e anexos que pertencem ao episódio que os originou.' },
  { v: '1.3.0', a: 'Sistema',      k: 'feat', t: 'Seis esquemas de cor e três aspetos (claro, escuro, sistema), guardados por perfil.' },
  { v: '1.3.1', a: 'Sistema',      k: 'fix',  t: 'O modo escuro deixou de apagar títulos e pastilhas: a superfície passou a ter um token próprio, separado do branco de primeiro plano.' },
  { v: '1.3.2', a: 'Agenda',       k: 'fix',  t: 'As datas deixaram de mostrar o dia sem zero à esquerda, e a agenda passou a começar em hoje.' },
  { v: '1.4.0', a: 'Tarefas',      k: 'feat', t: 'Urgência em três níveis que manda na ordem, prazos com aviso, e confirmação pelos pais do que a criança marca.' },
  { v: '1.4.0', a: 'Dinheiro',     k: 'feat', t: 'Registar despesa fora das compras: valor, envelope, quem pagou e como divide.' },
  { v: '1.4.1', a: 'Sistema',      k: 'fix',  t: 'O rodapé voltou a aparecer em todos os ecrãs — um fecho a mais tirava-o da coluna da app.' },
  { v: '1.5.0', a: 'Sistema',      k: 'feat', t: 'PIN das crianças definido por um adulto, sem valor de fábrica, com limite de tentativas.' },
  { v: '1.5.0', a: 'Compras',      k: 'feat', t: 'Histórico das últimas dez compras, com média, e gestão dos supermercados.' },
];
