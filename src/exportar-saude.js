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

import { dayLabel, plural } from './format';
import { paginaDaApp, escapar } from './documento';

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

// ── A ficha de emergência ────────────────────────────────────────────────────
//
// O que a escola precisa de saber num dia mau, numa página: alergias,
// medicação em curso, médico, contactos. A `ficha` vem da loja
// (`fichaDeEmergencia`), já filtrada por quem a pode ver — este ficheiro não
// decide visibilidade, monta o papel. (12/09/2026)
export const GRAVIDADES = [
  { chave: 'grave', rotulo: 'Grave' },
  { chave: 'moderada', rotulo: 'Moderada' },
  { chave: 'leve', rotulo: 'Leve' },
];

export const nomeDoFicheiroDeEmergencia = ({ membro, dia }) => {
  const limpo = (x) => String(x || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return `emergencia-${limpo(membro)}-${String(dia).replace(/^d/, '')}.pdf`;
};

const quando = (h) => {
  const d = dayLabel(h.day).replace('Hoje · ', 'Hoje, ');
  return h.time ? `${d} às ${h.time}` : d;
};

// ── As imagens dos anexos, para irem dentro do documento ─────────────────────
//
// Cada anexo com `foto` (um `file://` da câmara ou o endereço assinado do
// servidor) passa a trazer `dados`: a imagem em `data:` URI, lida por quem
// chamar — o `lerComoDataURI` do `guardar-ficheiro.js` na app; nas provas, o
// que se quiser. Sem leitor, ou quando a leitura falha, o anexo fica como está,
// e o documento diz que ele ficou na aplicação. Puro de propósito: não importa
// a plataforma, para se provar sem ela.
export async function anexosComImagens(docs, ler) {
  if (typeof ler !== 'function') return docs || [];
  return Promise.all((docs || []).map(async (d) => {
    if (!d || !d.foto) return d;
    const dados = await ler(d.foto).catch(() => null);
    return dados ? { ...d, dados } : d;
  }));
}

// ── O documento ──────────────────────────────────────────────────────────────
//
// ⚠ Dizia aqui «preto sobre branco, sem cor de esquema: o sistema visual da
// casa não se aplica a um documento clínico». O dono da casa decidiu o
// contrário em 12/09/2026: os documentos levam a cara da app — a faixa do
// esquema com o logótipo, o desenho C, a marca de água e o carimbo de quem
// imprime (opção A de design/documentos-da-app.dc.html). O molde é o
// `paginaDaApp`, o mesmo dos três documentos; aqui fica só o que é desta ficha.
export function documentoDeSaude({
  membro, casa, consultas, docs, notas = {}, ambito = 'tudo', alvo = null, hoje, quemImprime = null, t = null,
}) {
  const escolhidas = consultasDoAmbito(consultas, ambito, alvo);
  const ids = new Set(escolhidas.map(h => h.id));
  const anexos = (docs || []).filter(d => ids.has(d.healthId));

  const titulo = ambito === 'tudo' ? `Ficha de saúde · ${membro}`
    : ambito === 'especialidade' ? `${alvo} · ${membro}`
    : `Consulta · ${membro}`;

  // ⚠ As IMAGENS dos documentos vão dentro do PDF (12/09/2026 — o dono da
  // casa: «o PDF deve incluir as imagens dos docs»). Um anexo chega aqui com
  // `dados` — a imagem já em `data:` URI, lida pelo `anexosComImagens` — e sai
  // como figura, com a legenda. O que não trouxer imagem (sem ficheiro, ou um
  // ficheiro que não se leu) fica NOMEADO, e o aviso diz que ficou na app: o
  // que fica para trás diz-se, não se omite.
  const rotuloDoAnexo = (d) => escapar(d.title) + (d.kind ? ` (${escapar(d.kind)})` : '');
  const linhas = escolhidas.map(h => {
    const desteAnexos = anexos.filter(d => d.healthId === h.id);
    const comImagem = desteAnexos.filter(d => d.dados);
    const semImagem = desteAnexos.filter(d => !d.dados);
    const desteNotas = (notas[h.id] || []);
    return `
    <div class="consulta">
      <h3>${escapar(h.specialty)}</h3>
      <p class="meta">${escapar(quando(h))}${h.doctor ? ' · ' + escapar(h.doctor) : ''}</p>
      ${desteNotas.length ? `<div class="notas">${desteNotas.map(n =>
        `<p><span class="autor">${escapar(n.author)}:</span> ${escapar(n.text)}</p>`).join('')}</div>` : ''}
      ${comImagem.map(d => `<figure class="anexo"><img src="${escapar(d.dados)}" alt="${escapar(d.title)}">`
        + `<figcaption>${rotuloDoAnexo(d)}</figcaption></figure>`).join('')}
      ${semImagem.length ? `<p class="anexos">${semImagem.length === 1 ? 'Documento em arquivo, sem imagem neste PDF'
        : 'Documentos em arquivo, sem imagem neste PDF'}: ${semImagem.map(rotuloDoAnexo).join(', ')}</p>` : ''}
    </div>`;
  }).join('');

  // O aviso diz o que vai e o que ficou: quem leva isto ao médico tem de saber
  // ANTES de chegar lá se as imagens estão no papel ou ficaram no telemóvel.
  const incluidos = anexos.filter(d => d.dados).length;
  const emFalta = anexos.length - incluidos;
  const avisoAnexos = anexos.length
    ? `<p class="aviso">${incluidos ? `Este documento inclui ${incluidos === 1 ? 'a imagem de um documento'
        : `as imagens de ${incluidos} documentos`} do arquivo clínico.` : ''}${emFalta ? `${incluidos ? ' ' : ''}${
        emFalta === 1 ? 'Um documento não pôde ser incluído e continua' : `${emFalta} documentos não puderam ser incluídos e continuam`
      } na aplicação.` : ''}</p>`
    : '';

  const seccao = ambito === 'tudo' ? 'Consultas' : ambito === 'especialidade' ? 'Consultas da especialidade' : 'Consulta';
  return paginaDaApp({
    titulo,
    origem: `Casa ${escapar(casa)} · exportado a ${escapar(dayLabel(hoje).replace('Hoje · ', ''))}`,
    corpo: `<section><h2>${seccao}<span>${escapar(plural(escolhidas.length, 'consulta', 'consultas'))}</span></h2>`
      + `${escolhidas.length ? linhas : '<p class="vazio">Sem consultas neste âmbito.</p>'}</section>${avisoAnexos}`,
    aviso: 'Documento gerado pela aplicação Nossa Casa. Contém dados de saúde — guarde-o com o mesmo cuidado que teria com o papel.',
    quemImprime, hoje, t,
  });
}

// O documento da ficha de emergência: as quatro secções, sempre as quatro —
// uma secção vazia diz «nenhuma conhecida», porque na escola «não diz» e
// «não tem» são coisas diferentes. Preto sobre branco, como o outro.
export function documentoDeEmergencia({ membro, casa, ficha, hoje, quemImprime = null, t = null }) {
  const f = ficha || { alergias: [], medicacao: [], medicos: [], contactos: [] };
  const rotuloDaGravidade = (g) => (GRAVIDADES.find(x => x.chave === g) || GRAVIDADES[1]).rotulo.toLowerCase();
  const lista = (itens, vazio) => (itens.length
    ? `<ul>${itens.map(i => `<li>${i}</li>`).join('')}</ul>`
    : `<p class="vazio">${escapar(vazio)}</p>`);
  const alergias = lista(f.alergias.map(a =>
    `<strong>${escapar(a.nome)}</strong> · ${escapar(rotuloDaGravidade(a.gravidade))}${a.nota ? ` — ${escapar(a.nota)}` : ''}`),
  'Nenhuma alergia conhecida.');
  const medicacao = lista(f.medicacao.map(m =>
    `<strong>${escapar(m.nome)}</strong>${m.dose ? ` · ${escapar(m.dose)}` : ''}${m.plano ? ` · ${escapar(m.plano)}` : ''}${m.ate ? ` · até ${escapar(dayLabel(m.ate).replace(/^(Hoje|Amanhã) · /, ''))}` : ''}`),
  'Sem medicação em curso.');
  const medicos = lista(f.medicos.map(m => escapar(m)), 'Sem médico registado nas consultas.');
  const contactos = lista(f.contactos.map(c => `<strong>${escapar(c.nome)}</strong>${c.email ? ` · ${escapar(c.email)}` : ''}`),
    'Sem contactos.');

  return paginaDaApp({
    titulo: `Ficha de emergência · ${membro}`,
    origem: `Casa ${escapar(casa)} · exportado a ${escapar(dayLabel(hoje).replace('Hoje · ', ''))}`,
    corpo: `<section><h2>Alergias</h2>${alergias}</section>`
      + `<section><h2>Medicação atual</h2>${medicacao}</section>`
      + `<section><h2>Médico</h2>${medicos}</section>`
      + `<section><h2>Contactos</h2>${contactos}</section>`,
    aviso: 'Documento gerado pela aplicação Nossa Casa. Contém dados de saúde de um menor — entregue-o em mão, e peça que o guardem com o mesmo cuidado que teriam com o papel.',
    quemImprime, hoje, t,
  });
}
