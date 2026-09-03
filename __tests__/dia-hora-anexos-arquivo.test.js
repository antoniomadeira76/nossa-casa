/**
 * Os pontos 5, 6 e 7 da revalidação da Saúde — a validação está no TAREFAS.md.
 *
 *   5. dia e hora são UM controlo, e a hora não é texto livre
 *   6. arquivar uma consulta, que não apaga nada
 *   7. anexar um exame, uma receita ou um relatório
 *
 * ⚠ A fotografia do documento fica de fora, e não é esquecimento: um ficheiro
 * clínico de menor entra em `anexos`, e é dessa peça que os cinco pontos do
 * db/postgres/README.md mais falam. Ponto 8, e é decisão à parte.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider, useStore } = require('../src/store');
const { buildTheme } = require('../src/theme');
const Saude = require('../src/screens/Saude').default;
const CampoData = require('../src/CampoData').default;

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
  && x.props.accessibilityLabel === rot
  && typeof x.props.onPress === 'function');

const tocar = (r, rot) => {
  const n = alvos(r, rot)[0];
  expect(n).toBeTruthy();
  TestRenderer.act(() => { n.props.onPress(); });
};

const campoData = (r) => r.root.findAll(x => x.props
  && typeof x.props.onChange === 'function'
  && Object.prototype.hasOwnProperty.call(x.props, 'valor'))[0];

const escrever = (r, rot, texto) => {
  const campo = r.root.findAll(x => x.props && typeof x.props.onChangeText === 'function'
    && x.props.accessibilityLabel === rot)[0];
  expect(campo).toBeTruthy();
  TestRenderer.act(() => { campo.props.onChangeText(texto); });
};

// Marcar uma consulta e deixá-la aberta.
const consultaAberta = (membro) => {
  const quem = membro || 'Léo';
  const { r, loja } = abrir('Rita');
  tocar(r, 'marcar consulta');
  tocar(r, quem);
  tocar(r, 'Dentista');
  TestRenderer.act(() => { campoData(r).props.onChange('d2026-09-20'); });
  tocar(r, 'Marcar e Pôr na Agenda');
  const linha = r.root.findAll(x => x.props && typeof x.props.onPress === 'function'
    && new RegExp('^Dentista, ' + quem).test(x.props.accessibilityLabel || ''))[0];
  expect(linha).toBeTruthy();
  TestRenderer.act(() => { linha.props.onPress(); });
  return { r, loja };
};

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠ 5. dia e hora são UM controlo', () => {
  const campo = (props) => {
    let r = null;
    TestRenderer.act(() => {
      r = TestRenderer.create(React.createElement(CampoData,
        { t: buildTheme('violet', false), valor: null, onChange: () => {}, ...props }));
    });
    return r;
  };

  it('sem `onHora` é exactamente o que era — os outros ecrãs não mudam', () => {
    const r = campo({});
    tocar(r, 'Escolher no calendário');
    expect(junta(r.toJSON())).not.toContain('Hora');
  });

  it('com `onHora` traz a hora por baixo do calendário', () => {
    const r = campo({ hora: '09:00', onHora: () => {} });
    tocar(r, 'Escolher no calendário');
    const texto = junta(r.toJSON());
    expect(texto).toContain('Hora');
    // ⚠ O `junta` separa os nós de texto: o ecrã diz «09:00» e a sonda vê
    // «09 : 00». A prova mede o que a sonda vê, não o que o olho lê.
    expect(texto).toMatch(/09\s*:\s*00/);
  });

  it('a hora anda de hora em hora, e dá a volta em 23', () => {
    let hora = '23:30';
    const r = campo({ hora, onHora: (v) => { hora = v; } });
    tocar(r, 'Escolher no calendário');
    tocar(r, 'Hora seguinte');
    expect(hora).toBe('00:30');
  });

  it('e para trás dá a volta em 0', () => {
    let hora = '00:15';
    const r = campo({ hora, onHora: (v) => { hora = v; } });
    tocar(r, 'Escolher no calendário');
    tocar(r, 'Hora anterior');
    expect(hora).toBe('23:15');
  });

  it('os minutos são os quartos de hora, e guardam a hora escolhida', () => {
    let hora = '14:00';
    const r = campo({ hora, onHora: (v) => { hora = v; } });
    tocar(r, 'Escolher no calendário');
    tocar(r, '14:45');
    expect(hora).toBe('14:45');
  });

  it('⚠ e uma hora impossível é dita, não gravada em silêncio', () => {
    const r = campo({ valor: 'd2026-09-03', hora: '25:99', onHora: () => {} });
    expect(junta(r.toJSON())).toContain('Essa hora não existe.');
  });

  it('a legenda diz o dia E a hora, numa frase', () => {
    const r = campo({ valor: 'd2026-09-03', hora: '09:00', onHora: () => {} });
    expect(junta(r.toJSON())).toMatch(/03\/09.*às 09:00/);
  });

  it('⚠ e escolher o dia não fecha o painel quando há hora para escolher', () => {
    // Fechava, e a segunda metade do controlo parecia não existir.
    const r = campo({ hora: '09:00', onHora: () => {} });
    tocar(r, 'Escolher no calendário');
    tocar(r, 'Escolher hoje');
    expect(junta(r.toJSON())).toContain('Hora');
  });

  it('e a Saúde já não tem um campo de hora à parte', () => {
    const { r } = abrir('Rita');
    tocar(r, 'marcar consulta');
    expect(junta(r.toJSON())).toContain('Dia e hora');
    expect(r.root.findAll(x => x.props && x.props.placeholder === 'hh:mm')).toEqual([]);
  });

  it('⚠ e o campo da Saúde PASSA o `onHora` — senão a hora não existe ali', () => {
    // A primeira versão desta prova não morria ao tirar o `onHora` do
    // formulário: as provas da hora exercitavam o `CampoData` directamente,
    // com o `onHora` posto pela própria prova. Tirar o adereço na Saúde deixava
    // o ecrã sem hora nenhuma e as provas todas verdes.
    const { r } = abrir('Rita');
    tocar(r, 'marcar consulta');
    const comHora = r.root.findAll(x => x.props
      && typeof x.props.onChange === 'function'
      && typeof x.props.onHora === 'function'
      && Object.prototype.hasOwnProperty.call(x.props, 'valor'));
    expect(comHora.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠ 7. anexar um documento a uma consulta', () => {
  const abrirAnexo = () => {
    const { r, loja } = consultaAberta();
    tocar(r, 'Anexar Exame ou Receita');
    return { r, loja };
  };

  it('a folha abre da consulta, com os três tipos', () => {
    const texto = junta(abrirAnexo().r.toJSON());
    for (const k of ['Exame', 'Receita', 'Relatório']) expect(texto).toContain(k);
  });

  it('⚠ o documento fica ligado à consulta — «nenhum exame órfão»', () => {
    const { r, loja } = abrirAnexo();
    escrever(r, 'Nome do documento', 'Análises de sangue');
    tocar(r, 'Anexar');
    const doc = loja().s.healthDocs[0];
    expect(doc).toBeTruthy();
    expect(doc.healthId).toBe(loja().s.health[0].id);
    expect(doc.member).toBe('Léo');
    expect(doc.title).toBe('Análises de sangue');
  });

  it('sem nome não se anexa nada', () => {
    const { r, loja } = abrirAnexo();
    // O `Primary` desactivado não expõe `onPress`.
    expect(alvos(r, 'Anexar').length).toBe(0);
    expect(loja().s.healthDocs).toEqual([]);
  });

  it('a validade só aparece para receitas', () => {
    const { r } = abrirAnexo();
    expect(junta(r.toJSON())).not.toContain('Validade da receita');
    tocar(r, 'Receita');
    expect(junta(r.toJSON())).toContain('Validade da receita');
  });

  it('⚠ e trocar de tipo limpa a validade — um exame com prazo era uma receita', () => {
    // O `receitasAExpirarDe` filtra por `kind === Receita`, mas um exame com
    // `expires` é um dado errado à espera de alguém alargar esse filtro.
    const { r, loja } = abrirAnexo();
    tocar(r, 'Receita');
    const dat = r.root.findAll(x => x.props && typeof x.props.onChange === 'function'
      && Object.prototype.hasOwnProperty.call(x.props, 'valor'))
      .filter(x => x.props.valor !== 'd2026-09-20').pop();
    TestRenderer.act(() => { dat.props.onChange('d2026-12-31'); });
    tocar(r, 'Exame');
    escrever(r, 'Nome do documento', 'Radiografia');
    tocar(r, 'Anexar');
    expect(loja().s.healthDocs[0].expires).toBeUndefined();
  });

  it('e o anexo aparece na consulta de onde saiu', () => {
    const { r, loja } = abrirAnexo();
    escrever(r, 'Nome do documento', 'Análises de sangue');
    tocar(r, 'Anexar');
    const texto = junta(r.toJSON());
    // ⚠ Com espaços tolerados: a sonda junta os nós de texto com um espaço,
    // portanto o ecrã diz «(1)» e ela vê «( 1 )».
    expect(texto).toMatch(/Anexos desta consulta \(\s*1\s*\)/);
    expect(texto).toContain('Análises de sangue');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠ 6. arquivar uma consulta não apaga nada', () => {
  it('sai do «precisa de ação» e vai para «Arquivadas»', () => {
    const { r, loja } = consultaAberta();
    expect(junta(r.toJSON())).toContain('Precisa de ação');
    tocar(r, 'Arquivar a consulta de Dentista');
    expect(junta(r.toJSON())).toMatch(/Arquivadas \(\s*1\s*\)/);
    expect(loja().s.healthArchived[loja().s.health[0].id]).toBe(true);

    // ⚠ E SAIU do que precisa de ação. Sem esta linha a prova não morria
    // quando as arquivadas deixavam de ser filtradas: a secção «Arquivadas»
    // aparecia de qualquer modo, porque é calculada à parte, e a consulta
    // ficava nas DUAS listas ao mesmo tempo sem ninguém dar por isso.
    const texto = junta(r.toJSON());
    const antesDeArquivadas = texto.slice(0, texto.search(/Arquivadas \(/));
    expect(antesDeArquivadas).not.toContain('Dentista Léo');
    expect(texto).toMatch(/Precisa de ação \(\s*4\s*\)/);
  });

  it('⚠ e a consulta CONTINUA lá — arquivar não é apagar', () => {
    const { r, loja } = consultaAberta();
    tocar(r, 'Arquivar a consulta de Dentista');
    expect(loja().s.health).toHaveLength(1);
    expect(loja().s.healthGone[loja().s.health[0].id]).toBeUndefined();
    expect(junta(r.toJSON())).toContain('Dentista');
  });

  it('e volta com um toque, como a frase promete', () => {
    const { r, loja } = consultaAberta();
    tocar(r, 'Arquivar a consulta de Dentista');
    tocar(r, 'Desarquivar a consulta de Dentista');
    expect(loja().s.healthArchived[loja().s.health[0].id]).toBe(false);
    expect(junta(r.toJSON())).not.toContain('Arquivadas (');
  });

  it('e os anexos ficam ligados', () => {
    const { r, loja } = consultaAberta();
    const ep = loja().s.health[0];
    TestRenderer.act(() => { loja().addHealthDoc(ep.id, 'Léo', { kind: 'Exame', title: 'Radiografia' }); });
    tocar(r, 'Arquivar a consulta de Dentista');
    expect(loja().docsDaConsulta(ep.id)).toHaveLength(1);
  });

  it('a frase que promete está no ecrã', () => {
    const { r } = consultaAberta();
    expect(junta(r.toJSON()))
      .toContain('Arquivar não apaga nada — os anexos ficam ligados e a consulta volta com um toque.');
  });
});
