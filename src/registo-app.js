// Registo de alterações da app — a fonte das duas vistas da Documentação.
// Vem do protótipo (`design/Nossa Casa App.dc.html`), onde é escrito à mão a
// cada correção. A Documentação gera daqui as novidades por versão e o «Como
// funciona» por área: nada é escrito duas vezes.
//
// Não confundir com `s.registo`, que é o histórico de alterações que a
// FAMÍLIA faz à casa. São duas coisas diferentes, e o ecrã mostrava a segunda
// onde a referência 17 mostra a primeira.
export const APP_VERSION = '1.4.2';

export const REGISTO_APP = [
  { v: '1.4.0', d: '25/08/2026', k: 'novo', a: 'Documentação', t: 'Registo de versões e Como funciona, gerados deste registo' },
  { v: '1.4.0', d: '25/08/2026', k: 'novo', a: 'Saúde', t: 'Ficha por membro com episódios, anexos e notas' },
  { v: '1.4.0', d: '25/08/2026', k: 'novo', a: 'Saúde', t: 'Especialidades geridas na Gestão da Casa' },
  { v: '1.4.0', d: '25/08/2026', k: 'alterado', a: 'Compras', t: 'Listas acima de 5 linhas paginam; 10 por página no modo de loja' },
  { v: '1.4.0', d: '25/08/2026', k: 'alterado', a: 'Perfil', t: 'Aspeto e Esquema de Cor num só bloco, com três ícones' },
  { v: '1.4.1', d: '25/08/2026', k: 'alterado', a: 'Perfil', t: 'Gestão da Casa e Saúde com ícones próprios: houseGear e heartPulse' },
  { v: '1.4.1', d: '25/08/2026', k: 'novo', a: 'A App', t: 'Marca da casa no arranque, no ecrã de entrada e no resumo diário' },
  { v: '1.4.1', d: '25/08/2026', k: 'alterado', a: 'Gestão da Casa', t: 'Divisão das despesas passou a alternador' },
  { v: '1.4.1', d: '25/08/2026', k: 'alterado', a: 'Entrada', t: 'Painéis de vidro passaram de preto a Storm Blue — a cor do cabeçalho onde se entra' },
  { v: '1.4.1', d: '26/08/2026', k: 'alterado', a: 'Perfil', t: 'Escala de espaçamento única (2/4/8/16/24) e entradas da casa num só contentor' },
  { v: '1.4.2', d: '26/08/2026', k: 'corrigido', a: 'Gestão da Casa', t: 'PIN sem valor de fábrica, definido por um adulto e nunca mostrado em claro' },
  { v: '1.4.2', d: '26/08/2026', k: 'alterado', a: 'Gestão da Casa', t: 'Membros: a linha abre a ficha, com PIN e papel como linhas dentro dela' },
  { v: '1.4.2', d: '26/08/2026', k: 'corrigido', a: 'Gestão da Casa', t: 'Cinco tentativas de PIN erradas bloqueiam o perfil por um minuto' },
  { v: '1.4.1', d: '26/08/2026', k: 'corrigido', a: 'Perfil', t: 'Documentação passou a linha do bloco A App e os Dados' },
  { v: '1.4.1', d: '25/08/2026', k: 'alterado', a: 'Gestão da Casa', t: 'Concluir removido — a folha grava ao toque e fecha pelo ✕ do cabeçalho' },
  { v: '1.4.1', d: '25/08/2026', k: 'alterado', a: 'Gestão da Casa', t: 'Valor do ponto livre entre 0,01 e 5,00 €; semanada em qualquer dia da semana' },
  { v: '1.4.0', d: '25/08/2026', k: 'corrigido', a: 'Agenda', t: 'Consultas da Saúde passam a aparecer na Agenda de Hoje' },
  { v: '1.4.0', d: '25/08/2026', k: 'corrigido', a: 'Início', t: 'Rodapé desaparecia em algumas janelas — a raiz fechava cedo' },
  { v: '1.4.0', d: '25/08/2026', k: 'corrigido', a: 'Perfil', t: 'Subtítulo do cabeçalho ilegível nos esquemas mais claros' },
  { v: '1.3.0', d: '24/08/2026', k: 'novo', a: 'Dinheiro', t: 'Registar Despesa fora das compras, com envelope e divisão' },
  { v: '1.3.0', d: '24/08/2026', k: 'novo', a: 'Dinheiro', t: 'Fecho do mês guarda o que foi gasto por envelope' },
  { v: '1.3.0', d: '24/08/2026', k: 'novo', a: 'Tarefas', t: 'Prazo com aviso, e urgência que ordena a lista' },
  { v: '1.3.0', d: '24/08/2026', k: 'alterado', a: 'Gestão da Casa', t: 'Papéis editáveis, com validação das transições possíveis' },
  { v: '1.3.0', d: '24/08/2026', k: 'alterado', a: 'Perfil', t: 'Terminar sessão passou a ícone no cabeçalho da folha' },
  { v: '1.2.0', d: '22/08/2026', k: 'novo', a: 'Compras', t: 'Carrinho, últimas 10 compras e preço habitual de cada artigo' },
  { v: '1.2.0', d: '22/08/2026', k: 'novo', a: 'Compras', t: 'Lojas com a sua própria ordem de corredor' },
  { v: '1.2.0', d: '22/08/2026', k: 'alterado', a: 'Compras', t: 'Aba Todos no modo de loja, para não andar secção a secção' },
  { v: '1.2.0', d: '22/08/2026', k: 'alterado', a: 'Dinheiro', t: 'Valores escritos à mão em vez de montantes fixos' },
  { v: '1.1.0', d: '21/08/2026', k: 'novo', a: 'Equipamentos', t: 'Compra, fatura, garantia e manutenções agendadas' },
  { v: '1.1.0', d: '21/08/2026', k: 'novo', a: 'Gestão da Casa', t: 'Rendimento, semanada, divisão e envelopes, só para quem administra' },
  { v: '1.1.0', d: '21/08/2026', k: 'novo', a: 'Tarefas', t: 'Modo criança com PIN: só as suas tarefas e o seu cofre' },
  { v: '1.0.0', d: '20/08/2026', k: 'novo', a: 'Início', t: 'Cinco separadores: Início, Dinheiro, Tarefas, Compras e Agenda' },
  { v: '1.0.0', d: '20/08/2026', k: 'novo', a: 'Agenda', t: 'Calendário com mês expansível e visibilidade por evento' },
  { v: '1.0.0', d: '20/08/2026', k: 'novo', a: 'Perfil', t: 'Entrada com conta Google, dados guardados no dispositivo' },
];

// Novo / Alterado / Corrigido. As cores vêm do tema em quem desenha.
export const TIPOS = {
  novo:      'Novo',
  alterado:  'Alterado',
  corrigido: 'Corrigido',
};
