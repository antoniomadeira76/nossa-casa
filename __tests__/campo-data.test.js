/**
 * O campo de data: escrever e escolher.
 *
 * Um campo de data que aceita `31/02/2026` e a converte em silêncio para 3 de
 * março é pior do que um que recusa: a pessoa fica com a data errada e sem
 * saber. Estas provas são sobre o que ele aceita, o que recusa, e o que faz
 * enquanto ainda se está a escrever.
 */

const React = require('react');
const TestRenderer = require('react-test-renderer');
const CampoData = require('../src/CampoData').default;
const { buildTheme } = require('../src/theme');

const t = buildTheme('violet', false);

// Monta o campo e devolve o que se lhe pode fazer.
const campo = (valorInicial = null, extra = {}) => {
  let ultimo = valorInicial;
  let r = null;
  const Sob = ({ v }) => React.createElement(CampoData, {
    t, valor: v, onChange: (x) => { ultimo = x; }, ...extra });
  TestRenderer.act(() => { r = TestRenderer.create(React.createElement(Sob, { v: valorInicial })); });
  const caixa = () => r.root.findAll(n => n.props && n.props.maxLength === 10
    && typeof n.props.onChangeText === 'function')[0];
  const botao = (rot) => r.root.findAll(n => n.props
    && n.props.accessibilityLabel === rot && typeof n.props.onPress === 'function')[0];
  return {
    r,
    escrever: (v) => { TestRenderer.act(() => { caixa().props.onChangeText(v); }); },
    texto: () => caixa().props.value,
    valor: () => ultimo,
    abrir: () => { TestRenderer.act(() => { botao('Escolher no calendário').props.onPress(); }); },
    tocarDia: (rot) => { TestRenderer.act(() => { botao(rot).props.onPress(); }); },
    tem: (rot) => !!botao(rot),
    todoOTexto: () => {
      const junta = (n) => {
        if (n === null || n === undefined || n === false) return '';
        if (typeof n === 'string' || typeof n === 'number') return String(n);
        if (Array.isArray(n)) return n.map(junta).join(' ');
        return junta(n.children || (n.props && n.props.children) || null);
      };
      return junta(r.toJSON());
    },
  };
};

describe('Escrever à mão', () => {
  test('as barras aparecem sozinhas', () => {
    const c = campo();
    c.escrever('15092026');
    expect(c.texto()).toBe('15/09/2026');
  });

  test('e vão aparecendo à medida que se escreve', () => {
    const c = campo();
    c.escrever('1');       expect(c.texto()).toBe('1');
    c.escrever('15');      expect(c.texto()).toBe('15');
    c.escrever('159');     expect(c.texto()).toBe('15/9');
    c.escrever('1509');    expect(c.texto()).toBe('15/09');
    c.escrever('150920');  expect(c.texto()).toBe('15/09/20');
  });

  test('uma data inteira sai em chave, que é como a app as guarda', () => {
    const c = campo();
    c.escrever('15/09/2026');
    expect(c.valor()).toBe('d2026-09-15');
  });

  // Escrever «15/0» não pode apagar o que já lá estava: a pessoa está a meio.
  test('uma data a meio não mexe no valor', () => {
    const c = campo('d2026-01-01');
    c.escrever('15/0');
    expect(c.valor()).toBe('d2026-01-01');
  });

  test('esvaziar o campo limpa a data', () => {
    const c = campo('d2026-01-01');
    c.escrever('');
    expect(c.valor()).toBeNull();
  });

  // `chaveDeDMY` aceita 31 em qualquer mês. Aceitar 31 de fevereiro e guardá-lo
  // como 3 de março é a pior forma de errar: sem aviso e sem volta.
  test('um dia que não existe nesse mês é recusado, e dito', () => {
    const c = campo();
    c.escrever('31/02/2026');
    expect(c.valor()).toBeNull();
    expect(c.todoOTexto()).toContain('Esse dia não existe nesse mês.');
  });

  test('mas 29 de fevereiro passa num ano bissexto', () => {
    const c = campo();
    c.escrever('29/02/2028');
    expect(c.valor()).toBe('d2028-02-29');
    expect(c.todoOTexto()).not.toContain('não existe');
  });

  test('e 29 de fevereiro é recusado num ano que o não tem', () => {
    const c = campo();
    c.escrever('29/02/2026');
    expect(c.valor()).toBeNull();
  });

  test('letras não entram', () => {
    const c = campo();
    c.escrever('1a5b');
    expect(c.texto()).toBe('15');
  });

  test('e não se escreve para lá de uma data', () => {
    const c = campo();
    c.escrever('150920261234');
    expect(c.texto()).toBe('15/09/2026');
  });
});

describe('Escolher no calendário', () => {
  test('o calendário está fechado até se lhe tocar', () => {
    const c = campo();
    expect(c.tem('Escolher no calendário')).toBe(true);
    expect(c.tem('20 de agosto de 2026')).toBe(false);
    c.abrir();
    expect(c.tem('20 de agosto de 2026')).toBe(true);
  });

  test('escolher um dia preenche a caixa e devolve a chave', () => {
    const c = campo();
    c.abrir();
    c.tocarDia('15 de agosto de 2026');
    expect(c.valor()).toBe('d2026-08-15');
    expect(c.texto()).toBe('15/08/2026');
  });

  test('e fecha-se depois de escolher — a resposta já foi dada', () => {
    const c = campo();
    c.abrir();
    c.tocarDia('15 de agosto de 2026');
    expect(c.tem('15 de agosto de 2026')).toBe(false);
  });

  test('abre no mês da data que já lá está, e não em hoje', () => {
    const c = campo('d2027-03-09');
    c.abrir();
    expect(c.todoOTexto()).toMatch(/Março\s+2027/);
  });

  test('os meses navegam-se, e o ano vira com eles', () => {
    const c = campo('d2026-12-10');
    c.abrir();
    TestRenderer.act(() => {
      c.r.root.findAll(n => n.props && n.props.accessibilityLabel === 'Mês seguinte'
        && typeof n.props.onPress === 'function')[0].props.onPress();
    });
    expect(c.todoOTexto()).toMatch(/Janeiro\s+2027/);
  });

  // A semana desta app começa à segunda — como a Agenda, como as Tarefas.
  test('a semana começa à segunda', () => {
    const c = campo('d2026-08-01');   // 1 de agosto de 2026 é um sábado
    c.abrir();
    const texto = c.todoOTexto();
    expect(texto).toMatch(/Seg\s+Ter\s+Qua\s+Qui\s+Sex\s+Sáb\s+Dom/);
  });

  test('os alvos dos dias têm 44', () => {
    const c = campo();
    c.abrir();
    const dia = c.r.root.findAll(n => n.props
      && n.props.accessibilityLabel === '15 de agosto de 2026'
      && typeof n.props.onPress === 'function')[0];
    const estilo = typeof dia.props.style === 'function' ? dia.props.style({ pressed: false }) : dia.props.style;
    expect(estilo.minHeight).toBe(44);
  });
});

describe('Limites, quando o ecrã os impõe', () => {
  // Uma garantia não expira antes de a compra existir; uma consulta passada
  // não se marca. Quem sabe isso é o ecrã, não este componente.
  test('um dia fora do intervalo não se escolhe', () => {
    const c = campo(null, { minimo: 'd2026-08-10', maximo: 'd2026-08-20' });
    c.abrir();
    c.tocarDia('5 de agosto de 2026');
    expect(c.valor()).toBeNull();
    c.tocarDia('15 de agosto de 2026');
    expect(c.valor()).toBe('d2026-08-15');
  });

  test('sem limites, qualquer dia serve', () => {
    const c = campo();
    c.abrir();
    c.tocarDia('5 de agosto de 2026');
    expect(c.valor()).toBe('d2026-08-05');
  });
});

describe('O desenho diz o estado, em vez de o esconder', () => {
  test('sem data, convida a escrever ou a tocar no calendário', () => {
    expect(campo().todoOTexto()).toContain('Escreva a data, ou toque no calendário.');
  });

  // Uma data escrita em números não diz que dia da semana é. «Terça, 15/09» é
  // o que confirma que se escolheu o dia que se queria.
  test('com data, diz o dia da semana por extenso', () => {
    const c = campo('d2026-09-15');
    expect(c.todoOTexto()).toMatch(/Terça/);
  });

  test('e o erro substitui a legenda, em vez de se acumular com ela', () => {
    const c = campo();
    c.escrever('31/02/2026');
    const texto = c.todoOTexto();
    expect(texto).toContain('Esse dia não existe nesse mês.');
    expect(texto).not.toContain('Escreva a data');
  });

  // Numa app de casa a data que mais se escolhe é hoje, e chegar-lhe obrigava
  // a navegar de volta se já se tivesse saído do mês.
  test('«Hoje» escolhe hoje, mesmo depois de navegar para longe', () => {
    const c = campo('d2027-05-10');
    c.abrir();
    TestRenderer.act(() => {
      c.r.root.findAll(n => n.props && n.props.accessibilityLabel === 'Escolher hoje'
        && typeof n.props.onPress === 'function')[0].props.onPress();
    });
    expect(c.valor()).toBe('d2026-08-20');   // o TODAY da app
    expect(c.texto()).toBe('20/08/2026');
  });
});
