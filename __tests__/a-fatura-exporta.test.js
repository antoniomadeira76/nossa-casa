/**
 * A ficha do equipamento: «Agendar» e «Exportar» lado a lado, e a fatura sai.
 *
 * 13/09/2026, o dono da casa: «botões lado a lado (agendar e exportar) em
 * todos os ecrãs que tiverem estes dois». Era a única ficha com os dois em
 * coluna — e o «Exportar fatura» tinha `onPress={() => {}}`: prometia e não
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

// ⚠ 13/09/2026, os testes de importação e exportação na casa simulada: a
// fotografia escolhia-se, a ficha dizia «Guardada», o servidor ficava com a
// `fatura` vazia — e ao recarregar a página o `blob:` estava morto. As
// fotografias nunca subiam; ficavam num telemóvel só.
describe('⚠ a fotografia do equipamento sobe ao servidor, e diz onde está', () => {
  const { useStore } = require('../src/store');
  const montarLoja = () => {
    let api = null;
    const Sonda = () => { api = useStore(); return null; };
    TestRenderer.act(() => { TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda))); });
    return () => api;
  };

  it('a leitura traz o URL assinado da fatura e da foto, e a escrita vai à parte, com ficheiro', () => {
    const sync = semComentarios(ler('src/sync.js'));
    expect(sync).toMatch(/fatura: servidor\.ler\.ficheiro\(e, 'fatura'\)/);
    expect(sync).toMatch(/foto: servidor\.ler\.ficheiro\(e, 'foto'\)/);
    expect(sync).toMatch(/export async function fotografiaDoEquipamento\(idNoServidor, campo/);
    expect(sync).toMatch(/atualizarComFicheiro\('equipamentos', idNoServidor/);
    // A nota que dizia «a app ainda não tem onde escolher a fotografia» saiu:
    // era falsa desde a ficha do equipamento.
    expect(ler('src/sync.js')).not.toMatch(/ficam por usar/);
    expect(ler('src/store.jsx')).not.toMatch(/ficam por usar/);
  });

  it('a loja guarda a fotografia no aparelho PRIMEIRO, marcada «por subir», e a ficha di-lo', () => {
    const loja = montarLoja();
    const equip = loja().allEquip()[0];
    expect(equip).toBeTruthy();
    TestRenderer.act(() => { loja().editEquip(equip.id, { fatura: 'blob:fatura-local' }); });
    const depois = loja().allEquip().find(e => e.id === equip.id);
    expect(depois.fatura).toBe('blob:fatura-local');
    expect(depois.faturaPorSubir).toBe(true);   // sem servidor nas provas, fica por subir
    expect(depois.fotoPorSubir).toBeUndefined();

    let r = null;
    TestRenderer.act(() => {
      r = TestRenderer.create(React.createElement(SafeAreaProvider,
        { initialMetrics: { frame: { x: 0, y: 0, width: 412, height: 915 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } } },
        React.createElement(StoreProvider, null,
          React.createElement(FichaEquipamento, { t: T, equip: { ...EQUIP, faturaPorSubir: true }, user: 'Rita', onClose: () => {} }))));
    });
    const textos = r.root.findAll(n => n.type === 'Text').map(n => [].concat(n.props.children).join(''));
    expect(textos).toContain('Só neste aparelho · por subir');
    // E a escrita das fotografias passa pelo `fotografiaDoEquipamento`, não
    // pelo `alterarEquipamento` dos campos de texto.
    const store = semComentarios(ler('src/store.jsx'));
    expect(store).toMatch(/sync\.fotografiaDoEquipamento\(noServidor, c, \{ uri: campos\[c\]/);
    expect(store).toMatch(/\[`\$\{c\}PorSubir`\]: false/);
  });

  // O mesmo defeito, no anexo de saúde: subia, mas o documento local ficava
  // sem `idServidor` e com o `blob:` como fotografia — e o PDF, depois de
  // recarregar, dizia «não pôde ser incluído» com a imagem intacta no servidor.
  it('o anexo de saúde, depois de subir, aponta para o servidor: `idServidor` e o URL do ficheiro', () => {
    const store = semComentarios(ler('src/store.jsx'));
    const i = store.indexOf('sync.anexoDeSaude({');
    const bloco = store.slice(i, store.indexOf('.catch(() => {});', i));
    expect(bloco).toMatch(/\.then\(\(r\) => set\(/);
    expect(bloco).toMatch(/idServidor: r\.id/);
    expect(bloco).toMatch(/foto: sync\.urlDoFicheiro\(r, 'ficheiro'\)/);
    expect(semComentarios(ler('src/sync.js'))).toMatch(/export const urlDoFicheiro = \(registo, campo\) => servidor\.ler\.ficheiro\(registo, campo\);/);
  });
});

describe('⚠ a ficha: os dois botões lado a lado, e nenhum morto', () => {
  it('«Agendar manutenção» e «Exportar fatura» vivem na mesma fila; «Remover» fica sozinho por baixo', () => {
    let r = null;
    TestRenderer.act(() => {
      r = TestRenderer.create(React.createElement(SafeAreaProvider,
        { initialMetrics: { frame: { x: 0, y: 0, width: 412, height: 915 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } } },
        React.createElement(StoreProvider, null,
          React.createElement(FichaEquipamento, { t: T, equip: EQUIP, user: 'Rita', onClose: () => {} }))));
    });
    const botao = (label) => r.root.findAll(n => typeof n.type === 'string' && n.props && n.props.accessibilityLabel === label)[0];
    const agendar = botao('Agendar manutenção');
    const exportar = botao('Exportar fatura');
    expect(agendar).toBeTruthy();
    expect(exportar).toBeTruthy();
    // Há um View em linha (`flexDirection: 'row'`) que contém os DOIS e não
    // contém o «Remover».
    const rotulosDentro = (no) => no.findAll(n => typeof n.type === 'string' && n.props && typeof n.props.accessibilityLabel === 'string')
      .map(n => n.props.accessibilityLabel);
    const filas = r.root.findAll(n => n.type === 'View' && n.props && n.props.style
      && [].concat(n.props.style).filter(s => s && typeof s === 'object').some(s => s.flexDirection === 'row'));
    const fila = filas.find(f => { const d = rotulosDentro(f); return d.includes('Agendar manutenção') && d.includes('Exportar fatura'); });
    expect(fila).toBeTruthy();
    expect(rotulosDentro(fila)).not.toContain('Remover equipamento');
    // Com fatura, «Exportar fatura» está ativo.
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
