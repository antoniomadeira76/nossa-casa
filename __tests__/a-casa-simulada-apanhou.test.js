/**
 * O que a casa SIMULADA apanhou — 13/09/2026.
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * «Testa a app toda, simula o que tiveres de simular.» Um PocketBase
 * temporário, uma casa cheia e difícil (`npm run simular:casa`: cinco membros,
 * um nome longo, sete envelopes, oito corredores, três meses, 68 despesas) e o
 * percurso de todos os ecrãs no navegador. O que a casa de demonstração, com
 * quatro de tudo, nunca mostrava:
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. Uma base criada DO ZERO tem os mesmos campos que a tabela do
 *      `acrescentar-campos.mjs` põe numa base a andar — o avatar e a figura
 *      dos membros nasciam só na tabela.
 *   2. Toda a coleção que o `criar-colecoes.mjs` cria está na lista NOSSAS —
 *      senão correr o ficheiro pela segunda vez tropeça em «name exists».
 *   3. O Modo Compras com mais de cinco corredores rola a fila dos separadores
 *      em vez de os esmagar abaixo dos 44 (INVARIANTE #5).
 *   4. Na Saúde, as pastilhas de filtro por membro e «Adicionar receita» têm
 *      alvo de 44.
 *   5. «Reforçar» escolhe o envelope apertado como destino; a folha «Abrir Mês»
 *      mostra o limite que vai ficar, não o ajuste.
 *   6. O subtítulo das Compras conta os adultos da casa em vez de dizer «2».
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { ScrollView } = require('react-native');
const { SafeAreaProvider } = require('react-native-safe-area-context');

jest.mock('../src/pocketbase', () => ({
  estaLigado: () => false,
  auth: { valida: () => false, membro: () => null },
  ler: {},
  google: { disponivel: () => false, porLigar: () => false, verificar: async () => false },
}));

const { StoreProvider, useStore } = require('../src/store');
const { buildTheme } = require('../src/theme');
const { EUR } = require('../src/format');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const Dinheiro = require('../src/screens/Dinheiro').default;
const ModoCompras = require('../src/screens/ModoCompras').default;

const comMargens = (filho) => React.createElement(SafeAreaProvider,
  { initialMetrics: { frame: { x: 0, y: 0, width: 412, height: 915 },
                      insets: { top: 47, left: 0, right: 0, bottom: 34 } } }, filho);
const junta = (n) => {
  if (n === null || n === undefined || n === false) return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(junta).join(' ');
  return junta(n.children || (n.props && n.props.children) || null);
};
const montar = (Ecra, props, patch) => {
  let r = null, api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    r = TestRenderer.create(comMargens(React.createElement(StoreProvider, null,
      React.createElement(React.Fragment, null,
        React.createElement(Sonda),
        React.createElement(Ecra, props)))));
  });
  if (patch) TestRenderer.act(() => { api.set(patch); });
  return { r, loja: () => api, texto: () => junta(r.toJSON()) };
};
const T = buildTheme(1, false);
const nada = () => {};
const hospedeiro = (r, label) => r.root.findAll(n => typeof n.type === 'string' && n.props
  && typeof n.props.accessibilityLabel === 'string'
  && (n.props.accessibilityLabel === label || n.props.accessibilityLabel.startsWith(`${label} — `))).pop();
const tocar = (r, label) => {
  const alvo = hospedeiro(r, label);
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  TestRenderer.act(() => { (alvo.props.onPress || alvo.props.onClick)(); });
};
const estiloDe = (no) => [].concat(no.props.style).filter(Boolean)
  .reduce((a, s) => ({ ...a, ...(typeof s === 'function' ? s({ pressed: false }) : s) }), {});

describe('⚠ 1. e 2. a base do zero e a lista de apagamento', () => {
  const cria = ler('db/pocketbase/criar-colecoes.mjs');

  it('os `membros` nascem com `avatar` e `figura` no criar-colecoes, como na tabela de campos', () => {
    const i = cria.indexOf("name: 'membros', type: 'auth'");
    const bloco = cria.slice(i, cria.indexOf('indexes:', i));
    expect(bloco).toMatch(/txt\('avatar', \{ max: 500 \}\)/);
    expect(bloco).toMatch(/txt\('figura', \{ max: 24 \}\)/);
    const campos = ler('db/pocketbase/acrescentar-campos.mjs');
    expect(campos).toMatch(/\['membros', 'avatar', \{ type: 'text', max: 500 \}\]/);
    expect(campos).toMatch(/\['membros', 'figura', \{ type: 'text', max: 24 \}\]/);
  });

  it('⚠ toda a coleção criada está na NOSSAS — a segunda corrida não tropeça em «name exists»', () => {
    const i = cria.indexOf('const NOSSAS = [');
    const nossas = [...cria.slice(i, cria.indexOf('];', i)).matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
    const criadas = [...cria.matchAll(/^  name: '([a-z_]+)'/gm)].map(m => m[1])
      .concat(['categorias_equip', 'especialidades']);
    expect(criadas.length).toBeGreaterThan(30);
    expect(criadas.filter(c => !nossas.includes(c))).toEqual([]);
  });

  // ⚠ 13/09/2026, os testes de importação e exportação: as provas da agenda da
  // Google rebentavam num servidor de simulação com «Missing or invalid
  // collection context» — a `credenciais_agenda` nasce num ficheiro PRÓPRIO
  // (o `criar-colecoes` só a preserva), e esse ficheiro não estava em cadeia
  // nenhuma: uma base do zero ficava sem ela, e ligar a agenda falhava. E lia
  // as credenciais só do `process.env`, ao contrário dos irmãos.
  it('⚠ a `credenciais_agenda` nasce com a base do zero — o `db:colecoes` corre o ficheiro dela, e ele lê o ambiente como os outros', () => {
    const scripts = JSON.parse(ler('package.json')).scripts;
    expect(scripts['db:colecoes']).toMatch(/criar-colecoes\.mjs && node db\/pocketbase\/criar-credenciais-agenda\.mjs/);
    const cred = ler('db/pocketbase/criar-credenciais-agenda.mjs');
    expect(cred).toMatch(/import \{ SUPERUTILIZADOR, SUPER_PALAVRA, URL_DO_SERVIDOR \} from '\.\/ambiente\.mjs'/);
    expect(cred).not.toMatch(/process\.env\.PB_ADMIN/);
    expect(cred).toMatch(/authWithPassword\(SUPERUTILIZADOR, SUPER_PALAVRA\)/);
    // E o criar-colecoes continua a PRESERVÁ-LA em vez de a apagar — é a
    // autorização de longa duração de uma conta Google, não se recria.
    expect(cria).toMatch(/\['membros', 'casas', 'credenciais_agenda', \.\.\.comDados\]/);
  });

  it('a regra de criar `meta_movimentos` é a mesma nos dois sítios', () => {
    expect(cria).toMatch(/createRule: `\$\{DA_CASA\} && \$\{ADMIN\} && meta\.casa = @request\.auth\.casa && \$\{daCasaTambem\('por'\)\}`/);
    const campos = ler('db/pocketbase/acrescentar-campos.mjs');
    expect(campos).toMatch(/meta\.casa = @request\.auth\.casa && \(por = "" \|\| por\.casa = @request\.auth\.casa\)/);
  });
});

describe('⚠ 3. o Modo Compras com muitos corredores', () => {
  const OITO = ['Frutas & Legumes', 'Frescos', 'Talho e peixaria', 'Mercearia', 'Congelados', 'Higiene e limpeza', 'Outros', 'constructor'];
  const modo = (seccoes) => montar(ModoCompras, { t: T, user: 'Rita', onClose: nada }, { seccoesDaCasa: seccoes });

  it('com oito corredores a fila dos separadores é um ScrollView horizontal e cada um tem 72 de mínimo', () => {
    const { r } = modo(OITO);
    const horizontais = r.root.findAllByType(ScrollView).filter(n => n.props.horizontal);
    expect(horizontais).toHaveLength(1);
    // Só os nós HOSPEDEIROS: o `Pressable` composto e o `View` que ele desenha
    // repetem as mesmas props, e contavam-se três por separador.
    const separadores = r.root.findAll(n => typeof n.type === 'string' && n.props && n.props.accessibilityRole === 'tab');
    expect(separadores).toHaveLength(9);
    for (const sep of separadores) {
      const e = estiloDe(sep);
      expect(e.minWidth).toBeGreaterThanOrEqual(72);
      expect(e.minHeight).toBeGreaterThanOrEqual(44);
    }
  });

  it('com quatro, como na demonstração, repartem a largura sem rolar', () => {
    const { r } = modo([]);
    expect(r.root.findAllByType(ScrollView).filter(n => n.props.horizontal)).toHaveLength(0);
    for (const sep of r.root.findAll(n => typeof n.type === 'string' && n.props && n.props.accessibilityRole === 'tab')) {
      expect(estiloDe(sep).flex).toBe(1);
    }
  });
});

describe('⚠ 4. os alvos da Saúde', () => {
  it('o filtro por membro é o MESMO componente das Tarefas, e «Adicionar receita» tem 44 de mínimo', () => {
    const saude = semComentarios(ler('src/screens/Saude.jsx'));
    // 13/09/2026, o dono da casa: «os filtros devem ser como o segundo print»
    // — as bolas das Tarefas. Um componente, dois ecrãs.
    expect(saude).toMatch(/<FiltroDeMembros t=\{t\} membros=\{membrosDaCasa\}/);
    expect(saude).not.toMatch(/corDoMembro\(member/);
    expect(semComentarios(ler('src/screens/Tarefas.jsx'))).toMatch(/<FiltroDeMembros t=\{t\} membros=\{membrosDaCasa\}/);
    const filtro = semComentarios(ler('src/FiltroDeMembros.jsx'));
    // A bola é um alvo de 52 × 44 com o nome por baixo (opção B de
    // design/nome-no-filtro.dc.html); o «Todos» continua a 44.
    expect(filtro).toMatch(/width: 52, minHeight: 44/);
    expect(filtro).toMatch(/numberOfLines=\{1\}/);
    // ⚠ O «Todos» era um RETÂNGULO de raio 6 com 14 de enchimento — o desenho
    // da `Choice` — à cabeça de uma fila de bolas. 15/09/2026, o dono da casa:
    // «implementa este ícone em todos os ecrãs que tenham ícone semelhante ou
    // igual ao segundo print», com o círculo num print e o retângulo no outro.
    // Passa a ter a geometria da bola: alvo de 44, anel de 2 com vão de 2, e um
    // disco de 32 de altura com os extremos redondos. O que se defende aqui é
    // que o alvo continua nos 44 e que o CANTO é redondo.
    expect(filtro).toMatch(/minHeight: 44, alignItems: 'center', justifyContent: 'center'/);
    // Um círculo de 40, com a largura a crescer só se a palavra não couber.
    expect(filtro).toMatch(/minWidth: 40, height: 40, borderRadius: R\.pill/);
    expect(filtro).not.toMatch(/borderRadius: R\.row/);
    // E a pesquisa por texto saiu (opção E de design/pesquisa-da-saude.dc.html).
    expect(saude).not.toMatch(/Procurar por especialidade/);
    expect(saude).not.toMatch(/searchText/);
    // O nome de quem se filtra vai para o título (opção A de nome-no-filtro).
    expect(saude).toMatch(/Precisa de ação · \$\{memberFilter\}/);
    const j = saude.indexOf('accessibilityLabel="Adicionar receita"');
    expect(j).toBeGreaterThan(0);
    expect(saude.slice(j, j + 400)).toMatch(/minHeight: 44/);
  });

  it('o título «Precisa de ação (n)» conta o que o filtro mostra, não a casa toda', () => {
    const saude = semComentarios(ler('src/screens/Saude.jsx'));
    expect(saude).toMatch(/Precisa de ação \(\$\{aDecidir\.length\}\)/);
    expect(saude).not.toMatch(/needsDecision\.length\}?\)/);
  });
});

describe('⚠ 5. o Dinheiro: «Reforçar» e «Abrir Mês»', () => {
  const casa = [
    { id: 'a', name: 'Mercearia', limit: 500, color: null },
    { id: 'b', name: 'Transportes', limit: 100, color: null },
    { id: 'c', name: 'Lazer', limit: 300, color: null },
  ];
  // Transportes está no limite: 96 de 100 gastos.
  const patch = { envelopesDaCasa: casa, gastoPorEnvelope: { Transportes: 96 }, roles: { Rita: 'admin' } };
  const dinheiro = () => montar(Dinheiro, { t: T, user: 'Rita', go: nada, onEquip: nada }, patch);

  it('«Reforçar o envelope Transportes» abre a folha com o Transportes como destino e o mais livre como origem', () => {
    const { r, texto } = dinheiro();
    tocar(r, 'Reforçar o envelope Transportes');
    expect(texto()).toMatch(/O limite de Mercearia passa a .* e o de Transportes a/);
  });

  it('«Abrir Mês» mostra o limite que vai ficar em cada envelope, não «0,00 €»', () => {
    const { r, texto } = dinheiro();
    // «Abrir Outubro» na casa real; na demonstração o mês aberto é outro — o
    // que interessa é a linha «Abrir <mês seguinte>», seja ele qual for.
    const rotulo = r.root.findAll(n => typeof n.type === 'string' && n.props
      && /^Abrir [A-Z]/.test(n.props.accessibilityLabel || '')).map(n => n.props.accessibilityLabel)[0];
    expect(rotulo).toBeTruthy();
    tocar(r, rotulo.split(' — ')[0]);
    const campos = r.root.findAll(n => n.props && n.props.accessibilityLabel === 'Valor' && typeof n.type === 'string');
    const valores = campos.map(c => c.props.value);
    expect(valores.some(v => /500,00/.test(String(v)))).toBe(true);
    expect(valores.some(v => /300,00/.test(String(v)))).toBe(true);
    expect(texto()).toContain(`${EUR(900)} distribuídos`);
  });
});

describe('⚠ 6. o subtítulo das Compras conta os adultos', () => {
  it('não diz «2 adultos» à mão', () => {
    const app = semComentarios(ler('App.jsx'));
    expect(app).not.toMatch(/partilhada com 2 adultos/);
    expect(app).toMatch(/nAdultos: Object\.values\(MEMBERS\)\.filter\(m => !m\.kid\)\.length/);
    expect(app).toMatch(/plural\(ctx\.nAdultos, 'adulto', 'adultos'\)/);
  });
});
