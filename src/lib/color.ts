/**
 * Convert a hex color (`#rgb` or `#rrggbb`) to an `rgba()` string at the given
 * opacity. Non-hex input is returned as-is (or `transparent` when empty), so it
 * is safe to pass already-resolved CSS colors through it.
 */
export function hexToRgba(color: string, opacity: number): string {
  if (!color || !color.startsWith('#')) return color || 'transparent';
  const cleanHex = color.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** Darken a `#rrggbb` color by `percent` (0–100) of full scale, per channel. */
export function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const channel = (v: number) => Math.min(255, Math.max(0, v - amt));
  const r = channel(num >> 16);
  const g = channel((num >> 8) & 0xff);
  const b = channel(num & 0xff);
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}
