// O histórico de preços da casa, por artigo e por loja.
//
// ── Porque é que não vem do Lidl nem do Continente ──────────────────────────
//
// Nenhuma das cadeias tem uma API pública de preços, e raspar os sites traz
// quatro problemas de uma vez: os termos proíbem-no, precisa de um servidor
// (o navegador não consegue, por CORS), parte sempre que eles mexem no HTML, e
// os preços variam por loja — o Continente de Belém não tem os preços do de
// Cascais.
//
// O que esta casa tem e nenhum site tem: o que ELA pagou, NAS lojas dela. Não
// parte nunca, não depende de ninguém, e responde à pergunta certa — não
// «quanto custa a banana», mas «esta lista sai mais barata onde?».
//
// ── A forma: observações, não médias gravadas ───────────────────────────────
//
// É o INVARIANTE #2 outra vez. Cada compra acrescenta uma OBSERVAÇÃO; a média,
// o último preço e a comparação entre lojas são somas dessas observações,
// calculadas quando se lê. Guardar «a banana custa 1,29 no Lidl» seria um total
// escrito, e dois telemóveis a comprar no mesmo sábado apagavam-se um ao outro.

// A chave de um artigo é o rótulo, normalizado.
//
// Não o `id`: a lista é semanal e a banana desta semana é um artigo novo com um
// id novo. O que se repete é o nome. Normaliza-se para «Banana · 1 kg» e
// «banana · 1kg» serem a mesma coisa — que é o que uma pessoa espera de duas
// linhas que ela própria escreveu com uma semana de intervalo.
export const chaveDoArtigo = (rotulo) => String(rotulo || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// Uma observação: este artigo, nesta loja, custou isto, neste dia.
export const observacao = ({ rotulo, loja, valor, dia }) => ({
  id: `p-${chaveDoArtigo(rotulo)}-${dia}-${Math.round(valor * 100)}`,
  artigo: chaveDoArtigo(rotulo),
  rotulo: String(rotulo || '').trim(),
  loja: loja || null,
  valor: Math.round(Number(valor) * 100) / 100,
  dia,
});

// O que se sabe de um artigo, loja a loja. Ordenado do mais barato para o mais
// caro — que é a ordem por que a pergunta é feita.
export const precosDe = (precos, rotulo) => {
  const chave = chaveDoArtigo(rotulo);
  const meus = (precos || []).filter(p => p.artigo === chave && p.loja);
  const porLoja = new Map();
  for (const p of meus) {
    const a = porLoja.get(p.loja) || { loja: p.loja, vezes: 0, soma: 0, ultimo: null, ultimoDia: null };
    a.vezes += 1;
    a.soma += p.valor;
    // «Último» é o mais recente por data, não o último a ser gravado: duas
    // compras registadas fora de ordem davam um «último preço» do mês passado.
    if (!a.ultimoDia || String(p.dia) > String(a.ultimoDia)) {
      a.ultimo = p.valor; a.ultimoDia = p.dia;
    }
    porLoja.set(p.loja, a);
  }
  return [...porLoja.values()]
    .map(a => ({ ...a, media: Math.round((a.soma / a.vezes) * 100) / 100 }))
    .sort((a, b) => a.ultimo - b.ultimo);
};

// A melhor estimativa para um artigo: o que se pagou da última vez, na loja
// onde se vai comprar. Sem histórico dessa loja, o mais recente de qualquer
// uma. Sem histórico nenhum, o que estiver escrito na lista.
//
// Devolve também DE ONDE veio o número, porque um ecrã que mostra uma
// estimativa sem dizer se ela é um palpite ou uma memória não ajuda a decidir.
export const estimativaDe = (precos, artigo, loja) => {
  const conhecidos = precosDe(precos, artigo.label);
  const daLoja = conhecidos.find(x => x.loja === loja);
  if (daLoja) return { valor: daLoja.ultimo, origem: 'loja', loja, vezes: daLoja.vezes };
  if (conhecidos.length) {
    const maisRecente = [...conhecidos].sort((a, b) =>
      String(b.ultimoDia).localeCompare(String(a.ultimoDia)))[0];
    return { valor: maisRecente.ultimo, origem: 'outra-loja', loja: maisRecente.loja,
             vezes: maisRecente.vezes };
  }
  return { valor: artigo.est || 0, origem: 'escrito', loja: null, vezes: 0 };
};

// Quanto custaria esta lista em cada loja, com o que se sabe.
//
// `conhecidos` conta quantos artigos da lista têm preço nessa loja: um total de
// 4 € porque só se conhece um artigo de vinte não é uma loja barata, é uma loja
// desconhecida. O ecrã precisa dos dois números para não mentir.
export const custoPorLoja = (precos, artigos, lojas) => (lojas || []).map(loja => {
  let total = 0, conhecidos = 0;
  for (const a of artigos || []) {
    const p = precosDe(precos, a.label).find(x => x.loja === loja);
    if (p) { total += p.ultimo; conhecidos += 1; }
    else total += a.est || 0;
  }
  return {
    loja,
    total: Math.round(total * 100) / 100,
    conhecidos,
    deQuantos: (artigos || []).length,
  };
}).sort((a, b) => a.total - b.total);

// Qual das lojas sai mais barata — e a resposta NÃO se tira dos totais acima.
//
// A primeira versão disto comparava `custoPorLoja` entre lojas e dava um
// resultado errado de uma forma que só se vê a olhar: onde um artigo não se
// conhece, o total usa a estimativa escrita, que é quase sempre mais alta do
// que o preço real. Uma loja onde se conhecem dois artigos ganha a uma onde se
// conhece um, mesmo sendo mais cara nos dois. Isso premeia a loja mais
// CONHECIDA, não a mais barata, e manda a pessoa ao sítio errado.
//
// A comparação faz-se só sobre os artigos que se conhecem em TODAS as lojas em
// causa. É menos ambicioso e é a única coisa que se pode afirmar.
export const compararLojas = (precos, artigos, lojas, minimoComuns = 3) => {
  const candidatas = (lojas || []).filter(Boolean);
  if (candidatas.length < 2) return null;

  const comuns = (artigos || []).filter(a => {
    const p = precosDe(precos, a.label);
    return candidatas.every(l => p.some(x => x.loja === l));
  });
  // Abaixo de um punhado de artigos em comum, a diferença é ruído com aspeto
  // de conselho — e silêncio é melhor do que um conselho que não se sustenta.
  if (comuns.length < minimoComuns) return null;

  const totais = candidatas.map(loja => ({
    loja,
    total: Math.round(comuns.reduce((soma, a) =>
      soma + precosDe(precos, a.label).find(x => x.loja === loja).ultimo, 0) * 100) / 100,
  })).sort((a, b) => a.total - b.total);

  const [melhor, seguinte] = totais;
  if (melhor.total >= seguinte.total) return null;      // empate não é conselho
  return {
    loja: melhor.loja,
    contra: seguinte.loja,
    poupanca: Math.round((seguinte.total - melhor.total) * 100) / 100,
    sobre: comuns.length,
    deQuantos: (artigos || []).length,
  };
};
