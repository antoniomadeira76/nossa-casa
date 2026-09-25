/**
 * UMA ESCOLHA QUE CRESCE COM A CASA NÃO SE FAZ NUMA FILA QUE QUEBRA
 * ============================================================================
 *
 * 25/09/2026. Ele abriu a folha de criar artigo e disse: «arranja uma solução
 * melhor para os filtros dos corredores, quando forem muitos vão ocupar muito
 * espaço». O simulador de `design/escolher-corredor.dc.html` mediu-o:
 *
 *     corredores        4      8     15     27
 *     pastilhas       149    197    293    485 px
 *     o campo B        83     83     83     83 px
 *
 * Escolheu a B — uma linha que abre a lista — e mandou usá-la «em todos os
 * sítios com situações semelhantes».
 *
 * ── Porque é que isto é um guarda e não um recado ────────────────────────────
 *
 * O varrimento encontrou a MESMA fila de pastilhas em dez sítios, e a mesma
 * pergunta já tinha sido respondida de três maneiras diferentes nesta app: a
 * folha de marcar consulta escreveu a sua própria B à mão; o filtro de membros
 * encolheu a célula para 52; a Documentação pôs ícones de 44 numa linha só. Uma
 * decisão que se toma quatro vezes não está tomada.
 *
 * Este guarda ENUMERA. Anda pela árvore de todos os `.jsx` da app, encontra
 * cada `<Choice>` desenhado dentro de um `.map()` numa fila que quebra de
 * linha, e cruza a lista encontrada com o INVENTÁRIO aqui em baixo. Cada
 * entrada do inventário diz de onde vêm as opções e porque é que aquela não
 * cresce. Uma fila nova, ou uma que passe a ler uma lista da casa, chumba aqui
 * e obriga a decidir — que é o que ele pediu: «avisa-me quando encontrares».
 *
 * ⚠ Lê-se a ÁRVORE, com o Babel, e não o texto. Os comentários que explicam
 * esta correcção falam de `Choice` e de `seccoes` dentro dos próprios ficheiros
 * corrigidos — é a armadilha já catalogada em
 * `armadilhas-de-tratar-codigo-como-texto`.
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
      else if (/\.jsx$/.test(nome)) achados.push(p);
    }
  };
  andarDir(path.join(RAIZ, 'src'));
  const app = path.join(RAIZ, 'App.jsx');
  if (fs.existsSync(app)) achados.push(app);
  return achados;
};

const andar = (no, visita, pai = null) => {
  if (!no || typeof no !== 'object') return;
  if (Array.isArray(no)) { for (const x of no) andar(x, visita, pai); return; }
  if (typeof no.type === 'string') { visita(no, pai); pai = no; }
  for (const k of Object.keys(no)) {
    if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue;
    andar(no[k], visita, pai);
  }
};

// Um `<View style={{ ..., flexWrap: 'wrap' }}>` — a fila que quebra.
const ehFilaQueQuebra = (no) => {
  if (no.type !== 'JSXOpeningElement') return false;
  let quebra = false;
  for (const a of no.attributes) {
    if (a.type !== 'JSXAttribute' || !a.name || a.name.name !== 'style') continue;
    andar(a.value, (x) => {
      if (x.type === 'ObjectProperty' && x.key && x.key.name === 'flexWrap') quebra = true;
    });
  }
  return quebra;
};

// De onde vem a lista: `seccoes.map(...)` → «seccoes»; `s.stores.map(...)` →
// «s.stores»; `Object.keys(X).map(...)` → «Object.keys(…)».
const fonteDoMap = (chamada) => {
  const c = chamada.callee;
  if (!c || c.type !== 'MemberExpression' || !c.property || c.property.name !== 'map') return null;
  const escreve = (no) => {
    if (!no) return '?';
    if (no.type === 'Identifier') return no.name;
    if (no.type === 'MemberExpression') {
      return `${escreve(no.object)}.${no.property && no.property.name ? no.property.name : '…'}`;
    }
    if (no.type === 'CallExpression') return `${escreve(no.callee)}(…)`;
    if (no.type === 'ArrayExpression') return '[…]';
    return no.type;
  };
  return escreve(c.object);
};

// ── O varrimento ────────────────────────────────────────────────────────────
const achados = [];
for (const ficheiro of ficheirosDaApp()) {
  let arvore;
  try {
    arvore = babel.parse(fs.readFileSync(ficheiro, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  } catch { continue; }

  andar(arvore.program, (no) => {
    if (!ehFilaQueQuebra(no)) return;
    // O elemento inteiro é o pai do `JSXOpeningElement`; procura-se lá dentro.
    // Anda-se a partir da abertura para trás não dá: parte-se do elemento.
  });

  // Segunda passagem, agora sobre os ELEMENTOS.
  andar(arvore.program, (no) => {
    if (no.type !== 'JSXElement' || !ehFilaQueQuebra(no.openingElement)) return;
    andar(no.children, (dentro) => {
      if (dentro.type !== 'CallExpression') return;
      const fonte = fonteDoMap(dentro);
      if (!fonte) return;
      // Há um `<Choice>` no que este `.map()` devolve?
      let temChoice = false;
      andar(dentro.arguments, (x) => {
        if (x.type === 'JSXOpeningElement' && x.name && x.name.name === 'Choice') temChoice = true;
      });
      if (!temChoice) return;
      achados.push({
        ficheiro: path.relative(RAIZ, ficheiro).replace(/\\/g, '/'),
        linha: dentro.loc ? dentro.loc.start.line : 0,
        fonte,
      });
    });
  });
}

const chave = (a) => `${a.ficheiro} · ${a.fonte}`;

// ── O INVENTÁRIO ────────────────────────────────────────────────────────────
//
// Cada linha é uma fila de pastilhas que FICA, e a razão por que fica. A regra
// é uma só: as opções não crescem com a casa. Duas ou três escolhas fixas vêem-
// -se melhor todas de uma vez do que escondidas atrás de um toque — e a B
// custava-lhes um toque a mais sem ganhar píxel nenhum.
const FICAM = {
  'src/sheets/NovaTarefa.jsx · URG_OPTS'
    : 'A urgência — três valores, e são o INVARIANTE #6. Nunca vai ter um quarto.',
  'src/sheets/FichaEmergencia.jsx · GRAVIDADES'
    : 'A gravidade de uma alergia — escala clínica fechada, não é lista da casa.',
  'src/screens/Equipamentos.jsx · CATS'
    : '⚠ As categorias de equipamento — quatro, numa CONSTANTE. Está a meio caminho: '
      + 'a loja tem `equipCats` como uma das três listas da casa e o servidor tem a coleção '
      + '`categorias_equip`, mas NENHUM ecrã as lê. As outras duas da mesma trindade (lojas, '
      + 'especialidades) já crescem com a casa. No dia em que a interface for ligada ao '
      + '`equipCats`, isto passa a crescer e tem de levar o campo.',
  'src/sheets/FichaEquipamento.jsx · CATEGORIAS_DE_EQUIPAMENTO'
    : '⚠ A segunda metade do caso acima — o mesmo campo na folha de editar.',

  // ── POR DECIDIR ──────────────────────────────────────────────────────────
  // Estas DUAS crescem com a casa, e por isso são a classe do corredor. Não
  // levaram o campo porque converter custa alguma coisa que está no ecrã, e
  // essa troca é dele: «avisa-me quando encontrares para eu decidir».
  // Enquanto não decidir, ficam aqui nomeadas — e a prova
  // «as que estão por decidir são exactamente estas» falha no dia em que
  // alguém acrescentar uma terceira sem passar por ele.
  'src/sheets/CamposContaFixa.jsx · envelopes'
    : '⚠ POR DECIDIR — o envelope de uma conta fixa. CRESCE com a casa, e os nomes são '
      + 'compridos («Crianças & escola»). Não se converteu sozinho porque o envelope tem TRÊS '
      + 'formas diferentes nesta app: esta fila, a grelha de dois do «Mover» e a pilha vertical '
      + 'da despesa nova — e a grelha mostra o «livre 138,00 €» de cada um, que o campo esconde '
      + 'até se abrir. Ou entram as três, ou não entra nenhuma.',
  'src/screens/Dinheiro.jsx · metas'
    : '⚠ POR DECIDIR — a meta que recebe o saldo ao fechar o mês. CRESCE com a casa. Aqui a '
      + 'escolha é OPCIONAL e desliga-se tocando outra vez na escolhida, que é a saída para '
      + 'quem se enganou; um campo que abre precisa de uma linha «nenhuma» para não a perder.',
};

// As que crescem com a casa e ainda esperam decisão. Estão no inventário para
// o guarda não chumbar, e aqui para não se esquecerem.
const POR_DECIDIR = [
  'src/sheets/CamposContaFixa.jsx · envelopes',
  'src/screens/Dinheiro.jsx · metas',
];

describe('uma escolha que cresce com a casa não é uma fila que quebra', () => {
  it('o varrimento funciona — encontra filas de pastilhas onde elas estão', () => {
    // Um guarda que não varre nada passa sempre.
    expect(achados.length).toBeGreaterThan(0);
  });

  it('⚠ todas as filas de pastilhas que restam estão no inventário, com a razão escrita', () => {
    const forasteiras = achados.map(chave).filter(k => !(k in FICAM));
    // Se isto falhar com uma fila nova: ou as opções são fixas e poucas, e
    // acrescenta-se aqui com a razão; ou crescem com a casa, e leva o
    // `CampoDeEscolha`. Não há terceira saída — é o que ele pediu ao mandar
    // usar a B «em todos os sítios com situações semelhantes».
    expect([...new Set(forasteiras)]).toEqual([]);
  });

  it('⚠ as que CRESCEM e ainda esperam decisão são exactamente estas duas', () => {
    // Não é uma lista de desculpas: é o que falta decidir, à vista. Uma
    // terceira fila sobre uma lista da casa chumba aqui — e é isso que faz a
    // decisão chegar a ele em vez de se instalar em silêncio.
    const inventariadas = new Set(achados.map(chave));
    for (const k of POR_DECIDIR) expect(inventariadas.has(k)).toBe(true);
    for (const k of POR_DECIDIR) expect(FICAM[k]).toMatch(/POR DECIDIR/);
  });

  it('⚠ e o inventário não tem linhas mortas', () => {
    // Uma razão escrita para uma fila que já não existe é documentação a
    // apodrecer, e faz o inventário parecer maior do que a app.
    const vivas = new Set(achados.map(chave));
    expect(Object.keys(FICAM).filter(k => !vivas.has(k))).toEqual([]);
  });
});

describe('⚠ os sítios que a opção B levou já não têm pastilhas', () => {
  // Esta é a outra metade: as provas acima impedem filas NOVAS, estas impedem
  // que as corrigidas voltem atrás. Cada uma nomeia a lista que cresce.
  const semFilaSobre = (ficheiro, fonte) => {
    const iguais = achados.filter(a => a.ficheiro === ficheiro && a.fonte === fonte);
    expect(iguais).toEqual([]);
  };

  it('o corredor — três folhas, a mesma lista da casa', () => {
    semFilaSobre('src/sheets/NovoArtigo.jsx', 'seccoes');
    semFilaSobre('src/sheets/GerirArtigo.jsx', 'seccoes');
    semFilaSobre('src/KidApp.jsx', 'seccoes');
  });

  it('a loja da ida', () => {
    semFilaSobre('src/screens/ComoFazemosCompras.jsx', 'lojas');
  });

  it('a especialidade a exportar', () => {
    semFilaSobre('src/sheets/ExportarSaude.jsx', 'especialidades');
  });

  it('as duas tarefas da troca — o pior caso, por causa dos títulos', () => {
    semFilaSobre('src/sheets/ProporTroca.jsx', 'minhas');
    semFilaSobre('src/sheets/ProporTroca.jsx', 'deles');
  });
});

describe('⚠ e há UM campo que abre, não vários', () => {
  const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

  it('todos os que escolhem de uma lista que cresce usam o `CampoDeEscolha`', () => {
    // A folha de marcar consulta tinha a sua própria B escrita à mão, com a
    // história no comentário. Duas Bs diferentes eram o defeito de origem
    // outra vez — e a dela nem sequer tinha tecto: com trinta especialidades o
    // acordeão voltava a empurrar o botão de marcar para fora do ecrã.
    const esperados = [
      'src/sheets/NovoArtigo.jsx', 'src/sheets/GerirArtigo.jsx', 'src/KidApp.jsx',
      'src/screens/Saude.jsx', 'src/sheets/ExportarSaude.jsx', 'src/sheets/ProporTroca.jsx',
    ];
    const semCampo = esperados.filter(f => !/CampoDeEscolha/.test(ler(f)));
    expect(semCampo).toEqual([]);
  });

  it('⚠ e a folha de marcar consulta já não tem a sua própria lista à mão', () => {
    const saude = ler('src/screens/Saude.jsx');
    // O estado do acordeão era este, e vivia dentro da folha.
    expect(saude).not.toMatch(/const \[escolhendoEsp/);
  });

  it('o limiar da pesquisa vive DENTRO do componente, e não em cada sítio', () => {
    // Senão cada folha decidia o seu, e a mesma lista de quinze tinha pesquisa
    // num sítio e não tinha no outro.
    const { PESQUISA_ACIMA_DE } = require('../src/CampoDeEscolha');
    expect(PESQUISA_ACIMA_DE).toBe(12);
  });
});
