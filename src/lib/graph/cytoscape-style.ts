import type cytoscape from 'cytoscape';

// Read theme tokens from the document at the moment a stylesheet is built.
// On theme switch, rebuild + reapply.
export function readThemeTokens() {
  const s = getComputedStyle(document.documentElement);
  return {
    bg: s.getPropertyValue('--bg').trim(),
    nodeBg: s.getPropertyValue('--node-bg').trim(),
    nodeBorder: s.getPropertyValue('--node-border').trim(),
    nodeText: s.getPropertyValue('--text').trim(),
    edge: s.getPropertyValue('--edge').trim(),
    focusRing: s.getPropertyValue('--focus-ring').trim(),
    satelliteBg: s.getPropertyValue('--satellite-bg').trim() || s.getPropertyValue('--node-bg').trim(),
    compoundBg: s.getPropertyValue('--compound-bg').trim()
  };
}

export function buildStylesheet(): cytoscape.StylesheetJson {
  const t = readThemeTokens();
  return [
    {
      selector: 'node',
      style: {
        'background-color': t.nodeBg,
        'border-color': t.nodeBorder,
        'border-width': 1.5,
        label: 'data(title)',
        color: t.nodeText,
        'font-size': 12,
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': '90px',
        width: 60,
        height: 60,
        'transition-property': 'opacity, border-width, background-color',
        'transition-duration': 250
      }
    },
    {
      selector: 'node[type = "note"]',
      style: { shape: 'round-rectangle', width: 90, height: 60 }
    },
    {
      selector: 'node[type = "image"]',
      style: { shape: 'ellipse', 'background-color': '#7ab2ff' }
    },
    {
      selector: 'node[type = "iframe"]',
      style: { shape: 'diamond', 'background-color': '#c084fc' }
    },
    {
      selector: 'node[type = "file"]',
      style: { shape: 'rectangle', 'background-color': '#fbbf24' }
    },
    {
      selector: ':parent',
      style: {
        'background-color': t.compoundBg,
        'background-opacity': 0.25,
        'border-color': t.nodeBorder,
        'border-width': 1,
        'border-opacity': 0.6,
        padding: 20,
        'text-valign': 'top',
        'text-margin-y': -8
      }
    },
    {
      selector: 'edge',
      style: {
        width: 1.5,
        'line-color': t.edge,
        'target-arrow-color': t.edge,
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        opacity: 0.7,
        label: 'data(label)',
        'font-size': 9,
        color: t.nodeText,
        'text-background-color': t.bg,
        'text-background-opacity': 0.8,
        'text-background-padding': '2px'
      }
    },
    {
      selector: '.focused',
      style: { 'border-color': t.focusRing, 'border-width': 3, 'z-index': 999 }
    },
    {
      selector: '.dimmed',
      style: { opacity: 0.2 }
    }
  ];
}
