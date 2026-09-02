/**
 * As especialidades médicas, e a faixa de abas que elas entupiam.
 *
 * ── O defeito ────────────────────────────────────────────────────────────────
 *
 * A faixa de abas da Gestão da Casa CORTAVA num telemóvel. Não em teoria — no
 * telefone do dono da casa, de 412 px. Medido no navegador a 402, aba a aba:
 *
 *     Orçamento 84   Membros 75   Envelopes 80   Lojas 51   Especialidades 107
 *
 * A última acabava em 413 e a coluna acaba em 386: vinte e sete pixels por
 * fora, comidos pelo `overflow: hidden` do contentor sem deixar rasto. É isso
 * que faz uma falta de espaço parecer um erro de desenho.
 *
 * ── A causa, que não era a largura ───────────────────────────────────────────
 *
 * As especialidades médicas eram geridas em DOIS sítios, sobre a mesma lista
 * `s.specialities`: uma quinta aba da Gestão (criar, renomear, apagar) e a
 * folha «Marcar Consulta» da Saúde (criar, apagar). A faixa só tinha cinco
 * abas por haver uma secção a mais.
 *
 * Saíram para a Saúde, que é onde se usam — aparecem ao marcar uma consulta.
 *
 * ── O que a saída obrigava a arranjar primeiro ───────────────────────────────
 *
 * A lista da Saúde tinha dois defeitos que só se tornam graves quando ela
 * passa a ser o ÚNICO sítio:
 *
 *     apagava ao toque      sem perguntar nada. A da Gestão tinha diálogo.
 *     alvo de 34 px         `padding: S.sm` à volta de um ícone de 18, contra
 *                           os 44 do INVARIANTE #5 — e o `hitSlop={8}` que o
 *                           acompanhava não salvava nada, porque a
 *                           react-native-web IGNORA o hitSlop.
 *
 * ── E o renomear, que se foi de propósito ────────────────────────────────────
 *
 * ⚠ O `renameSpecialty` da loja troca o nome em `specialities` e não toca nos
 * episódios de `health`, que guardam a especialidade como TEXTO. Renomear
 * deixava as consultas a apontar para um nome que já não existe. Não foi
 * portado para a Saúde: um renomear correto tem de migrar os episódios, e até
 * o haver é melhor não ter nenhum do que ter um que parte fichas em silêncio.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider } = require('../src/store');
const { buildTheme } = require('../src/theme');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');

const ecras = fs.readdirSync(path.join(raiz, 'src/screens'))
  .filter(f => f.endsWith('.jsx')).map(f => `src/screens/${f}`);
const folhas = fs.readdirSync(path.join(raiz, 'src/sheets'))
  .filter(f => f.endsWith('.jsx')).map(f => `src/sheets/${f}`);

// O código de um ficheiro sem os comentários — para que uma prova não passe
// nem falhe pelo que está escrito a explicar o que já não existe. Este
// ficheiro inteiro seria um falso positivo sem isto.
const semComentarios = (rel) => ler(rel)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

describe('⚠ as especialidades são geridas num sítio só', () => {
  it('a Gestão da Casa já não tem interface de especialidades', () => {
    const c = semComentarios('src/screens/Gestao.jsx');
    for (const resto of ['newSpecialty', 'editSpecialty', 'deleteSpecialty',
                         'selectedSpecialty', 'renderSpecialtiesTab']) {
      expect(c).not.toContain(resto);
    }
  });

  it('e a aba dela saiu da faixa', () => {
    const c = semComentarios('src/screens/Gestao.jsx');
    expect(c).not.toMatch(/key: 'especialidades'/);
  });

  it('só UM ecrã escreve na lista — se dois voltarem, a faixa volta a entupir', () => {
    // Esta é a prova da causa. As outras são da consequência.
    const donos = [...ecras, ...folhas]
      .filter(rel => /\b(addSpecialty|removeSpecialty)\b/.test(semComentarios(rel)));
    expect(donos).toEqual(['src/screens/Saude.jsx']);
  });

  // ⚠ Aqui viviam duas provas que exigiam que o `renameSpecialty` estivesse
  // ERRADO: uma pedia que nenhum ecrã o chamasse, a outra que o corpo dele não
  // falasse de `health`. Eram uma trela, não uma rede, e o sítio delas era
  // enquanto o defeito existisse. O defeito foi corrigido — a migração está
  // provada no bloco «renomear leva tudo atrás», mais abaixo — e as duas
  // saíram. Uma prova que exige que algo continue mal cumpre-se apagando-a no
  // dia em que deixa de ser verdade, não mantendo-a.
});

describe('⚠ a faixa de abas da Gestão cabe num telemóvel', () => {
  const codigo = ler('src/screens/Gestao.jsx');
  const bloco = codigo.slice(codigo.indexOf("{ key: 'orcamento'"), codigo.indexOf('.map(({ key, label })'));
  const chaves = [...bloco.matchAll(/key: '(\w+)'/g)].map(m => m[1]);

  // Larguras do TEXTO de cada rótulo, medidas no navegador a 12 px/600 na
  // fonte da app. A largura da aba é `max(44, texto + 2 × enchimento)` — o 44
  // é o `minWidth`, e é ele que segura a «Lojas».
  const TEXTO = { orcamento: 64, membros: 55, envelopes: 60, lojas: 31 };
  const MARGEM = 16;   // o enchimento da coluna, à esquerda da primeira aba

  it('são quatro abas', () => {
    expect(chaves).toEqual(['orcamento', 'membros', 'envelopes', 'lojas']);
  });

  it('nenhuma desce dos 44, em nenhuma direção (INVARIANTE #5)', () => {
    const i = codigo.indexOf('.map(({ key, label })');
    const estilo = codigo.slice(i, i + 700);
    expect(estilo).toMatch(/minHeight: 44/);
    expect(estilo).toMatch(/minWidth: 44/);
  });

  it('⚠ e a faixa inteira cabe na coluna de um telefone de 360', () => {
    // O telefone que a cortou tem 412 (coluna 396). Os 360 são a rede: é a
    // largura de um Android comum, e prendem o enchimento a um valor que
    // serve os dois. Com 16 falha — 354 contra 344 — e é aí que esta prova
    // ganha o seu dinheiro.
    const i = codigo.indexOf('.map(({ key, label })');
    const m = codigo.slice(i, i + 700).match(/paddingHorizontal: (\d+)/);
    expect(m).toBeTruthy();
    const enchimento = Number(m[1]);

    const larguras = chaves.map(k => Math.max(44, TEXTO[k] + 2 * enchimento));
    const acabaEm = MARGEM + larguras.reduce((a, b) => a + b, 0);

    expect(acabaEm).toBeLessThanOrEqual(360 - MARGEM);
  });
});

describe('⚠ apagar uma especialidade pergunta primeiro', () => {
  const Saude = require('../src/screens/Saude').default;

  const abrir = () => {
    let r = null;
    const t = buildTheme('violet', false);
    TestRenderer.act(() => {
      r = TestRenderer.create(
        React.createElement(SafeAreaProvider,
          { initialMetrics: { frame: { x: 0, y: 0, width: 412, height: 915 },
                              insets: { top: 47, left: 0, right: 0, bottom: 34 } } },
          React.createElement(StoreProvider, null,
            React.createElement(Saude, { t, user: 'Rita', onClose: () => {},
              onAbrirFicha: () => {} }))));
    });
    return r;
  };

  const junta = (n) => {
    if (n === null || n === undefined || n === false) return '';
    if (typeof n === 'string' || typeof n === 'number') return String(n);
    if (Array.isArray(n)) return n.map(junta).join(' ');
    return junta(n.children || (n.props && n.props.children) || null);
  };

  const alvo = (r, rot) => r.root.findAll(x => x.props
    && x.props.accessibilityLabel === rot
    && typeof x.props.onPress === 'function')[0];

  const tocar = (r, rot) => {
    const n = alvo(r, rot);
    expect(n).toBeTruthy();
    TestRenderer.act(() => { n.props.onPress(); });
  };

  // Da lista de fichas até à gestão das especialidades, pelo caminho da app.
  const atéÀsEspecialidades = () => {
    const r = abrir();
    tocar(r, 'marcar consulta');   // o rótulo é mesmo em minúscula
    tocar(r, 'Especialidades');
    return r;
  };

  it('a lista chega-se pela folha de marcar consulta', () => {
    const texto = junta(atéÀsEspecialidades().toJSON());
    expect(texto).toContain('Adicionar especialidade');
    expect(texto).toContain('Pediatria');
  });

  it('⚠ o toque no lixo NÃO apaga — abre o diálogo', () => {
    // Era isto que a saída da Gestão ia estragar: lá havia diálogo, aqui o
    // toque apagava logo.
    const r = atéÀsEspecialidades();
    expect(junta(r.toJSON())).not.toContain('Apagar especialidade?');

    tocar(r, 'Apagar Pediatria');
    const texto = junta(r.toJSON());
    expect(texto).toContain('Apagar especialidade?');
    expect(texto).toContain('«Pediatria»');
    expect(texto).toContain('Pediatria');   // continua na lista, por apagar
  });

  it('cancelar deixa a lista como estava', () => {
    const r = atéÀsEspecialidades();
    tocar(r, 'Apagar Pediatria');
    tocar(r, 'Cancelar');
    const texto = junta(r.toJSON());
    expect(texto).not.toContain('Apagar especialidade?');
    expect(texto).toContain('Pediatria');
  });

  // ⚠ A lista das especialidades é uma FATIA do ecrã, não o ecrã. A primeira
  // versão desta prova pedia que a palavra «Pediatria» desaparecesse de todo o
  // texto, e falhou — por bem: o Léo tem uma consulta de Pediatria em «Precisa
  // de ação», e ela fica. Uma prova que exigisse o contrário estaria a exigir
  // o oposto do que o diálogo promete.
  const listaDeEspecialidades = (r) => {
    const texto = junta(r.toJSON());
    return texto.slice(texto.lastIndexOf('Adicionar especialidade'));
  };

  it('e confirmar é que apaga — da lista', () => {
    const r = atéÀsEspecialidades();
    expect(listaDeEspecialidades(r)).toContain('Pediatria');
    tocar(r, 'Apagar Pediatria');
    tocar(r, 'Apagar');
    expect(junta(r.toJSON())).not.toContain('Apagar especialidade?');
    const lista = listaDeEspecialidades(r);
    expect(lista).not.toContain('Pediatria');
    expect(lista).toContain('Dentista');           // e só essa
    expect(lista).toContain('Medicina geral');
  });

  it('⚠ e a consulta já marcada com ela fica — é o que o diálogo promete', () => {
    // O `health` guarda a especialidade como TEXTO. Apagá-la da lista não
    // pode apagar a consulta do Léo, e a mensagem do diálogo diz isso em
    // português antes de a pessoa decidir.
    const r = atéÀsEspecialidades();
    tocar(r, 'Apagar Pediatria');
    tocar(r, 'Apagar');
    const texto = junta(r.toJSON());
    const antesDaLista = texto.slice(0, texto.lastIndexOf('Adicionar especialidade'));
    expect(antesDaLista).toContain('Pediatria');
  });

  it('⚠ o alvo do lixo tem 44, e não depende do `hitSlop` para os ter', () => {
    // Tinha 34: `padding: S.sm` à volta de um ícone de 18. E o `hitSlop={8}`
    // que o acompanhava é IGNORADO pela react-native-web — portanto na web o
    // alvo eram mesmo 34, medidos no navegador.
    const r = atéÀsEspecialidades();
    const n = alvo(r, 'Apagar Pediatria');
    expect(n).toBeTruthy();
    const estilo = typeof n.props.style === 'function'
      ? [].concat(n.props.style({ pressed: false })).filter(Boolean)
      : [].concat(n.props.style).filter(Boolean);
    const junto = Object.assign({}, ...estilo);
    expect(junto.minWidth).toBeGreaterThanOrEqual(44);
    expect(junto.minHeight).toBeGreaterThanOrEqual(44);
  });
});
