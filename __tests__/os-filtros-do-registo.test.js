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

  // 14/09/2026: a fila que rolava cortava a última pastilha («há um botão
  // escondido»); a grelha com nomes embrulhava («não gosto de estar em 2
  // linhas»). Fica UMA linha de ícones de 44 a repartir a largura, sem «Tudo»
  // (tocar outra vez desfaz), e o nome da área escolhida no título da secção.
  it('as áreas são uma linha só de ícones de 44, a repartir a largura, e o nome da escolhida vai para o título', () => {
    expect(bloco).not.toMatch(/<ScrollView/);
    expect(bloco).not.toMatch(/Tudo/);
    expect(bloco).toMatch(/flex: 1, minWidth: 44, height: 44, borderRadius: R\.row/);
    expect(bloco).toMatch(/onPress=\{\(\) => mudarArea\(on \? null : a\)\}/);
    expect(bloco).toMatch(/accessibilityLabel=\{on \? `Deixar de mostrar só \$\{a\}` : `Mostrar só \$\{a\}`\}/);
    expect(bloco).toMatch(/<Icon name=\{ICONE_DA_AREA\[a\] \|\| 'fileText'\} size=\{20\}/);
    expect(bloco).not.toMatch(/fontSize/);   // só ícones — o nome está no título
    expect(doc).toMatch(/\{\['Histórico da Casa', filtroQuem, filtroArea\]\.filter\(Boolean\)\.join\(' · '\)\}/);
    // Os ícones são os do rodapé e dos cabeçalhos — e nenhum se repete na fila:
    // a Gestão leva `sliders` (o do cabeçalho dela), não o `houseGear` dos Equipamentos.
    expect(doc).toMatch(/Tarefas: 'checkSquare', Agenda: 'calendar', Compras: 'fileDone', Dinheiro: 'wallet'/);
    expect(doc).toMatch(/'Gestão da Casa': 'sliders'/);
    const j = doc.indexOf('const ICONE_DA_AREA = {');
    const mapa = doc.slice(j, doc.indexOf('};', j));
    const nomes = [...mapa.matchAll(/: '(\w+)'/g)].map(m => m[1]);
    expect(nomes.length).toBeGreaterThanOrEqual(8);
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it('sem cartão à volta, sem os rótulos «Quem» e «Onde»', () => {
    expect(bloco).not.toMatch(/<Card\b/);
    expect(bloco).not.toMatch(/<Label\b/);
    expect(bloco).not.toMatch(/"Quem"|"Onde"/);
    // E continua a não aparecer quando não há por onde escolher.
    expect(bloco).toMatch(/if \(quemHa\.length <= 1 && areasHa\.length <= 1\) return null;/);
  });
});
