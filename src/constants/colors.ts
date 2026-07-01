const C = {
  bg: '#121212',
  surface: '#1E1E1E',
  surface2: '#252525',
  surface3: '#2C2C2C',
  primary: '#BB86FC',
  primary50: 'rgba(187,134,252,0.10)',
  primary15: 'rgba(187,134,252,0.18)',
  primary30: 'rgba(187,134,252,0.30)',
  onPrimary: '#000000',
  secondary: '#03DAC6',
  success: '#4CAF50',
  warning: '#FB8C00',
  error: '#CF6679',
  whatsapp: '#25D366',
  text: '#FFFFFF',
  text2: '#B0B0B0',
  text3: 'rgba(255,255,255,0.55)',
  outline: 'rgba(255,255,255,0.10)',
  outlineSoft: 'rgba(255,255,255,0.06)',
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 22 } as const;

// Tints an arbitrary semantic color (status colors are picked at runtime, so they
// can't be precomputed tokens) — 'soft' for chip/badge backgrounds, 'medium' for icon
// badges, 'strong' for borders.
const OPACITY_HEX = { soft: '22', medium: '33', strong: '44' } as const;
export function withOpacity(color: string, level: keyof typeof OPACITY_HEX = 'soft') {
  return color + OPACITY_HEX[level];
}

export default C;
