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

  it('as áreas são UMA fila que rola, com o ícone do rodapé, «Tudo» primeiro e a escolhida a seguir', () => {
    expect(bloco).toMatch(/<ScrollView horizontal showsHorizontalScrollIndicator=\{false\}/);
    expect(bloco).toMatch(/rotulo="Tudo" on=\{!area\}/);
    expect(bloco).toMatch(/\[area, \.\.\.areasHa\.filter\(a => a !== area\)\]/);
    expect(bloco).toMatch(/icone=\{ICONE_DA_AREA\[a\] \|\| 'fileText'\}/);
    expect(bloco).toMatch(/label=\{`Mostrar só \$\{a\}`\}/);
    expect(bloco).toMatch(/minHeight: 44/);
    // Os ícones são os do rodapé — o mesmo significado, o mesmo desenho.
    expect(doc).toMatch(/Tarefas: 'checkSquare', Agenda: 'calendar', Compras: 'fileDone', Dinheiro: 'wallet'/);
  });

  it('sem cartão à volta, sem os rótulos «Quem» e «Onde», sem pastilhas a embrulhar', () => {
    expect(bloco).not.toMatch(/<Card\b/);
    expect(bloco).not.toMatch(/<Label\b/);
    expect(bloco).not.toMatch(/flexWrap/);
    expect(bloco).not.toMatch(/"Quem"|"Onde"/);
    // E continua a não aparecer quando não há por onde escolher.
    expect(bloco).toMatch(/if \(quemHa\.length <= 1 && areasHa\.length <= 1\) return null;/);
  });
});
