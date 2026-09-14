/**
 * A coerência do desenho entre ecrãs — a revisão de 14/09/2026.
 *
 * O dono da casa: «olha para toda a app e vê se o design está coerente em
 * todos os ecrãs». Oito pontos divergiam; cada um tem aqui o seu guarda, para
 * a divergência não voltar por descuido daqui a seis meses.
 *
 *   1. O scroll volta ao topo quando o ecrã muda (partilham a mesma área).
 *   2. «Acrescentar» é UM botão: o tracejado, em minúsculas — sem linhas com
 *      «+» dentro de cartões.
 *   3. Os botões escrevem-se em frase («Guardar alterações»), não com
 *      Maiúsculas Iniciais. Os títulos de secção e de folha, esses sim.
 *   4. Um envelope lê-se de uma forma só: «gasto / limite».
 *   5. Os tamanhos de letra são os da escala `LETRA` do tema.
 *   6. Nenhuma cor escrita à mão nos ecrãs — só tokens do tema (e o branco
 *      sobre o `chrome`).
 *   7. Toda a folha tem título E subtítulo.
 *   8. A marca do cabeçalho não fica por trás do avatar.
 */
const fs = require('fs');
const path = require('path');
const { LETRA } = require('../src/theme');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const lista = (d) => fs.readdirSync(path.join(RAIZ, d)).filter(f => f.endsWith('.jsx')).map(f => `${d}/${f}`);
const ECRAS = ['App.jsx', 'src/KidApp.jsx', 'src/ui.jsx', 'src/FiltroDeMembros.jsx', ...lista('src/screens'), ...lista('src/sheets')];

describe('⚠ a coerência do desenho', () => {
  it('1. o scroll volta ao topo quando o separador ou a vista mudam', () => {
    const app = semComentarios(ler('App.jsx'));
    expect(app).toMatch(/const scrollRef = useRef\(null\);/);
    expect(app).toMatch(/scrollRef\.current\.scrollTo\(\{ y: 0, animated: false \}\)/);
    expect(app).toMatch(/\}, \[tab, saude, equip, gestao, doc, ficha, loja, ida, pesquisa === null\]\);/);
    expect(app).toMatch(/<ScrollView ref=\{scrollRef\}/);
  });

  it('2. «acrescentar» é o botão tracejado, em minúsculas, em todos os ecrãs', () => {
    const rotulos = [];
    for (const f of ECRAS) {
      for (const m of semComentarios(ler(f)).matchAll(/<AddButton[^>]*?label="([^"]+)"/g)) rotulos.push([f, m[1]]);
    }
    expect(rotulos.length).toBeGreaterThan(10);
    for (const [f, r] of rotulos) {
      // primeira letra minúscula — «acrescentar tarefa», «registar despesa»
      expect(`${f}: ${r}`).toMatch(/: [a-zà-ú]/);
    }
    // O Dinheiro já não tem a linha «+ Registar Despesa» dentro de um cartão.
    expect(semComentarios(ler('src/screens/Dinheiro.jsx'))).not.toMatch(/<Row t=\{t\} icon="plus"/);
    expect(semComentarios(ler('src/screens/Dinheiro.jsx'))).toMatch(/<AddButton t=\{t\} label="registar despesa"/);
  });

  it('3. os botões escrevem-se em frase, não com Maiúsculas Iniciais', () => {
    // Um rótulo estático de botão com uma segunda palavra em maiúscula é
    // grafia de título. As siglas (PIN) e os nomes próprios (Google) ficam.
    const PROPRIOS = /^(PIN|Google|Setembro|Outubro|Novembro|Dezembro|Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto)$/;
    const maus = [];
    for (const f of ECRAS) {
      const txt = semComentarios(ler(f));
      for (const m of txt.matchAll(/<(?:Primary|Acao|BotaoCompacto|Confirm)\b[^>]*?\b(?:label|confirmLabel)="([^"{]+)"/gs)) {
        const palavras = m[1].split(/\s+/).slice(1);
        if (palavras.some(p => /^[A-ZÀ-Ú][a-zà-ú]/.test(p) && !PROPRIOS.test(p))) maus.push(`${f}: ${m[1]}`);
      }
    }
    expect(maus).toEqual([]);
  });

  it('4. um envelope lê-se «gasto / limite» na Gestão como no Dinheiro', () => {
    const gestao = semComentarios(ler('src/screens/Gestao.jsx'));
    expect((gestao.match(/\{EUR\(env\.used\)\} \/ \{EUR\(env\.limit\)\}/g) || []).length).toBe(2);
    expect(gestao).not.toMatch(/Limite: \{EUR\(env\.limit\)\}/);
    expect(gestao).not.toMatch(/\{EUR\(env\.limit - env\.used\)\} livre/);
    // E os mesmos números não se repetem por baixo da barra («178,00 € de 240,00 €»).
    expect(gestao).not.toMatch(/\{EUR\(env\.used\)\} de \{EUR\(env\.limit\)\}/);
    expect(semComentarios(ler('src/screens/Dinheiro.jsx'))).toMatch(/\{EUR\(e\.used\)\} \/ \{EUR\(e\.limit\)\}/);
  });

  it('5. os tamanhos de letra são os da escala do tema', () => {
    const fora = [];
    for (const f of ECRAS) {
      for (const m of semComentarios(ler(f)).matchAll(/fontSize: ([0-9.]+)/g)) {
        if (!LETRA.includes(Number(m[1]))) fora.push(`${f}: ${m[1]}`);
      }
    }
    expect(fora).toEqual([]);
  });

  it('6. nenhuma cor escrita à mão nos ecrãs — só o branco sobre o chrome', () => {
    const maus = [];
    for (const f of ECRAS) {
      for (const m of semComentarios(ler(f)).matchAll(/'#([0-9A-Fa-f]{3,8})'/g)) {
        if (!/^(FFFFFF|FFF)$/i.test(m[1])) maus.push(`${f}: #${m[1]}`);
      }
    }
    expect(maus).toEqual([]);
    // A urgência das Tarefas e o ecrã de entrada passaram a ler o tema.
    expect(semComentarios(ler('src/screens/Tarefas.jsx'))).toMatch(/cor: \(t\) => t\.state\.errDeep/);
    expect(semComentarios(ler('src/screens/Login.jsx'))).toMatch(/ESCURO\.state\.errTexto/);
  });

  it('7. toda a folha tem título e subtítulo', () => {
    const sem = [];
    for (const f of ECRAS) {
      const txt = semComentarios(ler(f));
      for (const m of txt.matchAll(/<Sheet\b([^>]*)>/gs)) {
        if (/\btitle=/.test(m[1]) && !/\bsub=/.test(m[1])) sem.push(`${f}: ${m[1].trim().slice(0, 60)}`);
      }
    }
    expect(sem).toEqual([]);
  });

  it('8. a marca do cabeçalho vive à esquerda do avatar, não por trás', () => {
    const app = semComentarios(ler('App.jsx'));
    const i = app.indexOf('<Marca size={72}');
    expect(app.slice(i, i + 200)).toMatch(/right: 68/);
  });
});

// ── A segunda revisão (14/09/2026, «verifica todo o design») ─────────────────
describe('⚠ a coerência do desenho — segunda revisão', () => {
  // Palavras que ficam em minúscula num título com Maiúsculas Iniciais.
  const MIUDAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'nos', 'nas',
    'por', 'para', 'se', 'com', 'entre', 'à', 'ao', 'às', 'aos', 'um', 'uma', 'que', 'sem', 'sobre']);
  const emTitulo = (s) => s.trim().split(/\s+/).every((p, i) => {
    const limpa = p.replace(/[«»()·—-]/g, '');
    if (!limpa) return true;
    if (i > 0 && MIUDAS.has(limpa.toLowerCase())) return true;
    return /^[A-ZÀ-Ú0-9]/.test(limpa);
  });
  // O conteúdo literal de um `<SectionTitle …>…</SectionTitle>`: procura-se
  // o fim da etiqueta de abertura contando chavetas, porque um `right={<Pill/>}`
  // tem `>` lá dentro.
  const titulosDeSeccao = (txt) => {
    const saida = [];
    let i = 0;
    while ((i = txt.indexOf('<SectionTitle', i)) !== -1) {
      let j = i, prof = 0;
      for (; j < txt.length; j++) {
        if (txt[j] === '{') prof++;
        else if (txt[j] === '}') prof--;
        else if (txt[j] === '>' && prof === 0) break;
      }
      const fim = txt.indexOf('</SectionTitle>', j);
      const dentro = fim === -1 ? '' : txt.slice(j + 1, fim).trim();
      if (dentro && !dentro.includes('{')) saida.push(dentro);
      i = j;
    }
    return saida;
  };

  it('9. o botão principal de uma folha vive no rodapé fixo, não no fim do conteúdo', () => {
    // As dez folhas que tinham o botão a rolar com o conteúdo.
    for (const f of ['NovaTarefa', 'NovoEvento', 'NovoArtigo', 'NovaMeta', 'NovaContaFixa', 'NovoContrato',
      'GerirArtigo', 'GerirMeta', 'GerirContaFixa', 'ConfirmarAdministradores']) {
      const txt = semComentarios(ler(`src/sheets/${f}.jsx`));
      expect(`${f}: ${/useAcaoDaFolha\(<Primary/.test(txt)}`).toBe(`${f}: true`);
    }
    const sheet = semComentarios(ler('src/Sheet.jsx'));
    expect(sheet).toMatch(/export function useAcaoDaFolha\(elemento\)/);
    expect(sheet).toMatch(/const acao = action \|\| acaoDoFilho;/);
  });

  it('10. títulos de secção e de folha em Maiúsculas Iniciais — a grafia dos botões é em frase, a dos títulos não', () => {
    const maus = [];
    for (const f of ECRAS) {
      const txt = semComentarios(ler(f));
      for (const t of titulosDeSeccao(txt)) if (!emTitulo(t)) maus.push(`${f} :: ${t}`);
      for (const m of txt.matchAll(/<Sheet\b[^>]*?\btitle="([^"]+)"/gs)) if (!emTitulo(m[1])) maus.push(`${f} :: folha «${m[1]}»`);
    }
    expect(maus).toEqual([]);
  });

  it('11. o vazio de uma lista é o `Empty` (ícone, título, dica), não um aviso de uma linha', () => {
    const compras = semComentarios(ler('src/screens/Compras.jsx'));
    expect(compras).toMatch(/items\.length === 0 \? \(\s*<Empty t=\{t\} icon="fileDone"/);
    const troca = semComentarios(ler('src/sheets/ProporTroca.jsx'));
    expect((troca.match(/<Empty t=\{t\} icon="checkSquare"/g) || []).length).toBe(2);
    expect(troca).not.toMatch(/<Tile t=\{t\} kind="info">/);
  });

  it('12. nenhum ecrã lê as cores do estado fora do tema (`STATE.` fixo não segue o aspeto escuro)', () => {
    for (const f of ECRAS) {
      const txt = semComentarios(ler(f));
      expect(`${f}: ${/\bSTATE\./.test(txt)}`).toBe(`${f}: false`);
    }
  });

  it('13. um número escreve-se no NumField — as caixas de texto numéricas ficam só para o PIN e para o preço na loja', () => {
    // O preço pago no Modo Compras fica em caixa simples de propósito: a linha
    // do artigo tem 64 px e o preço ao lado do nome, sem lugar para «−» e «+».
    // E a hora de um evento («HH:MM») é texto com dois pontos, não um número.
    const FICAM = { 'src/screens/ModoCompras.jsx': 1, 'src/screens/Gestao.jsx': 2 /* os dois PIN */, 'src/sheets/NovoEvento.jsx': 1 /* a hora */ };
    for (const f of ECRAS) {
      const txt = semComentarios(ler(f));
      const n = (txt.match(/keyboardType="(number-pad|decimal-pad|numeric)"/g) || []).length;
      const permitidos = f === 'src/ui.jsx' ? 1 : f === 'src/KidApp.jsx' ? 3 : (FICAM[f] || 0);   // KidApp: os três PIN
      expect(`${f}: ${n}`).toBe(`${f}: ${Math.min(n, permitidos)}`);
    }
    for (const f of ['src/sheets/NovaTarefa.jsx', 'src/screens/Equipamentos.jsx', 'src/sheets/GerirArtigo.jsx', 'src/screens/Saude.jsx']) {
      expect(semComentarios(ler(f))).toMatch(/<NumField t=\{t\}/);
    }
  });
});
