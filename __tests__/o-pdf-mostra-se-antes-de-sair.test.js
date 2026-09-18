/**
 * UM DOCUMENTO MOSTRA-SE ANTES DE SAIR DA APP
 * ===========================================
 *
 * 17/09/2026: «quando se clica em Exportar PDF (toda a app) tem de apresentar
 * uma previsualização».
 *
 * Havia QUATRO sítios a exportar — a ficha de saúde, a ficha de emergência, a
 * fatura do equipamento e o extracto do mês — e os quatro chamavam o
 * `guardarPDF` directamente: o documento só se via depois de já estar no
 * diálogo de impressão do navegador ou no seletor de partilha do telemóvel.
 * Dois deles levam dados clínicos de um menor.
 *
 * Remendar os quatro não serve: o quinto nasce sem pré-visualização e ninguém
 * dá por isso. Este guarda ENUMERA a árvore e prende a porta única:
 *
 *   · só o `src/PreVisualizarPDF.jsx` chama o `guardarPDF`;
 *   · quem exporta abre essa folha, e passa-lhe o `html` e o `nome`.
 *
 * ⚠ O `guardar-ficheiro.js` é quem o DEFINE, e por isso não conta — é a mesma
 * distinção que o guarda do acento faz com o `ui.jsx`.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const A_PORTA = 'src/PreVisualizarPDF.jsx';
const ONDE_VIVE = 'src/guardar-ficheiro.js';

// ⚠ Sem comentários. Este ficheiro explica o defeito com o nome da função lá
// dentro, e um guarda que lê texto encontra-se a si próprio — é a armadilha
// `armadilhas-de-tratar-codigo-como-texto`, e já custou duas tardes nesta casa.
// Os blocos trocam-se por o MESMO NÚMERO de quebras de linha, para os números
// das linhas continuarem a bater certo com o ficheiro.
const semComentarios = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ''))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p);

const ficheirosDaApp = () => {
  const achados = [];
  const andar = (dir) => {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) andar(p);
      else if (/\.(jsx|js)$/.test(nome)) achados.push(p);
    }
  };
  andar(path.join(RAIZ, 'src'));
  achados.push(path.join(RAIZ, 'App.jsx'));
  return achados.map(p => path.relative(RAIZ, p).split(path.sep).join('/'));
};

const codigo = (rel) => semComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));

describe('um documento mostra-se antes de sair da app', () => {
  const ficheiros = ficheirosDaApp();

  it('há ficheiros para ler — senão este guarda passa por vacuidade', () => {
    expect(ficheiros.length).toBeGreaterThan(50);
    expect(ficheiros).toContain(A_PORTA);
    expect(ficheiros).toContain(ONDE_VIVE);
  });

  it('a porta existe e é ela que chama o `guardarPDF`', () => {
    const porta = codigo(A_PORTA);
    expect(porta).toMatch(/import \{ guardarPDF \} from '\.\/guardar-ficheiro'/);
    expect(porta).toMatch(/await guardarPDF\(/);
  });

  it('⚠ mais nenhum ficheiro da app chama o `guardarPDF`', () => {
    const maus = [];
    for (const rel of ficheiros) {
      if (rel === A_PORTA || rel === ONDE_VIVE) continue;
      const linhas = codigo(rel).split('\n');
      linhas.forEach((l, i) => {
        if (/\bguardarPDF\b/.test(l)) maus.push(`${rel}:${i + 1} — ${l.trim().slice(0, 70)}`);
      });
    }
    expect(maus).toEqual([]);
  });

  it('⚠ e os quatro que exportam abrem a pré-visualização', () => {
    // Os nomes estão aqui porque a lista tem de ENVELHECER MAL: um sítio que
    // deixe de exportar falha isto e obriga a olhar, em vez de a lista ficar a
    // dizer sim a um ficheiro que já não faz nada.
    const QUE_EXPORTAM = [
      'src/sheets/ExportarSaude.jsx',
      'src/sheets/FichaEmergencia.jsx',
      'src/sheets/FichaEquipamento.jsx',
      'src/sheets/ExtractoDoMes.jsx',
    ];
    const maus = [];
    for (const rel of QUE_EXPORTAM) {
      const txt = codigo(rel);
      if (!/import PreVisualizarPDF from/.test(txt)) maus.push(`${rel} — não importa a pré-visualização`);
      if (!/<PreVisualizarPDF\b/.test(txt)) maus.push(`${rel} — não a desenha`);
      // Sem `html` e `nome` a folha abre vazia.
      const uso = (txt.match(/<PreVisualizarPDF[\s\S]*?\/>/) || [''])[0];
      if (!/\bhtml=/.test(uso)) maus.push(`${rel} — abre a pré-visualização sem o \`html\``);
      if (!/\bnome=/.test(uso)) maus.push(`${rel} — abre a pré-visualização sem o \`nome\``);
    }
    expect(maus).toEqual([]);
  });

  it('⚠ e a pré-visualização não inventa nada: o que mostra é o que exporta', () => {
    // O mesmo `html` e o mesmo `nome` vão para a moldura e para o `guardarPDF`.
    // Se um dia forem dois valores diferentes, mostra-se uma coisa e sai outra —
    // que é pior do que não mostrar nada.
    const porta = codigo(A_PORTA);
    expect(porta).toMatch(/guardarPDF\(nome, html\)/);
    expect(porta).toMatch(/srcDoc: html/);
  });
});
