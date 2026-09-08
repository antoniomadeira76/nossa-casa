// Tokens do sistema +Cliente. Único sítio onde vivem cores, escala e tipo.
// Regra herdada do protótipo: títulos de secção nunca em preto. Eram slate
// fixo; hoje seguem o esquema do membro — ver `titulo` no `buildTheme`.

// Os seis esquemas. Cada um são DUAS cores: a de ação e a do cabeçalho.
//
// ── O tecto, que não é uma questão de gosto ──────────────────────────────────
//
// O cabeçalho leva o título a branco, 20 px, peso 500 — que não conta como
// texto grande em nenhuma norma. Precisa de 4,5:1, e isso põe um limite duro:
// luminância do cabeçalho ≤ 0,183. Um esquema «claro» de verdade — um pastel —
// dava um título ilegível, e nenhum ajuste de alfa salva um branco sobre
// bege.
//
// O que se pode fazer, e é o que estes três novos fazem, é sair dos 14–18:1
// dos antigos para 5–7,5:1: um cabeçalho visivelmente mais claro, com o título
// ainda a passar. O mais claro de todos é o Cinza, a 5,09 — e o cinza mais
// claro que ainda cumpre a norma é #6B7280, a 4,83. Não há muito mais para
// dar deste lado.
//
// ── Os três que saíram, e porquê ─────────────────────────────────────────────
//
//   Azul Sóbrio  o mais escuro de todos (18:1) e da mesma família do Céu
//   Verde        substituído pelo Menta, a mesma família muito mais clara
//   Grafite      substituído pelo Cinza, o mesmo neutro muito mais claro
//
// ── Nem âmbar nem terracota ──────────────────────────────────────────────────
//
// Passavam no contraste e ficaram de fora à mesma: seriam um laranja como cor
// de AÇÃO, e o laranja saiu desta app de propósito (ver o erro #3 da lista do
// CLAUDE.md). Um esquema laranja trá-lo-ia de volta pela porta do lado.
export const SCHEMES = [
  { name: 'Violeta',     accent: '#722ED1', hover: '#8B4EE0', chrome: '#241239' },
  // ⚠ O acento era #08979C, e dava 3,55:1 com o branco por cima.
  //
  // A cor de ação é FUNDO de branco em toda a app: o botão principal, a
  // pastilha escolhida, a marca de um dia no calendário. 3,55 é abaixo dos 4,5
  // que texto de 13 a 15 px exige — quem escolhesse o Cião ficava com o botão
  // mais importante por baixo do mínimo legível, em todos os ecrãs.
  //
  // O cuidado existia para o CABEÇALHO desde que os três esquemas novos
  // entraram — «cabeçalho entre 5:1 e 7,5:1 com o branco» — e não tinha sido
  // aplicado ao acento. O Cião era o único dos seis a falhar.
  //
  // #078286 dá 4,62 com o branco e 4,51 contra o cartão (o `titulo` do modo
  // claro É o acento, e é texto). Um passo além do limite, de propósito e pela
  // mesma razão escrita no Cinza: sem margem, qualquer ajuste futuro atravessa
  // a linha sem se notar.
  { name: 'Cião',        accent: '#078286', hover: '#13ADB3', chrome: '#0A5B60' },
  { name: 'Céu',         accent: '#1B5FA8', hover: '#2679C9', chrome: '#0C2A47' },
  // Os três novos — cabeçalho entre 5:1 e 7,5:1 com o branco, contra os
  // 14–18:1 dos antigos.
  { name: 'Rosa',        accent: '#B5306E', hover: '#CC4285', chrome: '#8A3A5A' },
  { name: 'Menta',       accent: '#177D5E', hover: '#1E9B75', chrome: '#2E6455' },
  // O único em que o cabeçalho é MAIS CLARO do que a cor de ação. Nos outros
  // cinco o cabeçalho é o tom escuro; aqui é o claro, que é o que faz este
  // esquema ser cinza claro e não outro grafite. O `onChrome` e o `chromeLine`
  // sobem sozinhos o alfa do branco — foram feitos para isto.
  //
  // #646F80 dá 5,09:1 com o branco. O limite é 4,5, e o cinza mais claro que
  // ainda o cumpre é #6B7280 (4,83). Ficou um passo abaixo de propósito: sem
  // margem, qualquer futuro ajuste de tom atravessa a linha sem se notar.
  { name: 'Cinza',       accent: '#4B5563', hover: '#5E6A7C', chrome: '#646F80' },
];

const LIGHT = {
  page: '#F0F2F5', card: '#FCFCFD', surface: '#FFFFFF', subtle: '#FAFAFA', border: '#D9D9D9',
  // ⚠ `text3` e `slate` estão UM TOM abaixo do protótipo (`#6A7282` e
  // `#67769B`), e é medido: a 11,5–12 px pedem 4,5:1, e sobre a PÁGINA
  // (#F0F2F5) o protótipo dava 4,31 e 4,03 — e o `slate` dava 4,41 até sobre o
  // cartão. Todas as etiquetas pequenas da app falhavam por uma unha, em todos
  // os esquemas claros. Apanhado em 08/09/2026 pela sonda de contraste no
  // navegador; o CLAUDE.md afirmava que o slate chegava aos 4,5 e era falso.
  // 0,95 e 0,93 do valor original: 4,69/5,13 e 4,53/4,96 (página/cartão).
  text1: '#262626', text2: '#434343', text3: '#656C7C', slate: '#606E90',
  divider: '#F0F2F5', tileWarn: 'rgba(255,251,230,0.8)', tileInfo: 'rgba(232,244,255,0.8)',
  tileErr: 'rgba(255,241,240,0.9)',
  // A faixa da esquerda de uma linha informativa do «Precisa de Si» — mais
  // clara do que o ícone (`text3`), como no protótipo: o ícone é `#6A7282` e a
  // linha `#A9B4C6`. A app usava uma cor para os dois, e as faixas cinzentas
  // ficavam quase pretas ao lado das coloridas. É um sinal redundante com o
  // ícone, não um objeto que se leia sozinho — por isso não lhe pede 3:1.
  faixa: '#A9B4C6',
};
// ── O escuro segue o esquema ─────────────────────────────────────────────────
//
// O escuro era UM só — página #00101C, cartão #0A2033, linhas #1E3A4F: um
// azul-marinho fixo, igual nos seis esquemas.
//
// No claro isso não se nota. A página é um cinzento quase branco, quase sem
// cor, e quem dá cor ao ecrã é o cabeçalho, o acento e os títulos. No escuro é
// ao contrário: a PÁGINA é a maior superfície do ecrã, e estava sempre azul.
// Com o Violeta escolhido, o ecrã inteiro ficava azul-marinho com um ponto
// violeta no meio — o esquema escolhido não chegava ao que se vê.
//
// Agora a página, os cartões e as linhas nascem do TOM do cabeçalho do esquema.
//
// ⚠ A saturação é limitada pela DO PRÓPRIO ESQUEMA, e não por um valor fixo.
// Uma saturação igual para todos tornava o Cinza — que é cinzento de propósito,
// e foi escolhido justamente por isso — num azul como os outros. O `Math.min`
// deixa o Violeta ir a violeta e o Cinza ficar onde está.
//
// Os tons por extenso, e o que cada um sustenta, estão em `LUMES`. As claridades
// vêm das do escuro antigo, para que o escuro continue igualmente escuro.

const hsl = (hex) => {
  const n = String(hex || '').replace('#', '');
  if (n.length !== 6) return { h: 0, s: 0, l: 0 };
  const [r, g, b] = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const l = (mx + mn) / 2;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0))
    : mx === g ? (b - r) / d + 2
    : (r - g) / d + 4;
  return { h: h * 60, s, l };
};

const paraHex = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map(v =>
    Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
};

// claridade e saturação máxima, por superfície
//
// ⚠ As claridades da página e do cartão não são um gosto — são a única coisa
// que separa um cartão do fundo no escuro, e essa separação foi MEDIDA contra a
// do escuro antigo (cartão/página 1,16 · linha/cartão 1,40) para não regredir.
// Um cartão a 0,115 de claridade sobre uma página a 0,055 dava 1,10 no Violeta:
// o cartão desaparecia no fundo, e um ecrã de cartões passava a uma mancha só.
const LUMES = {
  page:    [0.042, 0.55],   // o fundo de tudo
  card:    [0.135, 0.42],   // cartões, folhas, rodapé
  subtle:  [0.180, 0.36],   // a superfície de dentro de um cartão
  border:  [0.255, 0.28],   // linhas e divisórias
  faixa:   [0.420, 0.20],   // a faixa informativa do Início: entre a linha e o texto
  text3:   [0.660, 0.14],   // texto terciário — pouca cor, muito contraste
  slate:   [0.740, 0.24],   // as etiquetas pequenas
};

// A luminância relativa da WCAG, e o contraste entre duas cores.
const luminancia = (hex) => {
  const n = String(hex || '').replace('#', '');
  const v = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};

export const contraste = (a, b) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// Clareia uma cor até ela cumprir um contraste contra um fundo.
//
// Sobe a claridade em passos de 1% e pára ao chegar ao alvo. O tom e a
// saturação não se mexem: a cor continua a ser a do esquema, só mais clara.
const clarearAte = (hex, fundo, alvo) => {
  const { h, s, l } = hsl(hex);
  for (let x = l; x <= 1; x += 0.01) {
    const c = paraHex(h, s, x);
    if (contraste(c, fundo) >= alvo) return c;
  }
  return '#FFFFFF';
};

// Escurece uma cor até ela cumprir um contraste contra um fundo — o par do
// `clarearAte`, para o aspeto claro.
const escurecerAte = (hex, fundo, alvo) => {
  const { h, s, l } = hsl(hex);
  for (let x = l; x >= 0; x -= 0.01) {
    const c = paraHex(h, s, x);
    if (contraste(c, fundo) >= alvo) return c;
  }
  return '#000000';
};

// A cor `a` pintada com transparência `alfa` sobre `fundo`, já composta num hex
// sólido. Sólido de propósito: um `rgba()` no ecrã compõe-se com o que estiver
// por baixo, e o contraste só se mede sobre a cor que resulta.
const mistura = (a, fundo, alfa) => {
  const c = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const [r1, g1, b1] = c(a);
  const [r2, g2, b2] = c(fundo);
  const m = (x, y) => Math.round(x * alfa + y * (1 - alfa)).toString(16).padStart(2, '0');
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`.toUpperCase();
};

// ── O botão de ação do protótipo ─────────────────────────────────────────────
//
// O protótipo pinta TODOS os botões principais com a cor do esquema, em três
// tokens: `--c-act-bg` (o acento a 10 % no claro, 20 % no escuro), `--c-act-brd`
// (o acento a 38 % / 45 %) e `--c-act-fg` (o acento escurecido até se ler no
// claro, clareado no escuro). É o «Guardar Tarefa», o «Guardar Evento», o
// «Guardar Equipamento» — e nenhum deles é preto.
//
// ⚠ Estes três tokens nunca tinham chegado à app. O `Primary` nasceu com duas
// cores inventadas aqui — o acento cheio e um preto «comum» — e o dono da casa
// perguntou três vezes «porque é que está a preto e não à cor do perfil?». A
// resposta certa era a que o protótipo já tinha, e que o CLAUDE.md manda seguir
// quando os dois discordam.
//
// O acento CHEIO continua a existir, e continua reservado ao que não se desfaz
// — é a lista fechada do guarda `o-acento-e-reservado`. O que muda é o comum:
// deixa de ser preto e passa a ser o esquema, em tinta.
//
// ⚠ Nada aqui é um alfa fixo. O texto escurece ou clareia até 4,5:1 sobre o
// FUNDO REAL do botão; a borda sobe a partir do alfa do protótipo até separar o
// botão da superfície a 3:1. Um alfa fixo calibrado num esquema falhava no
// seguinte — foi assim com o `chromeSub`.
const botaoDeAcao = (s, c, dark) => {
  const superficie = c.surface;
  const bg = mistura(s.accent, superficie, dark ? 0.20 : 0.10);
  // ⚠ No escuro a borda parte do `hover`, não do acento — pela mesma razão do
  // `titulo`: contra a superfície escura o acento não chega aos 3:1 nem a 100 %
  // (Cinza 2,12, Céu 2,47, Violeta 2,50, medidos). Subir o alfa do acento até ao
  // fim e ficar aquém era o que a primeira versão disto fazia, em silêncio.
  const base = dark ? s.hover : s.accent;
  // ⚠ A borda mede-se contra os TRÊS fundos onde um botão pode estar — a
  // página, a folha e o cartão —, e não só contra a folha. Medida só contra a
  // folha (branca, no claro), passava a 3,01 e falhava contra a página cinzenta
  // a 2,68 em oito dos doze temas: o mesmo botão, legível numa folha e sem
  // contorno num ecrã. O guarda apanhou-o à primeira corrida.
  const fundos = [c.page, c.surface, c.card];
  const separa = (cor) => fundos.every(f => contraste(cor, f) >= 3);
  let alfa = dark ? 0.45 : 0.38;
  let brd = mistura(base, superficie, alfa);
  while (!separa(brd) && alfa < 1) {
    alfa = Math.min(1, alfa + 0.02);
    brd = mistura(base, superficie, alfa);
  }
  // E se nem a cor inteira chegar, clareia-se — como o `titulo`.
  if (!separa(brd)) {
    const maisDificil = fundos.reduce((a, b) => (contraste(base, a) < contraste(base, b) ? a : b));
    brd = clarearAte(base, maisDificil, 3);
  }
  const fg = dark ? clarearAte(s.accent, bg, 4.5) : escurecerAte(s.accent, bg, 4.5);
  return { actBg: bg, actBrd: brd, actFg: fg };
};

const escuroDoEsquema = (chrome) => {
  const { h, s } = hsl(chrome);
  const tom = (k) => paraHex(h, Math.min(s, LUMES[k][1]), LUMES[k][0]);
  const card = tom('card');
  const linha = tom('border');
  return {
    page: tom('page'), card, surface: card, subtle: tom('subtle'),
    border: linha, divider: linha,
    // O texto claro fica NEUTRO. Tingi-lo também punha cor a competir com o
    // acento em cada palavra do ecrã, e a cor de ação deixava de saltar.
    text1: '#F0F2F5', text2: '#DCE3EA',
    text3: tom('text3'), slate: tom('slate'), faixa: tom('faixa'),
    tileWarn: 'rgba(250,173,20,0.16)', tileInfo: 'rgba(24,144,255,0.16)',
    tileErr: 'rgba(255,77,79,0.16)',
  };
};

// Estado — do sistema, não dos esquemas
//
// ⚠ Cada estado tem TRÊS papéis, e eram dois nomes:
//
//   `x`        o objeto gráfico — a barra, a borda, o ícone (3:1)
//   `xDeep`    o texto sobre o TIJOLO desse estado (`xBg`, que é claro nos dois
//              aspetos) e o preenchimento que leva branco por cima — constante
//   `xTexto`   o texto pequeno sobre as SUPERFÍCIES do tema — no claro é o
//              `xDeep`, no escuro é o próprio `x`. Vive no `buildTheme`.
//
// Faltava o terceiro. Os «deep» foram calibrados para o claro e, como texto de
// 11–13 px sobre o cartão ESCURO, medem 3,00 (errDeep), 2,82 (infoDeep), 2,89
// (warnDeep): «Léo · atrasada 1 dia» a vermelho ilegível em todos os esquemas
// escuros. Medido em 08/09/2026 pela sonda de contraste no navegador.
export const STATE = {
  // `infoDeep` não existia: a pastilha «Família» punha o azul claro sobre o
  // tijolo azul-claro, 2,91. O valor é o azul-8 da mesma escala (5,52).
  info: '#1890FF', infoBg: '#E8F4FF', infoDeep: '#0958D9',
  // `okBg` a 0,12 e não 0,2: o cartão de uma tarefa feita ficava a #ECF2EE e o
  // `text3` dava 4,27 em cima dele. A 0,12 dá #F8FBF8 e 4,64.
  // `okDeep` #237804 e não #389E0D: sobre esse tijolo o verde antigo dava
  // 3,32 — o «0,00 €» de um artigo apanhado não se lia.
  ok: '#52C41A', okBorder: '#BAE7A3', okBg: 'rgba(220,243,209,0.12)', okDeep: '#237804',
  // `warnDeep` é o `#8F5600` do protótipo. O `#AD8B00` que aqui estava dava
  // 3,16 sobre o tijolo amarelo — a pastilha «2 pt» ilegível nos dois aspetos.
  warn: '#FAAD14', warnBg: '#FEFFD0', warnDeep: '#8F5600',
  // errBg faltava — havia okBg e warnBg, e uma pastilha de erro ficava sem
  // fundo. O valor é o do protótipo (`rgba(255,77,79,.08)` em hExpiry).
  err: '#FF4D4F', errBg: 'rgba(255,77,79,0.08)', errDeep: '#CE0002',
  // ⚠ O texto de erro e de informação no ESCURO. O `err` e o `info` chegam aos
  // 4,5 sobre o cartão escuro do Violeta (5,32 e 5,35) e não sobre os do Cião,
  // Céu, Menta e Cinza, que são mais claros (4,24–4,40 no cartão, 3,58 no
  // subtil). Um tom acima na mesma escala — o vermelho-4 e o azul-4 — passa nos
  // seis. O verde e o âmbar não precisam: 6,8 e 8,1 no pior caso.
  errClaro: '#FF7875', infoClaro: '#69B1FF',
  // E o verde, por uma unha: sobre o cartão TINGIDO de uma tarefa feita, no
  // Cião e no Menta escuros, o `ok` dava 4,46 e 4,48. O verde-5 passa.
  okClaro: '#73D13D',
  violet: '#722ED1', cyan: '#08979C',
};

// Cor por membro — nenhuma é a cor de ação.
//
// Era um objeto com quatro nomes lá dentro, indexado por nome. Um membro
// acrescentado à casa não estava lá: o avatar saía cinzento, o ponto do filtro
// desaparecia e a barra lateral da ficha de saúde ficava sem cor. A paleta é
// que é fixa; a atribuição não pode ser.
export const PALETA_MEMBROS = ['#722ED1', '#08979C', '#1890FF', '#011B58',
  '#D4380D', '#389E0D', '#C41D7F', '#AD8B00'];

// As cores da casa de demonstração. Ficam para que quem já usa a app não veja
// os avatares trocarem de cor de um dia para o outro.
const SEMENTES_DE_COR = {
  'Rita': '#722ED1', 'Tomás': '#08979C', 'Léo': '#1890FF', 'Mia': '#011B58',
};

// A cor escolhida pelo membro ganha sempre — a casa é que sabe quem quer ser
// de que cor, e essa escolha vem do servidor. Sem ela, o nome escolhe: a mesma
// pessoa recebe a mesma cor em todos os telefones, sem nada para guardar.
export const corDoMembro = (nome, cor) => {
  if (cor) return cor;
  if (SEMENTES_DE_COR[nome]) return SEMENTES_DE_COR[nome];
  if (!nome) return PALETA_MEMBROS[0];
  let h = 0;
  for (let i = 0; i < String(nome).length; i++) h = (h * 31 + String(nome).charCodeAt(i)) >>> 0;
  return PALETA_MEMBROS[h % PALETA_MEMBROS.length];
};

// A largura da coluna da app.
//
// Estava só no App.jsx, e as modais não a viam: no monitor, uma folha abria de
// ponta a ponta da janela enquanto a app vivia numa coluna de 460 no meio. A
// folha do Perfil chegava a 909 px sobre uma app de 460.
//
// Aqui, quem precisa lê. Um telemóvel do tamanho do alvo (402) não nota nada.
export const LARGURA_APP = 460;

// Escala de espaçamento: cinco valores, mais nada
export const S = { xs: 2, sm: 4, md: 8, lg: 16, xl: 24, empty: 48 };

// Cantos.
//
// ⚠ `row` é o canto de TUDO O QUE SE TOCA — botões, pastilhas de escolha,
// separadores, campos, linhas. Era `pill` na metade dos botões da app, e a
// diferença entre um cilindro e um canto de 6 não dizia nada: os dois estavam
// em coisas do mesmo tipo, escolhidos ficheiro a ficheiro. Uma app onde o
// mesmo tipo de coisa tem duas formas obriga a olhar duas vezes para perceber
// que é a mesma coisa.
//
// `pill` fica para o que é REDONDO POR FORMA e não por decisão de estilo: a
// barra de progresso, o interruptor e a bola dele, o anel do rádio, os avatares
// e os discos de cor. Nesses, quadrar os cantos não é uma escolha de desenho —
// é desenhar outra coisa.
//
// O guarda que impede a volta atrás enumera os tocáveis:
// `__tests__/o-canto-de-tudo-o-que-se-toca.test.js`.
export const R = { pill: 100, card: 8, row: 6, sm: 4 };

export const FONT = {
  display: 'Roboto-500',   // títulos, botões
  body: 'Roboto',          // corpo
  ui: 'Inter-600',         // dados densos e etiquetas pequenas
};

// Uma cor do esquema com transparência.
//
// Serve os fundos dos avisos informativos, que passaram a seguir o esquema
// escolhido pelo membro em vez do azul fixo do sistema. Escrever um `rgba`
// à mão por esquema seriam seis valores a manter em vez de um cálculo.
export const comAlfa = (hex, a) => {
  const n = String(hex || '').replace('#', '');
  if (n.length !== 6) return `rgba(0,0,0,${a})`;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
};

// Uma receita de sombra, três opacidades
export const elev = (level = 1) => {
  const o = level === 3 ? 0.20 : level === 2 ? 0.15 : 0.10;
  return {
    shadowColor: '#4C7BA6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: o,
    shadowRadius: 6,
    elevation: level * 2,
  };
};

export const buildTheme = (schemeIdx = 0, dark = false) => {
  // ⚠ Um índice que não seja um número dá o PRIMEIRO esquema, e não `undefined`.
  //
  // Era `SCHEMES[Math.min(5, Math.max(0, schemeIdx))]`, e com `schemeIdx` a
  // valer uma string — `buildTheme('violet', false)`, que é o que meia dúzia de
  // testes passavam — as contas davam `NaN` e o resultado era `undefined`.
  // Isso passava despercebido porque espalhar `undefined` num objeto não faz
  // nada: o tema saía sem acento, sem cabeçalho, e ninguém reparava.
  //
  // Deixou de passar no momento em que o título passou a LER `s.hover`. O erro
  // não era esse — era o índice inválido a ser aceite em silêncio há muito.
  const i = Number(schemeIdx);
  const s = SCHEMES[Number.isFinite(i) ? Math.min(SCHEMES.length - 1, Math.max(0, Math.trunc(i))) : 0];
  const c = dark ? escuroDoEsquema(s.chrome) : LIGHT;
  // O título de secção segue o esquema — e no escuro é o `hover`, não o acento.
  //
  // Os títulos eram slate fixo (#67769B). A cor passa a ser a do esquema, mas o
  // acento não serve nos dois aspetos: medido contra a página escura, o Cinza
  // dá 2,55:1, o Violeta 2,77 e o Céu 2,98 — abaixo dos 3:1 que um título de
  // 20 px a 700 precisa. O `hover` é a versão clara de cada acento e existe
  // exactamente para isto: no escuro vai de 3,51 a 7,02.
  //
  // ⚠ As ETIQUETAS (`Label`, 12 px a 600) continuam em slate, e é uma decisão:
  // texto pequeno precisa de 4,5:1, e aí o Cião falha no claro (3,16) e o Cinza
  // no escuro (3,51). Uma etiqueta ilegível não fica mais bonita por ser da cor
  // do esquema.
  //
  // No escuro o `hover` é o PONTO DE PARTIDA, não a resposta final: passa a ser
  // clareado até chegar aos 3:1 contra o cartão. Com o escuro a seguir o
  // esquema, o cartão deixou de ser o mesmo para todos, e o Cinza — cujo hover
  // é o mais apagado dos seis — caía a 2,92 contra o seu. Escolher outro tom à
  // mão resolvia o Cinza e deixava o próximo esquema a falhar em silêncio,
  // como este falhou. Isto não tem como falhar em silêncio: ou sobe, ou o
  // limite baixa, e um limite baixado vê-se no código.
  const titulo = dark ? clarearAte(s.hover, c.card, 3) : s.accent;
  // O texto pequeno de cada estado sobre as superfícies do tema: o «deep» no
  // claro, a própria cor no escuro. Ver o comentário do `STATE`.
  const state = {
    ...STATE,
    okTexto: dark ? STATE.okClaro : STATE.okDeep,
    errTexto: dark ? STATE.errClaro : STATE.errDeep,
    warnTexto: dark ? STATE.warn : STATE.warnDeep,
    infoTexto: dark ? STATE.infoClaro : STATE.infoDeep,
  };
  return { ...c, ...s, dark, titulo, ...botaoDeAcao(s, c, dark), state };
};

// Alfa do branco sobre o cabeçalho, calculado da luminância real da cor —
// não um literal. Foi o que evitou texto ilegível quando os esquemas mudaram.
export const onChrome = (chromeHex, target = 0.65) => {
  const h = (i) => parseInt(chromeHex.slice(i, i + 2), 16) / 255;
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(h(1)) + 0.7152 * lin(h(3)) + 0.0722 * lin(h(5));
  // quanto mais claro o cabeçalho, mais opaco tem de ser o branco
  const a = Math.min(0.92, Math.max(target, 0.55 + L * 1.6));
  return `rgba(255,255,255,${a.toFixed(2)})`;
};

// O mesmo princípio para um traço sobre o cabeçalho — separadores, réguas.
// onChrome não serve: tem um piso de 0,55 porque é para texto, e um traço a
// 55 % de branco é uma barra, não um separador. Mas o alfa continua a ter de
// subir com a luminância, senão some-se nos esquemas claros.
export const chromeLine = (chromeHex) => {
  const h = (i) => parseInt(chromeHex.slice(i, i + 2), 16) / 255;
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(h(1)) + 0.7152 * lin(h(3)) + 0.0722 * lin(h(5));
  const a = Math.min(0.55, 0.18 + L * 1.1);
  return `rgba(255,255,255,${a.toFixed(2)})`;
};

// ── A cor da inicial sobre a cor de um membro ────────────────────────────────
//
// ⚠ Era branco sempre. A paleta dos membros tem cores claras — o azul #1890FF,
// o cião #08979C, o âmbar #AD8B00 — e uma inicial branca a 11 px sobre elas dá
// 3,24, 3,55 e 2,5: os «L» e «T» dos avatares pequenos da Agenda e das Tarefas
// não se liam. Apanhado pela sonda de contraste em 08/09/2026.
//
// Branco quando chega aos 4,5:1, senão PRETO. Não o `text1` (#262626): sobre o
// cião #08979C e o verde #389E0D da paleta, o cinzento-escuro dá 4,26 e 4,37 —
// as cores médias não têm par a 4,5 senão o preto puro (5,8 e 5,9). É a única
// inicial preta da app, e é sobre um disco de cor, não sobre uma superfície.
export const corSobre = (hex) => (luminancia(hex) <= 0.1833 ? '#FFFFFF' : '#000000');
