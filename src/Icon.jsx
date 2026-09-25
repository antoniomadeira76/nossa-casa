import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

// Conjunto outline do sistema: 24 px, traço 1.75, pontas redondas.
// A marca (houseDots) e os dois glifos próprios (houseGear, heartPulse)
// foram desenhados para este produto — ver documentação de ícones.
const P = {
  home: 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  wallet: 'M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M16 12.5h2',
  checkSquare: 'M4 5h16v14H4z|M8 12l2.6 2.6L16 9',
  calendar: 'M4 6h16v14H4z|M4 10h16M8 3v4M16 3v4',
  fileDone: 'M6 3h8l4 4v14H6z|M9 14l2.2 2.2L15 12',
  fileText: 'M6 3h8l4 4v14H6z|M9 12h6M9 16h4',
  fileAdd: 'M6 3h8l4 4v14H6z|M12 11v5M9.5 13.5h5',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  clock: 'M12 7v5.5l3.5 2|',
  edit: 'M4 20h4L20 8l-4-4L4 16z',
  trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',
  refresh: 'M20 12a8 8 0 1 1-3-6.2M20 4v4.5h-4.5',
  // `swap` quer dizer «troca de tarefas entre irmãos», e só isso (12/09/2026):
  // duas setas em sentidos contrários. O `refresh` é «alternar» e «repor».
  swap: 'M4 8h14M14.5 4.5L18 8l-3.5 3.5|M20 16H6M9.5 12.5L6 16l3.5 3.5',
  // `share` quer dizer «partilhar com quem não tem a app», e só isso
  // (12/09/2026): uma seta a sair de uma caixa aberta.
  share: 'M5 12v8h14v-8|M12 15V4M8 8l4-4 4 4',
  search: 'M15.5 15.5L21 21|',
  arrowLeft: 'M11 5l-7 7 7 7M4 12h16',
  lock: 'M6 11h12v9H6z|M9 11V8a3 3 0 0 1 6 0v3',
  logout: 'M15 4h5v16h-5M10 8l-5 4 5 4M5 12h10',
  user: 'M4 21c0-4 4-7 8-7s8 3 8 7|',
  eye: 'M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z|',
  printer: 'M7 9V4h10v5M7 18H5v-7h14v7h-2M7 14h10v6H7z',
  mail: 'M3 6h18v12H3z|M3 7l9 6.5L21 7',
  camera: 'M4 8h3l1.5-2h7L17 8h3v12H4z|',
  bank: 'M3 10l9-6 9 6M5 10v9h14v-9M9 19v-5h6v5',
  // Loja. A Gestão pedia-o pelo nome e ele não existia — um nome desconhecido
  // devolve um SVG vazio, sem erro, portanto a lista de lojas tinha um espaço
  // em branco onde devia ter um ícone. Mesmo idioma do `bank`: toldo, corpo,
  // porta.
  storefront: 'M3.5 4.5h17l1.5 5H2z|M5 9.5V20h14V9.5|M10 20v-6h4v6',
  idcard: 'M3 6h18v12H3z|M7 10h3M7 14h6M14 10h3',

  // ── Os corredores da loja ──────────────────────────────────────────────────
  //
  // 25/09/2026. Começou em «podes criar 5 designs para ter as secções com
  // icons?», passou por «não repitas icons nas secções» e «dont chose the
  // icons. let the admins chose», e acabou em «implementa o 3 com cobertura
  // completa dos corredores» — o 3 de `design/cinco-conjuntos-de-icones.dc.html`,
  // que era o estilo do Tabler.
  //
  // ── Porque é que são tantos ────────────────────────────────────────────────
  //
  // «Cobertura completa» quer dizer que uma casa portuguesa há-de encontrar
  // aqui o corredor que inventou — charcutaria, conservas, cereais, higiene,
  // take-away — sem ter de aceitar um ícone que quer dizer outra coisa. Com
  // doze, metade das casas ficava com caixas.
  //
  // ── Do Tabler, mas na mão desta casa ───────────────────────────────────────
  //
  // O Tabler é MIT, 24 de grelha, traço 2, pontas redondas. Isto é o MESMO
  // idioma com o traço 1,75 do resto do ficheiro, e com o pormenor aliviado:
  // a 17 px — que é o tamanho a que estes se vêem, dentro do título de um
  // corredor — as ondas do pão e os risquinhos da embalagem fecham-se numa
  // mancha. O que sobreviveu foi a silhueta, que é o que se reconhece.
  //
  // ⚠ Não se acrescentou biblioteca nenhuma. O `CLAUDE.md` põe «introduzir uma
  // biblioteca de componentes visuais» no que não se faz sem perguntar, e o
  // sistema visual desta casa vive no `theme.js` e aqui.
  //
  // ── ⚠ E o sentido de cada um é EXCLUSIVO, como os outros 43 ────────────────
  //
  // Estes são a marca de um CORREDOR DE LOJA, e mais nada. Não se usa a
  // `hortalica` para «ecológico», nem o `papel` para «documento», nem a
  // `caixa` para «arquivo».
  //
  // ⚠ E os nomes dizem o corredor, não o desenho — `hortalica` e não `folha`,
  // `peixaria` e não `peixe`. É de propósito: `folha` e `peixe` já são FIGURAS
  // de avatar (uma criança pode ter um peixe), e o guarda `escolher-avatar`
  // chumba um nome que sirva as duas coisas. Um nome, uma coisa.

  // Frutas e legumes. Folha com pé.
  hortalica: 'M5 21c.6-4.6 3-8 7.5-10|M9.5 20.5c-2.2-2.7-2-6.4.5-8.9C12.8 9 17 8.6 20 9.5c-.6 4.6-3.7 8.4-7.5 9.5-1 .3-2 .3-3 0z',
  // Fruta. Maçã com folha.
  fruta: 'M12 8.5c-1-1-2.4-1.5-3.8-1.2C5.8 7.8 4.5 10 4.5 13c0 4 2.5 7.5 4.7 7.5.9 0 1.7-.4 2.8-.4s1.9.4 2.8.4c2.2 0 4.7-3.5 4.7-7.5 0-3-1.3-5.2-3.7-5.7-1.4-.3-2.8.2-3.8 1.2z|M12 8.5V6a3 3 0 0 1 3-3',
  // Peixaria. Corpo, cauda e olho.
  peixaria: 'M2.5 12c3.4-4.2 7.2-5.8 10.7-5.8 3 0 5.6 1.5 7.3 4.3L21.5 12l-1 1.5c-1.7 2.8-4.3 4.3-7.3 4.3-3.5 0-7.3-1.6-10.7-5.8z|M16.6 10.4h.01|M6 13c-1.4 2.5-1.8 4.4-1.4 6.3 1.9-.4 3.4-1.5 4.7-3.3',
  // Talho. O osso.
  talho: 'M6.6 3.6a3 3 0 0 1 2.9 3.7l5.2 5.2a3 3 0 1 1-2.2 2.2L7.3 9.5a3 3 0 1 1-.7-5.9z|M4.6 6.6a3 3 0 0 0 3 3M16.4 16.4a3 3 0 0 0 3 3',
  // Charcutaria. Fatia de fiambre enrolada.
  charcutaria: 'M4 9.5C4 6.5 7.6 4.5 12 4.5s8 2 8 5-3.6 5-8 5-8-2-8-5z|M4 9.5v5c0 3 3.6 5 8 5s8-2 8-5v-5|M9.5 9h.01M14 10h.01',
  // Padaria. A côdea e o golpe.
  padaria: 'M3.5 12c0-3 3.8-5.4 8.5-5.4s8.5 2.4 8.5 5.4c0 1.9-1.4 2.8-2.8 3.1v2.4a1 1 0 0 1-1 1H7.3a1 1 0 0 1-1-1v-2.4C4.9 14.8 3.5 13.9 3.5 12z|M8 11c.9-.9 1.9-.9 2.8 0M13.2 11c.9-.9 1.9-.9 2.8 0',
  // Pastelaria. Bolo com vela.
  pastelaria: 'M4 14.5h16V20H4z|M5.5 14.5v-3h13v3|M12 11.5V8.5M12 6.5v.01',
  // Laticínios. Pacote de leite.
  laticinios: 'M8 9.8h8V20a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z|M8 9.8L9.6 5h4.8L16 9.8|M10.3 13.6h3.4',
  // Queijo. A cunha com os buracos.
  queijo: 'M3 12.5L13 6.5h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z|M8.5 13h.01M13 11h.01M16.5 14h.01',
  // Ovos. Dois ovos.
  ovos: 'M9 20c-2 0-3.5-1.6-3.5-3.8C5.5 13 7.4 9 9 9s3.5 4 3.5 7.2C12.5 18.4 11 20 9 20z|M16 17.5c-1.5 0-2.7-1.2-2.7-2.9 0-2.5 1.5-5.6 2.7-5.6s2.7 3.1 2.7 5.6c0 1.7-1.2 2.9-2.7 2.9z',
  // Bebidas. Garrafa com rótulo.
  bebidas: 'M10 3h4v2.6l1.8 2.7A4 4 0 0 1 16.5 11v8a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-8a4 4 0 0 1 .7-2.7L10 5.6z|M7.5 13.5h9',
  // Café e chá. A chávena.
  cafe: 'M4 9h13v5.5A4.5 4.5 0 0 1 12.5 19h-4A4.5 4.5 0 0 1 4 14.5z|M17 10.5h1.8a2.2 2.2 0 0 1 0 4.4H17|M7 5.5V4M10.5 5.5V4M14 5.5V4',
  // Congelados. O floco.
  congelados: 'M12 2.5v19M4.2 7l15.6 9M19.8 7L4.2 16|M9.8 4.3L12 6.5l2.2-2.2M9.8 19.7L12 17.5l2.2 2.2|M5.6 9.1l.3 3-2.9.8M18.4 14.9l-.3-3 2.9-.8M5.6 14.9l-2.9-.8 2.9-.8M18.4 9.1l2.9.8-2.9.8',
  // Conservas. A lata.
  conservas: 'M6 7.5c0-1.4 2.7-2.5 6-2.5s6 1.1 6 2.5v9c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5z|M6 7.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5|M9 13h6',
  // Cereais. A caixa com a tigela.
  cereais: 'M6 7h9l-1 13H7z|M6 7l1-3h7l1 3|M14.5 13.5h4a2 2 0 0 1-2 3.5 2 2 0 0 1-2-3.5z',
  // Massa e arroz. O saco.
  massa: 'M7 8.5h10l1 11.5H6z|M8.5 8.5c0-2 1.5-4.5 3.5-4.5s3.5 2.5 3.5 4.5|M9.5 13h5',
  // Mercearia. O carrinho.
  mercearia: 'M3 4h2l2.4 10.5h9.8L19.5 7H6|M9 19h.01M17 19h.01',
  // Snacks. O pacote de bolachas.
  snacks: 'M6.5 7h11l-.9 13.2a.8.8 0 0 1-.8.8H8.2a.8.8 0 0 1-.8-.8z|M6.5 7L8 3.5h8L17.5 7|M10 12h.01M13.5 14h.01M10.5 16h.01',
  // Doces. O rebuçado.
  doces: 'M9 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0z|M9 10.5L5 7.5v9l4-3M15 10.5l4-3v9l-4-3',
  // Limpeza. O balde.
  limpeza: 'M4 7.5h16l-1.4 12a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8z|M9 7.5V5A1.5 1.5 0 0 1 10.5 3.5h3A1.5 1.5 0 0 1 15 5v2.5|M4 11.5h16',
  // Higiene. O sabonete e a espuma.
  higiene: 'M5 13.5h14V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z|M8 13.5v-2a4 4 0 0 1 8 0v2|M11 7.5h.01M14.5 5.5h.01',
  // Papel. O rolo.
  papel: 'M6 6.5h9a3 3 0 0 1 3 3V21H6z|M6 6.5a3 3 0 0 0-3 3V21h3|M11 9.5h.01',
  // Bebé. O biberão.
  bebe: 'M9.3 9.5h5.4V20a1 1 0 0 1-1 1h-3.4a1 1 0 0 1-1-1z|M10.5 6.5h3v3h-3z|M11.2 4h1.6|M9.3 13h5.4',
  // Animais. A patinha.
  animais: 'M8.4 5.5a1.7 2.3 0 1 0 .01 0M15.6 5.5a1.7 2.3 0 1 0 .01 0M4 11a1.7 2.1 0 1 0 .01 0M20 11a1.7 2.1 0 1 0 .01 0|M12 12.6c-2.6 0-4.9 2.4-4.9 4.9 0 2 1.6 3 3.4 3h3c1.8 0 3.4-1 3.4-3 0-2.5-2.3-4.9-4.9-4.9z',
  // Casa e cozinha. A panela.
  cozinha: 'M4 9.5h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z|M4 9.5H2.5M20 9.5h1.5|M9 6.5l1.5-2M14.5 6.5L13 4.5',
  // Jardim. O regador.
  jardim: 'M6 9.5h9v7a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z|M15 12h4l2-4|M8 9.5V7a2 2 0 0 1 4 0v2.5',
  // ⚠ A REDE: o corredor que ainda não tem ícone. Uma caixa fechada, que é o
  // que um corredor é antes de alguém dizer o que lá está dentro.
  caixa: 'M4 7.5l8-3.5 8 3.5v9L12 20l-8-3.5z|M4 7.5l8 3.5 8-3.5M12 11v9',

  // ⚠ `grip` quer dizer «isto arrasta-se», e só isso — os ícones desta app têm
  // um sentido exclusivo cada um (CLAUDE.md). Seis pontos em duas colunas, que
  // é o desenho que toda a gente já leu noutro sítio como uma pega.
  //
  // A linha do corredor não tem alça tocável: o arrasto arma-se com pressão
  // longa, para não haver um segundo alvo na linha (erro #6). Isto é o SINAL
  // de que o gesto existe, não o alvo dele.
  //
  // ⚠ Esteve apagado durante dez minutos em 25/09/2026: a substituição do
  // bloco dos corredores cortou daqui até ao `smile` e levou-o pelo caminho.
  // O guarda `regressoes` apanhou-o — «todos os nomes de ícone usados existem no
  // Icon.jsx» — porque um nome desconhecido desenha um SVG vazio, sem erro.
  grip: 'M9 7h.01M9 12h.01M9 17h.01M15 7h.01M15 12h.01M15 17h.01|',
  smile: 'M8.5 14s1.2 1.5 3.5 1.5S15.5 14 15.5 14|',
  sun: 'M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4|',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
  // ⚠ `telemovel` quer dizer «o que o aparelho disser», e só isso (15/09/2026):
  // o aspeto que segue o sistema. Corpo de 10×18 centrado em (12,12) e a barra
  // de baixo. O `sun` é o aspeto claro e o `moon` o escuro — os três vivem
  // juntos no escolhedor do Perfil, e nenhum se empresta a outro sentido.
  //
  // Nasceu porque o terceiro aspeto não tinha ícone próprio: levou o `refresh`
  // (que é «alternância» e «manutenção») e o dono da casa leu-o como «igual ao
  // Claro»; passou a ser só a amostra partida ao meio, e essa também se
  // confundia com o claro num telemóvel claro. Um aparelho desenhado não se
  // confunde com nada.
  telemovel: 'M9 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z|M10.6 18.2h2.8',
  sliders: 'M4 7h6M14 7h6M4 17h10M18 17h2',
  caretDown: 'M6 9.5l6 6 6-6',
  caretUp: 'M6 14.5l6-6 6 6',
  caretLeft: 'M14.5 6l-6 6 6 6',
  caretRight: 'M9.5 6l6 6-6 6',
  warning: 'M12 4l9 16H3z|M12 10v4.5',
  exclamation: 'M12 6v8|',
};
const CIRCLES = {
  clock: [[12, 12, 8.5]], search: [[10.5, 10.5, 6.5]], user: [[12, 8, 4]],
  eye: [[12, 12, 3]], camera: [[12, 13.5, 3.5]], smile: [[12, 12, 8.5], [9, 9.5, 0.6], [15, 9.5, 0.6]],
  sun: [[12, 12, 4]], exclamation: [[12, 17.5, 0.7]], checkCircle: [[12, 12, 9]],
  infoCircle: [[12, 12, 9], [12, 8, 0.7]], closeCircle: [[12, 12, 9]],
  wallet: [], sliders: [[12, 7, 2.2], [16, 17, 2.2]],
};
const EXTRA = {
  checkCircle: 'M8 12.2l2.6 2.6L16.2 9',
  infoCircle: 'M12 11v6',
  closeCircle: 'M9 9l6 6M15 9l-6 6',
};

export default function Icon({ name, size = 24, color = '#262626', style }) {
  const d = P[name] || EXTRA[name] || '';
  const paths = (d + (EXTRA[name] && P[name] ? '|' + EXTRA[name] : '')).split('|').filter(Boolean);
  const circles = CIRCLES[name] || [];
  if (name === 'houseGear') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
        <G fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="8.4" cy="9.6" r="3" />
          <Path d="M8.4 4.5v1.4M8.4 13.3v1.4M3.3 9.6h1.4M12.1 9.6h1.4M4.8 6l1 1M11 12.2l1 1M12 6l-1 1M5.8 12.2l-1 1" />
          <Path d="M9.6 15.4L15.4 10l5.8 5.4v5.2a.8.8 0 0 1-.8.8H10.4a.8.8 0 0 1-.8-.8z" />
          <Path d="M14.2 21.4v-3.4h2.4v3.4" />
        </G>
      </Svg>
    );
  }
  if (name === 'heartPulse') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
        <G fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 20S3.8 14.9 3.8 9.4A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.2 2.4C20.2 14.9 12 20 12 20z" />
          <Path d="M6.6 12.4h2.6l1.3-2.3 1.6 4 1.4-2.6h2.5" />
        </G>
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <G fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        {paths.map((p, i) => <Path key={i} d={p} />)}
        {circles.map(([cx, cy, r], i) => <Circle key={'c' + i} cx={cx} cy={cy} r={r} />)}
      </G>
    </Svg>
  );
}

// O «G» da Google — marca de terceiros, cores fixas por definição.
export function GoogleG({ size = 22, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <Path fill="#4285F4" d="M23 12.2c0-.8-.1-1.6-.2-2.3H12v4.5h6.2c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7C21.7 18.6 23 15.7 23 12.2z" />
      <Path fill="#34A853" d="M12 23.5c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H2.1v2.9C3.9 21 7.7 23.5 12 23.5z" />
      <Path fill="#FBBC05" d="M5.8 14.5c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V7H2.1C1.4 8.5 1 10.2 1 12.2s.4 3.7 1.1 5.2l3.7-2.9z" />
      <Path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.3 1.7l3.2-3.2C17.5 2 15 1 12 1 7.7 1 3.9 3.4 2.1 7l3.7 2.9c.9-2.7 3.3-4.5 6.2-4.5z" />
    </Svg>
  );
}

// A marca: telhado branco e quatro pontos, um por membro.
// Sem acento de palete — o esquema é por membro e o ícone é um só.
// `cor`: a marca numa tinta só — telhado e bolas — para a marca de água sobre a
// página, onde o branco do telhado não se via (13/09/2026). O mesmo que o
// `logotipo({ cor })` do documento.js faz no papel.
// `telhado`: a cor do telhado E da quarta bola, com as outras três A CORES — a
// marca de água sobre a página (14/09/2026, «a marca de água deve ser a
// cores»). O telhado branco e a quarta bola (`#E8EDF5`, quase branca, feita
// para o cabeçalho escuro) não se viam sobre a página clara — «a última bola
// não se vê, porquê?» — e passam os dois à tinta do texto.
export function Marca({ size = 46, mono = false, cor = null, telhado = null, opacity = 1, style }) {
  const dots = cor ? [cor, cor, cor, cor] : mono
    ? ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF']
    : ['#8B4EE0', '#13ADB3', '#4A8FE0', telhado || '#E8EDF5'];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity} style={style}>
      <Path d="M3.6 10.9L12 4.1l8.4 6.8" stroke={cor || telhado || '#FFFFFF'} strokeWidth={1.9}
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx="9.1" cy="14.9" r="1.62" fill={dots[0]} />
      <Circle cx="14.9" cy="14.9" r="1.62" fill={dots[1]} />
      <Circle cx="9.1" cy="19.4" r="1.62" fill={dots[2]} />
      <Circle cx="14.9" cy="19.4" r="1.62" fill={dots[3]} />
    </Svg>
  );
}
