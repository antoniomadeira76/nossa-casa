/**
 * As contas fixas — a renda, a luz, a internet — com prazo, e pagas com um toque.
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 12/09/2026, a quarta das dez funcionalidades. Secção «Contas Fixas» no
 * Dinheiro; cada conta aparece na Agenda no dia em que vence e no «Precisa de
 * Si» dois dias antes; «Marcar como paga» regista a despesa no envelope.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 *   1. A coleção nasce nos DOIS sítios do servidor, ancorada ao envelope e a
 *      quem paga; a despesa ganha `conta_fixa`, ancorado, nos dois sítios.
 *   2. «Paga» NÃO é um campo: é a despesa do mês com a conta a apontar
 *      (INVARIANTE #2). Pagar regista uma despesa normal — o gasto mexe —, a
 *      segunda do mês é recusada, e a chave do mês é a que colide no servidor.
 *   3. O vencimento respeita o mês (o dia 31 vence a 30 de setembro); o que
 *      vence em dois dias entra no «Precisa de Si»; a Agenda mostra a conta no
 *      dia e não a deixa editar; a criança não vê nada disto.
 *   4. Nenhum ecrã escreve as chaves por fora da loja (classe 37).
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');

// A Agenda importa a folha do evento, que importa o SDK do PocketBase — ESM,
// que o Jest não carrega. O mesmo simulacro que os outros ecrãs usam.
jest.mock('../src/pocketbase', () => ({
  estaLigado: () => false,
  auth: { valida: () => false, membro: () => null },
  ler: {},
  google: { disponivel: () => false, porLigar: () => false, verificar: async () => false },
}));
const { StoreProvider, useStore } = require('../src/store');
const { buildTheme } = require('../src/theme');
const { TODAY, TODAY_KEY, EUR, dkey } = require('../src/format');
const { estadoDaConta, totalDasContas } = require('../src/contas-fixas');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');
const Dinheiro = require('../src/screens/Dinheiro').default;
const Inicio = require('../src/screens/Inicio').default;
const Agenda = require('../src/screens/Agenda').default;
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
const montar = (Ecra, props, patch) => {
  let r = null, api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    r = TestRenderer.create(comMargens(React.createElement(StoreProvider, null,
      React.createElement(React.Fragment, null,
        React.createElement(Sonda),
        React.createElement(Ecra, props)))));
  });
  if (patch) TestRenderer.act(() => { api.set(typeof patch === 'function' ? patch(api) : patch); });
  return { r, loja: () => api, texto: () => junta(r.toJSON()) };
};
const T = buildTheme(1, false);
const dinheiro = (patch) => montar(Dinheiro, { t: T, user: 'Rita', go: () => {}, onEquip: () => {} }, patch);
// Pelo rótulo exacto, ou pelo INÍCIO dele: o `Primary` lê «rótulo — consequência»
// em voz, e o botão de marcar como paga tem a consequência atrás do nome.
const hospedeiro = (r, label) => r.root.findAll(n => typeof n.type === 'string' && n.props
  && typeof n.props.accessibilityLabel === 'string'
  && (n.props.accessibilityLabel === label || n.props.accessibilityLabel.startsWith(`${label} — `))).pop();
const tocar = (r, label) => {
  const alvo = hospedeiro(r, label);
  if (!alvo) throw new Error(`Sem alvo «${label}»`);
  TestRenderer.act(() => { (alvo.props.onPress || alvo.props.onClick)(); });
};

// O «hoje» das provas é 20/08/2026 (jest.setup.js). As contas fazem-se em
// função dele, e não de dias escritos à mão.
const ENV = 'Casa & contas';
const conta = (id, nome, valor, dia, extra = {}) => ({ id, idServidor: null, nome, valor, dia, envelope: ENV, quemPaga: null, ...extra });
const RENDA = conta('cf-renda', 'Renda', 850, 1);
const EDP = conta('cf-edp', 'EDP', 62.4, TODAY.d + 2);         // vence em 2 dias
const NET = conta('cf-net', 'Internet', 34.99, 28, { quemPaga: 'Tomás' });

describe('⚠ as contas fixas: o servidor', () => {
  it('a coleção nasce nos dois sítios, ancorada ao envelope e a quem paga; a despesa ganha `conta_fixa` ancorado', () => {
    const cria = ler('db/pocketbase/criar-colecoes.mjs');
    const acresc = ler('db/pocketbase/acrescentar-campos.mjs');
    for (const txt of [cria, acresc]) {
      expect(txt).toMatch(/CREATE UNIQUE INDEX idx_conta_fixa_por_casa ON contas_fixas \(casa, nome\)/);
      // As duas âncoras da conta. No `criar-colecoes` a regra está partida em
      // duas linhas, por isso procuram-se as âncoras e não a frase inteira.
      expect(txt).toMatch(/envelope\.casa = @request\.auth\.casa/);
      expect(txt).toMatch(/\(quem_paga = "" \|\| quem_paga\.casa = @request\.auth\.casa\)/);
      // A regra das despesas, letra a letra nos dois: a âncora da conta.
      expect(txt).toMatch(/\(conta_fixa = "" \|\| conta_fixa\.casa = @request\.auth\.casa\)/);
    }
    expect(cria).toMatch(/rel\('conta_fixa', ids\.contas_fixas\)/);
    expect(acresc).toMatch(/\['despesas', 'conta_fixa', \{ type: 'relation', alvo: 'contas_fixas', maxSelect: 1, cascadeDelete: false \}\]/);
    expect(acresc).toMatch(/\['despesas', \{\s*createRule:/);
    // A criança não lê: é orçamento.
    const i = cria.indexOf("name: 'contas_fixas'");
    expect(cria.slice(i, i + 1200)).toMatch(/listRule: `\$\{DA_CASA\} && \$\{ADULTO\}`/);
    expect(ler('src/pocketbase.js')).toMatch(/'contas_fixas',/);
    expect(JSON.parse(ler('package.json')).scripts['db:provar']).toMatch(/provar-contas-fixas\.mjs/);
    expect(fs.existsSync(path.join(RAIZ, 'db/pocketbase/provar-contas-fixas.mjs'))).toBe(true);
  });

  it('a leitura traduz por nome e tira os pagamentos das despesas; a escrita leva a conta e a chave do mês', () => {
    const sync = semComentarios(ler('src/sync.js'));
    expect(sync).toMatch(/export async function contaFixaDaCasa\(/);
    expect(sync).toMatch(/conta_fixa: contaFixa \|\| null/);
    expect(sync).toMatch(/idem_key: idemKey/);
    expect(sync).toMatch(/\.filter\(d => d\.conta_fixa && !d\.anula_id\)/);
    const loja = semComentarios(ler('src/store.jsx'));
    expect(loja).toMatch(/idemKey: idConta && mes \? `conta-fixa:\$\{idConta\}:\$\{mes\}` : null/);
    const sobe = ler('src/o-que-sobe.js');
    expect(sobe).toMatch(/contasFixas: \['linhas',[^\n]*'contaFixaDaCasa'\]/);
    expect(sobe).toMatch(/contasPagas: \['linhas',[^\n]*'contasPagas'\]/);
  });
});

describe('⚠ as contas fixas: a loja', () => {
  it('criar exige nome, valor, dia de 1 a 31 e um envelope da casa, e recusa o nome repetido', () => {
    const { loja } = dinheiro(null);
    expect(loja().criarContaFixa({ nome: '', valor: 10, dia: 1, envelope: ENV })).toMatch(/nome/);
    expect(loja().criarContaFixa({ nome: 'Luz', valor: 0, dia: 1, envelope: ENV })).toMatch(/valor/);
    expect(loja().criarContaFixa({ nome: 'Luz', valor: 10, dia: 32, envelope: ENV })).toMatch(/dia/);
    expect(loja().criarContaFixa({ nome: 'Luz', valor: 10, dia: 1.5, envelope: ENV })).toMatch(/dia/);
    expect(loja().criarContaFixa({ nome: 'Luz', valor: 10, dia: 1, envelope: 'Não existe' })).toMatch(/envelope/);
    expect(loja().criarContaFixa({ nome: 'Luz', valor: 10, dia: 1, envelope: ENV, quemPaga: 'Léo' })).toMatch(/adulto/);
    let r;
    TestRenderer.act(() => { r = loja().criarContaFixa({ nome: 'Luz', valor: '62,40', dia: 15, envelope: ENV, quemPaga: 'Tomás' }); });
    expect(r).toMatchObject({ id: expect.any(String) });
    expect(loja().s.contasFixas[0]).toMatchObject({ nome: 'Luz', valor: 62.4, dia: 15, envelope: ENV, quemPaga: 'Tomás' });
    expect(loja().criarContaFixa({ nome: 'luz', valor: 10, dia: 1, envelope: ENV })).toMatch(/Já existe/);
  });

  it('⚠ pagar regista uma despesa NORMAL — o gasto mexe — e a segunda do mês é recusada', () => {
    const { loja } = dinheiro({ contasFixas: [RENDA], contasPagas: [] });
    const antes = loja().s.registered;
    const gastoAntes = loja().envelopes.find(e => e.name === ENV).used;
    let msg;
    TestRenderer.act(() => { msg = loja().pagarContaFixa('cf-renda', 'Rita'); });
    expect(msg).toBeNull();
    expect(loja().s.registered).toBeCloseTo(antes + 850, 2);
    expect(loja().envelopes.find(e => e.name === ENV).used).toBeCloseTo(gastoAntes + 850, 2);
    const mes = `${TODAY.y}-${String(TODAY.m + 1).padStart(2, '0')}`;
    expect(loja().s.contasPagas).toEqual([{ conta: 'cf-renda', mes, dia: TODAY_KEY, valor: 850, por: 'Rita' }]);
    expect(loja().contasDoMes()[0].paga).toBe(true);
    // Segunda vez: recusada, e nada muda.
    TestRenderer.act(() => { msg = loja().pagarContaFixa('cf-renda', 'Rita'); });
    expect(msg).toMatch(/já está paga/);
    expect(loja().s.registered).toBeCloseTo(antes + 850, 2);
    expect(loja().s.contasPagas.length).toBe(1);
  });

  it('quem paga é quem a conta diz, ou quem marca; e o pagamento do servidor vale pelo id de lá', () => {
    const { loja } = dinheiro({ contasFixas: [NET, { ...RENDA, idServidor: 'srv-1' }], contasPagas: [] });
    TestRenderer.act(() => { loja().pagarContaFixa('cf-net', 'Rita'); });
    expect(loja().s.contasPagas[0].por).toBe('Tomás');
    // O pagamento que desce do servidor traz o id de lá — e conta.
    const mes = `${TODAY.y}-${String(TODAY.m + 1).padStart(2, '0')}`;
    TestRenderer.act(() => { loja().set({ contasPagas: [{ conta: 'srv-1', mes, dia: TODAY_KEY, valor: 850, por: 'Tomás' }] }); });
    expect(loja().contasDoMes().find(c => c.id === 'cf-renda').paga).toBe(true);
    expect(loja().contasDoMes().find(c => c.id === 'cf-net').paga).toBe(false);
  });

  it('por pagar primeiro, pelo dia; as pagas no fim — e o total é a soma do que se mostra', () => {
    const mes = `${TODAY.y}-${String(TODAY.m + 1).padStart(2, '0')}`;
    const { loja } = dinheiro({ contasFixas: [NET, RENDA, EDP], contasPagas: [{ conta: 'cf-renda', mes, dia: TODAY_KEY, valor: 850 }] });
    const lista = loja().contasDoMes();
    expect(lista.map(c => c.id)).toEqual(['cf-edp', 'cf-net', 'cf-renda']);
    expect(totalDasContas(lista)).toBeCloseTo(850 + 62.4 + 34.99, 2);
  });

  it('⚠ o vencimento respeita o mês: a conta do dia 31 vence a 30 de setembro, e a Agenda vê este mês e o seguinte', () => {
    const { loja } = dinheiro({ contasFixas: [conta('cf-31', 'Seguro', 20, 31)], contasPagas: [] });
    const na = loja().contasNaAgenda('Rita');
    expect(na.map(e => e.day)).toEqual([dkey(2026, 7, 31), dkey(2026, 8, 30)]);
    expect(na[0]).toMatchObject({ title: `Seguro · ${EUR(20)}`, visibilidade: 'adultos', contaFixa: 'cf-31', paga: false });
    // A criança não recebe nada disto — é orçamento.
    expect(loja().contasNaAgenda('Léo')).toEqual([]);
  });

  it('o que vence em dois dias — ou já venceu — entra no «Precisa de Si»; o que está pago não', () => {
    const mes = `${TODAY.y}-${String(TODAY.m + 1).padStart(2, '0')}`;
    const tarde = conta('cf-tarde', 'Água', 15, TODAY.d + 3);
    const { loja } = dinheiro({ contasFixas: [RENDA, EDP, NET, tarde], contasPagas: [{ conta: 'cf-net', mes, dia: TODAY_KEY, valor: 34.99 }] });
    expect(loja().contasAVencer(2).map(c => c.id)).toEqual(['cf-renda', 'cf-edp']);
    expect(loja().contasAVencer(2)[0].dias).toBe(-19);
    expect(loja().contasAVencer(2)[1].dias).toBe(2);
    expect(estadoDaConta(loja().contasDoMes().find(c => c.id === 'cf-renda'))).toEqual({ texto: 'atrasada 19 dias', tom: 'err' });
    expect(estadoDaConta(loja().contasDoMes().find(c => c.id === 'cf-edp'))).toEqual({ texto: 'em 2 dias', tom: 'warn' });
    expect(estadoDaConta(loja().contasDoMes().find(c => c.id === 'cf-net'))).toEqual({ texto: 'paga', tom: 'ok' });
    expect(estadoDaConta(loja().contasDoMes().find(c => c.id === 'cf-tarde'))).toEqual({ texto: 'em 3 dias', tom: 'warn' });
  });

  it('alterar muda a definição; apagar tira a conta e os pagamentos dela, e devolve a lista vazia', () => {
    const { loja } = dinheiro({ contasFixas: [RENDA], contasPagas: [{ conta: 'cf-renda', mes: '2026-07', dia: 'd2026-07-01', valor: 850 }] });
    expect(loja().alterarContaFixa('cf-renda', { dia: 40 })).toMatch(/dia/);
    let r;
    TestRenderer.act(() => { r = loja().alterarContaFixa('cf-renda', { valor: 900, quemPaga: 'Tomás' }); });
    expect(r).toBeNull();
    expect(loja().s.contasFixas[0]).toMatchObject({ valor: 900, quemPaga: 'Tomás', nome: 'Renda' });
    TestRenderer.act(() => { loja().apagarContaFixa('cf-renda'); });
    expect(loja().s.contasFixas).toEqual([]);
    expect(loja().s.contasPagas).toEqual([]);
  });

  it('nenhum ecrã escreve contasFixas ou contasPagas por fora da loja', () => {
    for (const f of ['src/screens/Dinheiro.jsx', 'src/screens/Inicio.jsx', 'src/screens/Agenda.jsx',
      'src/sheets/NovaContaFixa.jsx', 'src/sheets/GerirContaFixa.jsx', 'src/sheets/CamposContaFixa.jsx', 'src/KidApp.jsx']) {
      const txt = semComentarios(ler(f));
      expect(txt).not.toMatch(/\b(contasFixas|contasPagas):\s/);
    }
  });
});

describe('⚠ as contas fixas: os ecrãs', () => {
  it('o Dinheiro tem a secção, com o aviso de vazio, e com as contas a soma por mês e a próxima a marcar', () => {
    const vazio = dinheiro({ contasFixas: [], contasPagas: [] });
    expect(vazio.texto()).toContain('Contas Fixas');
    expect(vazio.texto()).toContain('Sem contas fixas.');

    const { r, texto } = dinheiro({ contasFixas: [NET, RENDA, EDP], contasPagas: [] });
    const tx = texto();
    for (const n of ['Renda', 'EDP', 'Internet']) expect(tx).toContain(n);
    expect(tx).toContain(`${EUR(850 + 62.4 + 34.99)} por mês`);
    expect(tx).toContain('Tomás paga');
    // A primeira por pagar, pelo dia, é a renda (dia 1, atrasada).
    expect(hospedeiro(r, 'Marcar «Renda» como paga')).toBeTruthy();
    expect(tx).toContain('atrasada 19 dias');
    expect(tx).toContain('em 2 dias');
  });

  it('marcar pela secção paga a próxima; a pastilha diz «paga» e o botão passa à seguinte', () => {
    const { r, texto, loja } = dinheiro({ contasFixas: [RENDA, EDP], contasPagas: [] });
    tocar(r, 'Marcar «Renda» como paga');
    expect(loja().s.contasPagas.length).toBe(1);
    expect(texto()).toContain('paga');
    expect(hospedeiro(r, 'Marcar «EDP» como paga')).toBeTruthy();
    tocar(r, 'Marcar «EDP» como paga');
    expect(loja().s.contasPagas.length).toBe(2);
    expect(hospedeiro(r, 'Marcar «EDP» como paga')).toBeFalsy();
  });

  it('a linha abre a folha da conta, com «Marcar como paga», os campos e «Apagar conta»', () => {
    const { r, texto } = dinheiro({ contasFixas: [EDP], contasPagas: [] });
    tocar(r, `EDP · dia ${EDP.dia} · ${EUR(62.4)}`);
    const tx = texto();
    expect(tx).toContain('Marcar como paga');
    expect(tx).toContain('Este mês');
    expect(tx).toContain('Apagar conta');
    expect(tx).toContain('Quem marcar');
  });

  it('o Início avisa do que vence em dois dias e mostra na agenda de hoje a que vence hoje', () => {
    const hoje = conta('cf-hoje', 'Gás', 40, TODAY.d);
    const { texto } = montar(Inicio, { t: T, user: 'Rita', go: () => {}, onSaude: () => {}, onEquip: () => {}, onFicha: () => {} },
      { contasFixas: [EDP, hoje], contasPagas: [] });
    const tx = texto();
    expect(tx).toContain(`EDP · ${EUR(62.4)}`);
    expect(tx).toContain('Vence em 2 dias');
    expect(tx).toContain(`Gás · ${EUR(40)}`);
    expect(tx).toContain('Vence hoje · por pagar');
  });

  it('a Agenda mostra a conta no dia em que vence, sem a deixar editar', () => {
    const { r, texto } = montar(Agenda, { t: T, user: 'Rita' }, { contasFixas: [EDP], contasPagas: [] });
    expect(texto()).toContain(`EDP · ${EUR(62.4)}`);
    expect(texto()).toContain(`Conta fixa · ${ENV}`);
    expect(hospedeiro(r, `Editar EDP · ${EUR(62.4)}`)).toBeFalsy();
  });

  it('⚠ a criança não vê uma conta em lado nenhum da app dela', () => {
    for (const tab of ['tarefas', 'compras', 'cofre']) {
      const { texto } = montar(KidApp, { kid: 'Léo', kidTab: tab, setKidTab: () => {}, onLogout: () => {} },
        { contasFixas: [RENDA, EDP], contasPagas: [] });
      expect(texto()).not.toContain('Renda');
      expect(texto()).not.toContain('EDP');
    }
  });
});
