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
  smile: 'M8.5 14s1.2 1.5 3.5 1.5S15.5 14 15.5 14|',
  sun: 'M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4|',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
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
export function Marca({ size = 46, mono = false, opacity = 1, style }) {
  const dots = mono
    ? ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF']
    : ['#8B4EE0', '#13ADB3', '#4A8FE0', '#E8EDF5'];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity} style={style}>
      <Path d="M3.6 10.9L12 4.1l8.4 6.8" stroke="#FFFFFF" strokeWidth={1.9}
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx="9.1" cy="14.9" r="1.62" fill={dots[0]} />
      <Circle cx="14.9" cy="14.9" r="1.62" fill={dots[1]} />
      <Circle cx="9.1" cy="19.4" r="1.62" fill={dots[2]} />
      <Circle cx="14.9" cy="19.4" r="1.62" fill={dots[3]} />
    </Svg>
  );
}
