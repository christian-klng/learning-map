import type cytoscape from 'cytoscape';

export function readThemeTokens() {
  const s = getComputedStyle(document.documentElement);
  const get = (k: string) => s.getPropertyValue(k).trim();
  return {
    bg: get('--bg-base'),
    text: get('--text'),
    textDim: get('--text-dim'),

    planetCore: get('--planet-core'),
    planetEdge: get('--planet-edge'),
    planetBorder: get('--planet-border'),
    planetGlow: get('--planet-glow'),

    satImage: get('--sat-image'),
    satIframe: get('--sat-iframe'),
    satFile: get('--sat-file'),
    satNote: get('--sat-note'),

    edge: get('--edge'),
    edgeActive: get('--edge-active'),
    orbitEdge: get('--orbit-edge'),
    focusRing: get('--focus-ring')
  };
}

export function buildStylesheet(): cytoscape.StylesheetJson {
  const t = readThemeTokens();
  return [
    // Default node (rarely matches alone)
    {
      selector: 'node',
      style: {
        label: 'data(title)',
        color: t.text,
        'font-family':
          '"Inter", "SF Pro Display", -apple-system, system-ui, sans-serif',
        'font-size': 12,
        'font-weight': 500,
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': '110px',
        'text-outline-width': 0,
        'transition-property':
          'background-color, border-width, border-color, opacity, width, height',
        'transition-duration': 280,
        'transition-timing-function': 'ease-in-out'
      }
    },

    // PLANETS — the full visual (gradient body + design overlay) is a single SVG
    // that we paint as background-image. Solid background underneath stays transparent.
    {
      selector: 'node[?isPlanet]',
      style: {
        shape: 'ellipse',
        width: 96,
        height: 96,
        'background-color': '#000', // peeks at the very edges; mostly hidden by border + overlay
        'background-opacity': 0,
        'background-image': 'data(bgImage)',
        'background-image-opacity': 1,
        'background-fit': 'cover',
        'border-width': 1.5,
        'border-color': 'data(borderColor)',
        'border-opacity': 0.65,
        color: t.text,
        'font-size': 13,
        'font-weight': 600,
        'overlay-shape': 'ellipse'
      }
    },

    // SATELLITES — smaller, type-coloured
    {
      selector: 'node.satellite',
      style: {
        shape: 'ellipse',
        width: 44,
        height: 44,
        'font-size': 10,
        'font-weight': 500,
        color: t.text,
        'border-width': 1,
        'border-color': t.planetBorder,
        'border-opacity': 0.5,
        label: '',
        'overlay-padding': 6,
        'overlay-shape': 'ellipse',
        events: 'no' // satellites are display-only — no tap, drag, or hover hit-testing
      }
    },
    {
      selector: 'node.satellite[type = "image"]',
      style: { 'background-color': t.satImage, shape: 'ellipse', 'overlay-shape': 'ellipse' }
    },
    {
      selector: 'node.satellite[type = "iframe"]',
      style: { 'background-color': t.satIframe, shape: 'diamond', 'overlay-shape': 'ellipse' }
    },
    {
      selector: 'node.satellite[type = "file"]',
      style: { 'background-color': t.satFile, shape: 'round-rectangle', 'overlay-shape': 'round-rectangle' }
    },
    {
      selector: 'node.satellite[type = "note"]',
      style: { 'background-color': t.satNote, shape: 'round-rectangle', 'overlay-shape': 'round-rectangle' }
    },

    // EDGES between planets
    {
      selector: 'edge',
      style: {
        width: 1.2,
        'line-color': t.edge,
        'curve-style': 'bezier',
        'control-point-step-size': 60,
        opacity: 0.55,
        'target-arrow-shape': 'none',
        label: '',
        'transition-property': 'line-color, opacity, width',
        'transition-duration': 280
      }
    },

    // ORBIT edges (planet → satellite) — dashed, subtle
    {
      selector: 'edge.orbit-edge',
      style: {
        width: 1,
        'line-color': t.orbitEdge,
        'line-style': 'dashed',
        'line-dash-pattern': [4, 4],
        opacity: 0.45,
        label: ''
      }
    },

    // PRIMARY — the single currently-clicked element. Only one ever has this class,
    // so there's no overlay stacking. Glows from primary + scene never overlap.
    {
      selector: '.primary',
      style: {
        'border-color': t.focusRing,
        'border-width': 3,
        'border-opacity': 1,
        'overlay-color': t.focusRing,
        'overlay-opacity': 0.28,
        'overlay-padding': 22,
        // overlay-shape inherits from per-type rule
        'z-index': 999
      }
    },
    // Planet-specific primary: glow + border use the planet's own colour
    {
      selector: 'node[?isPlanet].primary',
      style: {
        'border-color': 'data(glow)',
        'overlay-color': 'data(glow)'
      }
    },
    // Satellite primary: same glow as its parent planet (inherited via data.glow)
    {
      selector: 'node.satellite.primary',
      style: {
        'border-color': 'data(glow)',
        'overlay-color': 'data(glow)'
      }
    },
    // DIMMED — everything outside the active scene
    {
      selector: '.dimmed',
      style: { opacity: 0.15 }
    }
  ];
}
