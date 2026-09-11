/**
 * As prendas: um artigo «só os adultos», que a criança não recebe — e a lista
 * de compras no modo criança, com «Pedir um artigo».
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 11/09/2026 — o dono da casa: «prendas com visibilidade». A lista é de todos,
 * e «prenda de anos do Léo» aparecia ao Léo. Pelo caminho viu-se que a app da
 * criança NÃO TINHA lista nenhuma, embora a documentação prometesse «as
 * crianças também pedem artigos» — a prenda só faz sentido se a criança tiver
 * a lista. Passou a ter.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. O campo `visibilidade` nasce nos DOIS sítios do servidor, e a regra de
 *      leitura dos `artigos` filtra-o lá (INVARIANTE #3). A regra do
 *      `criar-colecoes` e a da tabela `REGRAS` dizem o mesmo, letra a letra.
 *   2. O artigo tem `vis` na loja, na semente e no que o servidor monta — a
 *      prova «o artigo tem a forma da loja» confere os três lados sozinha.
 *   3. As folhas dos adultos oferecem «Quem vê»; a linha diz «Só adultos».
 *   4. A app da criança tem o separador Compras: mostra a lista SEM preços e
 *      SEM prendas, e «Pedir um artigo» cria um artigo `familia` com o nome
 *      dela, pela loja.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider, useStore } = require('../src/store');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const KidApp = require('../src/KidApp').default;

const comMargens = (filho) => React.createElement(SafeAreaProvider,
  { initialMetrics: { frame: { x: 0, y: 0, width: 412, height: 915 },
                      insets: { top: 47, left: 0, right: 0, bottom: 34 } } }, filho);

const junta = (n) => {
  if (n === null || n === undefined || n === false) return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(junta).join(' ');
  return junta(n.children || (n.props && n.props.children) || null);
};

const kidCom = (tab) => {
  let r = null, api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    r = TestRenderer.create(comMargens(React.createElement(StoreProvider, null,
      React.createElement(React.Fragment, null,
        React.createElement(Sonda),
        React.createElement(KidApp, { kid: 'Léo', kidTab: tab, setKidTab: () => {}, onLogout: () => {} })))));
  });
  return { r, loja: () => api, texto: () => junta(r.toJSON()) };
};

const hospedeiro = (r, label) => r.root.findAll(n => typeof n.type === 'string'
  && n.props && n.props.accessibilityLabel === label).pop();
const tocar = (r, label) => {
  const alvo = hospedeiro(r, label);
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  TestRenderer.act(() => { (alvo.props.onPress || alvo.props.onClick)(); });
};

// A regra de leitura, tal como o `criar-colecoes.mjs` a escreve.
const REGRA_DE_LEITURA = 'casa = @request.auth.casa && (visibilidade != "adultos" || @request.auth.papel != "crianca")';

describe('⚠ as prendas: só os adultos as veem', () => {
  it('o campo nasce nos DOIS sítios, e a regra de leitura filtra-o no servidor', () => {
    const cria = ler('db/pocketbase/criar-colecoes.mjs');
    const acresc = ler('db/pocketbase/acrescentar-campos.mjs');
    expect(cria).toMatch(/sel\('visibilidade', \['familia', 'adultos'\]\)/);
    expect(acresc).toMatch(/\['artigos', 'visibilidade', \{ type: 'select', values: \['familia', 'adultos'\], maxSelect: 1 \}\]/);
    // A regra, nos dois: a do criar-colecoes com as constantes, a da tabela também.
    expect(cria).toMatch(/listRule: `\$\{DA_CASA\} && \(visibilidade != "adultos" \|\| \$\{ADULTO\}\)`/);
    expect(cria).toMatch(/viewRule: `\$\{DA_CASA\} && \(visibilidade != "adultos" \|\| \$\{ADULTO\}\)`/);
    const i = acresc.indexOf("['artigos', {");
    expect(i).toBeGreaterThan(0);
    const bloco = acresc.slice(i, acresc.indexOf('}],', i));
    expect(bloco).toMatch(/listRule: `\$\{DA_CASA\} && \(visibilidade != "adultos" \|\| \$\{ADULTO\}\)`/);
    expect(bloco).toMatch(/viewRule: `\$\{DA_CASA\} && \(visibilidade != "adultos" \|\| \$\{ADULTO\}\)`/);
    // E as constantes da tabela são as do criar-colecoes — senão «letra a letra» é conversa.
    expect(acresc).toMatch(/const DA_CASA = 'casa = @request\.auth\.casa';/);
    expect(acresc).toMatch(/const ADULTO = '@request\.auth\.papel != "crianca"';/);
    expect(cria).toMatch(/const DA_CASA = 'casa = @request\.auth\.casa';/);
    expect(cria).toMatch(/const ADULTO = '@request\.auth\.papel != "crianca"';/);
    // A regra montada é esta, e é a que as provas do servidor atacam.
    expect(`casa = @request.auth.casa && (visibilidade != "adultos" || @request.auth.papel != "crianca")`).toBe(REGRA_DE_LEITURA);
  });

  it('a tabela REGRAS do acrescentar-campos tem também a regra das tarefas feitas — as duas que mudaram depois da base', () => {
    const acresc = ler('db/pocketbase/acrescentar-campos.mjs');
    expect(acresc).toMatch(/\['tarefas_feitas', \{\s*deleteRule:/);
    expect(acresc).toMatch(/for \(const \[nome, regras\] of REGRAS\)/);
    // E lê-as de volta, como faz aos campos.
    expect(acresc).toMatch(/não ficou como a tabela diz/);
  });

  it('a tradução do servidor traz `vis`, e a escrita manda `visibilidade` — a criar e a alterar', () => {
    const sync = semComentarios(ler('src/sync.js'));
    expect(sync).toMatch(/vis: a\.visibilidade === 'adultos' \? 'adultos' : 'familia',/);
    expect(sync).toMatch(/visibilidade: visibilidade === 'adultos' \? 'adultos' : 'familia',/);
    expect(sync).toMatch(/campos\.visibilidade !== undefined/);
    const store = semComentarios(ler('src/store.jsx'));
    expect(store).toMatch(/const criarArtigo = \(\{ label, section, est, staple, by, vis \}\)/);
    expect(store).toMatch(/mudanca\.vis !== undefined \? \{ visibilidade: mudanca\.vis \}/);
  });

  it('as folhas dos adultos oferecem «Quem vê», e a linha das Compras diz «Só adultos»', () => {
    for (const f of ['src/sheets/NovoArtigo.jsx', 'src/sheets/GerirArtigo.jsx']) {
      const txt = semComentarios(ler(f));
      expect(txt).toMatch(/label="A casa toda"/);
      expect(txt).toMatch(/label="Só os adultos"/);
      expect(txt).toMatch(/vis: 'adultos'/);
    }
    expect(semComentarios(ler('src/screens/Compras.jsx'))).toMatch(/i\.vis === 'adultos' \? \(\s*<Pill label="Só adultos"/);
  });

  it('a semente tem uma prenda «adultos» — para a app da criança se provar sem servidor', () => {
    const { ITEMS } = require('../src/data');
    const prendas = ITEMS.filter(i => i.vis === 'adultos');
    expect(prendas).toHaveLength(1);
    expect(prendas[0].label).toMatch(/Prenda/);
  });
});

describe('⚠ a lista de compras no modo criança', () => {
  it('há um separador Compras, e a criança pede artigos pela loja', () => {
    const kid = semComentarios(ler('src/KidApp.jsx'));
    expect(kid).toMatch(/\{ key: 'compras', label: 'Compras', icon: 'storefront' \}/);
    expect(kid).toMatch(/criarArtigo\(\{ label: rotulo, section: seccao \|\| seccoes\[0\], est: 0, staple: false, by: kid, vis: 'familia' \}\)/);
    // E não escreve `newItems` por fora da loja (classe 37).
    expect(kid).not.toMatch(/newItems:/);
  });

  it('mostra a lista sem a prenda e sem preços', () => {
    const { r, texto, loja } = kidCom('compras');
    const tx = texto();
    expect(tx).toContain('Pedir um artigo');
    expect(tx).toContain('Leite meio-gordo');
    expect(tx).not.toMatch(/Prenda de anos/);
    // Nenhum euro na LISTA: o modo criança não mostra orçamento. O cabeçalho
    // diz «12,40 € no cofre», que é dinheiro da criança e não da casa — por
    // isso mede-se só o que vem depois do botão e antes do rodapé.
    const lista = tx.split('Pedir um artigo')[1].split('Tarefas')[0];
    expect(lista).toContain('Leite meio-gordo');
    expect(lista).not.toMatch(/€/);
    // E a prenda EXISTE na loja: é o ecrã da criança que a não mostra sem servidor.
    expect(loja().allItems().some(i => i.vis === 'adultos')).toBe(true);
    expect(hospedeiro(r, 'Pedir um artigo')).toBeTruthy();
  });

  it('«Pedir um artigo» abre a folha, e pedir cria o artigo com o nome da criança e «familia»', () => {
    const { r, texto, loja } = kidCom('compras');
    tocar(r, 'Pedir um artigo');
    expect(texto()).toContain('Corredor');
    const campo = r.root.findAll(n => typeof n.type === 'string' && n.props && n.props.accessibilityLabel === 'Nome do artigo').pop();
    TestRenderer.act(() => { campo.props.onChangeText('Iogurtes de morango'); });
    tocar(r, 'Pedir');
    const novo = loja().s.newItems.find(i => i.label === 'Iogurtes de morango');
    expect(novo).toBeTruthy();
    expect(novo.by).toBe('Léo');
    expect(novo.vis).toBe('familia');
    expect(texto()).toContain('Iogurtes de morango');
  });

  it('a linha da criança não tem alvo abaixo de 44 e o rodapé tem três separadores', () => {
    const { r } = kidCom('compras');
    const abas = r.root.findAll(n => typeof n.type === 'string' && n.props && n.props.accessibilityRole === 'tab');
    expect(abas.map(a => a.props.accessibilityLabel)).toEqual(['Tarefas', 'Compras', 'O Meu Cofre']);
  });
});
