import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

// As figuras dos avatares — desenhadas para isto, e SÓ para isto.
//
// ── Porque não vêm do `Icon.jsx` ────────────────────────────────────────────
//
// Porque lá cada glifo tem um significado exclusivo: o `lock` é privado, o
// `smile` é bónus de criança, o `heartPulse` é saúde. Pôr um deles a servir de
// cara de alguém gasta esse significado em TODO O LADO onde ele aparece a
// sério — o utilizador deixa de poder confiar que um cadeado quer dizer
// privado. Um conjunto à parte custa um ficheiro e não custa isso.
//
// ── E porque não são emoji ──────────────────────────────────────────────────
//
// Além de o CLAUDE.md os proibir: um emoji é desenhado pelo sistema, muda de
// telemóvel para telemóvel, e não aceita a cor do membro. Aqui a figura é
// branca sobre a cor da pessoa — é a mesma nos dois telemóveis da casa, e a
// COR continua a ser o que distingue quem é quem.
//
// Mesmo idioma do resto: grelha de 24, traço 1.75, pontas redondas.

const F = {
  // ── Pessoas ───────────────────────────────────────────────────────────────
  pessoa: {
    nome: 'Pessoa', grupo: 'Pessoas',
    c: [[12, 8.4, 3.7]],
    d: 'M4.8 20.4c0-3.7 3.2-6.2 7.2-6.2s7.2 2.5 7.2 6.2',
  },
  cachos: {
    nome: 'Caracóis', grupo: 'Pessoas',
    c: [[12, 9.2, 3.6]],
    d: 'M4.8 20.8c0-3.6 3.2-6 7.2-6s7.2 2.4 7.2 6'
      + '|M8.6 7a2.1 2.1 0 1 1 2.8-2.7 2.1 2.1 0 0 1 1.2 0A2.1 2.1 0 1 1 15.4 7',
  },
  oculos: {
    nome: 'Óculos', grupo: 'Pessoas',
    c: [[12, 8.6, 3.9], [10.4, 8.4, 1.4], [13.6, 8.4, 1.4]],
    d: 'M4.8 20.6c0-3.7 3.2-6.2 7.2-6.2s7.2 2.5 7.2 6.2|M11.8 8.4h.4',
  },
  chapeu: {
    nome: 'Chapéu', grupo: 'Pessoas',
    c: [[12, 10.4, 3.5]],
    d: 'M4.8 21c0-3.6 3.2-6 7.2-6s7.2 2.4 7.2 6'
      + '|M7.2 7.4h9.6|M9.4 7.4V4.8a2.6 2.6 0 0 1 5.2 0v2.6',
  },

  // ── Animais ───────────────────────────────────────────────────────────────
  gato: {
    nome: 'Gato', grupo: 'Animais',
    c: [[12, 13.4, 6.1], [9.8, 12.4, 0.8], [14.2, 12.4, 0.8]],
    d: 'M6.6 9.1L5.4 4.6l4.3 2.3|M17.4 9.1l1.2-4.5-4.3 2.3'
      + '|M12 14.4l-1.1 1.3M12 14.4l1.1 1.3'
      + '|M1.9 13h2.6M19.5 13h2.6',
  },
  cao: {
    nome: 'Cão', grupo: 'Animais',
    c: [[12, 13.2, 5.9], [9.9, 12.2, 0.8], [14.1, 12.2, 0.8], [12, 15.2, 0.95]],
    d: 'M6.8 8.6C4.2 8 3.2 10.8 4 13.6M17.2 8.6c2.6-.6 3.6 2.2 2.8 5'
      + '|M12 16.6v1.2',
  },
  raposa: {
    nome: 'Raposa', grupo: 'Animais',
    c: [[9.9, 11.6, 0.8], [14.1, 11.6, 0.8], [12, 15.4, 0.95]],
    d: 'M12 20.4c-4 0-6.4-3-6.4-6.6L4.2 5.4l4.4 3.1a7.6 7.6 0 0 1 6.8 0l4.4-3.1'
      + '-1.4 8.4c0 3.6-2.4 6.6-6.4 6.6z',
  },
  coelho: {
    nome: 'Coelho', grupo: 'Animais',
    c: [[12, 14.4, 5.3], [10.1, 13.6, 0.8], [13.9, 13.6, 0.8], [12, 16.2, 0.9]],
    d: 'M9.6 9.4C8.6 6 8.6 3.2 10 3s2.1 2.4 2.1 6'
      + '|M14.4 9.4c1-3.4 1-6.2-.4-6.4s-2.1 2.4-2.1 6',
  },
  urso: {
    nome: 'Urso', grupo: 'Animais',
    c: [[7.4, 7.6, 2.5], [16.6, 7.6, 2.5], [12, 13.6, 6.1],
      [9.9, 12.4, 0.8], [14.1, 12.4, 0.8], [12, 15.4, 2.3]],
    d: 'M12 14.6v.8',
  },
  coruja: {
    nome: 'Coruja', grupo: 'Animais',
    c: [[9.4, 11.2, 2.5], [14.6, 11.2, 2.5], [9.4, 11.2, 0.85], [14.6, 11.2, 0.85]],
    d: 'M12 21c-3.9 0-6.4-3.1-6.4-7.6S8.1 4.2 12 4.2s6.4 4.7 6.4 9.2S15.9 21 12 21z'
      + '|M7.6 6.5L6.3 4.2M16.4 6.5l1.3-2.3'
      + '|M10.9 15.1L12 13.6l1.1 1.5',
  },
  peixe: {
    nome: 'Peixe', grupo: 'Animais',
    c: [[16.4, 10.7, 0.85]],
    d: 'M21.4 12c0 3.5-3.3 6.3-7.4 6.3S6.6 15.5 6.6 12s3.3-6.3 7.4-6.3S21.4 8.5 21.4 12z'
      + '|M6.6 12L2.6 8.4v7.2z'
      + '|M10.4 7.4c-1 2.9-1 6.3 0 9.2',
  },
  tartaruga: {
    nome: 'Tartaruga', grupo: 'Animais',
    c: [[20.6, 13.4, 1.6]],
    d: 'M4.6 15.4a7.4 7.4 0 0 1 14.8 0|M4.6 15.4h14.8'
      + '|M9.6 15.4c0-2.5.5-4.5 2.4-4.5s2.4 2 2.4 4.5'
      + '|M7.2 15.4v2.4M16.8 15.4v2.4',
  },

  // ── Coisas ────────────────────────────────────────────────────────────────
  estrela: {
    nome: 'Estrela', grupo: 'Coisas',
    c: [],
    d: 'M12 3.4l2.7 5.5 6 .9-4.35 4.25 1.03 6L12 17.25l-5.38 2.8 1.03-6L3.3 9.8l6-.9z',
  },
  folha: {
    nome: 'Folha', grupo: 'Coisas',
    c: [],
    d: 'M5 19C3.4 12.6 7.4 5.4 19.4 4.6c.8 8.4-4 14.6-11 14.6-1.2 0-2.3-.1-3.4-.2z'
      + '|M4.2 20.4C6.6 15 10.4 11 15.4 8.6',
  },
  montanha: {
    nome: 'Montanha', grupo: 'Coisas',
    c: [[17.4, 6.4, 1.9]],
    d: 'M2.4 19.6l6.2-9.4 4 5.6 2.2-3 6.8 6.8z',
  },
  foguete: {
    nome: 'Foguete', grupo: 'Coisas',
    c: [[12, 9.4, 1.8]],
    d: 'M12 2.8c2.7 2.5 4.1 5.6 4.1 8.9l-1.6 3.3H9.5L7.9 11.7c0-3.3 1.4-6.4 4.1-8.9z'
      + '|M7.9 11.9L5.4 14v3.2l2.7-1.7M16.1 11.9L18.6 14v3.2l-2.7-1.7'
      + '|M10.5 18.6L12 21.4l1.5-2.8',
  },
};

// A ordem em que aparecem na folha. Explícita, e não `Object.keys`: a ordem de
// um objeto é uma coincidência do motor, e uma lista que se reordena sozinha
// entre versões faz a pessoa procurar o seu avatar onde ele já não está.
export const FIGURAS = ['pessoa', 'cachos', 'oculos', 'chapeu',
  'gato', 'cao', 'raposa', 'coelho', 'urso', 'coruja', 'peixe', 'tartaruga',
  'estrela', 'folha', 'montanha', 'foguete'];

export const GRUPOS = ['Pessoas', 'Animais', 'Coisas'];

export const figurasDoGrupo = (g) => FIGURAS.filter(k => F[k].grupo === g);
export const nomeDaFigura = (k) => (F[k] ? F[k].nome : null);
export const existeFigura = (k) => Boolean(F[k]);

export default function Figura({ nome, size = 24, color = '#FFFFFF', style }) {
  const f = F[nome];
  if (!f) return null;
  const paths = String(f.d || '').split('|').filter(Boolean);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <G fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        {paths.map((p, i) => <Path key={i} d={p} />)}
        {(f.c || []).map(([cx, cy, r], i) => <Circle key={'c' + i} cx={cx} cy={cy} r={r} />)}
      </G>
    </Svg>
  );
}
