// O ícone de um corredor — escolhido por quem administra, e nunca repetido.
//
// 25/09/2026. Começou em «podes criar 5 designs para ter as secções com
// icons?», passou por «não repitas icons nas secções», e acabou aqui:
// «dont chose the icons. let the admins chose the icon to represent each
// "Compras" section».
//
// ── ⚠ A APP NÃO ADIVINHA ───────────────────────────────────────────────────
//
// Houve aqui uma tabela que lia o nome — «Padaria» dava o pão, «Peixaria» dava
// o peixe — e ele tirou-a. Tinha razão, e a razão é esta: os corredores são
// inventados pela família, e uma adivinha sobre nomes inventados acerta na
// maioria e erra em silêncio no resto. «Frescos» numa casa vegetariana, um
// corredor escrito noutra língua, um «Corredor 3». Um ícone errado é pior do
// que um ícone por escolher, porque ninguém vai lá corrigir o que não sabe que
// está errado.
//
// Agora um corredor sem escolha mostra a `caixa` — que quer dizer, com
// honestidade, «ainda não tem ícone» — e quem administra abre-o e escolhe.
//
// ── ⚠ E NUNCA DOIS CORREDORES COM O MESMO ÍCONE ────────────────────────────
//
// Um ícone repetido não é um ícone: é ruído. Um que já é de outro corredor não
// se pode escolher sem primeiro o libertar — e a grelha di-lo antes, em vez de
// o tirar a outro pelas costas.
//
// A `caixa` é a única que se repete, e só porque não é uma escolha: é o
// lugar vazio à espera de uma.

// Os doze. A `caixa` é a última porque é o «por escolher», e não uma categoria.
//
// ⚠ Os nomes dizem o CORREDOR e não o desenho — `hortalica` e não `folha`,
// `peixaria` e não `peixe`. É de propósito: `folha` e `peixe` já são FIGURAS de
// avatar (uma criança pode ter um peixe), e o guarda `escolher-avatar` chumba
// um nome que sirva as duas coisas. Um nome, uma coisa.
export const ICONES_DE_CORREDOR = [
  'hortalica', 'peixaria', 'talho', 'padaria', 'laticinios', 'bebidas',
  'congelados', 'conservas', 'limpeza', 'bebe', 'animais', 'caixa',
];

// O que um corredor mostra enquanto ninguém lhe escolher nada.
export const ICONE_POR_ESCOLHER = 'caixa';

// Sem acentos, sem maiúsculas, sem espaços nas pontas — a mesma normalização
// que a loja usa para comparar rótulos de artigos.
export const semAcentos = (x) => String(x == null ? '' : x)
  .trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const escolhaValida = (x) => !!x && ICONES_DE_CORREDOR.includes(x);

/**
 * O ícone de CADA corredor: `{ nome → ícone }`.
 *
 * Só o que foi escolhido conta. O resto fica na `caixa`, à espera.
 *
 * ⚠ Se duas escolhas colidirem — só acontece com dados vindos de fora, ou de
 * dois telemóveis a escolher ao mesmo tempo —, ganha a primeira por ordem
 * alfabética e a outra volta à `caixa`. Determinístico: os dois telemóveis
 * chegam à mesma conclusão sem falarem um com o outro, que é a mesma regra dos
 * saldos (INVARIANTE #2) aplicada a um desenho.
 */
export function iconesDosCorredores(nomes, escolhidos = {}) {
  const lista = [...new Set((nomes || []).map(n => String(n || '')).filter(Boolean))];
  const porNome = [...lista].sort((a, b) => a.localeCompare(b, 'pt'));

  const saida = {};
  const tomados = new Set();
  for (const nome of porNome) {
    const e = escolhidos && escolhidos[nome];
    // ⚠ A `caixa` não se «toma»: é o lugar vazio, e cabem lá todos.
    if (escolhaValida(e) && e !== ICONE_POR_ESCOLHER && !tomados.has(e)) {
      saida[nome] = e;
      tomados.add(e);
    } else {
      saida[nome] = ICONE_POR_ESCOLHER;
    }
  }
  return saida;
}

/**
 * O ícone de UM corredor, sabendo os outros. É o que os ecrãs chamam.
 */
export function iconeDoCorredor(nome, escolhidos = {}, todosOsNomes = null) {
  const lista = todosOsNomes && todosOsNomes.length ? todosOsNomes : [nome];
  return iconesDosCorredores(lista, escolhidos)[nome] || ICONE_POR_ESCOLHER;
}

/**
 * Que corredor está a usar cada ícone: `{ ícone → nome }`.
 *
 * É o que a grelha precisa para dizer «este já é do Talho» — e para não deixar
 * escolhê-lo sem que alguém o liberte primeiro.
 *
 * ⚠ A `caixa` nunca tem dono: é o lugar vazio, e escolher a `caixa` é
 * exactamente desistir de escolher.
 */
export function donoDeCadaIcone(nomes, escolhidos = {}) {
  const mapa = iconesDosCorredores(nomes, escolhidos);
  const dono = {};
  for (const [nome, icone] of Object.entries(mapa)) {
    if (icone !== ICONE_POR_ESCOLHER && !dono[icone]) dono[icone] = nome;
  }
  return dono;
}

/**
 * Quantos corredores ainda não têm ícone. O ecrã de administração usa-o para
 * dizer o que falta, em vez de deixar a pessoa descobrir sozinha.
 */
export function corredoresPorEscolher(nomes, escolhidos = {}) {
  const mapa = iconesDosCorredores(nomes, escolhidos);
  return Object.keys(mapa).filter(n => mapa[n] === ICONE_POR_ESCOLHER).sort((a, b) => a.localeCompare(b, 'pt'));
}
