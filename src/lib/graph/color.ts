// Tiny RGB blender — no dependency, enough for our atmospheric tweaks.

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.round(Math.max(0, Math.min(255, n)));
  return '#' + [r, g, b].map((x) => clamp(x).toString(16).padStart(2, '0')).join('');
}

function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function lighten(hex: string, amount: number): string {
  return mix(hex, '#ffffff', amount);
}

export function darken(hex: string, amount: number): string {
  return mix(hex, '#000000', amount);
}

/**
 * Three-stop radial gradient that reads as a lit sphere with limb darkening
 * (lighter "sun-lit" core, base mid, darker rim).
 */
export function planetGradient(baseColor: string): {
  colors: string;
  positions: string;
} {
  return {
    colors: `${lighten(baseColor, 0.3)} ${baseColor} ${darken(baseColor, 0.55)}`,
    positions: '0 55 100'
  };
}

/** Lighter version of the planet color — used for the focus halo. */
export function planetGlow(baseColor: string): string {
  return lighten(baseColor, 0.45);
}

/** Slightly lighter than base — for the visible rim. */
export function planetBorder(baseColor: string): string {
  return lighten(baseColor, 0.25);
}
