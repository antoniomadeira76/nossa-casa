/**
 * Marcar uma consulta.
 *
 * ── Três defeitos, e o pior era o silencioso ─────────────────────────────────
 *
 * 1. NENHUM EPISÓDIO. Marcar consulta criava só o evento na agenda. O
 *    `addHealthRecord` existia na loja e nada o chamava: numa casa a sério a
 *    Ficha de Saúde ficava vazia PARA SEMPRE. O ecrã dizia «Ainda não há nada
 *    nas fichas desta casa. Use Marcar Consulta para a primeira» — e usar
 *    Marcar Consulta não punha lá nada. É o «nenhum exame órfão» do
 *    TAREFAS.md: a consulta É o evento, e o evento tem de ter episódio.
 *
 * 2. A VISIBILIDADE ERRADA. O evento levava `shared: true` — o campo de antes
 *    dos três níveis — e o `visibilidadeDe` lê `shared: true` como «família».
 *    A consulta do Léo aparecia na agenda da Mia, e a de um adulto aparecia ao
 *    outro. A primeira linha do ecrã da Saúde promete exactamente o contrário.
 *
 * 3. O SELECTOR OFERECIA DEMASIADO. `membrosDaCasa` inteiro, o outro adulto
 *    incluído — e a ficha de um adulto é só dele (INVARIANTE #3). A Rita
 *    marcava ao Tomás e ficava com um episódio que não vê e um evento que não
 *    lhe aparece: escrevia no escuro.
 *
 * ⚠ A saúde continua a NÃO ir para servidor nenhum. Isto é tudo local, como
 * era: o CLAUDE.md põe `episodios_saude` e `anexos` fora das coleções até os
 * cinco pontos do db/postgres/README.md estarem resolvidos, e nada aqui mexe
 * nisso. São dados clínicos de menores.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider, useStore, podeVerSaude, podeVerEvento, visibilidadeDe } = require('../src/store');
const { buildTheme } = require('../src/theme');
const Saude = require('../src/screens/Saude').default;

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

// O campo da data usa o `CampoData`; o que a folha lê é o `onChange` dele com
// uma chave. Escreve-se por aí em vez de simular teclas.
const escreverData = (r, chave) => {
  const campo = r.root.findAll(x => x.props && typeof x.props.onChange === 'function'
    && Object.prototype.hasOwnProperty.call(x.props, 'valor'))[0];
  expect(campo).toBeTruthy();
  TestRenderer.act(() => { campo.props.onChange(chave); });
};

const marcar = ({ user, membro, especialidade, chave }) => {
  const { r, loja } = abrir(user);
  tocar(r, 'marcar consulta');
  if (membro) tocar(r, membro);
  tocar(r, especialidade);
  escreverData(r, chave);
  tocar(r, 'Marcar Consulta');
  return { r, loja };
};

describe('⚠ marcar consulta cria o episódio, não só o evento', () => {
  it('a ficha passa a ter a consulta — era isto que faltava', () => {
    const { loja } = marcar({ user: 'Rita', membro: 'Léo', especialidade: 'Dentista', chave: 'd2026-09-20' });
    const novos = loja().s.health;
    expect(novos).toHaveLength(1);
    expect(novos[0]).toMatchObject({ member: 'Léo', specialty: 'Dentista', day: 'd2026-09-20' });
    expect(novos[0].id).toMatch(/^hlth-/);
  });

  it('e o evento da agenda aponta para esse episódio', () => {
    const { loja } = marcar({ user: 'Rita', membro: 'Léo', especialidade: 'Dentista', chave: 'd2026-09-20' });
    const ep = loja().s.health[0];
    const ev = loja().s.added.find(e => e.tag === 'Saúde');
    expect(ev).toBeTruthy();
    expect(ev.healthId).toBe(ep.id);
    expect(ev.title).toBe('Consulta Dentista');
  });

  it('⚠ e não fica nenhum evento de saúde sem episódio', () => {
    // A prova do item 71 do TAREFAS.md, dita ao contrário: percorre os eventos
    // com etiqueta «Saúde» e exige que cada um tenha o seu episódio.
    const { loja } = marcar({ user: 'Rita', membro: 'Mia', especialidade: 'Pediatria', chave: 'd2026-09-21' });
    const ids = new Set(loja().s.health.map(h => h.id));
    const orfaos = loja().s.added
      .filter(e => e.tag === 'Saúde' && e.healthId)
      .filter(e => !ids.has(e.healthId));
    expect(orfaos).toEqual([]);
  });

  it('e o campo obrigatório é obrigatório: sem data não se cria nada', () => {
    const { r, loja } = abrir('Rita');
    tocar(r, 'marcar consulta');
    tocar(r, 'Dentista');
    const antes = loja().s.health.length;
    // O botão está lá, mas a folha recusa sem data.
    if (alvos(r, 'Marcar Consulta').length) tocar(r, 'Marcar Consulta');
    expect(loja().s.health).toHaveLength(antes);
  });
});

describe('⚠ a visibilidade do evento espelha a da saúde (INVARIANTE #3)', () => {
  it('a consulta de uma criança é dos adultos, e a criança NÃO a vê', () => {
    const { loja } = marcar({ user: 'Rita', membro: 'Léo', especialidade: 'Dentista', chave: 'd2026-09-20' });
    const ev = loja().s.added.find(e => e.tag === 'Saúde');

    expect(visibilidadeDe(ev)).toBe('adultos');
    // ⚠ E o dono NÃO é a criança: o `podeVerEvento` devolve verdade ao dono,
    // portanto pôr o Léo como dono mostrava-lhe a própria consulta.
    expect(ev.owner).not.toBe('Léo');

    expect(loja().podeVerEvento(ev, 'Rita')).toBe(true);
    expect(loja().podeVerEvento(ev, 'Tomás')).toBe(true);
    expect(loja().podeVerEvento(ev, 'Léo')).toBe(false);
    expect(loja().podeVerEvento(ev, 'Mia')).toBe(false);
  });

  it('a consulta de um adulto é só dele — nem o outro adulto a vê', () => {
    const { loja } = marcar({ user: 'Rita', membro: 'Rita', especialidade: 'Medicina geral', chave: 'd2026-09-22' });
    const ev = loja().s.added.find(e => e.tag === 'Saúde');

    expect(visibilidadeDe(ev)).toBe('so-eu');
    expect(ev.owner).toBe('Rita');
    expect(loja().podeVerEvento(ev, 'Rita')).toBe(true);
    expect(loja().podeVerEvento(ev, 'Tomás')).toBe(false);
    expect(loja().podeVerEvento(ev, 'Léo')).toBe(false);
  });

  it('⚠ e o `shared` antigo não volta — era ele que dizia «família»', () => {
    const { loja } = marcar({ user: 'Rita', membro: 'Léo', especialidade: 'Dentista', chave: 'd2026-09-20' });
    const ev = loja().s.added.find(e => e.tag === 'Saúde');
    expect(ev.shared).toBeUndefined();
    expect(ev.visibilidade).toBeDefined();
  });

  it('e quem vê o evento é exactamente quem vê a ficha', () => {
    // A regra do evento não pode ser uma segunda ideia da regra da saúde: se
    // divergirem, uma delas está errada e ninguém sabe qual.
    for (const membro of ['Léo', 'Mia']) {
      const { loja } = marcar({ user: 'Rita', membro, especialidade: 'Dentista', chave: 'd2026-09-20' });
      const ev = loja().s.added.find(e => e.tag === 'Saúde');
      for (const quem of ['Rita', 'Tomás', 'Léo', 'Mia']) {
        expect(loja().podeVerEvento(ev, quem)).toBe(podeVerSaude(membro, quem));
      }
    }
  });
});

describe('⚠ o selector só oferece fichas que quem marca pode ver', () => {
  it('a Rita marca para si e para as crianças, nunca para o Tomás', () => {
    const { r } = abrir('Rita');
    tocar(r, 'marcar consulta');
    for (const n of ['Rita', 'Léo', 'Mia']) expect(alvos(r, n).length).toBeGreaterThan(0);
    // O Tomás aparece noutros sítios do ecrã; o que não pode é ser marcável.
    // A pastilha do selector é a que tem `accessibilityState.selected`.
    const pastilhas = r.root.findAll(x => x.props
      && x.props.accessibilityLabel === 'Tomás'
      && x.props.accessibilityState
      && Object.prototype.hasOwnProperty.call(x.props.accessibilityState, 'selected'));
    expect(pastilhas).toEqual([]);
  });

  it('e o Tomás marca para si e para as crianças, nunca para a Rita', () => {
    const { r } = abrir('Tomás');
    tocar(r, 'marcar consulta');
    for (const n of ['Tomás', 'Léo', 'Mia']) expect(alvos(r, n).length).toBeGreaterThan(0);
    const pastilhas = r.root.findAll(x => x.props
      && x.props.accessibilityLabel === 'Rita'
      && x.props.accessibilityState
      && Object.prototype.hasOwnProperty.call(x.props.accessibilityState, 'selected'));
    expect(pastilhas).toEqual([]);
  });
});

describe('renomear uma especialidade, pela interface', () => {
  const atéÀsEspecialidades = (user) => {
    const { r, loja } = abrir(user || 'Rita');
    tocar(r, 'marcar consulta');
    tocar(r, 'Especialidades');
    return { r, loja };
  };

  const escrever = (r, texto) => {
    const campo = r.root.findAll(x => x.props && typeof x.props.onChangeText === 'function'
      && x.props.placeholder === 'Ex: Cardiologia')[0];
    expect(campo).toBeTruthy();
    TestRenderer.act(() => { campo.props.onChangeText(texto); });
  };

  it('o lápis traz o nome para o campo, e o rótulo diz o que se está a fazer', () => {
    const { r } = atéÀsEspecialidades();
    expect(junta(r.toJSON())).toContain('Adicionar especialidade');
    tocar(r, 'Renomear Pediatria');
    expect(junta(r.toJSON())).toContain('Renomear «Pediatria»');
  });

  it('⚠ e guardar migra o episódio, não só a lista', () => {
    // É a razão pela qual o renomear tinha sido RETIRADO da interface: o
    // `renameSpecialty` trocava o nome na lista e deixava as consultas a
    // apontar para um nome que já não existia.
    const { r, loja } = marcar({ user: 'Rita', membro: 'Léo', especialidade: 'Pediatria', chave: 'd2026-09-20' });
    expect(loja().s.health[0].specialty).toBe('Pediatria');

    // Guardar a consulta FECHA a folha — reabre-se para ir às especialidades.
    tocar(r, 'marcar consulta');
    tocar(r, 'Especialidades');
    tocar(r, 'Renomear Pediatria');
    escrever(r, 'Puericultura');
    tocar(r, 'Guardar o nome');

    expect(loja().s.specialities).toContain('Puericultura');
    expect(loja().s.specialities).not.toContain('Pediatria');
    expect(loja().s.health[0].specialty).toBe('Puericultura');
    expect(loja().s.added.find(e => e.tag === 'Saúde').title).toBe('Consulta Puericultura');
  });

  it('cancelar deixa tudo como estava', () => {
    const { r, loja } = atéÀsEspecialidades();
    tocar(r, 'Renomear Pediatria');
    escrever(r, 'Outra coisa');
    tocar(r, 'Cancelar');
    expect(junta(r.toJSON())).toContain('Adicionar especialidade');
    expect(loja().s.specialities).toContain('Pediatria');
  });

  it('⚠ e a recusa da loja aparece no ecrã, em português', () => {
    // Sem isto o toque no visto não fazia nada e a pessoa não sabia porquê.
    const { r } = atéÀsEspecialidades();
    tocar(r, 'Renomear Pediatria');
    escrever(r, 'x'.repeat(41));
    tocar(r, 'Guardar o nome');
    expect(junta(r.toJSON())).toContain('O nome não pode passar de 40 caracteres.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠ os dois botões do campo têm 44 de LARGURA, não só de altura', () => {
  const fs = require('fs');
  const path = require('path');
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'src/screens/Saude.jsx'), 'utf8');

  it('o de acrescentar e o de guardar declaram minWidth', () => {
    // Medido no navegador a 412: o de acrescentar dava 36 de largura. O
    // enchimento comprime-se porque o campo ao lado é `flex: 1`, e com o
    // renomear activo há três coisas na linha em vez de duas.
    //
    // ⚠ Isto é anterior a esta alteração e viveu escondido porque a prova de
    // alvos em `alvos-e-navegacao.test.js` confere `height`/`minHeight` e NÃO
    // a largura. O INVARIANTE #5 não fala só de altura — está escrito lá.
    const i = codigo.indexOf("aRenomear ? `Renomear");
    expect(i).toBeGreaterThan(0);
    const bloco = codigo.slice(i, i + 3200);
    expect((bloco.match(/minWidth: 44, minHeight: 44/g) || [])).toHaveLength(2);
  });
});
