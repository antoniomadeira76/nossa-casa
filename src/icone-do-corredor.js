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

// Vinte e seis, por famílias, e a `caixa` no fim porque é o «por escolher» e
// não uma categoria. «Cobertura completa» quer dizer que uma casa portuguesa
// há-de encontrar aqui o corredor que inventou — charcutaria, conservas,
// cereais, higiene — sem ter de aceitar um ícone que quer dizer outra coisa.
//
// ⚠ A ORDEM é a da grelha de escolher, e está agrupada de propósito: a 44 px
// por célula, vinte e sete pictogramas seguidos obrigam a PROCURAR. Por
// famílias, reconhece-se.
//
// ⚠ Os nomes dizem o CORREDOR e não o desenho — `hortalica` e não `folha`,
// `peixaria` e não `peixe`. É de propósito: `folha` e `peixe` já são FIGURAS de
// avatar (uma criança pode ter um peixe), e o guarda `escolher-avatar` chumba
// um nome que sirva as duas coisas. Um nome, uma coisa.
export const ICONES_DE_CORREDOR = [
  // Comida fresca
  'hortalica', 'fruta', 'peixaria', 'talho', 'charcutaria',
  // Padaria e laticínios
  'padaria', 'pastelaria', 'laticinios', 'queijo', 'ovos',
  // Bebidas
  'bebidas', 'cafe',
  // Despensa
  'congelados', 'conservas', 'cereais', 'massa', 'mercearia', 'snacks', 'doces',
  // Casa
  'limpeza', 'higiene', 'papel', 'bebe', 'animais', 'cozinha', 'jardim',
  // E a rede
  'caixa',
];

// O que um corredor mostra enquanto ninguém lhe escolher nada.
export const ICONE_POR_ESCOLHER = 'caixa';

// ── O que cada ícone quer dizer, por escrito ────────────────────────────────
//
// 25/09/2026: «cada icon deve ter uma label (frutas, enchidos, limpeza, etc)
// encontra a melhor correspondência».
//
// ⚠ Sem isto, a grelha eram vinte e sete desenhos mudos, e escolher passava
// por adivinhar o que cada um queria dizer — que é exactamente o problema que
// os ícones vieram resolver, devolvido ao contrário. Um pictograma a 21 px
// diz «qualquer coisa de carne»; a palavra diz «enchidos».
//
// ⚠ E os rótulos são o NOME DO CORREDOR como uma casa portuguesa o escreve —
// «Enchidos» e não «Charcutaria fatiada», «Papel» e não «Papel higiénico e de
// cozinha». São para se ler de relance debaixo de um quadrado de 44, não para
// serem exactos.
//
// ⚠ O rótulo NÃO baptiza o corredor. Quem lhe dá o nome é a família; isto diz
// só o que o desenho representa, para a escolha ser informada. Um corredor
// chamado «Zona B» pode muito bem levar o ícone dos «Enchidos».
const ROTULOS = {
  hortalica: 'Legumes',
  fruta: 'Fruta',
  peixaria: 'Peixaria',
  talho: 'Talho',
  charcutaria: 'Enchidos',
  padaria: 'Padaria',
  pastelaria: 'Pastelaria',
  laticinios: 'Laticínios',
  queijo: 'Queijo',
  ovos: 'Ovos',
  bebidas: 'Bebidas',
  cafe: 'Café e chá',
  congelados: 'Congelados',
  conservas: 'Conservas',
  cereais: 'Cereais',
  // ⚠ «Massa» e não «Massa e arroz»: a célula da grelha tem 66 px e o
  // segundo corta-se em «Massa e a…», que não diz nada. Um rótulo que não
  // cabe é pior do que um rótulo menos exacto.
  massa: 'Massa',
  mercearia: 'Mercearia',
  snacks: 'Snacks',
  doces: 'Doces',
  limpeza: 'Limpeza',
  higiene: 'Higiene',
  papel: 'Papel',
  bebe: 'Bebé',
  animais: 'Animais',
  cozinha: 'Cozinha',
  jardim: 'Jardim',
  caixa: 'Por escolher',
};

/**
 * O que um ícone quer dizer, em palavras. Nunca devolve vazio.
 */
export function rotuloDoIcone(icone) {
  return ROTULOS[icone] || ROTULOS[ICONE_POR_ESCOLHER];
}

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
