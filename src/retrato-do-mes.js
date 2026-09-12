// O retrato do mês — uma página por mês, SOMADA das linhas que já existem.
//
// 12/09/2026 — a décima das dez funcionalidades. Nenhum campo novo, nenhuma
// coleção nova: o gasto por envelope contra o limite, as tarefas feitas e os
// pontos por criança, as idas às compras e os acertos entre os adultos são
// somas das `despesas`, `tarefas_feitas`, `listas_compras` e `acertos` do
// intervalo de cada linha de `meses`. É o INVARIANTE #2 aplicado a um
// relatório: um retrato de um mês fechado não muda quando o seguinte abre,
// porque as linhas dele ficam onde estão e a soma é a mesma.
//
// O INTERVALO de um mês vai do seu `mes` (o dia em que abriu) até ao `mes` do
// seguinte — ou, sem seguinte, até ao dia depois de `fechado_em`, para o que
// se gastou no próprio dia do fecho contar. O mês aberto não tem fim.
//
// ⚠ Só adultos: o servidor não devolve `meses` nem `despesas` a uma criança,
// e sem meses não há retratos. Este módulo não filtra nada — não é ele que
// protege (INVARIANTE #3).
import { MONTHS, EUR, dayLabel, dmyDeChave, plural } from './format';
import { paginaDaApp, escapar } from './documento';

const dia = (x) => {
  const d = String(x || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
};
const maisUmDia = (d) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
};
const arredonda = (n) => Math.round((Number(n) || 0) * 100) / 100;

// «Setembro de 2026», de `2026-09-01` ou `d2026-09-01`.
export const nomeDoMes = (inicio) => {
  const d = dia(String(inicio || '').replace(/^d/, ''));
  if (!d) return '';
  const [ano, mes] = d.split('-');
  return `${MONTHS[Number(mes) - 1]} de ${ano}`;
};

// Os retratos de TODOS os meses da casa, do mais recente para o mais antigo.
// `casa` são as coleções cruas do servidor; `nomeDoMembro` é `id → nome`.
export function retratosDe(casa, nomeDoMembro = {}) {
  const meses = (casa.meses || [])
    .map(m => ({ ...m, inicio: dia(m.mes), fechado: dia(m.fechado_em) }))
    .filter(m => m.inicio)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  const envelopePorId = Object.fromEntries((casa.envelopes || []).map(e => [e.id, e.nome]));
  const limiteBase = Object.fromEntries((casa.envelopes || []).map(e => [e.nome, Number(e.limite_base) || 0]));
  const tarefaPorId = Object.fromEntries((casa.tarefas || []).map(t => [t.id, t]));
  const criancas = (casa.membros || []).filter(m => m.papel === 'crianca').map(m => m.nome);

  return meses.map((m, i) => {
    const seguinte = meses[i + 1];
    const fim = seguinte ? seguinte.inicio : (m.fechado ? maisUmDia(m.fechado) : null);
    const noMes = (x) => {
      const d = dia(x);
      return !!d && d >= m.inicio && (!fim || d < fim);
    };

    // ── Dinheiro: o gasto por envelope contra o limite do mês ──────────────
    const gastoPor = {};
    let despesas = 0;
    let meias = 0;
    for (const d of casa.despesas || []) {
      if (d.anula_id || !noMes(d.data)) continue;
      despesas += 1;
      if (d.divide_meias) meias += 1;
      const nome = envelopePorId[d.envelope];
      if (!nome) continue;
      gastoPor[nome] = (gastoPor[nome] || 0) + (Number(d.valor) || 0);
    }
    // O limite é o do MÊS (`limites`, escrito ao abrir), senão o de base do envelope.
    const limites = (m.limites && typeof m.limites === 'object') ? m.limites : {};
    const nomes = [...new Set([...Object.values(envelopePorId), ...Object.keys(gastoPor)])];
    const envelopes = nomes
      .map(nome => ({
        nome,
        gasto: arredonda(gastoPor[nome] || 0),
        limite: arredonda(limites[nome] !== undefined ? limites[nome] : (limiteBase[nome] || 0)),
      }))
      .sort((a, b) => b.gasto - a.gasto || a.nome.localeCompare(b.nome));
    const gasto = arredonda(envelopes.reduce((n, e) => n + e.gasto, 0));
    const orcamento = arredonda(envelopes.reduce((n, e) => n + e.limite, 0));

    // ── Tarefas: as CONFIRMADAS do mês, por criança, e os pontos delas ──────
    // Uma marcação sem `confirmada_em` não conta — é a regra dos pontos.
    // Atribui-se a quem TEM a tarefa, como a loja faz (e com o mesmo limite).
    const porCrianca = Object.fromEntries(criancas.map(n => [n, { nome: n, feitas: 0, pontos: 0 }]));
    for (const f of casa.tarefas_feitas || []) {
      if (!f.confirmada_em || !noMes(f.data)) continue;
      const t = tarefaPorId[f.tarefa];
      if (!t) continue;
      const nome = nomeDoMembro[t.atribuido_a];
      if (!nome || !porCrianca[nome]) continue;
      porCrianca[nome].feitas += 1;
      porCrianca[nome].pontos += Number(t.pontos) || 0;
    }

    // ── Compras: as idas FECHADAS no mês, e o que custaram ─────────────────
    const idas = (casa.listas_compras || []).filter(l => noMes(l.fechada_em));
    const compras = { idas: idas.length, total: arredonda(idas.reduce((n, l) => n + (Number(l.total) || 0), 0)) };

    // ── Contas entre os adultos: os acertos do mês ─────────────────────────
    const doMes = (casa.acertos || []).filter(a => noMes(a.data));
    const acertos = { n: doMes.length, total: arredonda(doMes.reduce((n, a) => n + (Number(a.valor) || 0), 0)) };

    return {
      idServidor: m.id,
      inicio: `d${m.inicio}`,
      fechadoEm: m.fechado ? `d${m.fechado}` : null,
      aberto: !m.fechado,
      nome: nomeDoMes(m.inicio),
      rendimento: Number(m.rendimento) || 0,
      envelopes, gasto, orcamento, despesas, meias,
      criancas: Object.values(porCrianca),
      compras, acertos,
    };
  }).reverse();
}

// `retrato-2026-09.pdf`
export const nomeDoFicheiroDoRetrato = ({ inicio }) =>
  `retrato-${String(inicio || '').replace(/^d/, '').slice(0, 7)}.pdf`;

// O documento: as quatro secções, sempre, no molde da app (`paginaDaApp`) —
// a faixa do esquema, o desenho C, a marca de água e o carimbo. Uma secção
// vazia diz que está vazia. Os números à direita, tabulares, como no Dinheiro.
export function documentoDoRetrato({ retrato, casa, hoje, quemImprime = null, t = null }) {
  const r = retrato || { nome: '', envelopes: [], criancas: [], compras: { idas: 0, total: 0 }, acertos: { n: 0, total: 0 }, gasto: 0, orcamento: 0, meias: 0 };
  const lista = (itens, vazio) => (itens.length
    ? `<ul>${itens.map(i => `<li>${i}</li>`).join('')}</ul>`
    : `<p class="vazio">${escapar(vazio)}</p>`);
  const dinheiro = lista(r.envelopes.map(e =>
    `<strong>${escapar(e.nome)}</strong>${e.gasto > e.limite ? '<span class="acima">acima do limite</span>' : ''}`
    + `<span class="dir">${escapar(EUR(e.gasto))} de ${escapar(EUR(e.limite))}</span>`),
  'Sem despesas neste mês.');
  const tarefas = lista(r.criancas.map(c =>
    `<strong>${escapar(c.nome)}</strong><span class="dir">${escapar(plural(c.feitas, 'tarefa feita', 'tarefas feitas'))} · ${escapar(plural(c.pontos, 'ponto', 'pontos'))}</span>`),
  'Sem crianças na casa.');
  const compras = r.compras.idas
    ? `<p>${escapar(plural(r.compras.idas, 'ida às compras', 'idas às compras'))} · ${escapar(EUR(r.compras.total))}</p>`
    : '<p class="vazio">Sem idas às compras fechadas neste mês.</p>';
  const contas = `<p>${escapar(plural(r.meias || 0, 'despesa a meias', 'despesas a meias'))} · ${
    escapar(plural(r.acertos.n, 'acerto', 'acertos'))}${r.acertos.n ? ` · ${escapar(EUR(r.acertos.total))}` : ''}</p>`;
  // A data do fecho em dd/mm/aaaa, sem o dia da semana: é um documento, não a agenda.
  const estado = r.aberto ? 'mês em curso' : `mês fechado${r.fechadoEm ? ` a ${escapar(dmyDeChave(r.fechadoEm))}` : ''}`;

  return paginaDaApp({
    titulo: `Retrato de ${r.nome}`,
    origem: `Casa ${escapar(casa)} · ${estado} · exportado a ${escapar(dayLabel(hoje).replace('Hoje · ', ''))}`,
    corpo: `<p class="total"><span class="n">${escapar(EUR(r.gasto))}</span><span class="de">gastos de ${escapar(EUR(r.orcamento))} de orçamento</span></p>`
      + `<section><h2>Dinheiro<span>${escapar(EUR(r.gasto))} de ${escapar(EUR(r.orcamento))}</span></h2>${dinheiro}</section>`
      + `<section><h2>Tarefas</h2>${tarefas}</section>`
      + `<section><h2>Compras</h2>${compras}</section>`
      + `<section><h2>Contas entre nós</h2>${contas}</section>`,
    aviso: 'Documento gerado pela aplicação Nossa Casa. Contém o orçamento da casa — não é para as crianças.',
    quemImprime, hoje, t,
  });
}
