/**
 * Os filtros do registo «Nesta casa» — opção A de
 * `design/filtros-do-registo.dc.html` (14/09/2026).
 *
 * Eram duas filas de pastilhas dentro de um cartão: nove áreas em três linhas
 * (~190 px antes da primeira entrada) e as pessoas pelo NOME. Agora o «Quem» é o
 * `FiltroDeMembros` das Tarefas e da Saúde (a bola com o nome por baixo), e o
 * «Onde» é uma fila que rola de lado com o ícone do rodapé de cada área, «Tudo»
 * primeiro e a escolhida logo a seguir. Duas linhas fixas, sem cartão nem
 * rótulos «Quem»/«Onde».
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');

describe('⚠ os filtros do registo', () => {
  const doc = semComentarios(ler('src/screens/Documentacao.jsx'));
  const i = doc.indexOf('const Filtros = (');
  const bloco = doc.slice(i, doc.indexOf('\n};', i));

  it('as pessoas escolhem-se pela bola — o mesmo FiltroDeMembros das Tarefas e da Saúde', () => {
    expect(doc).toMatch(/import FiltroDeMembros from '\.\.\/FiltroDeMembros';/);
    expect(bloco).toMatch(/<FiltroDeMembros t=\{t\} membros=\{quemHa\} escolhido=\{quem\} onEscolher=\{mudarQuem\}/);
    expect(bloco).toMatch(/rotuloDe=\{\(n\) => `Mostrar só o que \$\{n\} fez`\}/);
    // Com o quadro da casa, para as bolas terem a cor e a figura de cada um.
    expect(doc).toMatch(/const \{ s, retratosDaCasa, membros: membrosDaCasa \} = useStore\(\);/);
    expect(doc).toMatch(/<Filtros t=\{t\} quemHa=\{quemHa\} areasHa=\{areasHa\} MEMBERS=\{membrosDaCasa\}/);
  });

  // 14/09/2026, ao ver a fila a rolar: «há um botão escondido, arranja melhor
  // solução». As áreas passaram a uma GRELHA que embrulha — ícone de 44 numa
  // caixa com o nome por baixo, 64 de largura, na forma das bolas das pessoas
  // — em que nenhuma fica cortada nem escondida.
  it('as áreas são uma grelha que embrulha — ícone com o nome por baixo, 64 de largura, nada escondido', () => {
    expect(bloco).not.toMatch(/<ScrollView/);
    expect(bloco).toMatch(/flexDirection: 'row', flexWrap: 'wrap'/);
    expect(doc).toMatch(/const LARGURA_DA_AREA = 64;/);
    expect(bloco).toMatch(/width: LARGURA_DA_AREA, minHeight: 44/);
    expect(bloco).toMatch(/width: 44, height: 44, borderRadius: R\.row/);
    expect(bloco).toMatch(/rotulo="Tudo" on=\{!area\}/);
    expect(bloco).toMatch(/icone=\{ICONE_DA_AREA\[a\] \|\| 'fileText'\}/);
    expect(bloco).toMatch(/label=\{`Mostrar só \$\{a\}`\}/);
    expect(bloco).toMatch(/numberOfLines=\{2\}/);
    // Os ícones são os do rodapé — o mesmo significado, o mesmo desenho.
    expect(doc).toMatch(/Tarefas: 'checkSquare', Agenda: 'calendar', Compras: 'fileDone', Dinheiro: 'wallet'/);
  });

  it('sem cartão à volta, sem os rótulos «Quem» e «Onde»', () => {
    expect(bloco).not.toMatch(/<Card\b/);
    expect(bloco).not.toMatch(/<Label\b/);
    expect(bloco).not.toMatch(/"Quem"|"Onde"/);
    // E continua a não aparecer quando não há por onde escolher.
    expect(bloco).toMatch(/if \(quemHa\.length <= 1 && areasHa\.length <= 1\) return null;/);
  });
});
