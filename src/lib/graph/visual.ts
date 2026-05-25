// Each planet's visual is a SINGLE SVG that includes both the lit-sphere body
// (via a radial gradient) and the per-design overlay (craters, rings, etc.).
// We render it as Cytoscape's `background-image`. We do NOT use Cytoscape's own
// `background-fill: radial-gradient` because layering a gradient fill with a
// background-image is unreliable in the canvas renderer — depending on the
// composite order one hides the other.

import { lighten, darken } from './color';

export type PlanetDesign = 'plain' | 'bands' | 'craters' | 'rings' | 'swirl';

export const PLANET_DESIGNS: PlanetDesign[] = ['plain', 'bands', 'craters', 'rings', 'swirl'];

/** Default colour palette for new planets (cycles). */
export const PLANET_PALETTE: string[] = [
  '#10b981', '#f97316', '#3b82f6', '#a855f7',
  '#ef4444', '#eab308', '#06b6d4', '#ec4899'
];

// Overlays use rgba blacks/whites so they read on any planet colour. They are
// drawn inside the body circle via a clipPath ("c") defined in planetSvg.
const OVERLAYS: Record<PlanetDesign, string> = {
  plain: '',

  bands: `<g clip-path="url(#c)">
    <rect x="0" y="22" width="100" height="5" fill="rgba(0,0,0,0.20)"/>
    <rect x="0" y="34" width="100" height="3" fill="rgba(0,0,0,0.14)"/>
    <rect x="0" y="44" width="100" height="7" fill="rgba(0,0,0,0.24)"/>
    <rect x="0" y="58" width="100" height="4" fill="rgba(0,0,0,0.16)"/>
    <rect x="0" y="68" width="100" height="3" fill="rgba(0,0,0,0.1)"/>
    <rect x="0" y="76" width="100" height="5" fill="rgba(0,0,0,0.2)"/>
  </g>`,

  craters: `<g clip-path="url(#c)">
    <circle cx="32" cy="34" r="7" fill="rgba(0,0,0,0.24)"/>
    <circle cx="32" cy="34" r="2" fill="rgba(255,255,255,0.12)"/>
    <circle cx="62" cy="28" r="4" fill="rgba(0,0,0,0.18)"/>
    <circle cx="70" cy="52" r="8" fill="rgba(0,0,0,0.26)"/>
    <circle cx="70" cy="52" r="2.5" fill="rgba(255,255,255,0.1)"/>
    <circle cx="38" cy="62" r="5" fill="rgba(0,0,0,0.2)"/>
    <circle cx="52" cy="72" r="3.5" fill="rgba(0,0,0,0.18)"/>
    <circle cx="22" cy="50" r="3" fill="rgba(0,0,0,0.16)"/>
    <circle cx="60" cy="75" r="2.5" fill="rgba(0,0,0,0.14)"/>
  </g>`,

  rings: `<g clip-path="url(#c)" transform="rotate(-18 50 50)">
    <ellipse cx="50" cy="50" rx="52" ry="10" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2.5"/>
    <ellipse cx="50" cy="50" rx="44" ry="6.5" fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="1.4"/>
  </g>`,

  swirl: `<g clip-path="url(#c)" fill="none" stroke="rgba(0,0,0,0.22)" stroke-width="2" stroke-linecap="round">
    <path d="M 50 50 m -28 0 a 28 14 0 1 1 56 0 a 22 11 0 1 1 -44 0 a 16 8 0 1 1 32 0 a 10 5 0 1 1 -20 0"/>
  </g>`
};

/** Build the full planet SVG (body gradient + design overlay) parameterised by colour. */
export function planetSvg(color: string, design: PlanetDesign): string {
  const core = lighten(color, 0.3);
  const edge = darken(color, 0.55);
  const overlay = OVERLAYS[design] ?? '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <radialGradient id="g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${core}"/>
        <stop offset="55%" stop-color="${color}"/>
        <stop offset="100%" stop-color="${edge}"/>
      </radialGradient>
      <clipPath id="c"><circle cx="50" cy="50" r="48"/></clipPath>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#g)"/>
    ${overlay}
  </svg>`;
}

/** Encoded data URI ready for Cytoscape's background-image or CSS url(). */
export function planetBgImage(color: string, design: PlanetDesign): string {
  const svg = planetSvg(color, design).replace(/\s+/g, ' ').trim();
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// -------- Satellites: type-icon on a solid coloured disc --------

export type SatelliteType = 'note' | 'image' | 'iframe' | 'file' | 'quiz';

// Simple monochrome line icons, sized for a 100×100 viewBox so they read at ~44px.
const SATELLITE_ICONS: Record<SatelliteType, string> = {
  // Lines of text
  note: `<g stroke="white" stroke-width="6" stroke-linecap="round" fill="none">
    <line x1="30" y1="38" x2="70" y2="38"/>
    <line x1="30" y1="52" x2="70" y2="52"/>
    <line x1="30" y1="66" x2="58" y2="66"/>
  </g>`,

  // Sun + mountains in a frame
  image: `<g fill="white" stroke="none">
    <circle cx="38" cy="38" r="5"/>
    <path d="M24 68 L40 48 L52 60 L66 42 L78 68 Z"/>
  </g>`,

  // Arrow leaving a box (external link)
  iframe: `<g stroke="white" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M44 28 H28 V72 H72 V56"/>
    <path d="M54 28 H72 V46"/>
    <line x1="50" y1="50" x2="72" y2="28"/>
  </g>`,

  // Document with folded corner
  file: `<g stroke="white" stroke-width="6" fill="none" stroke-linejoin="round" stroke-linecap="round">
    <path d="M30 22 H58 L72 36 V78 H30 Z"/>
    <path d="M58 22 V36 H72"/>
  </g>`,

  // Question mark for quiz (placeholder until quiz is built)
  quiz: `<g stroke="white" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M36 38 a14 14 0 1 1 22 11 c-4 3 -8 6 -8 11"/>
    <circle cx="50" cy="72" r="3.5" fill="white" stroke="none"/>
  </g>`
};

export function satelliteSvg(type: SatelliteType, color: string): string {
  const icon = SATELLITE_ICONS[type] ?? '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="48" fill="${color}"/>
    ${icon}
  </svg>`;
}

export function satelliteBgImage(type: SatelliteType, color: string): string {
  const svg = satelliteSvg(type, color).replace(/\s+/g, ' ').trim();
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Reads `--sat-<type>` from the active theme; SSR-safe with a sensible fallback. */
export function satelliteTypeColor(type: SatelliteType): string {
  const fallback: Record<SatelliteType, string> = {
    note: '#10b981',
    image: '#06b6d4',
    iframe: '#f43f5e',
    file: '#f59e0b',
    quiz: '#a855f7'
  };
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback[type];
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--sat-${type}`).trim();
  return v || fallback[type];
}
