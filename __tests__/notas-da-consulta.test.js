/**
 * As notas de uma consulta: sempre à mão, e alteráveis.
 *
 * ── O que faltava ────────────────────────────────────────────────────────────
 *
 * A loja só tinha `addHealthNote`. Escrever uma nota era definitivo: uma gralha
 * ficava lá para sempre, e acrescentar o que faltava obrigava a uma segunda
 * nota a dizer «na anterior queria dizer…».
 *
 * E o campo de escrita vivia atrás de um botão «Adicionar nota» que o revelava
 * — dois toques para começar a escrever. Uma nota de consulta escreve-se na
 * sala de espera, com o médico à espera de fechar a porta.
 *
 * ── Duas decisões que estas provas prendem ───────────────────────────────────
 *
 * 1. Mexe-se numa nota pelo `id`, NUNCA pela posição. Dois telefones que
 *    acrescentem uma nota cada um à mesma consulta produzem listas com ordens
 *    diferentes, e um `editar(indice)` alterava a nota errada no segundo. É a
 *    mesma razão do INVARIANTE #2.
 *
 * 2. Só quem escreveu altera ou apaga. Uma nota é o relato de uma pessoa sobre
 *    o que ouviu; o outro adulto reescrevê-la em silêncio é pior do que não a
 *    poder corrigir.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider, useStore } = require('../src/store');
const { buildTheme } = require('../src/theme');
const Saude = require('../src/screens/Saude').default;

// ─────────────────────────────────────────────────────────────────────────────
// A loja, sem ecrã nenhum pelo meio.
// ─────────────────────────────────────────────────────────────────────────────
const comLoja = () => {
  let api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
  });
  return () => api;
};

const notasDe = (loja, id) => (loja().s.healthNotes || {})[id] || [];

describe('⚠ uma nota altera-se, e pelo `id`', () => {
  const CONSULTA = 'h-1';

  const comDuasNotas = () => {
    const loja = comLoja();
    TestRenderer.act(() => {
      loja().addHealthNote(CONSULTA, 'Rita', 'Levar as análises');
      loja().addHealthNote(CONSULTA, 'Rita', 'Voltar em três meses');
    });
    return loja;
  };

  it('⚠ duas notas seguidas têm ids DIFERENTES', () => {
    // Era `'note-' + Date.now()`. Duas no mesmo milissegundo ficavam com o
    // mesmo id — e a partir do momento em que se edita PELO id, editar uma
    // alterava as duas. Esta prova é a que torna todas as outras honestas.
    const loja = comDuasNotas();
    const [a, b] = notasDe(loja, CONSULTA);
    expect(a.id).not.toBe(b.id);
    expect(new Set(notasDe(loja, CONSULTA).map(n => n.id)).size).toBe(2);
  });

  it('editar troca o texto daquela nota, e só daquela', () => {
    const loja = comDuasNotas();
    const [a, b] = notasDe(loja, CONSULTA);
    let erro;
    TestRenderer.act(() => {
      erro = loja().editarNotaSaude(CONSULTA, a.id, 'Levar as análises e a receita', 'Rita');
    });
    expect(erro).toBeNull();
    expect(notasDe(loja, CONSULTA)[0].text).toBe('Levar as análises e a receita');
    expect(notasDe(loja, CONSULTA)[1].text).toBe(b.text);
  });

  it('⚠ e a data em que foi ESCRITA não se perde', () => {
    // Corrigir uma gralha não pode mover a nota no tempo: a data é o que a
    // situa na consulta. A alteração fica noutro campo.
    const loja = comDuasNotas();
    const a = notasDe(loja, CONSULTA)[0];
    expect(a.editadaEm).toBeUndefined();
    TestRenderer.act(() => { loja().editarNotaSaude(CONSULTA, a.id, 'Outro texto', 'Rita'); });
    const depois = notasDe(loja, CONSULTA)[0];
    expect(depois.date).toBe(a.date);
    expect(depois.editadaEm).toBeTruthy();
  });

  it('apagar tira aquela nota, e a outra fica', () => {
    const loja = comDuasNotas();
    const [a, b] = notasDe(loja, CONSULTA);
    let erro;
    TestRenderer.act(() => { erro = loja().apagarNotaSaude(CONSULTA, a.id, 'Rita'); });
    expect(erro).toBeNull();
    expect(notasDe(loja, CONSULTA).map(n => n.id)).toEqual([b.id]);
  });

  it('e diz o que está mal, em português', () => {
    const loja = comDuasNotas();
    const a = notasDe(loja, CONSULTA)[0];
    expect(loja().editarNotaSaude(CONSULTA, 'note-nao-existe', 'x', 'Rita'))
      .toBe('Essa nota já não existe.');
    expect(loja().editarNotaSaude(CONSULTA, a.id, '   ', 'Rita'))
      .toBe('A nota não pode ficar vazia.');
    expect(loja().editarNotaSaude(CONSULTA, a.id, 'x'.repeat(2001), 'Rita'))
      .toBe('A nota não pode passar de 2000 caracteres.');
    expect(loja().addHealthNote(CONSULTA, 'Rita', '  ')).toBe('A nota não pode ficar vazia.');
  });

  it('e o mesmo texto não é erro nenhum — é não haver nada a fazer', () => {
    const loja = comDuasNotas();
    const a = notasDe(loja, CONSULTA)[0];
    TestRenderer.act(() => {
      expect(loja().editarNotaSaude(CONSULTA, a.id, a.text, 'Rita')).toBeNull();
    });
    expect(notasDe(loja, CONSULTA)[0].editadaEm).toBeUndefined();
  });
});

describe('⚠ só quem escreveu a nota lhe mexe', () => {
  const CONSULTA = 'h-2';

  const comUmaNotaDaRita = () => {
    const loja = comLoja();
    TestRenderer.act(() => { loja().addHealthNote(CONSULTA, 'Rita', 'O que o médico disse'); });
    return loja;
  };

  it('o Tomás não altera a nota da Rita', () => {
    const loja = comUmaNotaDaRita();
    const a = notasDe(loja, CONSULTA)[0];
    let erro;
    TestRenderer.act(() => { erro = loja().editarNotaSaude(CONSULTA, a.id, 'Outra coisa', 'Tomás'); });
    expect(erro).toBe('Só quem escreveu a nota a pode alterar.');
    expect(notasDe(loja, CONSULTA)[0].text).toBe('O que o médico disse');
  });

  it('nem a apaga', () => {
    const loja = comUmaNotaDaRita();
    const a = notasDe(loja, CONSULTA)[0];
    let erro;
    TestRenderer.act(() => { erro = loja().apagarNotaSaude(CONSULTA, a.id, 'Tomás'); });
    expect(erro).toBe('Só quem escreveu a nota a pode apagar.');
    expect(notasDe(loja, CONSULTA)).toHaveLength(1);
  });

  it('⚠ e sem dizer QUEM também não — o esquecimento não abre a porta', () => {
    // `quem` é obrigatório de propósito: um `editarNotaSaude(id, nota, texto)`
    // sem autor não pode passar por «é do próprio».
    const loja = comUmaNotaDaRita();
    const a = notasDe(loja, CONSULTA)[0];
    expect(loja().editarNotaSaude(CONSULTA, a.id, 'Outra coisa')).toBeTruthy();
    expect(loja().apagarNotaSaude(CONSULTA, a.id)).toBeTruthy();
    expect(notasDe(loja, CONSULTA)[0].text).toBe('O que o médico disse');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E pelo caminho da app.
// ─────────────────────────────────────────────────────────────────────────────
describe('pela interface, dentro da consulta', () => {
  const abrir = (user) => {
    let r = null, api = null;
    const t = buildTheme('violet', false);
    const Sonda = () => { api = useStore(); return null; };
    TestRenderer.act(() => {
      r = TestRenderer.create(React.createElement(SafeAreaProvider,
        { initialMetrics: { frame: { x: 0, y: 0, width: 412, height: 915 },
                            insets: { top: 47, left: 0, right: 0, bottom: 34 } } },
        React.createElement(StoreProvider, null,
          React.createElement(React.Fragment, null,
            React.createElement(Sonda),
            React.createElement(Saude, { t, user, onClose: () => {}, onAbrirFicha: () => {} })))));
    });
    return { r, loja: () => api };
  };

  const junta = (n) => {
    if (n === null || n === undefined || n === false) return '';
    if (typeof n === 'string' || typeof n === 'number') return String(n);
    if (Array.isArray(n)) return n.map(junta).join(' ');
    return junta(n.children || (n.props && n.props.children) || null);
  };

  const alvos = (r, rot) => r.root.findAll(x => x.props
    && x.props.accessibilityLabel === rot && typeof x.props.onPress === 'function');
  const tocar = (r, rot) => {
    const n = alvos(r, rot)[0];
    expect(n).toBeTruthy();
    TestRenderer.act(() => { n.props.onPress(); });
  };
  const escrever = (r, rot, texto) => {
    const c = r.root.findAll(x => x.props && typeof x.props.onChangeText === 'function'
      && x.props.accessibilityLabel === rot)[0];
    expect(c).toBeTruthy();
    TestRenderer.act(() => { c.props.onChangeText(texto); });
  };

  // A consulta da Mia, que está nas sementes.
  const consultaAberta = (user) => {
    const { r, loja } = abrir(user);
    const linha = r.root.findAll(x => x.props && typeof x.props.onPress === 'function'
      && /^Dentista, Mia/.test(x.props.accessibilityLabel || ''))[0];
    expect(linha).toBeTruthy();
    TestRenderer.act(() => { linha.props.onPress(); });
    return { r, loja };
  };

  it('⚠ o campo está lá sem mais nenhum toque', () => {
    const { r, loja } = consultaAberta('Rita');
    // ⚠ `{ deep: false }`. Sem isto vêm DOIS: o `TextInput` e o elemento que
    // ele desenha por dentro, com os mesmos adereços. A prova falhou por
    // «2 em vez de 1» e não por haver dois campos no ecrã.
    const campo = r.root.findAll(x => x.props && typeof x.props.onChangeText === 'function'
      && x.props.accessibilityLabel === 'Acrescentar uma nota', { deep: false });
    expect(campo).toHaveLength(1);
    expect(junta(r.toJSON())).not.toContain('Adicionar nota');

    // ⚠ E vazio não guarda nada. O `Pressable` desactivado CONTINUA a expor
    // `onPress` — ao contrário do `Primary`, que o troca por `undefined` — e
    // portanto a sonda vê-o e pode chamá-lo. Quem recusa é a loja.
    tocar(r, 'Guardar nota');
    expect(Object.values(loja().s.healthNotes || {}).flat()).toHaveLength(0);
  });

  it('escrever e guardar põe a nota na consulta', () => {
    const { r, loja } = consultaAberta('Rita');
    escrever(r, 'Acrescentar uma nota', 'Levar o raio-x');
    tocar(r, 'Guardar nota');
    const id = Object.keys(loja().s.healthNotes)[0];
    expect(loja().s.healthNotes[id][0]).toMatchObject({ author: 'Rita', text: 'Levar o raio-x' });
    expect(junta(r.toJSON())).toContain('Levar o raio-x');
  });

  it('⚠ e o lápis altera-a no lugar', () => {
    const { r, loja } = consultaAberta('Rita');
    escrever(r, 'Acrescentar uma nota', 'Levar o raio-x');
    tocar(r, 'Guardar nota');

    tocar(r, 'Alterar a nota de Rita');
    escrever(r, 'Texto da nota', 'Levar o raio-x e a receita');
    tocar(r, 'Guardar a alteração');

    const id = Object.keys(loja().s.healthNotes)[0];
    expect(loja().s.healthNotes[id][0].text).toBe('Levar o raio-x e a receita');
    expect(junta(r.toJSON())).toContain('Levar o raio-x e a receita');
  });

  it('cancelar deixa o texto como estava', () => {
    const { r, loja } = consultaAberta('Rita');
    escrever(r, 'Acrescentar uma nota', 'Levar o raio-x');
    tocar(r, 'Guardar nota');

    tocar(r, 'Alterar a nota de Rita');
    escrever(r, 'Texto da nota', 'Outra coisa qualquer');
    tocar(r, 'Cancelar a alteração');

    const id = Object.keys(loja().s.healthNotes)[0];
    expect(loja().s.healthNotes[id][0].text).toBe('Levar o raio-x');
    expect(junta(r.toJSON())).not.toContain('Outra coisa qualquer');
  });

  it('e o lixo apaga-a', () => {
    const { r, loja } = consultaAberta('Rita');
    escrever(r, 'Acrescentar uma nota', 'Levar o raio-x');
    tocar(r, 'Guardar nota');
    tocar(r, 'Apagar a nota de Rita');

    const id = Object.keys(loja().s.healthNotes)[0];
    expect(loja().s.healthNotes[id]).toHaveLength(0);
    expect(junta(r.toJSON())).not.toContain('Levar o raio-x');
  });

  // A nota entra pela loja e não pelo ecrã, porque o autor tem de ser a Rita e
  // quem está a ver tem de ser o Tomás. Cada `abrir` monta uma loja NOVA — a
  // primeira versão desta prova escrevia numa e lia noutra, e falhou por isso.
  const comNotaDaRita = (user) => {
    const { r, loja } = abrir(user);
    // 'h1' é a consulta de Dentista da Mia, nas sementes.
    TestRenderer.act(() => { loja().addHealthNote('h1', 'Rita', 'Levar o raio-x'); });
    const linha = r.root.findAll(x => x.props && typeof x.props.onPress === 'function'
      && /^Dentista, Mia/.test(x.props.accessibilityLabel || ''))[0];
    expect(linha).toBeTruthy();
    TestRenderer.act(() => { linha.props.onPress(); });
    return { r, loja };
  };

  it('⚠ e a nota da Rita não oferece lápis nenhum ao Tomás', () => {
    // A loja recusa de qualquer modo — isto é não oferecer o alvo, que é a
    // outra metade. E ele VÊ-A: esconder o texto seria outra coisa, e errada.
    const minha = comNotaDaRita('Rita');
    expect(junta(minha.r.toJSON())).toContain('Levar o raio-x');
    expect(alvos(minha.r, 'Alterar a nota de Rita')).toHaveLength(1);
    expect(alvos(minha.r, 'Apagar a nota de Rita')).toHaveLength(1);

    const dele = comNotaDaRita('Tomás');
    expect(junta(dele.r.toJSON())).toContain('Levar o raio-x');
    expect(alvos(dele.r, 'Alterar a nota de Rita')).toHaveLength(0);
    expect(alvos(dele.r, 'Apagar a nota de Rita')).toHaveLength(0);
  });

  it('⚠ os alvos do lápis e do lixo têm 44', () => {
    const { r } = consultaAberta('Rita');
    escrever(r, 'Acrescentar uma nota', 'Levar o raio-x');
    tocar(r, 'Guardar nota');
    for (const rot of ['Alterar a nota de Rita', 'Apagar a nota de Rita', 'Guardar nota']) {
      const n = alvos(r, rot)[0];
      expect(n).toBeTruthy();
      const estilo = typeof n.props.style === 'function'
        ? [].concat(n.props.style({ pressed: false })).filter(Boolean)
        : [].concat(n.props.style).filter(Boolean);
      const junto = Object.assign({}, ...estilo);
      expect(junto.minWidth).toBeGreaterThanOrEqual(44);
      expect(junto.minHeight).toBeGreaterThanOrEqual(44);
    }
  });
});
