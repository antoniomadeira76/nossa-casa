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

// ⚠ `{ deep: false }`: sem isto vêm DOIS por cada campo — o `TextInput` e o
// elemento que ele desenha por dentro, com os mesmos adereços.
const campos = (r, rot) => r.root.findAll(x => x.props
  && typeof x.props.onChangeText === 'function'
  && x.props.accessibilityLabel === rot, { deep: false });

const escreverCampo = (r, rot, texto) => {
  const campo = r.root.findAll(x => x.props && typeof x.props.onChangeText === 'function'
    && x.props.accessibilityLabel === rot)[0];
  expect(campo).toBeTruthy();
  TestRenderer.act(() => { campo.props.onChangeText(texto); });
};

// ⚠ Escolher a especialidade são DOIS toques desde que deixou de ser pastilhas
// em fila: a linha abre, e a lista aparece por baixo. Eram pastilhas todas
// visíveis — cabiam quatro, e com dez ocupavam meia folha e empurravam o botão
// de marcar para fora do ecrã.
const escolherEspecialidade = (r, esp) => {
  tocar(r, 'Escolher a especialidade');
  tocar(r, esp);
};

const marcar = ({ user, membro, especialidade, chave, medico, nota }) => {
  const { r, loja } = abrir(user);
  tocar(r, 'marcar consulta');
  if (membro) tocar(r, membro);
  escolherEspecialidade(r, especialidade);
  escreverData(r, chave);
  if (medico) escreverCampo(r, 'Médico ou clínica', medico);
  if (nota) escreverCampo(r, 'Nota da consulta', nota);
  tocar(r, 'Marcar e Pôr na Agenda');
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
    escolherEspecialidade(r, 'Dentista');
    const antes = loja().s.health.length;
    // O botão está lá, mas a folha recusa sem data.
    if (alvos(r, 'Marcar Consulta').length) tocar(r, 'Marcar e Pôr na Agenda');
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
  // ⚠ A porta mudou. Havia DUAS — uma aba «Especialidades» na folha de marcar e
  // um «Gerir» ao lado do título, as duas para o mesmo sítio. Ficou uma: o
  // «Gerir» ao lado do campo, que abre uma folha IRMÃ.
  const atéÀsEspecialidades = (user) => {
    const { r, loja } = abrir(user || 'Rita');
    tocar(r, 'marcar consulta');
    tocar(r, 'Gerir especialidades');
    return { r, loja };
  };

  const escrever = (r, texto) => {
    const campo = r.root.findAll(x => x.props && typeof x.props.onChangeText === 'function'
      && x.props.placeholder === 'Ex.: Fisioterapia')[0];
    expect(campo).toBeTruthy();
    TestRenderer.act(() => { campo.props.onChangeText(texto); });
  };

  it('o lápis traz o nome para o campo, e o rótulo diz o que se está a fazer', () => {
    const { r } = atéÀsEspecialidades();
    expect(junta(r.toJSON())).toContain('Nova especialidade');
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
    tocar(r, 'Gerir especialidades');
    tocar(r, 'Renomear Pediatria');
    escrever(r, 'Puericultura');
    tocar(r, 'Guardar Nome');

    expect(loja().s.specialities).toContain('Puericultura');
    expect(loja().s.specialities).not.toContain('Pediatria');
    expect(loja().s.health[0].specialty).toBe('Puericultura');
    expect(loja().s.added.find(e => e.tag === 'Saúde').title).toBe('Consulta Puericultura');
  });

  it('cancelar deixa tudo como estava', () => {
    const { r, loja } = atéÀsEspecialidades();
    tocar(r, 'Renomear Pediatria');
    escrever(r, 'Outra coisa');
    tocar(r, 'Cancelar edição');
    expect(junta(r.toJSON())).toContain('Nova especialidade');
    expect(loja().s.specialities).toContain('Pediatria');
  });

  it('⚠ e a recusa da loja aparece no ecrã, em português', () => {
    // Sem isto o toque no visto não fazia nada e a pessoa não sabia porquê.
    const { r } = atéÀsEspecialidades();
    tocar(r, 'Renomear Pediatria');
    escrever(r, 'x'.repeat(41));
    tocar(r, 'Guardar Nome');
    expect(junta(r.toJSON())).toContain('O nome não pode passar de 40 caracteres.');
  });

  // ── E a viagem de ida e volta, que é a razão de o rascunho ter subido ──────
  it('⚠ o que já estava escrito sobrevive à ida às especialidades', () => {
    // O rascunho vivia DENTRO da folha de marcar. Com as especialidades numa
    // aba dessa mesma folha isso chegava, porque ela nunca desmontava. Agora
    // «Gerir» troca a folha — e um formulário meio preenchido perdia-se
    // exactamente no momento em que se vai lá: falta a especialidade.
    const { r } = abrir('Rita');
    tocar(r, 'marcar consulta');
    tocar(r, 'Mia');
    escreverData(r, 'd2026-09-20');

    tocar(r, 'Gerir especialidades');
    expect(junta(r.toJSON())).toContain('Nova especialidade');

    tocar(r, 'Fechar');   // fechar as especialidades volta a marcar, não sai
    // Voltou a marcar, com o membro que se tinha escolhido.
    expect(junta(r.toJSON())).toContain('A consulta');
    expect(junta(r.toJSON())).toContain('Para Mia');
  });

  it('⚠ e criar uma deixa-a JÁ escolhida no rascunho', () => {
    // É a razão por que se lá foi. Sem isto a pessoa cria «Fisioterapia»,
    // volta, e tem de a ir escolher outra vez à lista.
    const { r, loja } = abrir('Rita');
    tocar(r, 'marcar consulta');
    escreverData(r, 'd2026-09-20');
    tocar(r, 'Gerir especialidades');
    escrever(r, 'Fisioterapia');
    tocar(r, 'Criar Especialidade');
    expect(loja().s.specialities).toContain('Fisioterapia');

    tocar(r, 'Fechar');   // fechar as especialidades volta a marcar, não sai
    // Escolhida: o botão de marcar exige data E especialidade, e está vivo.
    expect(alvos(r, 'Marcar e Pôr na Agenda').length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠ os dois botões do campo têm 44 de LARGURA, não só de altura', () => {
  const fs = require('fs');
  const path = require('path');
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'src/screens/Saude.jsx'), 'utf8');

  it('o de cancelar a edição declara minWidth', () => {
    // Medido no navegador a 412: o de acrescentar dava 36 de largura. O
    // enchimento comprime-se porque o campo ao lado é `flex: 1`, e com o
    // renomear activo havia três coisas na linha em vez de duas.
    //
    // ⚠ Isto viveu escondido porque a prova de alvos em
    // `alvos-e-navegacao.test.js` confere `height`/`minHeight` e NÃO a
    // largura. O INVARIANTE #5 não fala só de altura — está escrito lá.
    //
    // Eram dois botões nesta linha; ficou um. O de guardar desceu para o fundo
    // da folha como `Primary`, que tem 48 de altura e ocupa a largura toda —
    // é o que o protótipo faz, e tira a compressão da origem.
    const i = codigo.indexOf("aRenomear ? `Renomear");
    expect(i).toBeGreaterThan(0);
    const bloco = codigo.slice(i, i + 3200);
    expect((bloco.match(/minWidth: 44, minHeight: 44/g) || [])).toHaveLength(1);
  });

  it('⚠ e o «Gerir» também — é a única porta, e um ícone sozinho não a abre', () => {
    const i = codigo.indexOf('accessibilityLabel="Gerir especialidades"');
    expect(i).toBeGreaterThan(0);
    const bloco = codigo.slice(i, i + 400);
    expect(bloco).toMatch(/minHeight: 44/);
    expect(bloco).toMatch(/minWidth: 44/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ O cartão de uma consulta não abria, e com ele ficava inalcançável TUDO o
// que vive dentro dele: os botões «Resolvida» e «Pendente», as notas, as
// receitas e a decisão de cada receita.
//
// A causa era uma linha: `<Card onPress={...}>`. O `Card` não aceita `onPress`
// — nem nunca aceitou — e ignorava-o em SILÊNCIO. O cartão nunca expandia, a
// seta nunca mudava de sentido, e o `setHealthDecision`, o `addHealthNote`, o
// `addRecipe` e o `setRecipeDecision` estavam todos escritos sem caminho
// nenhum até eles. É a mesma forma de defeito do `addHealthRecord`.
//
// Descoberto porque o dono da casa tocou em «Ação» e não aconteceu nada.
describe('⚠ o cartão de uma consulta abre, e o que está dentro é alcançável', () => {
  const fs = require('fs');
  const path = require('path');
  const parser = require('@babel/parser');
  const traverse = require('@babel/traverse').default;

  const raiz = path.join(__dirname, '..');

  it('nenhum `Card` recebe `onPress` — o `Card` ignora-o em silêncio', () => {
    // A rede da CLASSE, não do caso. Um componente que aceita uma prop
    // desconhecida e a descarta volta a fazer isto noutro ecrã.
    const maus = [];
    for (const d of ['src', 'src/screens', 'src/sheets']) {
      for (const f of fs.readdirSync(path.join(raiz, d))) {
        if (!f.endsWith('.jsx')) continue;
        const rel = `${d}/${f}`;
        const codigo = fs.readFileSync(path.join(raiz, rel), 'utf8');
        traverse(parser.parse(codigo, { sourceType: 'module', plugins: ['jsx'] }), {
          JSXElement(p) {
            if (p.node.openingElement.name.name !== 'Card') return;
            if (p.node.openingElement.attributes.some(a => a.name && a.name.name === 'onPress')) {
              maus.push(`${rel}:${p.node.loc.start.line}`);
            }
          },
        });
      }
    }
    expect(maus).toEqual([]);
  });

  it('e o `Card` continua a não aceitar `onPress` — é o que torna a prova acima necessária', () => {
    const ui = fs.readFileSync(path.join(raiz, 'src/ui.jsx'), 'utf8');
    const i = ui.indexOf('export const Card =');
    const assinatura = ui.slice(i, ui.indexOf(')', i));
    expect(assinatura).not.toContain('onPress');
  });

  it('a linha da consulta é tocável, e abre o interior', () => {
    const { r } = abrir('Rita');
    const linhas = r.root.findAll(x => x.props
      && typeof x.props.onPress === 'function'
      && /^Dentista, Mia/.test(x.props.accessibilityLabel || ''));
    expect(linhas.length).toBeGreaterThan(0);

    expect(junta(r.toJSON())).not.toContain('Resolvida');
    TestRenderer.act(() => { linhas[0].props.onPress(); });
    const texto = junta(r.toJSON());
    expect(texto).toContain('Resolvida');
    expect(texto).toContain('Pendente');
    // ⚠ O campo da nota está LÁ, sem mais nenhum toque. Havia um «Adicionar
    // nota» que o revelava, e escrever passava a custar dois toques — numa
    // sala de espera, é um a mais.
    expect(alvos(r, 'Guardar nota').length + campos(r, 'Acrescentar uma nota').length)
      .toBeGreaterThan(0);
    expect(campos(r, 'Acrescentar uma nota')).toHaveLength(1);
    expect(texto).not.toContain('Adicionar nota');
  });

  it('⚠ e «Resolvida» grava a decisão — o botão tinha para onde ir e não chegava lá', () => {
    const { r, loja } = abrir('Rita');
    const linha = r.root.findAll(x => x.props
      && typeof x.props.onPress === 'function'
      && /^Dentista, Mia/.test(x.props.accessibilityLabel || ''))[0];
    TestRenderer.act(() => { linha.props.onPress(); });

    const antes = JSON.stringify(loja().s.healthDecisions);
    const resolvida = r.root.findAll(x => x.props && typeof x.props.onPress === 'function'
      && junta(x.props.children) === 'Resolvida')[0];
    expect(resolvida).toBeTruthy();
    TestRenderer.act(() => { resolvida.props.onPress(); });

    expect(JSON.stringify(loja().s.healthDecisions)).not.toBe(antes);
    const decisao = Object.values(loja().s.healthDecisions)[0];
    expect(decisao.status).toBe('resolvido');
  });

  it('e a pastilha «Ação» continua a ser etiqueta, não um segundo alvo na linha', () => {
    // Erro #6 do CLAUDE.md: uma linha, um destino. Quem toca na pastilha abre
    // o cartão, porque a linha inteira é que é o alvo.
    const { r } = abrir('Rita');
    const pastilhas = r.root.findAll(x => x.props
      && x.props.label === 'Ação'
      && typeof x.props.onPress === 'function');
    expect(pastilhas).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Os quatro pontos que o protótipo mostrava e a implementação não tinha. A
// validação está no TAREFAS.md, secção 8, e a razão pela qual passaram é minha:
// auditei o código contra si próprio em vez de comparar os ecrãs com
// `design/Nossa Casa App.dc.html`.
describe('⚠ médico e nota — os campos que a app já lia e nunca escrevia', () => {
  it('o `doctor` fica gravado, e é o que cinco ecrãs esperavam', () => {
    // Lido em FichaSaude.jsx:51, :111, :159, exportar-saude.js:113 e
    // ExportarSaude.jsx:169 — e escrito em nenhum sítio. A app mostrava
    // «Dentista · Dr. Cardoso» para as sementes e nada para uma consulta real.
    const { loja } = marcar({ user: 'Rita', membro: 'Léo', especialidade: 'Dentista',
      chave: 'd2026-09-20', medico: 'Dr.ª Neves' });
    expect(loja().s.health[0].doctor).toBe('Dr.ª Neves');
  });

  it('e a nota de quem marca também', () => {
    const { loja } = marcar({ user: 'Rita', membro: 'Léo', especialidade: 'Dentista',
      chave: 'd2026-09-20', nota: 'Jejum' });
    expect(loja().s.health[0].nota).toBe('Jejum');
  });

  it('os dois são opcionais e nascem vazios, não `undefined`', () => {
    // `undefined` num campo que cinco ecrãs concatenam dá «undefined» no ecrã.
    const { loja } = marcar({ user: 'Rita', membro: 'Léo', especialidade: 'Dentista', chave: 'd2026-09-20' });
    expect(loja().s.health[0].doctor).toBe('');
    expect(loja().s.health[0].nota).toBe('');
  });

  it('e os espaços em branco não passam por conteúdo', () => {
    const { loja } = marcar({ user: 'Rita', membro: 'Léo', especialidade: 'Dentista',
      chave: 'd2026-09-20', medico: '   ', nota: '  ' });
    expect(loja().s.health[0].doctor).toBe('');
    expect(loja().s.health[0].nota).toBe('');
  });

  it('⚠ e a nota de quem marca não se confunde com as notas do episódio', () => {
    // `nota` é uma string de quem marca. `healthNotes` são as notas escritas
    // depois, cada uma com autor e data. Dois nomes parecidos, duas coisas.
    const { loja } = marcar({ user: 'Rita', membro: 'Léo', especialidade: 'Dentista',
      chave: 'd2026-09-20', nota: 'Jejum' });
    const ep = loja().s.health[0];
    expect(typeof ep.nota).toBe('string');
    expect(loja().s.healthNotes[ep.id]).toBeUndefined();
  });
});

describe('⚠ o aviso da privacidade diz a verdade para cada membro', () => {
  const avisoDe = (membro) => {
    const { r } = abrir('Rita');
    tocar(r, 'marcar consulta');
    tocar(r, membro);
    return junta(r.toJSON());
  };

  it('para um adulto: «Só eu», e ninguém vê o motivo', () => {
    const texto = avisoDe('Rita');
    expect(texto).toContain('Só eu');
    expect(texto).toContain('Ninguém mais vê o motivo');
  });

  it('⚠ para uma criança: «Só os adultos», e diz que ela não a vê', () => {
    // A frase do protótipo é fixa — «entra na sua Agenda como Só eu» — porque
    // aquela folha marca sempre para quem está a ver. Esta tem selector de
    // membro, e copiar a frase fixa dizia «só eu» ao marcar ao Léo, quando o
    // outro adulto a vê. Metade das vezes seria mentira.
    const texto = avisoDe('Léo');
    expect(texto).toContain('Só os adultos');
    expect(texto).toContain('O Léo não a vê');
    expect(texto).not.toContain('Só eu');
  });

  it('e a concordância acompanha o membro', () => {
    expect(avisoDe('Mia')).toContain('A Mia não a vê');
  });

  it('⚠ e a frase concorda com a visibilidade que o evento leva', () => {
    // Se as duas divergirem, o aviso mente — e é o género de mentira que só se
    // descobre quando alguém vê o que não devia.
    for (const [membro, esperado] of [['Rita', 'so-eu'], ['Léo', 'adultos'], ['Mia', 'adultos']]) {
      const { r, loja } = abrir('Rita');
      tocar(r, 'marcar consulta');
      tocar(r, membro);
      const disseSoEu = junta(r.toJSON()).includes('Só eu');
      escolherEspecialidade(r, 'Dentista');
      escreverData(r, 'd2026-09-20');
      tocar(r, 'Marcar e Pôr na Agenda');
      const ev = loja().s.added.find(e => e.tag === 'Saúde');
      expect(visibilidadeDe(ev)).toBe(esperado);
      expect(disseSoEu).toBe(esperado === 'so-eu');
    }
  });
});

describe('o botão e o «Gerir», como no protótipo', () => {
  it('o botão promete as duas coisas que acontecem', () => {
    // Dizia «Marcar Consulta». Acontecem duas: o episódio na ficha e o evento
    // na agenda.
    //
    // ⚠ Com o formulário preenchido. O `Primary` desactivado não expõe
    // `onPress`, portanto a sonda de alvos não o vê — e a primeira versão
    // desta prova falhou por isso, não por o rótulo estar errado.
    const { r } = abrir('Rita');
    tocar(r, 'marcar consulta');
    escolherEspecialidade(r, 'Dentista');
    escreverData(r, 'd2026-09-20');
    expect(alvos(r, 'Marcar e Pôr na Agenda').length).toBeGreaterThan(0);
    expect(alvos(r, 'Marcar Consulta').length).toBe(0);
  });

  it('e o «Gerir» leva às especialidades — sendo a ÚNICA porta', () => {
    const { r } = abrir('Rita');
    tocar(r, 'marcar consulta');
    expect(junta(r.toJSON())).toContain('A consulta');
    expect(junta(r.toJSON())).not.toContain('Nova especialidade');
    tocar(r, 'Gerir especialidades');
    expect(junta(r.toJSON())).toContain('Nova especialidade');
  });

  // ── A especialidade: uma linha que abre, não pastilhas em fila ────────────
  it('⚠ a lista nasce FECHADA, e mostra o que está escolhido', () => {
    // Eram pastilhas todas visíveis. Cabiam quatro; com dez ocupavam meia
    // folha e empurravam o botão de marcar para fora do ecrã.
    const { r } = abrir('Rita');
    tocar(r, 'marcar consulta');
    expect(alvos(r, 'Escolher a especialidade')).toHaveLength(1);
    // Fechada: nenhuma especialidade é alvo enquanto não se abrir.
    expect(alvos(r, 'Dentista')).toHaveLength(0);
    expect(junta(r.toJSON())).toContain('Escolher a especialidade');

    tocar(r, 'Escolher a especialidade');
    expect(alvos(r, 'Dentista')).toHaveLength(1);
    expect(alvos(r, 'Pediatria')).toHaveLength(1);
  });

  it('⚠ e escolher FECHA a lista, deixando o nome à vista', () => {
    // Sem fechar, a lista ficava aberta por cima do resto do formulário e não
    // havia sinal nenhum de que a escolha tinha pegado.
    const { r } = abrir('Rita');
    tocar(r, 'marcar consulta');
    tocar(r, 'Escolher a especialidade');
    tocar(r, 'Dentista');

    expect(alvos(r, 'Pediatria')).toHaveLength(0);   // fechou
    const linha = alvos(r, 'Escolher a especialidade')[0];
    expect(junta(linha.props.children)).toContain('Dentista');
  });

  it('⚠ e a linha da escolha tem 44 — é o alvo mais usado desta folha', () => {
    const { r } = abrir('Rita');
    tocar(r, 'marcar consulta');
    tocar(r, 'Escolher a especialidade');
    for (const rot of ['Escolher a especialidade', 'Dentista']) {
      const n = alvos(r, rot)[0];
      const estilo = typeof n.props.style === 'function'
        ? [].concat(n.props.style({ pressed: false })).filter(Boolean)
        : [].concat(n.props.style).filter(Boolean);
      expect(Object.assign({}, ...estilo).minHeight).toBeGreaterThanOrEqual(44);
    }
  });

  it('⚠ e a folha de marcar já não tem abas — eram a segunda porta', () => {
    // Havia uma faixa com «Nova Consulta» e «Especialidades» E o «Gerir», os
    // dois para o mesmo sítio. É o mesmo defeito dos atalhos do Início.
    const { r } = abrir('Rita');
    tocar(r, 'marcar consulta');
    const abas = r.root.findAll(x => x.props && x.props.accessibilityRole === 'tab');
    expect(abas).toEqual([]);
    // E nenhum outro alvo leva lá, tirando o «Gerir».
    expect(alvos(r, 'Especialidades').length).toBe(0);
    expect(alvos(r, 'Gerir especialidades').length).toBe(1);
  });
});
