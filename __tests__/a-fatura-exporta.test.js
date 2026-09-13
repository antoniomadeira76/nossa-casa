/**
 * A ficha do equipamento: «Agendar» e «Exportar» lado a lado, e a fatura sai.
 *
 * 13/09/2026, o dono da casa: «botões lado a lado (agendar e exportar) em
 * todos os ecrãs que tiverem estes dois». Era a única ficha com os dois em
 * coluna — e o «Exportar Fatura» tinha `onPress={() => {}}`: prometia e não
 * fazia. Agora sai um PDF pelo molde da app, com a fotografia da fatura.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');

jest.mock('../src/pocketbase', () => ({
  estaLigado: () => false,
  auth: { valida: () => false, membro: () => null },
  ler: {},
  google: { disponivel: () => false, porLigar: () => false, verificar: async () => false },
}));

const { documentoDaFatura, nomeDoFicheiroDaFatura } = require('../src/exportar-equipamento');
const { StoreProvider } = require('../src/store');
const { buildTheme } = require('../src/theme');
const FichaEquipamento = require('../src/sheets/FichaEquipamento').default;

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const T = buildTheme(1, false);
const EQUIP = { id: 'q1', name: 'Frigorífico', cat: 'Eletrodomésticos', price: 899, bought: '02/10/2024', warrantyEnd: '02/10/2026', fatura: 'file:///fatura.jpg' };

describe('⚠ o documento da fatura', () => {
  it('sai pelo molde da app, com o equipamento, a garantia e a imagem', () => {
    const html = documentoDaFatura({ equip: EQUIP, estado: { titulo: 'Em Garantia', linha: 'Faltam 20 dias.' },
      imagem: 'data:image/png;base64,AAAA', casa: 'Madeira', hoje: 'd2026-09-13', quemImprime: 'António' });
    expect(html).toMatch(/<h2>Equipamento<\/h2>/);
    expect(html).toMatch(/<h2>Fatura<\/h2>/);
    expect(html).toMatch(/<strong>Preço de compra<\/strong><span class="dir">899,00/);
    expect(html).toMatch(/Em Garantia — Faltam 20 dias\./);
    expect(html).toMatch(/<figure class="anexo"><img src="data:image\/png;base64,AAAA"/);
    expect(html).toMatch(/Impresso por António/);
  });
  it('sem imagem diz-o em vez de deixar uma moldura vazia; o nome do ficheiro é limpo', () => {
    const html = documentoDaFatura({ equip: EQUIP, imagem: null, casa: 'Madeira', hoje: 'd2026-09-13' });
    expect(html).toMatch(/Sem fotografia da fatura nesta ficha\./);
    expect(html).not.toMatch(/<img/);
    expect(nomeDoFicheiroDaFatura(EQUIP, 'd2026-09-13')).toBe('fatura-frigorifico-2026-09-13.pdf');
  });
});

describe('⚠ a ficha: os dois botões lado a lado, e nenhum morto', () => {
  it('«Agendar Manutenção» e «Exportar Fatura» vivem na mesma fila; «Remover» fica sozinho por baixo', () => {
    let r = null;
    TestRenderer.act(() => {
      r = TestRenderer.create(React.createElement(SafeAreaProvider,
        { initialMetrics: { frame: { x: 0, y: 0, width: 412, height: 915 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } } },
        React.createElement(StoreProvider, null,
          React.createElement(FichaEquipamento, { t: T, equip: EQUIP, user: 'Rita', onClose: () => {} }))));
    });
    const botao = (label) => r.root.findAll(n => typeof n.type === 'string' && n.props && n.props.accessibilityLabel === label)[0];
    const agendar = botao('Agendar Manutenção');
    const exportar = botao('Exportar Fatura');
    expect(agendar).toBeTruthy();
    expect(exportar).toBeTruthy();
    // Há um View em linha (`flexDirection: 'row'`) que contém os DOIS e não
    // contém o «Remover».
    const rotulosDentro = (no) => no.findAll(n => typeof n.type === 'string' && n.props && typeof n.props.accessibilityLabel === 'string')
      .map(n => n.props.accessibilityLabel);
    const filas = r.root.findAll(n => n.type === 'View' && n.props && n.props.style
      && [].concat(n.props.style).filter(s => s && typeof s === 'object').some(s => s.flexDirection === 'row'));
    const fila = filas.find(f => { const d = rotulosDentro(f); return d.includes('Agendar Manutenção') && d.includes('Exportar Fatura'); });
    expect(fila).toBeTruthy();
    expect(rotulosDentro(fila)).not.toContain('Remover Equipamento');
    // Com fatura, «Exportar Fatura» está ativo.
    expect(exportar.props.accessibilityState.disabled).toBe(false);
  });
  // 13/09/2026: ao exportar, o dono da casa viu «O navegador bloqueou a janela
  // de impressão». O PDF na web fazia-se numa janela NOVA (`window.open`), e os
  // bloqueadores travam-na. Passou a um `iframe` escondido na própria página,
  // que se imprime a si próprio; o `window.open` fica só como recurso, depois.
  it('na web o PDF imprime-se num iframe da própria página, não numa janela nova', () => {
    const entrega = semComentarios(ler('src/guardar-ficheiro.js'));
    const moldura = entrega.indexOf("createElement('iframe')");
    const janela = entrega.indexOf('window.open(');
    expect(moldura).toBeGreaterThan(-1);
    expect(entrega).toMatch(/\.srcdoc = html/);
    expect(entrega).toMatch(/contentWindow/);
    expect(janela === -1 || moldura < janela).toBe(true);
  });
  it('o ficheiro já não tem o `onPress={() => {}}`, e o Equipamentos passa o `user` para o carimbo', () => {
    const ficha = semComentarios(ler('src/sheets/FichaEquipamento.jsx'));
    expect(ficha).not.toMatch(/onPress=\{\(\) => \{\}\}/);
    expect(ficha).toMatch(/guardarPDF\(nomeDoFicheiroDaFatura\(equip, TODAY_KEY\), html\)/);
    expect(semComentarios(ler('src/screens/Equipamentos.jsx'))).toMatch(/<FichaEquipamento t=\{t\} equip=\{[^}]+\} user=\{user\}/);
  });
});
