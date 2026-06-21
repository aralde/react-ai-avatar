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
