// O molde dos documentos que a app gera — a ficha de saúde, a ficha de
// emergência, o retrato do mês. UM molde para os três (12/09/2026).
//
// ── O que o dono da casa pediu ───────────────────────────────────────────────
//
// «Os documentos gerados pela app devem ter o logótipo da app em marca de água
// e o nome de quem imprime e a data no canto inferior direito», e depois
// «um design semelhante à app». Mostrei cinco páginas
// (design/documentos-da-app.dc.html) e escolheu a A: a faixa de cabeçalho na
// cor do cabeçalho da app (o `chrome` do esquema de quem imprime) com o
// logótipo a cores, o corpo no desenho C — títulos de secção a 13 px em
// `actFg` com régua, linhas planas com divisória, números tabulares à direita
// —, o logótipo centrado a 7 % como marca de água, e o carimbo «Impresso por
// António · 12/09/2026 · 19:40» no canto inferior direito.
//
// ⚠ A marca e o carimbo são `position: fixed`: num documento impresso isso
// repete-se em CADA página, que é o que uma marca de água e um carimbo têm de
// fazer — uma folha solta continua a dizer de onde veio e quem a imprimiu.
//
// Sem serifa: a letra é a da app (Inter/Roboto, com reserva do sistema). Sai
// da app para papel ou para o ecrã de outra pessoa, mas continua a ser um
// papel da Nossa Casa.
import { dmyDeChave, agoraNaApp, pad2, TODAY_KEY } from './format';

// As cores por omissão são as do Cião — o esquema com que a app nasce. Quem
// imprime passa o seu tema (`t`), e a faixa fica com o cabeçalho DELE.
export const CORES_POR_OMISSAO = { chrome: '#0A5B60', actFg: '#076F73', accent: '#078286' };

export const escapar = (x) => String(x == null ? '' : x)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// A marca da casa (a mesma do `Marca` do Icon.jsx): o telhado e as quatro
// bolas. A cores para a faixa; numa cor só para a marca de água.
export const logotipo = ({ classe = '', cor = null, tamanho = null } = {}) => {
  const bolas = cor ? [cor, cor, cor, cor] : ['#8B4EE0', '#13ADB3', '#4A8FE0', '#E8EDF5'];
  const telhado = cor || '#FFFFFF';
  const medida = tamanho ? ` width="${tamanho}" height="${tamanho}"` : '';
  return `<svg class="${classe}" viewBox="0 0 24 24"${medida} aria-hidden="true">`
    + `<path d="M3.6 10.9L12 4.1l8.4 6.8" stroke="${telhado}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
    + `<circle cx="9.1" cy="14.9" r="1.62" fill="${bolas[0]}"/><circle cx="14.9" cy="14.9" r="1.62" fill="${bolas[1]}"/>`
    + `<circle cx="9.1" cy="19.4" r="1.62" fill="${bolas[2]}"/><circle cx="14.9" cy="19.4" r="1.62" fill="${bolas[3]}"/>`
    + '</svg>';
};

// O carimbo: quem imprimiu, e quando — data e hora do relógio da app.
export const carimboDe = ({ quemImprime, hoje }) => {
  const agora = agoraNaApp();
  const data = dmyDeChave(hoje || TODAY_KEY);
  const hora = `${pad2(agora.getHours())}:${pad2(agora.getMinutes())}`;
  return { quem: quemImprime ? `Impresso por ${quemImprime}` : 'Impresso pela aplicação Nossa Casa', quando: `${data} · ${hora}` };
};

// `titulo` e `origem` vão na faixa; `corpo` são as `<section>` de cada
// documento; `aviso` é a frase do rodapé, à esquerda do carimbo.
export function paginaDaApp({ titulo, origem, corpo, aviso, quemImprime, hoje, t }) {
  const cores = {
    chrome: (t && t.chrome) || CORES_POR_OMISSAO.chrome,
    actFg: (t && t.actFg) || CORES_POR_OMISSAO.actFg,
  };
  const carimbo = carimboDe({ quemImprime, hoje });

  return `<!doctype html>
<html lang="pt-PT"><head><meta charset="utf-8">
<title>${escapar(titulo)}</title>
<style>
  @page { margin: 14mm 18mm 20mm; }
  html, body { margin: 0; }
  body { font-family: Inter, Roboto, 'Segoe UI', system-ui, -apple-system, sans-serif; color: #262626;
         line-height: 1.5; font-size: 12pt; padding: 0 0 22mm; }
  .faixa { background: ${cores.chrome}; color: #fff; border-radius: 8px; padding: 14px 18px;
           display: flex; align-items: center; gap: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .faixa .logo { width: 34px; height: 34px; flex: none; }
  h1 { font-size: 18pt; font-weight: 600; margin: 0; line-height: 1.25; }
  .origem { font-size: 9.5pt; color: rgba(255,255,255,.82); margin: 3px 0 0; }
  section { margin: 18px 0 0; break-inside: auto; }
  h2 { display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
       font-size: 13px; font-weight: 600; letter-spacing: .2px; color: ${cores.actFg};
       border-bottom: 1px solid #D9D9D9; padding-bottom: 8px; margin: 0 0 2px; }
  h2 span { font-weight: 500; color: #656C7C; font-size: 11.5px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li, .lin { display: flex; align-items: center; gap: 12px; min-height: 30px; padding: 7px 4px;
             border-bottom: 1px solid #E7E9EE; break-inside: avoid; }
  li:last-child, .lin:last-child { border-bottom: 0; }
  .dir { margin-left: auto; color: #656C7C; font-variant-numeric: tabular-nums; white-space: nowrap; font-size: 11pt; }
  .acima { font-size: 9pt; font-weight: 600; color: #A8071A; background: #FFECEC; border-radius: 999px; padding: 1px 8px; }
  p { margin: 0; }
  .meta { font-size: 10.5pt; color: #656C7C; margin: 0 0 6px; }
  .consulta { padding: 10px 4px; border-bottom: 1px solid #E7E9EE; break-inside: avoid; }
  .consulta:last-child { border-bottom: 0; }
  .consulta h3 { font-size: 12.5pt; font-weight: 600; margin: 0 0 2px; }
  .notas p { margin: 4px 0; font-size: 11pt; }
  .autor { font-weight: 600; }
  .anexos { font-size: 10pt; color: #656C7C; margin: 6px 0 0; font-style: italic; }
  .aviso { font-size: 10pt; color: #656C7C; border-left: 3px solid #D9D9D9; padding-left: 12px; margin: 18px 0; }
  .vazio { color: #656C7C; font-style: italic; padding: 7px 4px; }
  .total { display: flex; align-items: baseline; gap: 10px; padding: 12px 4px 0; }
  .total .n { font-size: 20pt; font-weight: 500; color: #146B3A; }
  .total .de { color: #656C7C; font-size: 11pt; }
  /* A marca de água e o pé repetem-se em CADA página impressa.
     ⚠ A marca é FUNDO: fica atrás do texto (z-index negativo) e à frente do
     papel — e para isso a página tem de ser o seu próprio contexto
     («isolation: isolate»), senão o fundo branco da folha tapa-a. */
  html { isolation: isolate; background: #fff; }
  .marca { position: fixed; left: 50%; top: 50%; width: 110mm; height: 110mm; transform: translate(-50%, -50%);
           opacity: .07; z-index: -1; pointer-events: none; }
  /* O pé é UMA linha em flex: o aviso à esquerda, o carimbo à direita, e um
     intervalo entre os dois — assim nunca se sobrepõem, por muito comprido
     que o aviso seja. */
  .pe { position: fixed; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between;
        align-items: flex-end; gap: 24px; }
  .rodape { flex: 1 1 auto; min-width: 0; font-size: 8.5pt; color: #656C7C; line-height: 1.35; }
  .carimbo { flex: none; text-align: right; font-size: 9pt; color: #656C7C; line-height: 1.35; white-space: nowrap; }
  .carimbo b { display: block; font-weight: 600; color: #3B3F48; }
  @media screen {
    body { background: #F0F2F5; }
    .pagina { max-width: 190mm; margin: 24px auto; background: #fff; padding: 14mm 18mm 26mm; position: relative;
              isolation: isolate; box-shadow: 0 1px 4px rgba(0,0,0,.12); min-height: 240mm; }
    .marca, .pe { position: absolute; }
    .pe { left: 18mm; right: 18mm; bottom: 10mm; }
  }
</style></head>
<body>
<div class="pagina">
${logotipo({ classe: 'marca', cor: cores.chrome })}
<header class="faixa">
  ${logotipo({ classe: 'logo' })}
  <div>
    <h1>${escapar(titulo)}</h1>
    <p class="origem">${origem}</p>
  </div>
</header>
${corpo}
<div class="pe">
<div class="rodape">${escapar(aviso || 'Documento gerado pela aplicação Nossa Casa.')}</div>
<div class="carimbo"><b>${escapar(carimbo.quem)}</b>${escapar(carimbo.quando)}</div>
</div>
</div>
</body></html>`;
}
