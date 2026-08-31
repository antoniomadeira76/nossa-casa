// Exportar uma ficha de saúde.
//
// Duas metades, de propósito separadas: aqui MONTA-SE o documento, e em
// `entregar` ele SAI da app. A primeira é pura — não sabe o que é React nem
// que plataforma corre — e por isso prova-se contra o texto que produz. A
// segunda é a única que toca no dispositivo.
//
// ── O que sai, e o que não sai ──────────────────────────────────────────────
//
// Esta é a única porta por onde dados clínicos saem da app, e de menores. O
// resto do módulo de saúde está deliberadamente fora do servidor (CLAUDE.md,
// db/README.md: cinco pontos de conformidade por resolver). Aqui não há
// servidor nenhum — o ficheiro fica no dispositivo de quem já vê a ficha, e o
// propósito é levá-lo ao médico.
//
// Três decisões que vêm daí:
//
//   1. O documento diz de quem é. Casa, membro, e a data em que foi exportado.
//      Um papel clínico sem dono é um papel que se confunde com o de outra
//      criança.
//   2. Os ANEXOS não vão. São ficheiros — fotografias de relatórios — e
//      juntá-los é outro problema (um só ficheiro? uma pasta?). O documento
//      diz quantos ficaram de fora, em vez de os omitir em silêncio.
//   3. GUARDA-SE, não se partilha. A folha de partilha do sistema abre a porta
//      a mandar isto para qualquer aplicação instalada, com um toque distraído.
//      Guardar é o toque a mais que impede esse engano.
//
// ── HTML por dentro, PDF por fora ───────────────────────────────────────────
//
// O que sai é um PDF, que é o que um consultório aceita e o que se anexa a um
// correio. O que se monta aqui é o HTML de onde ele sai: no telemóvel o
// `expo-print` converte-o, e na web é o diálogo de impressão do navegador.
//
// A folha de estilos leva `@page` e uma regra de impressão porque o documento
// nasce para papel — margens, quebras, e nada de cor de esquema. O sistema
// visual da casa não se aplica a um papel clínico; o que se aplica é ler-se
// bem impresso e em branco e preto.

import { dayLabel } from './format';

// ── Âmbito ───────────────────────────────────────────────────────────────────
// Os três que fazem sentido pedir: uma consulta, uma especialidade, ou tudo.
export const AMBITOS = {
  consulta: { chave: 'consulta', rotulo: 'Só esta consulta' },
  especialidade: { chave: 'especialidade', rotulo: 'Por especialidade' },
  tudo: { chave: 'tudo', rotulo: 'Ficha completa' },
};

// Que consultas entram, dado o âmbito. Pura: recebe a lista já filtrada por
// visibilidade — quem pode ver o quê decide-se na loja, e repeti-lo aqui daria
// a impressão errada de que é este ficheiro que protege.
export const consultasDoAmbito = (consultas, ambito, alvo) => {
  const todas = [...(consultas || [])].sort((a, b) => String(a.day).localeCompare(String(b.day)));
  if (ambito === 'consulta') return todas.filter(h => h.id === alvo);
  if (ambito === 'especialidade') return todas.filter(h => h.specialty === alvo);
  return todas;
};

// O que o ecrã mostra antes de exportar: quantas consultas, quantos documentos
// vão ficar de fora. Dizer o que sai antes de sair.
export const resumoDoAmbito = (consultas, docs, ambito, alvo) => {
  const escolhidas = consultasDoAmbito(consultas, ambito, alvo);
  const ids = new Set(escolhidas.map(h => h.id));
  return {
    consultas: escolhidas.length,
    anexos: (docs || []).filter(d => ids.has(d.healthId)).length,
  };
};

// Um nome de ficheiro que se percebe numa pasta cheia, e que nenhum sistema
// de ficheiros recusa.
export const nomeDoFicheiro = ({ membro, ambito, alvo, dia }) => {
  const limpo = (x) => String(x || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // sem acentos
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  const meio = ambito === 'tudo' ? 'ficha-completa'
    : ambito === 'especialidade' ? limpo(alvo)
    : 'consulta';
  return `saude-${limpo(membro)}-${meio}-${String(dia).replace(/^d/, '')}.pdf`;
};

const escapar = (x) => String(x == null ? '' : x)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const quando = (h) => {
  const d = dayLabel(h.day).replace('Hoje · ', 'Hoje, ');
  return h.time ? `${d} às ${h.time}` : d;
};

// ── O documento ──────────────────────────────────────────────────────────────
//
// Preto sobre branco, sem cor de esquema: isto sai da app e vai para papel ou
// para o ecrã de outra pessoa. O sistema visual da casa não se aplica a um
// documento clínico — o que se aplica é ler-se bem impresso.
export function documentoDeSaude({
  membro, casa, consultas, docs, notas = {}, ambito = 'tudo', alvo = null, hoje,
}) {
  const escolhidas = consultasDoAmbito(consultas, ambito, alvo);
  const ids = new Set(escolhidas.map(h => h.id));
  const anexos = (docs || []).filter(d => ids.has(d.healthId));

  const titulo = ambito === 'tudo' ? `Ficha de saúde · ${membro}`
    : ambito === 'especialidade' ? `${alvo} · ${membro}`
    : `Consulta · ${membro}`;

  const linhas = escolhidas.map(h => {
    const desteAnexos = anexos.filter(d => d.healthId === h.id);
    const desteNotas = (notas[h.id] || []);
    return `
    <section class="consulta">
      <h2>${escapar(h.specialty)}</h2>
      <p class="meta">${escapar(quando(h))}${h.doctor ? ' · ' + escapar(h.doctor) : ''}</p>
      ${desteNotas.length ? `<div class="notas">${desteNotas.map(n =>
        `<p><span class="autor">${escapar(n.author)}:</span> ${escapar(n.text)}</p>`).join('')}</div>` : ''}
      ${desteAnexos.length ? `<p class="anexos">Documentos em arquivo: ${
        desteAnexos.map(d => escapar(d.title) + (d.kind ? ` (${escapar(d.kind)})` : '')).join(', ')
      }</p>` : ''}
    </section>`;
  }).join('');

  // O aviso dos anexos aparece SEMPRE que houver algum, e não como nota de
  // rodapé: quem leva isto ao médico tem de saber que os ficheiros ficaram no
  // telefone antes de chegar lá, não depois.
  const avisoAnexos = anexos.length
    ? `<p class="aviso">Este documento lista ${anexos.length === 1 ? 'um documento'
        : anexos.length + ' documentos'} do arquivo clínico, mas não ${
        anexos.length === 1 ? 'o inclui' : 'os inclui'}. ${
        anexos.length === 1 ? 'O ficheiro continua' : 'Os ficheiros continuam'} na aplicação.</p>`
    : '';

  return `<!doctype html>
<html lang="pt-PT"><head><meta charset="utf-8">
<title>${escapar(titulo)}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; max-width: 44em;
         margin: 2rem auto; padding: 0 1.5rem; line-height: 1.55; }
  header { border-bottom: 2px solid #111; padding-bottom: .8rem; margin-bottom: 1.6rem; }
  h1 { font-size: 1.5rem; margin: 0 0 .3rem; }
  .origem { font-size: .84rem; color: #444; margin: 0; }
  .consulta { border-bottom: 1px solid #ddd; padding-bottom: 1rem; margin-bottom: 1.2rem; }
  .consulta:last-of-type { border-bottom: 0; }
  h2 { font-size: 1.06rem; margin: 0 0 .2rem; }
  .meta { font-size: .86rem; color: #444; margin: 0 0 .6rem; }
  .notas p { margin: .3rem 0; font-size: .93rem; }
  .autor { font-weight: bold; }
  .anexos { font-size: .84rem; color: #444; margin: .5rem 0 0; font-style: italic; }
  .aviso { font-size: .84rem; color: #444; border-left: 3px solid #bbb;
           padding-left: .8rem; margin: 1.4rem 0; }
  .vazio { color: #444; font-style: italic; }
  footer { border-top: 1px solid #ddd; margin-top: 2rem; padding-top: .7rem;
           font-size: .78rem; color: #555; }
  @media print { body { margin: 0; max-width: none; } }
</style></head>
<body>
<header>
  <h1>${escapar(titulo)}</h1>
  <p class="origem">Casa ${escapar(casa)} · exportado a ${escapar(dayLabel(hoje).replace('Hoje · ', ''))}</p>
</header>
${escolhidas.length ? linhas : '<p class="vazio">Sem consultas neste âmbito.</p>'}
${avisoAnexos}
<footer>Documento gerado pela aplicação Nossa Casa. Contém dados de saúde — guarde-o com o mesmo cuidado que teria com o papel.</footer>
</body></html>`;
}
