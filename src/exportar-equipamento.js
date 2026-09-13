// A fatura de um equipamento, em PDF — pelo molde da app (`paginaDaApp`).
//
// 13/09/2026: «Exportar Fatura» na ficha do equipamento era um botão com
// `onPress={() => {}}` — prometia e não fazia, com a fatura fotografada mesmo
// ao lado. Passa a sair um documento com a cara da app: o equipamento, a
// garantia, a compra e a fotografia da fatura em tamanho de página. É o mesmo
// caminho da ficha de saúde (`documentoDeSaude`), e recebe a imagem já lida em
// `data:` por quem chama (`lerComoDataURI`), para o módulo ficar puro.
import { paginaDaApp, escapar } from './documento';
import { EUR, dayLabel } from './format';

// `fatura-frigorifico-2026-09-13.pdf`
export const nomeDoFicheiroDaFatura = (equip, dia) =>
  `fatura-${String((equip && equip.name) || 'equipamento').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}-${String(dia || '').replace(/^d/, '')}.pdf`;

export function documentoDaFatura({ equip, estado, imagem = null, casa, hoje, quemImprime = null, t = null }) {
  const e = equip || {};
  const linhas = [
    ['Categoria', e.cat],
    ['Preço de compra', typeof e.price === 'number' ? EUR(e.price) : null],
    ['Data de compra', e.bought],
    ['Garantia', estado ? `${estado.titulo} — ${estado.linha}` : (e.warrantyEnd ? `até ${e.warrantyEnd}` : null)],
    ['Manutenção marcada', e.maint ? `${e.maint}${e.maintDate ? ` · até ${e.maintDate}` : ''}` : null],
  ].filter(([, v]) => v);
  const dados = `<ul>${linhas.map(([k, v]) => `<li><strong>${escapar(k)}</strong><span class="dir">${escapar(v)}</span></li>`).join('')}</ul>`;
  const fatura = imagem
    ? `<figure class="anexo"><img src="${escapar(imagem)}" alt="Fatura de compra"><figcaption>Fatura de compra${e.bought ? ` · ${escapar(e.bought)}` : ''}</figcaption></figure>`
    : '<p class="vazio">Sem fotografia da fatura nesta ficha.</p>';

  return paginaDaApp({
    titulo: `Fatura · ${e.name || 'Equipamento'}`,
    origem: `Casa ${escapar(casa || '')} · exportado a ${escapar(dayLabel(hoje).replace('Hoje · ', ''))}`,
    corpo: `<section><h2>Equipamento</h2>${dados}</section>`
      + `<section><h2>Fatura</h2>${fatura}</section>`,
    aviso: 'Documento gerado pela aplicação Nossa Casa. Serve de prova de compra para a garantia ou a assistência.',
    quemImprime, hoje, t,
  });
}
