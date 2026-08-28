// Tokens do sistema +Cliente. Único sítio onde vivem cores, escala e tipo.
// Regra herdada do protótipo: títulos de secção são slate, nunca preto.

export const SCHEMES = [
  { name: 'Azul Sóbrio', accent: '#011B58', hover: '#0A2A7A', chrome: '#001529' },
  { name: 'Violeta',     accent: '#722ED1', hover: '#8B4EE0', chrome: '#241239' },
  { name: 'Cião',        accent: '#08979C', hover: '#13ADB3', chrome: '#0A5B60' },
  { name: 'Verde',       accent: '#2F7D1F', hover: '#3B9B23', chrome: '#12300B' },
  { name: 'Grafite',     accent: '#3F3F46', hover: '#52525B', chrome: '#1C1C1F' },
  { name: 'Céu',         accent: '#1B5FA8', hover: '#2679C9', chrome: '#0C2A47' },
];

const LIGHT = {
  page: '#F0F2F5', card: '#FCFCFD', surface: '#FFFFFF', subtle: '#FAFAFA', border: '#D9D9D9',
  text1: '#262626', text2: '#434343', text3: '#6A7282', slate: '#67769B',
  divider: '#F0F2F5', tileWarn: 'rgba(255,251,230,0.8)', tileInfo: 'rgba(232,244,255,0.8)',
  tileErr: 'rgba(255,241,240,0.9)',
};
const DARK = {
  page: '#00101C', card: '#0A2033', surface: '#0A2033', subtle: '#10293D', border: '#1E3A4F',
  text1: '#F0F2F5', text2: '#DCE3EA', text3: '#93A4B5', slate: '#9DB2D6',
  divider: '#1E3A4F', tileWarn: 'rgba(250,173,20,0.16)', tileInfo: 'rgba(24,144,255,0.16)',
  tileErr: 'rgba(255,77,79,0.16)',
};

// Estado — do sistema, não dos esquemas
export const STATE = {
  info: '#1890FF', infoBg: '#E8F4FF',
  ok: '#52C41A', okBorder: '#BAE7A3', okBg: 'rgba(220,243,209,0.2)', okDeep: '#389E0D',
  warn: '#FAAD14', warnBg: '#FEFFD0', warnDeep: '#AD8B00',
  err: '#FF4D4F', errDeep: '#CE0002',
  violet: '#722ED1', cyan: '#08979C',
};

// Cor por membro — nenhuma é a cor de ação
export const MEMBER_COLOR = {
  'Rita': '#722ED1', 'Tomás': '#08979C', 'Léo': '#1890FF', 'Mia': '#011B58',
};

// Escala de espaçamento: cinco valores, mais nada
export const S = { xs: 2, sm: 4, md: 8, lg: 16, xl: 24, empty: 48 };

export const R = { pill: 100, card: 8, row: 6, sm: 4 };

export const FONT = {
  display: 'Roboto-500',   // títulos, botões
  body: 'Roboto',          // corpo
  ui: 'Inter-600',         // dados densos e etiquetas pequenas
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
  const s = SCHEMES[Math.min(SCHEMES.length - 1, Math.max(0, schemeIdx))];
  const c = dark ? DARK : LIGHT;
  return { ...c, ...s, dark, state: STATE };
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
