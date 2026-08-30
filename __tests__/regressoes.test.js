/**
 * Regressões — Nossa Casa
 *
 * Ao contrário de smoke.test.js, estes testes lêem o código-fonte e as
 * sementes. Cada um corresponde a um defeito que chegou a estar em produção
 * e que os testes existentes não apanharam, porque comparavam literais
 * consigo próprios.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
// Estes testes descrevem os defeitos pelo nome. Sem isto, a busca por
// `flex: 0` ou `new Date()` apanhava a própria explicação do erro.
const semComentarios = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const jsxFiles = () => {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.jsx?$/.test(e.name)) out.push(rel);
    }
  };
  walk('src');
  return out;
};

describe('Contratos dos componentes partilhados', () => {
  // Pill é um View de estado: não aceita selected/onPress. Quatro folhas
  // passavam-lhos, e as pastilhas ficavam sem preenchimento e sem toque.
  test('Pill nunca recebe selected ou onPress — para isso existe Choice', () => {
    const offenders = [];
    for (const f of jsxFiles()) {
      const src = read(f);
      for (const tag of src.match(/<Pill\b[\s\S]*?\/>/g) || []) {
        if (/\bselected=|\bonPress=/.test(tag)) offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });

  // Toggle declara {on, onPress} e não desenha o rótulo. Quem passava
  // value/onChange ficava com um interruptor inerte e sem legenda.
  test('Toggle nunca recebe value ou onChange', () => {
    const offenders = [];
    for (const f of jsxFiles()) {
      const src = read(f);
      for (const tag of src.match(/<Toggle\b[\s\S]*?\/>/g) || []) {
        if (/\bvalue=|\bonChange=/.test(tag)) offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });

  // Passar strings cruas dava três segmentos em branco, todos «selecionados»
  // porque undefined === undefined.
  test('Segmented normaliza opções em string', () => {
    expect(read('src/ui.jsx')).toMatch(/typeof raw === 'string'/);
  });

  test('Choice existe e o seu alvo de toque tem 44', () => {
    const ui = read('src/ui.jsx');
    const choice = ui.slice(ui.indexOf('export const Choice'), ui.indexOf('export const Tap'));
    expect(choice).toMatch(/minHeight: 44/);
    expect(choice).toMatch(/t\.accent/);          // cor de ação lida do tema
    expect(choice).not.toMatch(/#[0-9a-fA-F]{6}(?!')/); // sem literais de cor de ação
  });
});

describe('INVARIANTE #1 — o cabeçalho e o rodapé cabem no que mostram', () => {
  // O CLAUDE.md conta três quebras deste invariante, todas por o rodapé sair
  // da coluna flex. Esta é a quarta variante, e é silenciosa: o cabeçalho
  // continuou no sítio mas encolheu.
  //
  // `flex: 0` parece dizer «não cresces nem encolhes». O react-native-web
  // traduz para `0 1 0%` — base zero e ENCOLHÍVEL — portanto a caixa fica com
  // a altura do minHeight independentemente do conteúdo. Com os três números
  // do Início, o cabeçalho precisava de 135 px, tinha 80, e havia
  // `overflow: 'hidden'` a esconder a diferença. Ninguém via um erro; via-se
  // uma saudação cortada ao meio.
  const app = semComentarios(read('App.jsx'));

  // Este teste olhava só para o App.jsx, e por isso não apanhou a mesma
  // quebra no KidApp: o modo criança tinha o cabeçalho com 24 px onde
  // precisava de 46 e o rodapé com 16 onde precisava de 54. Uma regressão
  // que cobre um ficheiro não cobre um invariante.
  it('nenhum ficheiro usa o atalho `flex: 0`', () => {
    const culpados = [];
    for (const f of ['App.jsx', ...jsxFiles()]) {
      semComentarios(read(f)).split('\n').forEach((l, i) => {
        // `\b` sozinho casava dentro de `flex: 0.6` — a fronteira de palavra
        // fica entre o zero e o ponto. É preciso excluir o que vem a seguir.
        if (/\bflex:\s*0(?![.\d])/.test(l)) culpados.push(`${f}:${i + 1}`);
      });
    }
    expect(culpados).toEqual([]);
  });

  it('o KidApp tem a raiz de três caixas, como a app dos adultos', () => {
    const kid = semComentarios(read('src/KidApp.jsx'));
    const fixas = kid.match(/flexGrow:\s*0,\s*flexShrink:\s*0,\s*flexBasis:\s*'auto'/g) || [];
    expect(fixas.length).toBe(2);   // cabeçalho e rodapé
  });

  // `done` vive dentro de `s`. Desestruturá-lo à cabeça da loja dava
  // undefined, e o modo criança inteiro ficava em branco.
  it('ninguém desestrutura campos de estado à cabeça da loja', () => {
    const campos = ['done', 'pending', 'status', 'pins', 'roles', 'urg', 'due'];
    const culpados = [];
    for (const f of jsxFiles()) {
      for (const m of semComentarios(read(f)).matchAll(/const \{([^}]*)\} = (?:st|useStore\(\))/g)) {
        for (const nome of m[1].split(',').map(x => x.trim().split(':')[0].trim())) {
          if (campos.includes(nome)) culpados.push(`${f} → ${nome}`);
        }
      }
    }
    expect(culpados).toEqual([]);
  });

  it('as duas caixas fixas declaram flexShrink 0, para caberem no conteúdo', () => {
    const fixas = app.match(/flexGrow:\s*0,\s*flexShrink:\s*0,\s*flexBasis:\s*'auto'/g) || [];
    expect(fixas.length).toBe(2);   // cabeçalho e rodapé
  });

  it('o rodapé continua a ser o último filho da raiz', () => {
    const raiz = app.slice(app.indexOf('backgroundColor: t.page'));
    const rodape = raiz.indexOf('minHeight: 60');
    const scroll = raiz.indexOf('<ScrollView');
    expect(scroll).toBeGreaterThan(-1);
    expect(rodape).toBeGreaterThan(scroll);
  });
});

describe('Início — alinhado com 04-inicio.png', () => {
  const inicio = read('src/screens/Inicio.jsx');
  const app = semComentarios(read('App.jsx'));

  // A saudação estava nos dois sítios: o cabeçalho do App.jsx e o conteúdo do
  // Inicio.jsx. A app cumprimentava duas vezes, e os números («2 eventos e 3
  // tarefas por concluir») eram uma linha de texto no conteúdo em vez das três
  // caixas do cabeçalho.
  it('a saudação existe uma vez só, no cabeçalho', () => {
    expect(app).toMatch(/\{greet\}, \{user\}/);
    expect(inicio).not.toMatch(/\{greet\}/);
  });

  it('os três números estão no cabeçalho', () => {
    for (const rot of ['Disponível', 'Tarefas hoje', 'Eventos']) {
      expect(app).toContain(rot);
    }
  });

  // O cabeçalho lia `new Date()` e o conteúdo lia TODAY_KEY, portanto a app
  // dizia «Sábado, 29/08» em cima e «Quinta, 20/08» duas linhas abaixo.
  it('a data vem do TODAY da app, não do relógio da máquina', () => {
    expect(app).not.toMatch(/new Date\(\)/);
    expect(app).toMatch(/dayLabel\(TODAY_KEY\)/);
  });
});

describe('Nenhum ecrã fica sem entrada', () => {
  // Os quatro botões do Início (Saúde/Equip./Gestão/Docs) não estão na
  // referência e saíram. Mas as linhas do Perfil que os deviam substituir
  // tinham `onPress={() => {}}` — não faziam nada. Removê-los sem ligar isto
  // teria deixado três ecrãs inteiros inalcançáveis, sem erro nenhum.
  const perfil = read('src/screens/Perfil.jsx');
  const dinheiro = read('src/screens/Dinheiro.jsx');

  it('nenhuma linha do Perfil tem um handler vazio', () => {
    expect(perfil).not.toMatch(/onPress=\{\(\)\s*=>\s*\{\}\}/);
  });

  it('a linha de equipamentos do Dinheiro leva a algum lado', () => {
    expect(dinheiro).not.toMatch(/onPress=\{\(\)\s*=>\s*\{\}\}/);
    expect(dinheiro).toMatch(/onPress=\{onEquip\}/);
  });

  it('o Perfil recebe as três saídas do App', () => {
    const app = read('App.jsx');
    for (const p of ['onSaude', 'onDoc', 'onGestao']) {
      expect(app).toMatch(new RegExp(`${p}=\\{\\(\\) => set`));
      expect(perfil).toContain(p);
    }
  });

  // A Gestão vivia em dois sítios: uma folha dentro do Perfil (valor do ponto,
  // dia de pagamento, dividir a meias) e o Gestao.jsx (rendimento, envelopes,
  // membros). A linha prometia as quatro coisas e abria só metade.
  it('as definições da casa estão todas no Gestao.jsx', () => {
    const gestao = read('src/screens/Gestao.jsx');
    for (const chave of ['pointValue', 'payDay', 'splitHalf']) {
      expect(gestao).toContain(chave);
      expect(perfil).not.toContain(chave);
    }
  });
});

describe('Vistas de ecrã inteiro — cabeçalho próprio, rodapé intacto', () => {
  const app = semComentarios(read('App.jsx'));

  // Abriam como cartão centrado com véu por cima da área de conteúdo, e o
  // cabeçalho da app ficava cortado a meio por trás. As referências 11, 13,
  // 15 e 17 mostram-nas com cabeçalho próprio e o rodapé da app por baixo.
  it('não sobrou nenhum cartão centrado com véu', () => {
    expect(app).not.toMatch(/rgba\(0,0,0,0\.3\)/);
    expect(app).not.toMatch(/maxHeight: '85vh'/);
  });

  it('as cinco vistas declaram ícone, título e legenda', () => {
    for (const v of ['saude', 'equip', 'gestao', 'doc', 'loja']) {
      expect(app).toMatch(new RegExp(`\\n    ${v}: \\{`));
    }
    const decls = app.match(/icon: '[a-zA-Z]+', titulo: '[^']+', fechar:/g) || [];
    expect(decls.length).toBe(5);
  });

  it('a raiz continua a ter três filhos, com o rodapé em último', () => {
    const raiz = app.slice(app.indexOf('backgroundColor: t.page'));
    expect(raiz.indexOf('minHeight: 60')).toBeGreaterThan(raiz.indexOf('<ScrollView'));
  });

  // O modo de loja era um <Modal>, que no react-native-web escapa à raiz da
  // app: elementFromPoint no meio do rodapé devolvia o painel, portanto os
  // separadores não se conseguiam tocar. É o INVARIANTE #1, e o CLAUDE.md
  // nomeia este ecrã.
  it('o modo de loja não usa Modal', () => {
    const modo = semComentarios(read('src/screens/ModoCompras.jsx'));
    expect(modo).not.toMatch(/<Modal/);
    expect(read('src/screens/Compras.jsx')).not.toMatch(/setShop/);
  });

  it('o modo de loja tem as duas acções por linha e a barra da loja', () => {
    const modo = read('src/screens/ModoCompras.jsx');
    expect(modo).toContain('Sem stock');
    expect(modo).toContain('ordem do corredor');
    expect((modo.match(/minHeight: 44/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('O dinheiro gasto é uma soma, não um número escrito', () => {
  // Estava `1687.4` à mão e os envelopes somam 1387,00 — 300,40 € a mais. O
  // «Disponível» dava 82,60 € onde a referência 05-dinheiro.png mostra
  // 383,00 €, e o cabeçalho do Início repetia o erro em todos os ecrãs.
  const { ENV_BASE } = require('../src/data.js');

  it('não sobrou nenhum total de despesa escrito à mão', () => {
    expect(semComentarios(read('src/store.jsx'))).not.toMatch(/1687\.4/);
  });

  it('o gasto deriva dos envelopes', () => {
    expect(read('src/store.jsx')).toMatch(/const spent = envelopes\.reduce/);
  });

  it('as sementes somam o que a referência mostra', () => {
    expect(ENV_BASE.reduce((a, e) => a + e.used, 0)).toBe(1387);
    expect(ENV_BASE.reduce((a, e) => a + e.limit, 0)).toBe(1770);
    // 1770 − 1387 = 383,00 €, o «Disponível» da referência
    expect(ENV_BASE.reduce((a, e) => a + e.limit - e.used, 0)).toBe(383);
  });
});

describe('Equipamentos e Dinheiro — o que a referência mostra e faltava', () => {
  // Os dados estavam lá desde sempre: price, maint, maintDate. O ecrã é que
  // não os mostrava, e agrupava por estado de garantia em três secções onde a
  // referência 11 tem uma lista só com o estado na pastilha.
  const equip = read('src/screens/Equipamentos.jsx');
  const { EQUIP } = require('../src/data.js');

  it('o resumo mostra os cinco números da referência', () => {
    for (const rot of ['Equipamentos', 'Valor registado', 'Garantias a expirar',
      'Garantias expiradas', 'Próxima manutenção']) {
      expect(equip).toContain(rot);
    }
  });

  it('é uma lista só, não três secções por garantia', () => {
    expect(equip).toContain('Registados');
    expect(semComentarios(equip)).not.toMatch(/title="A Expirar \(90 dias\)"/);
  });

  it('cada linha mostra preço e manutenção', () => {
    expect(equip).toMatch(/EUR\(e\.price\)/);
    expect(equip).toMatch(/\{e\.maint\}/);
  });

  it('o valor registado é o das sementes', () => {
    expect(EQUIP.reduce((a, e) => a + e.price, 0)).toBe(3797);
  });

  const dinheiro = read('src/screens/Dinheiro.jsx');

  it('o cartão do saldo mostra o gasto, não só o orçamento', () => {
    expect(dinheiro).toMatch(/EUR\(spent\)\} gastos/);
  });

  it('registar despesa e abrir o mês são linhas próprias', () => {
    expect(dinheiro).toContain('Registar Despesa');
    expect(dinheiro).toMatch(/Abrir \$\{proximoMes\}/);
  });

  it('o envelope no limite oferece o passo seguinte', () => {
    expect(dinheiro).toContain('neste envelope');
    expect(dinheiro).toContain('Reforçar');
  });

  // Nem só «tu»: «vocês» também é tratamento de segunda pessoa, e o registo
  // desta app é a terceira.
  it('não há tratamento por «vocês»', () => {
    const re = /(?<![\p{L}])(voc[êe]s?)(?![\p{L}])/iu;
    expect(jsxFiles().filter(f => re.test(semComentarios(read(f))))).toEqual([]);
  });
});

describe('INVARIANTE #3 — a visibilidade da saúde não é do ecrã', () => {
  // O «Precisa de Si» passou a mostrar receitas e consultas. São dados de
  // saúde, e uma linha dessas no Início do membro errado é a fuga exacta que
  // o INVARIANTE #3 existe para impedir. Estas provas correm sem React: as
  // funções são puras precisamente para poderem ser provadas.
  //
  // A regra do servidor é a que conta (db/pocketbase/provar-saude.mjs, 15
  // provas). Esta é a do cliente, e tem de concordar com ela.
  const { podeVerSaude, receitasAExpirarDe, consultasProximasDe } = require('../src/store.jsx');

  const receita = (member, expires) => ({
    id: `r-${member}`, member, kind: 'Receita', title: 'Prova', expires,
  });
  const consulta = (member, day) => ({ id: `c-${member}`, member, day, specialty: 'Prova' });

  test('um adulto vê a sua própria ficha e nenhuma outra de adulto', () => {
    expect(podeVerSaude('Rita', 'Rita')).toBe(true);
    expect(podeVerSaude('Tomás', 'Rita')).toBe(false);
    expect(podeVerSaude('Rita', 'Tomás')).toBe(false);
  });

  test('as fichas das crianças são dos adultos, e não das próprias', () => {
    expect(podeVerSaude('Léo', 'Rita')).toBe(true);
    expect(podeVerSaude('Léo', 'Tomás')).toBe(true);
    expect(podeVerSaude('Léo', 'Léo')).toBe(false);
    expect(podeVerSaude('Mia', 'Léo')).toBe(false);
  });

  // O que a prova do browser não conseguiu mostrar por causa das fibras
  // velhas do React: a receita de um adulto não entra na lista do outro.
  test('a receita da Rita não chega à lista do Tomás', () => {
    const docs = [receita('Rita', 'd2026-08-25'), receita('Léo', 'd2026-09-10')];
    expect(receitasAExpirarDe(docs, 'Rita').map(d => d.member)).toEqual(['Rita', 'Léo']);
    expect(receitasAExpirarDe(docs, 'Tomás').map(d => d.member)).toEqual(['Léo']);
    expect(receitasAExpirarDe(docs, 'Léo')).toEqual([]);
  });

  test('a consulta de um adulto não chega ao outro nem às crianças', () => {
    const cs = [consulta('Tomás', 'd2026-08-22'), consulta('Mia', 'd2026-08-23')];
    expect(consultasProximasDe(cs, 'Tomás').map(c => c.member)).toEqual(['Tomás', 'Mia']);
    expect(consultasProximasDe(cs, 'Rita').map(c => c.member)).toEqual(['Mia']);
    expect(consultasProximasDe(cs, 'Mia')).toEqual([]);
  });

  // Contra o TODAY da app (20/08/2026), não contra o relógio da máquina.
  test('as janelas de tempo contam a partir do TODAY da app', () => {
    const docs = [receita('Léo', 'd2026-09-10'), receita('Mia', 'd2027-01-01')];
    expect(receitasAExpirarDe(docs, 'Rita').map(d => d.dias)).toEqual([21]);

    const cs = [consulta('Léo', 'd2026-08-22'), consulta('Mia', 'd2026-08-28'),
                consulta('Léo', 'd2026-08-10')];
    expect(consultasProximasDe(cs, 'Rita').map(c => c.dias)).toEqual([2]);  // 28/08 são 8 dias; 10/08 já passou
  });

  test('uma receita já expirada continua a aparecer — deixar de a mostrar é escondê-la', () => {
    const docs = [receita('Léo', 'd2026-08-01')];
    expect(receitasAExpirarDe(docs, 'Rita').map(d => d.dias)).toEqual([-19]);
  });
});

describe('Saúde — o ecrã e a loja contam a mesma coisa', () => {
  const saude = read('src/screens/Saude.jsx');

  // O ecrã lia `s.health` — só o gravado. As sementes são código, portanto
  // dizia «Sem registos de saúde.» enquanto o cartão do membro logo acima,
  // que lê pela loja, dizia «1 consulta». O mesmo ecrã contradizia-se.
  it('lê pela loja, não pelo estado gravado', () => {
    expect(saude).toMatch(/st\.allHealth\(\)/);
    expect(semComentarios(saude)).not.toMatch(/\bs\.health\b\s*\|\|/);
  });

  // Havia aqui uma cópia do canSeeHealth, e mais permissiva: devolvia true
  // para qualquer criança sem verificar se quem vê é adulto.
  it('não tem uma cópia própria da regra de visibilidade', () => {
    expect(saude).toMatch(/st\.canSeeHealth\(member, user\)/);
    expect(semComentarios(saude)).not.toMatch(/const canSeeHealth\s*=/);
  });

  // Ordenava com `new Date('28/08/2026')`, que é Invalid Date.
  it('ordena pelas chaves, não por new Date de um texto', () => {
    expect(semComentarios(saude)).not.toMatch(/new Date\([ab]\.date\)/);
    expect(saude).toMatch(/localeCompare\(String\(a\.day/);
  });

  // O «marcar consulta» abria com o membro por omissão, viesse de onde viesse.
  // Depois de a ficha passar a vista do App, o membro faz a viagem
  // ficha → App → Saúde; sem isso voltava a abrir no predefinido, e foi o
  // que aconteceu ao fazer esse refactor.
  it('o marcar consulta recebe o membro de onde foi aberto', () => {
    expect(saude).toMatch(/<MarcarConsulta[^>]*membro=\{membroDaFolha\}/s);
    expect(saude).toMatch(/member: membro \|\| 'Léo'/);
    expect(read('App.jsx')).toMatch(/setMarcarPara\(ficha\)/);
    expect(saude).toMatch(/setMembroDaFolha\(marcarPara\)/);
  });

  // A ficha de um membro desenhava um cabeçalho próprio dentro do conteúdo, e
  // ficavam dois empilhados: o «Saúde da Família» da vista e o «Saúde do Léo»
  // dela. Passou a vista do App, como as outras.
  it('a ficha é uma vista do App, não um ramo da Saúde', () => {
    expect(semComentarios(saude)).not.toMatch(/<FichaSaude/);
    expect(semComentarios(read('App.jsx'))).toMatch(/\n    ficha: \{/);
    expect(semComentarios(read('src/screens/FichaSaude.jsx')))
      .not.toMatch(/backgroundColor: t\.chrome/);
  });

  // Um nome de ícone que não existe devolve um SVG vazio, sem erro nenhum.
  it('todos os nomes de ícone usados existem no Icon.jsx', () => {
    const icones = read('src/Icon.jsx');
    const conhecidos = new Set([
      ...[...icones.matchAll(/^\s{2}([a-zA-Z]+):\s*'/gm)].map(m => m[1]),
      ...[...icones.matchAll(/name === '([a-zA-Z]+)'/g)].map(m => m[1]),
    ]);
    const usados = new Set();
    for (const f of jsxFiles()) {
      for (const m of semComentarios(read(f)).matchAll(/(?:<Icon\s+name|\bicon)=["']([a-zA-Z]+)["']/g)) {
        usados.add(m[1]);
      }
    }
    const desconhecidos = [...usados].filter(n => !conhecidos.has(n));
    expect(desconhecidos).toEqual([]);
  });
});

describe('INVARIANTE #2 — saldos são somas de movimentos', () => {
  test('o cofre não é um campo escrito', () => {
    const store = read('src/store.jsx');
    expect(store).not.toMatch(/^\s*vault:\s*\{/m);
    expect(store).toMatch(/vaultMoves/);
  });

  test('nenhum ecrã lê um saldo de cofre directamente', () => {
    const offenders = jsxFiles().filter(f => /s\.vault\s*\[/.test(read(f)));
    expect(offenders).toEqual([]);
  });

  test('os movimentos semeados somam os saldos da demonstração', () => {
    const { VAULT } = require('../src/data.js');
    const soma = (kid) => Math.round(
      VAULT.reduce((n, m) => (m.kid === kid ? n + m.delta : n), 0) * 100) / 100;
    expect(soma('Léo')).toBe(12.40);
    expect(soma('Mia')).toBe(8.90);
  });
});

describe('Armazenamento local — versão e migração', () => {
  const store = read('src/store.jsx');

  test('o formato gravado tem versão e uma cadeia de migrações', () => {
    expect(store).toMatch(/const SCHEMA = \d+/);
    expect(store).toMatch(/const MIGRATIONS = \{/);
    // grava a versão do código, não um literal preso no 1
    expect(store).toMatch(/\{ v: SCHEMA, savedAt/);
    // e recusa ler um formato mais recente do que sabe interpretar
    expect(store).toMatch(/v <= SCHEMA/);
  });

  // As sementes eram gravadas, por isso mudá-las não tinha efeito em quem já
  // tinha a app aberta — vi ícones errados no cofre por causa disto.
  test('as sementes do cofre vivem no código, não no estado gravado', () => {
    expect(read('src/data.js')).toMatch(/export const VAULT = \[/);
    expect(store).toMatch(/vaultMoves: \[\], paidPts/);        // DEMO não semeia
    expect(store).toMatch(/s\.clearedSeeds \? \[\] : VAULT/);  // a derivação junta-as
  });

  // As migrações correm aqui, importadas — não recortadas do ficheiro por
  // texto. A versão anterior deste teste fatiava o código-fonte de `2: (o) =>`
  // até `export const DEMO`, e ao acrescentar a migração 3 a fatia passou a
  // apanhar as duas: o teste partiu-se por a app ter crescido, que é o pior
  // motivo possível para um teste falhar.
  const { MIGRATIONS, SCHEMA } = require('../src/store.jsx');

  test('há uma migração para cada salto até à versão actual', () => {
    for (let n = 2; n <= SCHEMA; n++) expect(typeof MIGRATIONS[n]).toBe('function');
  });

  test('v1 → v2 preserva o dinheiro e deixa de gravar as sementes', () => {
    const { VAULT } = require('../src/data.js');
    const mig = MIGRATIONS[2];
    const soma = (mv, kid) => Math.round(
      [...VAULT, ...mv].reduce((n, m) => (m.kid === kid ? n + m.delta : n), 0) * 100) / 100;

    // saldo antigo diferente das sementes: a diferença tem de sobreviver
    const a = mig({ v: 1, vault: { 'Léo': 20.00, 'Mia': 8.90 } });
    expect('vault' in a).toBe(false);
    expect(soma(a.vaultMoves, 'Léo')).toBe(20.00);
    expect(soma(a.vaultMoves, 'Mia')).toBe(8.90);

    // estado intermédio: sementes gravadas + um movimento do utilizador
    const b = mig({ v: 1, vaultMoves: [...VAULT, { id: 'vm-x', kid: 'Léo', delta: 1 }] });
    expect(b.vaultMoves).toHaveLength(1);          // as sementes saíram
    expect(soma(b.vaultMoves, 'Léo')).toBe(13.40); // 12,40 + 1,00
  });

  // v2 → v3: os registos de saúde tinham duas formas — `date` com o texto do
  // formulário nos gravados, `day` em chave nas sementes. O ecrã lia `date` e
  // por isso estava apontado só aos gravados, que estavam sempre vazios.
  test('v2 → v3 põe os registos de saúde todos na mesma forma', () => {
    const r = MIGRATIONS[3]({
      v: 2,
      health: [
        { id: 'a', member: 'Léo', date: '28/08/2026', specialty: 'Dentista' },
        { id: 'b', member: 'Mia', day: 'd2026-09-01', time: '10:00', specialty: 'Pediatria' },
        { id: 'c', member: 'Léo', date: 'para a semana', specialty: 'Ilegível' },
      ],
    });
    // o texto do formulário passa a chave
    expect(r.health[0]).toEqual({ id: 'a', member: 'Léo', day: 'd2026-08-28', time: '', specialty: 'Dentista' });
    // quem já tinha a forma certa fica como estava
    expect(r.health[1]).toEqual({ id: 'b', member: 'Mia', day: 'd2026-09-01', time: '10:00', specialty: 'Pediatria' });
    // uma data que não se consegue ler não faz o registo desaparecer
    expect(r.health[2].day).toBe('para a semana');
    expect(r.health.every(h => !('date' in h))).toBe(true);
  });

  test('v2 → v3 aguenta um estado sem registos de saúde nenhuns', () => {
    expect(MIGRATIONS[3]({ v: 2 }).health).toEqual([]);
  });
});

describe('PIN', () => {
  // setPin grava. Chamá-lo no JSX comprometia o PIN a meio da escrita.
  test('Gestao valida com pinError e só grava no manipulador do botão', () => {
    const src = read('src/screens/Gestao.jsx');
    const renderPart = src.slice(src.indexOf('return ('));
    const calls = renderPart.match(/setPin\(/g) || [];
    expect(calls.length).toBe(1);                       // só a do onPress
    expect(renderPart).toMatch(/onPress=\{\(\) => \{\s*if \(setPin\(/);
    expect(src).toMatch(/pinError\(selectedMember, input\)/);
  });

  test('não há PIN de fábrica', () => {
    expect(read('src/store.jsx')).toMatch(/pins:\s*\{\}/);
    const offenders = jsxFiles().filter(f =>
      /pins\s*\[[^\]]+\]\s*\|\|\s*['"]\d{4}['"]/.test(read(f)));
    expect(offenders).toEqual([]);
  });
});

describe('Equipamentos', () => {
  const dataSrc = read('src/data.js');
  const equip = [...dataSrc.matchAll(
    /\{ id: '(\w+)',\s+name: '([^']+)',\s+cat: '([^']+)',\s+bought: '([^']+)',[\s\S]*?warrantyEnd: '([^']+)'/g
  )].map(([, id, name, cat, bought, warrantyEnd]) => ({ id, name, cat, bought, warrantyEnd }));

  test('as sementes foram lidas', () => {
    expect(equip.length).toBe(4);
  });

  // O ecrã lia e.category/e.purchase; as sementes têm cat/bought. Todas as
  // linhas mostravam «undefined · Data desconhecida».
  test('o ecrã lê os campos que as sementes carregam', () => {
    const src = read('src/screens/Equipamentos.jsx');
    expect(src).not.toMatch(/e\.category|e\.purchase\b|e\.warrantyDays|e\.purchaseAt/);
    expect(src).toMatch(/e\.bought/);
    expect(src).toMatch(/e\.price/);
    // A categoria saiu da linha: a referência 11 mostra «Comprado a … · preço»,
    // não a categoria. Continua a existir no formulário de registo.
    expect(src).toMatch(/cat: CATS\[0\]/);
  });

  test('gravar um equipamento produz a forma das sementes', () => {
    const src = read('src/screens/Equipamentos.jsx');
    const save = src.slice(src.indexOf('const handleSave'), src.indexOf('const estadoDe'));
    for (const field of ['cat:', 'bought:', 'warrantyEnd:']) expect(save).toContain(field);
  });

  // Antes: tudo caía em today+365, e a caldeira expirada aparecia em garantia.
  test('as sementes povoam os três estados de garantia', () => {
    const { warrantyDaysLeft } = require('../src/format.js');
    const bucket = (e) => {
      const d = warrantyDaysLeft(e);
      return d > 90 ? 'em' : d > 0 ? 'a-expirar' : 'fora';
    };
    const states = new Set(equip.map(bucket));
    expect([...states].sort()).toEqual(['a-expirar', 'em', 'fora']);
    expect(bucket(equip.find(e => /Caldeira/.test(e.name)))).toBe('fora');
  });
});

describe('Ficha do equipamento — alinhada com 12-ficha-equipamento.png', () => {
  const ficha = read('src/sheets/FichaEquipamento.jsx');

  test('tem as secções que a referência mostra', () => {
    for (const s of ['Garantia', 'Fotografias', 'Preço de compra', 'Data de compra']) {
      expect(ficha).toContain(s);
    }
  });

  test('tem as três ações, com os ícones que a referência usa', () => {
    for (const [rotulo, icone] of [['Agendar Manutenção', 'calendar'],
                                   ['Exportar Fatura', 'printer'],
                                   ['Remover Equipamento', 'trash']]) {
      expect(ficha).toContain(rotulo);
      expect(ficha).toContain(`"${icone}"`);
    }
  });

  // O defeito que esta sessão passou a corrigir: controlos que não fazem nada.
  // Cada ação ou está ligada, ou está desativada com o motivo à vista.
  test('nenhuma ação é um botão morto', () => {
    expect(ficha).toMatch(/removeEquip\(equip\.id\)/);        // remover liga
    expect(ficha).toMatch(/editEquip\(equip\.id, manut\)/);   // manutenção liga
    expect(ficha).toMatch(/launchImageLibraryAsync/);         // fotografias ligam
    // exportar não é possível sem fatura, e diz porquê em vez de não fazer nada
    expect(ficha).toMatch(/desativado=\{!equip\.fatura\}/);
    expect(ficha).toMatch(/Ainda não há fatura para exportar/);
  });

  test('remover pede confirmação — não se desfaz', () => {
    expect(ficha).toMatch(/<Confirm[\s\S]*?destructive/);
    expect(ficha).toContain('Remover equipamento?');
  });

  test('as edições não escrevem sobre as sementes', () => {
    const store = read('src/store.jsx');
    expect(store).toMatch(/equipEdits/);
    expect(store).toMatch(/\.\.\.\(\(s\.equipEdits \|\| \{\}\)\[e\.id\] \|\| \{\}\)/);
    expect(read('src/data.js')).toMatch(/export const EQUIP = \[/);   // sementes intactas
  });
});

describe('Português europeu', () => {
  const BR = [
    [/\bCompartilh/i, 'compartilhar → partilhar'],
    [/\bgerenci/i, 'gerenciar → gerir'],
    [/\bAguardando\b/, 'Aguardando → A aguardar'],
    [/\bplanejar\b/i, 'planejar → planear'],
    [/\busuário/i, 'usuário → utilizador'],
    [/\bdeletar\b/i, 'deletar → eliminar'],
    // Este estava no ecrã de entrada, e está também no protótipo. O protótipo
    // ganha nas medidas; no registo da língua ganha o CLAUDE.md.
    [/\bacess(ar|ando|e)\b/i, 'acessar → aceder'],
    [/\bsalvar\b/i, 'salvar → guardar'],
    [/\bcadastr(o|ar|e)\b/i, 'cadastrar → registar'],
    [/\bregistr(o|ar|ado)\b/i, 'registro → registo (registar)'],
    [/\baplicativo\b/i, 'aplicativo → aplicação'],
    [/\bsenha\b/i, 'senha → palavra-passe'],
    [/\bcelular\b/i, 'celular → telemóvel'],
    [/\btela\b/i, 'tela → ecrã'],
  ];

  // Sem comentários: o que conta é o que o membro lê. Um comentário que
  // explica o brasileirismo corrigido não é um brasileirismo — e sem isto o
  // teste dava-se por falhado a si próprio.
  test.each(BR)('nenhum ficheiro usa %s', (re, hint) => {
    const offenders = jsxFiles().filter(f => re.test(semComentarios(read(f))));
    expect({ hint, offenders }).toEqual({ hint, offenders: [] });
  });

  // O gerúndio de acção contínua é brasileiro: «está carregando» em vez de
  // «está a carregar». Não aparece em nenhum ficheiro hoje e é a construção
  // mais fácil de deixar entrar sem dar por isso.
  test('não há gerúndio de acção contínua', () => {
    const re = /\b(está|estão|estamos|estou|continua|vai)\s+[a-zà-ÿ]+ndo\b/iu;
    const offenders = jsxFiles().filter(f => re.test(semComentarios(read(f))));
    expect(offenders).toEqual([]);
  });

  // O género gramatical é dado da pessoa, não coisa que se adivinhe do nome.
  // Três sítios adivinhavam-no com `nome === 'Rita' || nome === 'Mia'`, e um
  // esquecia-se: a ficha da Mia dizia «Saúde do Mia».
  test('o género vem dos dados, e nenhum ecrã o adivinha pelo nome', () => {
    const { MEMBERS, DE, FEM } = require('../src/data.js');
    for (const [nome, m] of Object.entries(MEMBERS)) {
      expect(typeof m.fem).toBe('boolean');
      expect(DE(nome)).toBe(m.fem ? 'da' : 'do');
      expect(FEM(nome)).toBe(m.fem);
    }
    const adivinhas = jsxFiles().filter(f => /=== '(Rita|Mia)'\s*\|\|/.test(semComentarios(read(f))));
    expect(adivinhas).toEqual([]);
    const artigoFixo = jsxFiles().filter(f => /Saúde d[oa] \$\{/.test(semComentarios(read(f))));
    expect(artigoFixo).toEqual([]);
  });

  // Fronteiras em Unicode: \b parte-se nos acentos, e /\bvocê\b/ casava dentro
  // de «vocês». As fronteiras aqui são «não é letra».
  test('não há tratamento por «tu»', () => {
    const re = /(?<![\p{L}])(tu|teu|teus|tua|tuas|contigo|ti)(?![\p{L}])/iu;
    const offenders = jsxFiles().filter(f => re.test(semComentarios(read(f))));
    expect(offenders).toEqual([]);
  });
});

describe('Camada de ligação ao servidor — PocketBase', () => {
  const cliente = read('src/pocketbase.js');
  const colecoes = read('db/pocketbase/criar-colecoes.mjs');

  // Estes testes leem código. As regras do servidor não se verificam assim —
  // verificam-se a correr, em db/pocketbase/provar-regras.mjs (19 provas) e
  // provar-hooks.mjs (12). Aqui só se guarda o que o cliente não pode fazer.
  test('a ligação é opcional: sem URL, a app corre local', () => {
    expect(cliente).toMatch(/export const ligado = Boolean\(URL\)/);
    expect(cliente).toMatch(/process\.env\.EXPO_PUBLIC_PB_URL/);
  });

  // INVARIANTE #3: quem decide o que existe é o servidor.
  test('o PIN é verificado no servidor, nunca comparado aqui', () => {
    expect(cliente).toMatch(/authWithPassword\(login, pin\)/);
    expect(cliente).not.toMatch(/pin\s*===|===\s*pin\b/);
    // e a coleção de membros é de autenticação, que é o que faz o hash
    expect(colecoes).toMatch(/name: 'membros', type: 'auth'/);
  });

  // INVARIANTE #2: sem regra de update nem de delete, o servidor recusa-os.
  test('o cofre é uma coleção de inserções', () => {
    const bloco = colecoes.slice(colecoes.indexOf("name: 'cofre_movimentos'"),
                                 colecoes.indexOf("name: 'equipamentos'"));
    expect(bloco).toMatch(/updateRule: null/);
    expect(bloco).toMatch(/deleteRule: null/);
    expect(cliente).not.toMatch(/update\([^)]*saldo/i);
  });

  // §5: ausentes da resposta, não escondidos na interface.
  test('o orçamento exclui perfis de criança na própria regra', () => {
    const bloco = colecoes.slice(colecoes.indexOf("name: 'envelopes'"),
                                 colecoes.indexOf("name: 'despesas'"));
    expect(bloco).toMatch(/listRule: `\$\{DA_CASA\} && \$\{ADULTO\}`/);
  });

  // §6 e §9: nenhuma operação de dinheiro sem chave.
  test('as operações de dinheiro levam chave de idempotência', () => {
    for (const c of ['despesas', 'cofre_movimentos']) {
      expect(colecoes).toMatch(new RegExp(`CREATE UNIQUE INDEX \\w+ ON ${c} \\(casa, idem_key\\)`));
    }
    expect(cliente).toMatch(/COM_IDEM = new Set\(\['despesas', 'cofre_movimentos'\]\)/);
  });

  // §5 chama-lhe «a regra mais restritiva do sistema». Aqui só se guarda que a
  // condição existe com a forma certa; que ela FUNCIONA prova-se a correr, em
  // provar-saude.mjs — incluindo a transição de papel retroativa.
  test('a ficha de um adulto exclui os outros adultos, na própria regra', () => {
    expect(colecoes).toMatch(/const SAUDE_VISIVEL =/);
    // ou o registo é meu, ou eu sou adulto E o dono é criança — nunca outro adulto
    expect(colecoes).toContain('membro = @request.auth.id || (${ADULTO} && membro.papel = "crianca")');
  });

  test('a saúde não vem na leitura em massa — pede-se ficha a ficha', () => {
    const bloco = cliente.slice(cliente.indexOf('const COLECOES'), cliente.indexOf('export const ler'));
    expect(bloco).not.toMatch(/episodios_saude|anexos/);
    expect(cliente).toMatch(/async saude\(membroId\)/);
  });

  test('nenhum segredo ficou no código', () => {
    expect(cliente).not.toMatch(/eyJ[A-Za-z0-9_-]{20}|service_role/);
    // a palavra-passe de superutilizador só existe nos scripts de prova locais
    expect(cliente).not.toMatch(/casa-de-testes/);
  });

  test('as provas do servidor existem e são executáveis', () => {
    for (const f of ['db/pocketbase/provar-regras.mjs', 'db/pocketbase/provar-hooks.mjs',
                     'db/pocketbase/provar-saude.mjs', 'db/pocketbase/provar-cliente.mjs']) {
      expect(read(f)).toMatch(/process\.exit\(mau \? 1 : 0\)/);
    }
  });
});

describe('O que a interface promete, o código faz', () => {
  // O texto anunciava 30 % para as metas (Dinheiro) e para os cofres (Gestão);
  // o manipulador não fazia nem uma coisa nem outra.
  // Sem comentários: o que se mede é o que o utilizador lê, não as notas ao lado.
  const withoutComments = (src) => src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  test('fechar o mês não promete mover dinheiro', () => {
    for (const f of ['src/screens/Dinheiro.jsx', 'src/screens/Gestao.jsx']) {
      expect(withoutComments(read(f))).not.toMatch(/30\s*%|\*\s*0\.30/);
    }
  });

  test('não sobra o cálculo morto dos 30 %', () => {
    expect(read('src/screens/Dinheiro.jsx')).not.toMatch(/toGoals/);
  });
});
