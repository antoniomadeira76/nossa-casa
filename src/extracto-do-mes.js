// O extracto do mês — cada movimento de dinheiro da casa, por ordem do tempo.
//
// 17/09/2026. Quanto, quando, quem: é o que ele pediu, e é o que as cinco
// coleções de movimentos já guardam, cada uma com um valor, uma data e uma
// pessoa. Não falta dado nenhum — faltava a VISTA que as junta.
//
//   `despesas`           o que se gastou            pagador
//   `cofre_movimentos`   semanadas, bónus, retiradas autorizado_por
//   `meta_movimentos`    o que se juntou a uma meta  por
//   `acertos`            o que um adulto pagou ao outro  de_membro → para_membro
//   `transferencias`     o que mudou de envelope     por
//
// ⚠ NÃO SE GRAVA UMA CÓPIA AO FECHAR O MÊS, e é de propósito. O INVARIANTE #2
// diz que saldos nunca são campos escritos: são somas de movimentos. Um
// extracto gravado no fecho seria exactamente isso — um valor derivado,
// escrito, que a partir daí pode discordar das linhas que lhe deram origem, e
// ninguém saberia qual das duas versões acreditar. O extracto de um mês fechado
// é estável porque as LINHAS dele não se mexem: a coleção `despesas` não tem
// `updateRule` nem `deleteRule`, e corrigir uma despesa é anulá-la e criar
// outra. O esquema já o dizia por palavras suas, antes de este ficheiro
// existir: «o extrato tem de contar a verdade, não a última versão dela».
// Era o mesmo raciocínio do `retrato-do-mes.js`, que este ficheiro substituiu
// em 17/09/2026 — as mesmas linhas de origem, uma a uma em vez de somadas.
//
// ⚠ O INTERVALO de um mês é o mesmo que o `sync.js` usa para filtrar os totais
// do mês aberto: do seu `mes` (o dia em que abriu) até ao `mes` do seguinte —
// ou, sem seguinte, até ao dia depois de `fechado_em`. Dois intervalos davam
// dois setembros diferentes em dois ecrãs.
//
// ⚠ Só adultos: o servidor não devolve `meses` nem `despesas` a uma criança.
// Este módulo não filtra nada — não é ele que protege (INVARIANTE #3).
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

// «Setembro de 2026», de `2026-09-01`.
export const nomeDoMesDoExtracto = (inicio) => {
  const d = dia(String(inicio || '').replace(/^d/, ''));
  if (!d) return '';
  const [ano, mes] = d.split('-');
  return `${MONTHS[Number(mes) - 1]} de ${ano}`;
};

// ── As cinco espécies de movimento ──────────────────────────────────────────
//
// O `sinal` diz o que o movimento faz ao dinheiro DISPONÍVEL da casa:
//
//   -1  sai       uma despesa, uma semanada paga, um reforço de uma meta
//   +1  entra     o rendimento do mês, uma retirada do cofre
//    0  neutro    um acerto entre os dois adultos, uma transferência entre
//                 envelopes — o dinheiro muda de mão ou de gaveta e a casa fica
//                 com o mesmo. Do lado das transferências isto já estava
//                 decidido: uma transferência entre envelopes soma zero, e o
//                 orçamento total não muda com ela.
//
// ⚠ Um movimento neutro APARECE no extracto e NÃO mexe no saldo corrente. Ele
// pediu «cada movimento monetário que se faz, quando e quem o faz» — um acerto
// de 83,67 € entre a Rita e o Tomás é um movimento e tem de se ver. Somá-lo ao
// saldo é que seria mentira: não entrou dinheiro nenhum em casa.
export const ESPECIES = ['rendimento', 'despesa', 'cofre', 'meta', 'acerto', 'transferencia'];

// O valor de um movimento já traz o sinal do que aconteceu: uma `retirada` do
// cofre e um levantamento de uma meta são escritos negativos na coleção, e por
// isso um movimento de espécie «sai» com valor negativo é, de facto, uma
// entrada. Resolve-se aqui, uma vez, para o ecrã não ter de pensar.
const comSinal = (sinal, valor) => arredonda(sinal * (Number(valor) || 0));

/**
 * Os extractos de TODOS os meses da casa, do mais recente para o mais antigo.
 * `casa` são as coleções cruas do servidor; `nomeDoMembro` é `id → nome`.
 */
export function extractosDe(casa, nomeDoMembro = {}) {
  const meses = (casa.meses || [])
    .map(m => ({ ...m, inicio: dia(m.mes), fechado: dia(m.fechado_em) }))
    .filter(m => m.inicio)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  const envelopePorId = Object.fromEntries((casa.envelopes || []).map(e => [e.id, e.nome]));
  const metaPorId = Object.fromEntries((casa.metas || []).map(m => [m.id, m.nome || m.titulo || '']));
  const quem = (id) => nomeDoMembro[id] || null;

  return meses.map((m, i) => {
    const seguinte = meses[i + 1];
    const fim = seguinte ? seguinte.inicio : (m.fechado ? maisUmDia(m.fechado) : null);
    const noMes = (x) => {
      const d = dia(x);
      return !!d && d >= m.inicio && (!fim || d < fim);
    };

    const movs = [];

    // ── A abertura do mês ───────────────────────────────────────────────────
    //
    // O rendimento não é uma coleção de movimentos: é um campo da linha do mês,
    // escrito ao abrir. Mas é dinheiro que entrou, tem data (o dia em que o mês
    // abriu) e sem ele o extracto começava do nada e o saldo corrente não tinha
    // de onde descer. É a primeira linha, como num extracto de banco.
    //
    // ⚠ Sem `quem`: a coleção `meses` não guarda quem abriu o mês. Dizer «a
    // Rita» por ser ela quem está a ver seria inventar. Fica sem pessoa, e o
    // ecrã mostra a casa.
    const rendimento = Number(m.rendimento) || 0;
    if (rendimento > 0) {
      movs.push({
        chave: `mes:${m.id || m.inicio}`,
        especie: 'rendimento',
        data: m.inicio,
        quem: null,
        titulo: 'Rendimento do mês',
        detalhe: 'abertura',
        valor: arredonda(rendimento),
      });
    }

    // ── As despesas ─────────────────────────────────────────────────────────
    //
    // ⚠ `!d.anula_id`, o mesmo filtro que o `sync.js` usa no `registered` e no
    // `gastoPorEnvelope` — o número que o cartão do Dinheiro mostra. Uma
    // linha de anulação não é um movimento novo — é a marca de que outra deixou
    // de contar. O extracto e o cartão do Dinheiro têm de concordar sobre
    // setembro, e a maneira de garantir isso é filtrarem igual.
    for (const d of casa.despesas || []) {
      if (d.anula_id || !noMes(d.data)) continue;
      const envelope = envelopePorId[d.envelope] || null;
      movs.push({
        chave: `despesa:${d.id}`,
        especie: 'despesa',
        data: dia(d.data),
        quem: quem(d.pagador),
        // A descrição é o que a pessoa escreveu; sem ela, o nome do envelope diz
        // o que foi. Uma linha sem nenhum dos dois diz «Despesa» e não uma
        // cadeia vazia — uma linha em branco num extracto não se explica.
        titulo: String(d.descricao || '').trim() || envelope || 'Despesa',
        detalhe: envelope,
        aMeias: !!d.divide_meias,
        contaFixa: !!d.conta_fixa,
        valor: comSinal(-1, d.valor),
      });
    }

    // ── Os cofres das crianças ──────────────────────────────────────────────
    //
    // Quem FAZ o movimento é o adulto que o autoriza; de quem é o cofre vai no
    // detalhe. Sem `autorizado_por` (as linhas semeadas não o têm) fica a casa.
    for (const c of casa.cofre_movimentos || []) {
      if (!noMes(c.data)) continue;
      const crianca = quem(c.membro);
      movs.push({
        chave: `cofre:${c.id}`,
        especie: 'cofre',
        data: dia(c.data),
        quem: quem(c.autorizado_por),
        titulo: String(c.motivo || '').trim() || `Cofre · ${c.tipo || 'movimento'}`,
        // «Cofre · Léo», sem género: este módulo lê as coleções cruas e não tem
        // o `fem` do quadro de membros. Dizer «cofre do Mia» seria pior do que
        // não dizer artigo nenhum.
        detalhe: crianca ? `Cofre · ${crianca}` : 'Cofre',
        valor: comSinal(-1, c.valor),
      });
    }

    // ── As metas da família ─────────────────────────────────────────────────
    for (const mv of casa.meta_movimentos || []) {
      if (!noMes(mv.data)) continue;
      const meta = metaPorId[mv.meta] || null;
      movs.push({
        chave: `meta:${mv.id}`,
        especie: 'meta',
        data: dia(mv.data),
        quem: quem(mv.por),
        titulo: String(mv.motivo || '').trim() || (meta ? `Juntado à meta ${meta}` : 'Juntado a uma meta'),
        detalhe: meta,
        valor: comSinal(-1, mv.valor),
      });
    }

    // ── Os acertos entre os adultos — neutros ───────────────────────────────
    for (const a of casa.acertos || []) {
      if (!noMes(a.data)) continue;
      const de = quem(a.de_membro);
      const para = quem(a.para_membro);
      movs.push({
        chave: `acerto:${a.id}`,
        especie: 'acerto',
        data: dia(a.data),
        quem: de,
        titulo: para ? `Acerto de contas com ${para}` : 'Acerto de contas',
        detalhe: de && para ? `${de} pagou ${para}` : null,
        valor: arredonda(a.valor),
        neutro: true,
      });
    }

    // ── As transferências entre envelopes — neutras ─────────────────────────
    for (const t of casa.transferencias || []) {
      if (!noMes(t.mes)) continue;
      const de = envelopePorId[t.de_envelope];
      const para = envelopePorId[t.para_envelope];
      movs.push({
        chave: `transferencia:${t.id}`,
        especie: 'transferencia',
        data: dia(t.mes),
        quem: quem(t.por),
        titulo: de && para ? `${de} → ${para}` : 'Dinheiro movido entre envelopes',
        detalhe: 'entre envelopes',
        valor: arredonda(t.valor),
        neutro: true,
      });
    }

    // ── Por ordem do tempo, e o saldo corrente ──────────────────────────────
    //
    // Ordena-se do mais ANTIGO para o mais recente para somar o saldo, e
    // devolve-se ao contrário — que é como se lê um extracto. O desempate é
    // pela chave, para que duas leituras da mesma casa dêem a mesma ordem: sem
    // ele, dois movimentos do mesmo dia trocavam de sítio entre leituras e o
    // saldo de cada linha mudava à frente de quem estava a ler.
    //
    // ⚠ As coleções guardam DATA e não hora (`data('data')` é um campo de data).
    // O extracto mostra o dia, não a hora — e é por isso que este desenho ganha
    // ao da linha do tempo, que prometia uma hora que não existe.
    movs.sort((a, b) => String(a.data).localeCompare(String(b.data)) || a.chave.localeCompare(b.chave));

    let saldo = 0;
    let entrou = 0;
    let saiu = 0;
    for (const mo of movs) {
      if (mo.neutro) { mo.saldo = arredonda(saldo); continue; }
      saldo = arredonda(saldo + mo.valor);
      mo.saldo = saldo;
      if (mo.valor >= 0) entrou = arredonda(entrou + mo.valor);
      else saiu = arredonda(saiu - mo.valor);
    }

    return {
      idServidor: m.id || null,
      inicio: `d${m.inicio}`,
      fechadoEm: m.fechado ? `d${m.fechado}` : null,
      aberto: !m.fechado,
      nome: nomeDoMesDoExtracto(m.inicio),
      // Os três números do cabeçalho são a SOMA DA LISTA que o ecrã mostra, e
      // não uma contagem ao lado dela.
      entrou, saiu, sobrou: arredonda(entrou - saiu),
      movimentos: movs.reverse(),
    };
  }).reverse();
}

// Quantos movimentos tem um extracto — para a linha que lhe dá entrada.
export const quantosMovimentos = (e) => ((e && e.movimentos) || []).length;

// `extracto-2026-09.pdf`
export const nomeDoFicheiroDoExtracto = ({ inicio }) =>
  `extracto-${String(inicio || '').replace(/^d/, '').slice(0, 7)}.pdf`;

// «17/09», do `2026-09-17` que as coleções guardam.
export const diaCurto = (d) => {
  const s = dia(d);
  return s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '';
};

// O que cada espécie diz de si própria no papel, onde não há cor nem pastilha.
const PALAVRA = {
  rendimento: 'rendimento',
  despesa: 'despesa',
  cofre: 'cofre',
  meta: 'meta',
  acerto: 'acerto',
  transferencia: 'transferência',
};

// ⚠ As larguras são fixas e os algarismos tabulares — num extracto as colunas
// do valor e do saldo têm de alinhar de cima a baixo, senão não se lê. É a
// única coisa que este documento acrescenta ao molde da app.
const ESTILO = `
  .mov { display: flex; align-items: baseline; gap: 10px; padding: 6px 4px;
         border-bottom: 1px solid #E7E9EE; break-inside: avoid; font-size: 10.5pt; }
  .mov:last-child { border-bottom: 0; }
  .mov .d { flex: none; width: 13mm; color: #656C7C; font-variant-numeric: tabular-nums; }
  .mov .q { flex: 1 1 auto; min-width: 0; }
  .mov .q b { font-weight: 500; }
  .mov .q i { font-style: normal; color: #656C7C; font-size: 9.5pt; }
  .mov .v, .mov .s { flex: none; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .mov .v { width: 26mm; }
  .mov .s { width: 26mm; color: #656C7C; font-size: 9.5pt; }
  .mov.neutro .v { color: #656C7C; }
  .cab { display: flex; gap: 10px; padding: 12px 4px 4px; }
  .cab div { flex: 1; }
  .cab .r { font-size: 9pt; color: #656C7C; text-transform: uppercase; letter-spacing: .6px; }
  .cab .n { font-size: 15pt; font-weight: 500; font-variant-numeric: tabular-nums; display: block; }
  .cab .sobrou .n { color: #146B3A; }
`;

/**
 * O extracto em papel: os três números do mês, e depois cada movimento com o
 * dia, quem, o que foi, quanto e o saldo a seguir a ele. O molde é o mesmo das
 * outras páginas da app — a faixa do esquema de quem imprime, a marca de água e
 * o carimbo (`documento.js`).
 *
 * ⚠ Vem do MAIS ANTIGO para o mais recente, ao contrário do ecrã. No ecrã lê-se
 * «o que aconteceu agora» e por isso o recente vem à frente; no papel lê-se o
 * mês de fio a pavio, e um saldo corrente que desce de cima para baixo só faz
 * sentido na ordem em que aconteceu.
 */
export function documentoDoExtracto({ extracto, casa, hoje, quemImprime = null, t = null }) {
  const e = extracto || { nome: '', movimentos: [], entrou: 0, saiu: 0, sobrou: 0, aberto: true, fechadoEm: null };
  const movs = [...(e.movimentos || [])].reverse();

  const linha = (m) => {
    const quem = m.quem ? escapar(m.quem) : 'a casa';
    const detalhe = [quem, m.detalhe ? escapar(m.detalhe) : null, PALAVRA[m.especie] || null]
      .filter(Boolean).join(' · ');
    const valor = m.neutro
      ? escapar(EUR(Math.abs(m.valor)))
      : `${m.valor < 0 ? '−' : '+'}${escapar(EUR(Math.abs(m.valor)))}`;
    return `<div class="mov${m.neutro ? ' neutro' : ''}">`
      + `<span class="d">${escapar(diaCurto(m.data))}</span>`
      + `<span class="q"><b>${escapar(m.titulo)}</b><br><i>${detalhe}</i></span>`
      + `<span class="v">${valor}</span>`
      + `<span class="s">${m.neutro ? '—' : escapar(EUR(m.saldo))}</span>`
      + '</div>';
  };

  const corpo = `<div class="cab">`
    + `<div><span class="r">Entrou</span><span class="n">${escapar(EUR(e.entrou))}</span></div>`
    + `<div><span class="r">Saiu</span><span class="n">${escapar(EUR(e.saiu))}</span></div>`
    + `<div class="sobrou"><span class="r">Sobrou</span><span class="n">${escapar(EUR(e.sobrou))}</span></div>`
    + '</div>'
    + `<section><h2>Movimentos<span>${escapar(plural(movs.length, 'movimento', 'movimentos'))}</span></h2>`
    + (movs.length ? movs.map(linha).join('') : '<p class="vazio">Nenhum movimento neste mês.</p>')
    + '</section>';

  const estado = e.aberto ? 'mês em curso' : `mês fechado${e.fechadoEm ? ` a ${escapar(dmyDeChave(e.fechadoEm))}` : ''}`;

  return paginaDaApp({
    titulo: `Extracto de ${e.nome}`,
    origem: `Casa ${escapar(casa)} · ${estado} · exportado a ${escapar(dayLabel(hoje).replace('Hoje · ', ''))}`,
    corpo,
    aviso: 'Documento gerado pela aplicação Nossa Casa. Contém o dinheiro da casa — não é para as crianças.',
    quemImprime, hoje, t, estilo: ESTILO,
  });
}
