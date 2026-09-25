/**
 * UM NOME QUE A FAMÍLIA ESCREVEU NÃO SE CORTA NO DADO
 * ============================================================================
 *
 * 25/09/2026, e é a SEGUNDA vez. À segunda, varre-se tudo e escreve-se um
 * guarda que enumera.
 *
 *   1. As abas do Modo Compras: `n.split(' ')[0]`. «Frutas & Legumes» lia-se
 *      «Frutas», e uma casa que também tivesse «Frutas do dia» ficava com DUAS
 *      ABAS COM O MESMO RÓTULO.
 *   2. O aviso de garantia do Início: `String(e.name).split(' ').slice(0, 2)`.
 *      «Máquina de lavar roupa» e «Máquina de lavar loiça» ficavam as duas
 *      «Garantia a expirar · Máquina de» — duas linhas idênticas no mesmo
 *      cartão, cada uma a abrir a ficha de um equipamento diferente.
 *
 * Nos dois casos o nome cortado ia TAMBÉM para o leitor de ecrã.
 *
 * ── Porque é que um corte no DADO é pior do que um corte no desenho ──────────
 *
 * Uma reticência diz «há mais texto» — quem lê sabe que não está a ver tudo, e
 * o resto está a um toque. Um `split` não diz nada: devolve uma palavra
 * inteira, sem «…», e apresenta-a como se fosse o nome. Lê-se como certo.
 *
 * E não havia problema de largura para resolver em nenhum dos dois: o aviso do
 * Início parte para a segunda linha (a `Row` não tem `numberOfLines`), e a aba
 * do Modo Compras passou a fazer-se do tamanho do nome.
 *
 * ── O que este guarda faz ────────────────────────────────────────────────────
 *
 * Anda pela árvore de todos os `.js` e `.jsx` da app e encontra cada sítio onde
 * um texto é PARTIDO E DEITADO FORA — `split(...)` seguido de `[0]`, `.pop()`
 * ou `.slice(...)` — e cada `charAt(0)`. Cruza com o inventário aqui em baixo,
 * onde cada entrada diz o que corta e porque é que aquilo pode ser cortado.
 *
 * ⚠ Lê-se a ÁRVORE, com o Babel. Depois da correcção, `split(' ')` aparece nos
 * dois ficheiros corrigidos — dentro dos COMENTÁRIOS que explicam o defeito. Um
 * guarda de texto proibia a explicação, que é a armadilha já catalogada em
 * `armadilhas-de-tratar-codigo-como-texto` e que já custou duas tardes.
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/parser');

const RAIZ = path.join(__dirname, '..');

const ficheirosDaApp = () => {
  const achados = [];
  const andarDir = (dir) => {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) andarDir(p);
      else if (/\.jsx?$/.test(nome)) achados.push(p);
    }
  };
  andarDir(path.join(RAIZ, 'src'));
  const app = path.join(RAIZ, 'App.jsx');
  if (fs.existsSync(app)) achados.push(app);
  return achados;
};

const andar = (no, visita) => {
  if (!no || typeof no !== 'object') return;
  if (Array.isArray(no)) { for (const x of no) andar(x, visita); return; }
  if (typeof no.type === 'string') visita(no);
  for (const k of Object.keys(no)) {
    if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue;
    andar(no[k], visita);
  }
};

// Como se escreve o que foi partido, para o inventário se ler.
const escrever = (no) => {
  if (!no) return '?';
  if (no.type === 'Identifier') return no.name;
  if (no.type === 'ThisExpression') return 'this';
  if (no.type === 'StringLiteral') return `'${no.value}'`;
  if (no.type === 'NumericLiteral') return String(no.value);
  if (no.type === 'RegExpLiteral') return `/${no.pattern}/`;
  if (no.type === 'MemberExpression') {
    const p = no.computed ? `[${escrever(no.property)}]` : `.${no.property.name || '…'}`;
    return escrever(no.object) + p;
  }
  if (no.type === 'CallExpression') {
    return `${escrever(no.callee)}(${(no.arguments || []).map(escrever).join(', ')})`;
  }
  if (no.type === 'TemplateLiteral') return '`…`';
  if (no.type === 'LogicalExpression') return `${escrever(no.left)} ${no.operator} ${escrever(no.right)}`;
  return no.type;
};

// ── O varrimento ────────────────────────────────────────────────────────────
//
// «Partir e deitar fora» é um `split` cujo resultado é logo indexado, `pop`ado
// ou fatiado. Um `split` cujas partes se usam TODAS (`const [i, d] = …`, um
// `.map`, um `.join` sem fatia) não deita nada fora e não entra.
const achados = [];
for (const ficheiro of ficheirosDaApp()) {
  let arvore;
  try {
    arvore = babel.parse(fs.readFileSync(ficheiro, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  } catch { continue; }
  const rel = path.relative(RAIZ, ficheiro).replace(/\\/g, '/');

  andar(arvore.program, (no) => {
    // `charAt(0)` — a inicial de um avatar, e mais nada.
    if (no.type === 'CallExpression' && no.callee && no.callee.type === 'MemberExpression'
        && no.callee.property && no.callee.property.name === 'charAt') {
      achados.push({ rel, linha: no.loc ? no.loc.start.line : 0,
        forma: 'charAt', corta: escrever(no.callee.object) });
      return;
    }
    // Um `X` que é um `split(...)`, envolvido por um `[n]`, `.pop()` ou `.slice(...)`.
    if (no.type !== 'MemberExpression') return;
    const dentro = no.object;
    const ehSplit = dentro && dentro.type === 'CallExpression' && dentro.callee
      && dentro.callee.type === 'MemberExpression'
      && dentro.callee.property && dentro.callee.property.name === 'split';
    if (!ehSplit) return;
    const prop = no.computed ? 'índice' : (no.property && no.property.name);
    if (!(prop === 'índice' || prop === 'pop' || prop === 'slice' || prop === 'shift')) return;
    achados.push({
      rel, linha: no.loc ? no.loc.start.line : 0,
      forma: `split(${(dentro.arguments || []).map(escrever).join('')}) + ${prop}`,
      corta: escrever(dentro.callee.object),
    });
  });
}

const chave = (a) => `${a.rel} · ${a.corta} · ${a.forma}`;

// ── O INVENTÁRIO ────────────────────────────────────────────────────────────
//
// Cada linha é um texto partido que FICA, e a razão por que pode ser partido.
// A regra: o que se corta não pode ser um nome que a família escreveu.
const PODEM = {
  // ── Textos que a PRÓPRIA app compôs, e que se voltam a separar ────────────
  "src/format.js · dayLabel(dueKey) · split(' · ') + pop":
    'A etiqueta de um dia, composta pela própria app («Hoje · Quinta, 03/09»). '
    + 'Fica a parte da data. Nada aqui foi escrito pela família.',
  "src/ler-imagem.js · String(uri) · split('?') + índice":
    'O endereço de um ficheiro, para lhe tirar a linha de pergunta.',
  "src/ler-imagem.js · String(uri).split('?')[0] · split('.') + pop":
    'O mesmo endereço, agora para lhe tirar a extensão. Não é um nome que se leia.',
  "src/screens/Tarefas.jsx · c · split('|') + índice":
    'A CHAVE de uma marcação («tsk-3|d2026-09-20»), para lhe tirar o id da tarefa. '
    + 'É uma chave de dados, não texto de ecrã.',

  // ── A inicial de um avatar ────────────────────────────────────────────────
  //
  // ⚠ É a única abreviatura desta app que é uma CONVENÇÃO e não um corte.
  // «Mia», «Miguel» e «Maria» dão todos «M» — e é por isso que a bola nunca
  // pode ser a única indicação de quem é: leva sempre o nome ao lado ou no
  // rótulo em voz alta. Onde isso não acontecer, é defeito.
  "src/ui.jsx · String(nome || '?').trim() · charAt":
    'A inicial do avatar, no `avatarDe` — a fonte de todas as outras.',
  "src/store.jsx · String(novo).trim() · charAt":
    'A mesma inicial, quando a casa renomeia um membro.',
  'src/store.jsx · n · charAt':
    'A mesma inicial, ao montar os membros da casa.',
  "src/sync.js · String(m.nome || '?').trim() · charAt":
    'A mesma inicial, quando os membros vêm do servidor.',
  'src/KidApp.jsx · kid · charAt':
    'A mesma inicial, na app da criança.',
  'src/sheets/EscolherAvatar.jsx · user · charAt':
    'A mesma inicial, na folha de escolher avatar.',
};

// ⚠ O rótulo é a CHAVE do inventário, e não uma frase: quando esta prova
// falhar, o que ela imprime copia-se para o `PODEM` tal e qual, com a razão
// escrita ao lado. Um guarda que obriga a adivinhar a chave que ele próprio
// espera é um guarda que se contorna a apagar a linha.
const rotulo = (a) => `${chave(a)}   (linha ${a.linha})`;

describe('um nome que a família escreveu não se corta no dado', () => {
  it('o varrimento funciona — encontra cortes onde eles estão', () => {
    // Um guarda que não varre nada passa sempre.
    expect(achados.length).toBeGreaterThan(3);
  });

  it('⚠ todo o corte que resta está no inventário, com a razão escrita', () => {
    const forasteiros = achados.filter(a => !(chave(a) in PODEM)).map(rotulo);
    // Se isto falhar: ou o que se corta NÃO é um nome que a família escreveu, e
    // acrescenta-se aqui com a razão; ou é, e não se corta — mostra-se inteiro
    // e deixa-se o desenho tratar da largura, que pelo menos põe reticências.
    expect([...new Set(forasteiros)]).toEqual([]);
  });

  it('⚠ e o inventário não tem linhas mortas', () => {
    const vivos = new Set(achados.map(chave));
    expect(Object.keys(PODEM).filter(k => !vivos.has(k))).toEqual([]);
  });
});

describe('⚠ os dois que deram origem a isto estão mesmo corrigidos', () => {
  const cortesEm = (rel) => achados.filter(a => a.rel === rel && a.forma.startsWith("split(' ')"));

  it('as abas do Modo Compras mostram o nome inteiro do corredor', () => {
    expect(cortesEm('src/screens/ModoCompras.jsx')).toEqual([]);
  });

  it('o aviso de garantia do Início mostra o nome inteiro do equipamento', () => {
    expect(cortesEm('src/screens/Inicio.jsx')).toEqual([]);
  });

  it('⚠ e nenhum ficheiro da app parte um texto por ESPAÇOS para o encurtar', () => {
    // É esta a forma exacta do defeito: partir por espaços e ficar com as
    // primeiras palavras. Não deixa reticências, e por isso lê-se como certo.
    const porEspacos = achados.filter(a => /^split\('\s'\)|^split\(\/\\s/.test(a.forma));
    expect(porEspacos.map(rotulo)).toEqual([]);
  });
});
