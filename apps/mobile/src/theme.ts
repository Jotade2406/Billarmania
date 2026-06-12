// Billarmania Design System — paleta oficial
// Primary #085041 · Secondary #1D9E75 · Tertiary #F5F5F0 · Neutral #121212

export const C = {
  // Fondos
  bg: '#121212',
  card: '#1A1A1A',
  cardAlt: '#1e1e1e',
  input: '#161616',

  // Bordes
  border: '#262626',
  borderAccent: '#1D9E7540',

  // Marca
  primary: '#085041',
  accent: '#1D9E75',
  mint: '#68dbae',
  accentDim: '#08504133',

  // Texto
  cream: '#F5F5F0',
  text: '#F5F5F0',
  muted: '#a3a3a3',
  faint: '#6b6b6b',

  // Estados
  amber: '#f4a261',
  amberBg: '#2a1f10',
  red: '#f87171',
  redBg: '#2a1414',
  blue: '#60a5fa',
  blueBg: '#101a2a',
} as const;

/** ¿Está abierto ahora? Soporta cierre después de medianoche (ej. 14:00–02:00). */
export function isOpenNow(openTime?: string | null, closeTime?: string | null): boolean | null {
  if (!openTime || !closeTime) return null;
  const now = new Date();
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const open = oh * 60 + om;
  const close = ch * 60 + cm;
  if (close < open) return mins >= open || mins < close;
  return mins >= open && mins < close;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function fmtCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
