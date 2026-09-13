// A pesquisa global — o que a casa tem, procurado à medida que se escreve.
//
// 13/09/2026, o dono da casa: «implementa uma pesquisa global no cabeçalho do
// primeiro ecrã com autocomplete e a mostrar o que encontra à medida que se
// vai escrevendo». Opção A de `design/pesquisa-global.dc.html`: a lupa no
// cabeçalho do Início, o campo no lugar da saudação, os resultados no lugar do
// conteúdo, agrupados por área, e três sugestões em pastilhas por cima.
//
// ⚠ É LOCAL e é PURA. Não pede nada ao servidor: procura no que a loja já tem
// neste telemóvel — e só isso, que é o que o servidor deixou chegar a quem
// está a olhar. O INVARIANTE #3 continua onde estava; este módulo não filtra
// visibilidade porque não recebe nada que a pessoa não pudesse ver.
//
// Sem React, sem loja: recebe listas, devolve listas. É assim que se prova.
import { dmyDeChave } from './format';

// Uma chave de dia («d2026-09-13» ou «2026-09-13») em dd/mm/aaaa — a data
// desta app é sempre assim, também aqui.
const diaLegivel = (chave) => {
  const d = String(chave || '').replace(/^d/, '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? dmyDeChave(`d${d}`) : '';
};

// «Léo» e «leo» são a mesma coisa; «Frutas & Legumes» encontra-se por «legu».
export const normalizar = (texto) => String(texto == null ? '' : texto)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().trim();

// A ordem das áreas nos resultados — a ordem do rodapé, e depois o resto.
export const AREAS_DA_PESQUISA = ['Tarefas', 'Agenda', 'Compras', 'Dinheiro', 'Equipamentos', 'Saúde', 'Pessoas', 'Documentação'];

// O mínimo para procurar: com uma letra, tudo é resultado.
export const MINIMO = 2;

const primeiro = (...xs) => xs.find(x => x !== undefined && x !== null && x !== '') || '';

// Um item do índice: o que se mostra, o que se procura, e para onde leva.
//   { area, titulo, sub, texto, ordem, destino }
//   `texto` é o que se procura (título + subtítulo + extras), já normalizado.
//   `ordem` é o mais recente primeiro dentro da área (uma data, ou '').
//   `destino` é o que o App faz ao tocar: { tab, id } ou { vista, id | membro }.
const item = (area, titulo, sub, destino, ordem = '', extras = []) => ({
  area, titulo: String(titulo || ''), sub: String(sub || ''), destino, ordem: String(ordem || ''),
  texto: normalizar([titulo, sub, ...extras].filter(Boolean).join(' · ')),
});

// Constrói o índice a partir do que a loja dá. Cada lista é opcional — a app
// da criança passa menos.
export function indexar({
  tarefas = [], eventos = [], artigos = [], pratos = [], contas = [], metas = [],
  equipamentos = [], contratos = [], consultas = [], documentos = [], membros = [],
  areas = [], novidades = [],
} = {}) {
  const itens = [];

  for (const t of tarefas) {
    itens.push(item('Tarefas', primeiro(t.title, t.titulo), [t.who, t.recur].filter(Boolean).join(' · '),
      { tab: 'tarefas', id: t.id }, t.dueKey || ''));
  }
  for (const e of eventos) {
    itens.push(item('Agenda', primeiro(e.title, e.titulo), [diaLegivel(e.day), e.time, e.location || e.local].filter(Boolean).join(' · '),
      { tab: 'agenda', id: e.id }, e.day || '', [e.description]));
  }
  for (const a of artigos) {
    // O `by` de um artigo pode já vir por extenso («Adicionado por Rita»,
    // «Artigo habitual»); só se acrescenta «pedido por» a um nome solto.
    const quem = a.by ? (/\bpor\b|habitual/i.test(a.by) ? a.by : `pedido por ${a.by}`) : '';
    itens.push(item('Compras', primeiro(a.label, a.rotulo), [a.section || a.s, quem].filter(Boolean).join(' · '),
      { tab: 'compras', id: a.id }));
  }
  for (const p of pratos) {
    const ingredientes = (p.ingredientes || []).map(i => (i && i.rotulo) || i).filter(Boolean);
    itens.push(item('Compras', primeiro(p.nome, p.name), `Prato · ${ingredientes.slice(0, 4).join(', ')}`,
      { tab: 'compras' }, '', ingredientes));
  }
  for (const c of contas) {
    itens.push(item('Dinheiro', c.nome, `Conta fixa · dia ${c.dia}${c.envelope ? ` · ${c.envelope}` : ''}`,
      { tab: 'dinheiro', id: `conta:${c.id}` }));
  }
  for (const m of metas) {
    itens.push(item('Dinheiro', primeiro(m.nome, m.name), 'Meta da família', { tab: 'dinheiro', id: `meta:${m.id}` }));
  }
  for (const e of equipamentos) {
    itens.push(item('Equipamentos', primeiro(e.name, e.nome), [e.brand || e.marca, e.cat || e.categoria].filter(Boolean).join(' · '),
      { vista: 'equip', id: e.id }, e.bought || ''));
  }
  for (const c of contratos) {
    itens.push(item('Equipamentos', c.nome, [c.fornecedor, c.renovaEm ? `renova a ${c.renovaEm}` : ''].filter(Boolean).join(' · '),
      { vista: 'equip', id: `contrato:${c.id}` }));
  }
  for (const h of consultas) {
    itens.push(item('Saúde', `${primeiro(h.specialty, h.especialidade)} · ${h.member}`, [h.doctor, diaLegivel(h.day)].filter(Boolean).join(' · '),
      { vista: 'ficha', membro: h.member }, h.day || '', [h.notes, h.decision]));
  }
  for (const d of documentos) {
    itens.push(item('Saúde', primeiro(d.title, d.titulo), [d.kind || d.tipo, d.member].filter(Boolean).join(' · '),
      { vista: 'ficha', membro: d.member }, d.day || ''));
  }
  for (const m of membros) {
    const nome = typeof m === 'string' ? m : m.nome;
    const kid = typeof m === 'object' && m.kid;
    itens.push(item('Pessoas', nome, kid ? 'Criança da casa' : 'Adulto da casa',
      kid ? { tab: 'tarefas', membro: nome } : { vista: 'ficha', membro: nome }));
  }
  for (const a of areas) {
    itens.push(item('Documentação', a.area, a.o, { vista: 'doc' }, '', a.faz || []));
  }
  for (const n of novidades) {
    itens.push(item('Documentação', `${n.a} · ${n.k}`, n.t, { vista: 'doc' }, n.d || ''));
  }
  return itens;
}

// Quão bem um item responde ao termo. Menor é melhor; `null` é «não responde».
const pontuar = (it, termo) => {
  const titulo = normalizar(it.titulo);
  if (titulo.startsWith(termo)) return 0;
  if (titulo.split(/[\s·,/()-]+/).some(p => p.startsWith(termo))) return 1;
  if (titulo.includes(termo)) return 2;
  if (it.texto.includes(termo)) return 3;
  return null;
};

// Os resultados, por área, na ordem das áreas. Dentro de cada área: quem
// responde melhor primeiro; em igualdade, o mais recente.
export function pesquisar(itens, termo) {
  const t = normalizar(termo);
  if (t.length < MINIMO) return { grupos: [], total: 0, termo: t };
  const porArea = new Map();
  for (const it of itens) {
    const p = pontuar(it, t);
    if (p === null) continue;
    if (!porArea.has(it.area)) porArea.set(it.area, []);
    porArea.get(it.area).push({ ...it, pontos: p });
  }
  const grupos = AREAS_DA_PESQUISA
    .filter(a => porArea.has(a))
    .map(a => ({
      area: a,
      itens: porArea.get(a).sort((x, y) => x.pontos - y.pontos || y.ordem.localeCompare(x.ordem) || x.titulo.localeCompare(y.titulo)),
    }));
  return { grupos, total: grupos.reduce((n, g) => n + g.itens.length, 0), termo: t };
}

// Até três palavras da casa que COMPLETAM o que se escreveu — as pastilhas por
// cima dos resultados. Tiradas dos títulos, sem repetir, sem a própria palavra
// já inteira, as mais curtas primeiro (a que completa com menos é a mais
// provável). Vêm com a grafia original, para se ler como a casa escreveu.
export function sugerir(itens, termo, maximo = 3) {
  const t = normalizar(termo);
  if (t.length < MINIMO) return [];
  const vistas = new Set();
  const saida = [];
  for (const it of itens) {
    for (const palavra of String(it.titulo).split(/[\s·,/()]+/)) {
      const n = normalizar(palavra).replace(/^[«"'(]+|[»"'.,;:!?)]+$/g, '');
      if (!n || n === t || !n.startsWith(t) || vistas.has(n)) continue;
      vistas.add(n);
      saida.push(palavra.replace(/^[«"'(]+|[»"'.,;:!?)]+$/g, ''));
    }
  }
  return saida.sort((a, b) => a.length - b.length || a.localeCompare(b)).slice(0, maximo);
}

// Onde é que o termo está no título, para se pôr a negrito: uma lista de
// pedaços `{ texto, marca }`. Compara sem acentos e sem maiúsculas, mas devolve
// os pedaços do título ORIGINAL — «Lêvedo» procurado por «leve» marca «Lêve».
export function realcar(titulo, termo) {
  const original = String(titulo || '');
  const t = normalizar(termo);
  if (!t) return [{ texto: original, marca: false }];
  // Normalizar letra a letra mantém o mapa de posições: cada letra do original
  // dá 0 ou 1 letras normalizadas (os acentos separados caem).
  const mapa = [];
  let n = '';
  for (let i = 0; i < original.length; i++) {
    const c = original[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (c) { n += c; mapa.push(i); }
  }
  const pos = n.indexOf(t);
  if (pos < 0) return [{ texto: original, marca: false }];
  const ini = mapa[pos];
  const fim = mapa[pos + t.length - 1] + 1;
  return [
    { texto: original.slice(0, ini), marca: false },
    { texto: original.slice(ini, fim), marca: true },
    { texto: original.slice(fim), marca: false },
  ].filter(p => p.texto);
}
