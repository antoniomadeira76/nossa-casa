// As categorias de um equipamento — as mesmas ao registar e ao alterar.
//
// Viviam como `CATS` dentro do ecrã dos Equipamentos, e a ficha (que é uma
// folha importada POR esse ecrã) não lhes chegava sem um ciclo de importações.
// Uma lista, um sítio, duas folhas a lê-la (15/09/2026).
//
// ⚠ E são a SEMENTE, não a lista (26/09/2026). As categorias são uma das três
// listas da casa — o `TAREFAS.md` diz-o na linha 174, e o lado dos dados está
// feito há semanas: a loja tem `equipCats`, o servidor tem a coleção
// `categorias_equip`, e o `puxarCasa` desce-a e substitui a da loja.
//
// O que faltava era a outra ponta: NENHUM ecrã a lia. Os dois liam esta
// constante, e uma categoria escrita no servidor nunca aparecia na app — é a
// classe «calculado na leitura, e ninguém o usa», que já custou o gasto do mês
// a aparecer a zero com dez despesas na base.
//
// Agora os ecrãs pedem a lista da casa e caem aqui quando ela vem vazia, que é
// o caso de quem corre sem servidor. Ver `categoriasDaCasa`.
export const CATEGORIAS_DE_EQUIPAMENTO = ['Eletrodomésticos', 'Aquecimento', 'Informática', 'Outros'];

/**
 * As categorias desta casa: a lista do servidor, ou as sementes enquanto ela
 * não existir. Nunca devolve vazio — uma folha com um campo sem opções é uma
 * promessa que não se cumpre.
 */
export const categoriasDaCasa = (lista) =>
  (Array.isArray(lista) && lista.length ? lista : CATEGORIAS_DE_EQUIPAMENTO);
