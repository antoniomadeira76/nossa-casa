/**
 * As metas da família: em euros, e o juntado é uma SOMA.
 *
 * ── O que não existia ────────────────────────────────────────────────────────
 *
 * A coleção `metas` está no servidor desde o primeiro dia, com regras e tudo. O
 * cliente nunca lhe escreveu nem leu: a lista da app era a constante `GOALS` do
 * `data.js`, desenhada e mais nada. Não havia como criar, alterar, apagar nem
 * reforçar uma meta — e uma meta que a Rita quisesse criar não existia em sítio
 * nenhum, nem no telemóvel dela. Era a lacuna maior que restava, e está no
 * registo desta casa como «o cliente nunca lhe escreve».
 *
 * ── Duas coisas que a base impôs antes de haver interface ────────────────────
 *
 * ⚠ **O juntado é a soma dos movimentos, nunca um campo.** Havia um
 * `num('atual')` na coleção `metas` e um `at: 1920` na semente — os dois saldos
 * ESCRITOS, o INVARIANTE #2 ao contrário. Dois telemóveis a reforçar a meta das
 * férias no mesmo dia escreviam cada um o seu total e o último ganhava: os 50 €
 * do outro desapareciam sem erro nenhum. É a mesma forma do `paidPts` que fez
 * pagar a semanada duas vezes. Saíram os dois.
 *
 * ⚠ **Em EUROS.** Decidido pelo dono da casa em 08/09/2026. O protótipo punha
 * uma percentagem ao lado do nome de cada meta e dizia «30 % do que sobrou
 * reforça as metas» ao fechar o mês. A barra basta para o progresso; os números
 * dizem-se em euros, e quanto vai para uma meta é um valor que quem administra
 * escolhe — 30 % de 771,36 € são 231,41 €, e ninguém escolheu esse número.
 * A prova geral do símbolo é `o-dinheiro-diz-se-em-euros`.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider, useStore } = require('../src/store');
const { buildTheme } = require('../src/theme');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const soCodigo = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .split('\n').map(l => (/^\s*(\/\/|\*)/.test(l) ? '' : l)).join('\n');

const texto = (n) => {
  if (n === null || n === undefined || n === false) return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(texto).join(' ');
  return texto(n.children || (n.props && n.props.children) || null);
};

const METRICAS = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// ── A loja, sem ecrã ─────────────────────────────────────────────────────────
const abrir = () => {
  let api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
  });
  return {
    loja: () => api,
    mexer: (f) => { let r; TestRenderer.act(() => { r = f(api); }); return r; },
  };
};

describe('⚠ o juntado é a SOMA dos movimentos', () => {
  it('as sementes dão duas metas com dinheiro juntado', () => {
    const metas = abrir().loja().metas;
    expect(metas.length).toBe(2);
    expect(metas[0].at).toBeGreaterThan(0);
  });

  it('⚠ e o `at` é mesmo a soma da lista que o ecrã mostra', () => {
    // Um total ao lado de uma lista tem de ser a soma DELA. É a regra desta
    // casa desde o varrimento de 07/09: um total que se conta noutro sítio
    // acaba por discordar da lista.
    const d = abrir();
    for (const m of d.loja().metas) {
      const soma = d.loja().movimentosDaMeta(m.id).reduce((n, mv) => n + mv.delta, 0);
      expect(m.at).toBeCloseTo(soma, 2);
    }
  });

  it('⚠ dois reforços SOMAM-SE — era aqui que um total escrito perdia dinheiro', () => {
    // A Rita reforça 50 € e o Tomás reforça 50 €. Com um saldo escrito o
    // resultado era 50; com movimentos é 100. É o INVARIANTE #2, e é a
    // diferença entre uma app que funciona a dois e uma que perde dinheiro.
    const d = abrir();
    const id = d.loja().metas[0].id;
    const antes = d.loja().metas[0].at;
    d.mexer(a => a.reforcarMeta(id, 50, 'Sobra do mês', 'Rita'));
    d.mexer(a => a.reforcarMeta(id, 50, 'Sobra do mês', 'Tomás'));
    expect(d.loja().metas.find(m => m.id === id).at).toBeCloseTo(antes + 100, 2);
  });

  it('um valor NEGATIVO tira dinheiro da meta', () => {
    // A linha do servidor não se edita nem se apaga: corrigir é lançar o
    // movimento contrário, como nas despesas.
    const d = abrir();
    const id = d.loja().metas[0].id;
    const antes = d.loja().metas[0].at;
    d.mexer(a => a.reforcarMeta(id, -20, 'Enganei-me', 'Rita'));
    expect(d.loja().metas.find(m => m.id === id).at).toBeCloseTo(antes - 20, 2);
  });

  it('e um reforço de zero não faz nada, e diz porquê', () => {
    const d = abrir();
    const id = d.loja().metas[0].id;
    const antes = d.loja().metas[0].at;
    expect(typeof d.mexer(a => a.reforcarMeta(id, 0, '', 'Rita'))).toBe('string');
    expect(d.loja().metas.find(m => m.id === id).at).toBeCloseTo(antes, 2);
  });

  it('⚠ e o movimento fica com quem o lançou e o motivo', () => {
    // Sem isto o ecrã não pode dizer de onde vieram os 50 €, e um total sem
    // história não se verifica.
    const d = abrir();
    const id = d.loja().metas[0].id;
    d.mexer(a => a.reforcarMeta(id, 50, 'Prémio de produtividade', 'Rita'));
    const mv = d.loja().movimentosDaMeta(id)[0];
    expect(mv.label).toBe('Prémio de produtividade');
    expect(mv.por).toBe('Rita');
    expect(mv.delta).toBe(50);
  });
});

describe('criar, alterar e apagar uma meta', () => {
  it('criar acrescenta à lista, e nasce a ZERO', () => {
    // Uma meta nasce vazia e sobe por movimentos. Um campo «já juntei 1 920 €»
    // era o saldo escrito que esta funcionalidade veio tirar.
    const d = abrir();
    expect(d.mexer(a => a.criarMeta('Telhado', 4000, 'sem prazo'))).toBe(null);
    const nova = d.loja().metas.find(m => m.name === 'Telhado');
    expect(nova.of).toBe(4000);
    expect(nova.at).toBe(0);
  });

  it('⚠ e criar a primeira NÃO apaga o que as sementes já tinham juntado', () => {
    // A lista materializa-se ao primeiro toque, como os envelopes e os
    // corredores. Se os movimentos das sementes não se materializassem com
    // ela, criar uma meta punha as outras duas a zero.
    const d = abrir();
    const antes = d.loja().metas.map(m => [m.name, m.at]);
    d.mexer(a => a.criarMeta('Telhado', 4000, ''));
    for (const [nome, at] of antes) {
      expect(d.loja().metas.find(m => m.name === nome).at).toBeCloseTo(at, 2);
    }
  });

  it('recusa um nome vazio e um alvo que não é dinheiro', () => {
    const d = abrir();
    expect(typeof d.mexer(a => a.criarMeta('   ', 100, ''))).toBe('string');
    expect(typeof d.mexer(a => a.criarMeta('Telhado', 0, ''))).toBe('string');
    expect(typeof d.mexer(a => a.criarMeta('Telhado', -5, ''))).toBe('string');
    expect(d.loja().metas.length).toBe(2);
  });

  it('⚠ e recusa um nome repetido, com maiúsculas ou sem elas', () => {
    const d = abrir();
    const nome = d.loja().metas[0].name;
    expect(typeof d.mexer(a => a.criarMeta(nome.toUpperCase(), 100, ''))).toBe('string');
  });

  it('alterar muda o nome, o alvo e o prazo', () => {
    const d = abrir();
    const id = d.loja().metas[0].id;
    expect(d.mexer(a => a.alterarMeta(id, { name: 'Férias na Madeira', of: 3500, when: 'agosto de 2027' }))).toBe(null);
    const m = d.loja().metas.find(x => x.id === id);
    expect(m.name).toBe('Férias na Madeira');
    expect(m.of).toBe(3500);
    expect(m.when).toBe('agosto de 2027');
  });

  it('⚠ e alterar o alvo NÃO mexe no que já está juntado', () => {
    const d = abrir();
    const id = d.loja().metas[0].id;
    const at = d.loja().metas[0].at;
    d.mexer(a => a.alterarMeta(id, { of: 9999 }));
    expect(d.loja().metas.find(x => x.id === id).at).toBeCloseTo(at, 2);
  });

  it('⚠ apagar leva os MOVIMENTOS dela — não ficam linhas órfãs a somar', () => {
    const d = abrir();
    const id = d.loja().metas[0].id;
    expect(d.mexer(a => a.apagarMeta(id))).toBe(null);
    expect(d.loja().metas.find(m => m.id === id)).toBeUndefined();
    expect(d.loja().movimentosDaMeta(id)).toEqual([]);
  });

  it('e apagar a última deixa a casa sem metas, sem voltar às sementes', () => {
    const d = abrir();
    while (d.loja().metas.length) {
      const id = d.loja().metas[0].id;
      d.mexer(a => a.apagarMeta(id));
    }
    expect(d.loja().metas).toEqual([]);
  });

  it('uma meta que não existe não rebenta em nenhuma das três', () => {
    const d = abrir();
    for (const f of ['alterarMeta', 'apagarMeta']) {
      expect(typeof d.mexer(a => a[f]('nao-existe', { name: 'X' }))).toBe('string');
    }
    expect(typeof d.mexer(a => a.reforcarMeta('nao-existe', 50, '', 'Rita'))).toBe('string');
  });
});

describe('⚠ o ecrã do Dinheiro mostra as metas em euros, e deixa mexer-lhes', () => {
  const Dinheiro = require('../src/screens/Dinheiro').default;

  const montar = (antes) => {
    let arvore = null;
    let api = null;
    const Sonda = () => {
      api = useStore();
      return React.createElement(Dinheiro, {
        t: buildTheme(0, false), user: 'Rita', onEquip: () => {},
      });
    };
    TestRenderer.act(() => {
      arvore = TestRenderer.create(
        React.createElement(SafeAreaProvider, { initialMetrics: METRICAS },
          React.createElement(StoreProvider, null, React.createElement(Sonda))));
    });
    if (antes) TestRenderer.act(() => { antes(api); });
    const alvos = () => arvore.root.findAll(x => x.props
      && typeof x.props.onPress === 'function' && x.props.accessibilityLabel);
    return {
      loja: () => api,
      alvos,
      rotulos: () => alvos().map(a => String(a.props.accessibilityLabel)),
      tocar: (rotulo) => {
        const a = alvos().find(x => String(x.props.accessibilityLabel) === rotulo);
        if (!a) throw new Error(`sem alvo «${rotulo}»`);
        TestRenderer.act(() => { a.props.onPress(); });
      },
      ecra: () => texto(arvore.toJSON()),
    };
  };

  it('a secção existe, e o total é a soma das metas', () => {
    const d = montar();
    const t = d.ecra();
    expect(t).toContain('Metas da Família');
    for (const m of d.loja().metas) expect(t).toContain(m.name);
    // ⚠ O total ao lado do título é a SOMA da lista que o ecrã mostra, e não
    // uma contagem ao lado — a regra desta casa desde o varrimento de 07/09.
    const soma = d.loja().metas.reduce((n, m) => n + m.at, 0);
    expect(soma).toBeGreaterThan(0);
    expect(t).toContain(require('../src/format').EUR(soma));
  });


  it('⚠ e diz quanto FALTA, em euros — não em percentagem', () => {
    const d = montar();
    expect(d.ecra()).toMatch(/faltam\s/);
    // O símbolo não aparece em texto nenhum do ecrã: a prova geral é a
    // `o-dinheiro-diz-se-em-euros`, e esta é a metade que se lê montada.
    expect(d.ecra()).not.toMatch(/\d\s?%/);
  });

  it('o reforço rápido de 50 € está lá, e soma', () => {
    const d = montar();
    const g = d.loja().metas[0];
    const antes = g.at;
    d.tocar(`Reforçar ${g.name} em 50 euros`);
    expect(d.loja().metas.find(m => m.id === g.id).at).toBeCloseTo(antes + 50, 2);
  });

  it('⚠ e só quem ADMINISTRA o vê — é a regra da coleção, não da interface', () => {
    // Mostrar um botão que o servidor recusa é a divergência entre o servidor e
    // a app que já custou três defeitos a esta casa.
    const d = montar(a => a.set({ roles: { ...a.s.roles, Rita: 'adulto' } }));
    // ⚠ Pelos NOMES das metas, e não por um `/^Reforçar /`: esse apanhava o
    // «Reforçar o envelope Sair & lazer», que é outro botão e não tem nada a
    // ver com isto. Um guarda demasiado largo é a classe de defeito 23.
    for (const g of d.loja().metas) {
      expect(d.rotulos()).not.toContain(`Reforçar ${g.name} em 50 euros`);
    }
    expect(d.rotulos()).not.toContain('acrescentar meta');
  });

  it('a linha da meta abre a gestão', () => {
    const d = montar();
    const g = d.loja().metas[0];
    d.tocar(`${g.name} · ${require('../src/format').EUR(g.at)} de ${require('../src/format').EUR(g.of)}`);
    expect(d.ecra()).toContain('Reforçar ou retirar');
    expect(d.ecra()).toContain('De onde veio');
  });

  it('⚠ e o apagar vive lá dentro, com a pergunta a dizer quanto se perde', () => {
    const d = montar();
    const g = d.loja().metas[0];
    const { EUR } = require('../src/format');
    d.tocar(`${g.name} · ${EUR(g.at)} de ${EUR(g.of)}`);
    d.tocar(`Apagar a meta ${g.name}`);
    const t = d.ecra();
    expect(t).toContain(`Apagar «${g.name}»?`);
    expect(t).toContain(EUR(g.at));
  });

  it('sem metas nenhumas, o vazio explica o que uma meta é', () => {
    const d = montar(a => a.set({ metasDaCasa: [], metasProprias: true, metaMovs: [] }));
    const t = d.ecra();
    expect(t).toContain('Sem metas definidas');
    expect(t).not.toContain('undefined');
    expect(t).not.toContain('NaN');
  });
});

describe('⚠ o fecho do mês leva um VALOR para a meta, e não uma percentagem', () => {
  const dinheiro = soCodigo(ler('src/screens/Dinheiro.jsx'));

  it('a regra dos 30 % já não está no código', () => {
    // Estava escrita no protótipo e ficou por aplicar meses, e bem: uma
    // percentagem escrita no código não é uma decisão da família.
    expect(dinheiro).not.toMatch(/0\.3\b/);
    expect(dinheiro).not.toMatch(/30\s?%/);
  });

  it('⚠ e o fecho reforça a meta escolhida com o valor escolhido', () => {
    expect(dinheiro).toMatch(/reforcarMeta\(metaDoFecho\.id, paraMeta/);
  });

  it('o valor sugerido é o saldo INTEIRO, para a app não escolher por ninguém', () => {
    expect(dinheiro).toMatch(/fecho\.valor === null \? Math\.max\(0, remaining\)/);
  });

  it('⚠ e não se pode levar mais do que o saldo', () => {
    // Um valor acima do disponível era prometer a uma meta dinheiro que a casa
    // não tem.
    const i = dinheiro.indexOf('Levar para uma meta');
    expect(i).toBeGreaterThan(0);
    const bloco = dinheiro.slice(i, i + 1200);
    expect(bloco).toMatch(/max=\{Math\.max\(0, remaining\)\}/);
  });
});

describe('⚠ e o saldo escrito saiu dos DOIS lados', () => {
  it('a coleção `metas` já não tem o campo `atual`', () => {
    const colecoes = ler('db/pocketbase/criar-colecoes.mjs');
    const i = colecoes.indexOf("name: 'metas', type: 'base'");
    expect(i).toBeGreaterThan(0);
    const bloco = colecoes.slice(i, colecoes.indexOf('});', i));
    expect(bloco).not.toMatch(/num\('atual'/);
    expect(bloco).toMatch(/num\('alvo'/);
  });

  it('e há uma coleção de MOVIMENTOS, sem alterar nem apagar', () => {
    const colecoes = ler('db/pocketbase/criar-colecoes.mjs');
    const i = colecoes.indexOf("name: 'meta_movimentos', type: 'base'");
    expect(i).toBeGreaterThan(0);
    const bloco = colecoes.slice(i, colecoes.indexOf('});', i));
    expect(bloco).toMatch(/updateRule: null/);
    expect(bloco).toMatch(/deleteRule: null/);
    // Com chave de idempotência: um reenvio da fila não reforça duas vezes.
    expect(bloco).toMatch(/idem_key/);
  });

  it('⚠ a semente também não escreve um total — o `at` é somado', () => {
    const { GOALS, META_MOVS } = require('../src/data');
    expect(GOALS.every(g => g.at === undefined)).toBe(true);
    expect(META_MOVS.length).toBeGreaterThan(2);
    // E cada movimento aponta para uma meta que existe.
    const ids = new Set(GOALS.map(g => g.id));
    expect(META_MOVS.filter(mv => !ids.has(mv.meta))).toEqual([]);
  });

  it('⚠ e o `sync` NUNCA escreve um total na meta', () => {
    const sync = soCodigo(ler('src/sync.js'));
    expect(sync).not.toMatch(/atual:/);
    // O que sobe da definição é o alvo; o juntado sobe como movimento.
    expect(sync).toMatch(/export async function reforcarMeta/);
    expect(sync).toMatch(/collection\('meta_movimentos'\)|'meta_movimentos'/);
  });

  it('⚠ e o `puxarCasa` devolve a meta SEM o juntado — um só dono do número', () => {
    // Devolver aqui um `at` já somado dava duas contas do mesmo valor a viver
    // ao lado uma da outra, e é assim que elas divergem. Quem soma é a loja.
    const sync = soCodigo(ler('src/sync.js'));
    const i = sync.indexOf('const metas = (casa.metas || []).map');
    expect(i).toBeGreaterThan(0);
    const bloco = sync.slice(i, sync.indexOf('}));', i));
    expect(bloco).not.toMatch(/\bat:/);
    expect(bloco).toMatch(/of: Number\(m\.alvo\)/);
  });

  it('e as duas coleções descem — senão era uma escrita de sentido único', () => {
    const cliente = ler('src/pocketbase.js');
    expect(cliente).toMatch(/'metas', 'meta_movimentos'/);
  });
});

describe('as duas folhas desenham-se sozinhas', () => {
  // ⚠ Montadas DIRECTAMENTE, e não só pelo caminho do Dinheiro. É o que a
  // prova `ecras-que-nunca-eram-desenhados` exige de cada ecrã e folha.
  const NovaMeta = require('../src/sheets/NovaMeta').default;
  const GerirMeta = require('../src/sheets/GerirMeta').default;

  const montar = (Comp, props) => {
    let arvore = null;
    TestRenderer.act(() => {
      arvore = TestRenderer.create(
        React.createElement(SafeAreaProvider, { initialMetrics: METRICAS },
          React.createElement(StoreProvider, null,
            React.createElement(Comp, {
              t: buildTheme(0, false), user: 'Rita',
              onApagar: () => {}, onClose: () => {}, ...props,
            }))));
    });
    return texto(arvore.toJSON());
  };

  it('a folha de criar', () => {
    const t = montar(NovaMeta);
    expect(t).toContain('Criar meta');
    // Sem nome, o botão diz o que falta em vez de dizer a consequência — é o
    // rótulo desactivado a ser útil, e não o mesmo rótulo com menos brilho.
    expect(t).toContain('Escreva um nome para a meta');
    expect(t).toContain('Quanto quer juntar');
    expect(t).not.toContain('undefined');
    expect(t).not.toContain('NaN');
  });

  it('a folha de gerir, com uma meta inteira', () => {
    const t = montar(GerirMeta, {
      meta: { id: 'g1', name: 'Férias', at: 1920, of: 3000, when: 'julho de 2027' },
    });
    expect(t).toContain('Reforçar ou retirar');
    expect(t).toContain('Apagar meta');
    expect(t).toMatch(/faltam/);
    expect(t).not.toContain('undefined');
    expect(t).not.toContain('NaN');
  });

  it('⚠ e com uma meta a zero, sem movimentos e sem prazo', () => {
    const t = montar(GerirMeta, { meta: { id: 'g9', name: 'Telhado', at: 0, of: 4000 } });
    expect(t).not.toContain('undefined');
    expect(t).not.toContain('NaN');
    // Sem separador pendurado onde o prazo não existe.
    expect(t).not.toMatch(/·\s*·/);
    // E «De onde veio» não aparece vazio: sem movimentos, a secção não existe.
    expect(t).not.toContain('De onde veio');
  });

  it('⚠ e uma meta já alcançada não diz que faltam euros negativos', () => {
    const t = montar(GerirMeta, { meta: { id: 'g8', name: 'Bicicleta', at: 500, of: 400 } });
    expect(t).toContain('meta alcançada');
    expect(t).not.toMatch(/faltam .*−/);
  });
});
