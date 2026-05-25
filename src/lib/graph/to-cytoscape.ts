import type { NodeRow, EdgeRow } from '$lib/server/db/schema';
import type cytoscape from 'cytoscape';
import { planetGradient, planetGlow, planetBorder } from './color';

const DEFAULT_PLANET_COLOR = '#6366f1'; // indigo fallback

export type Partitioned = {
  planets: NodeRow[];
  satellitesByParent: Map<string, NodeRow[]>;
  planetEdges: EdgeRow[];
};

/** Split nodes into top-level "planets" and child "satellites". */
export function partition(nodes: NodeRow[], edges: EdgeRow[]): Partitioned {
  const planets: NodeRow[] = [];
  const satellitesByParent = new Map<string, NodeRow[]>();
  for (const n of nodes) {
    if (n.parentId) {
      const list = satellitesByParent.get(n.parentId) ?? [];
      list.push(n);
      satellitesByParent.set(n.parentId, list);
    } else {
      planets.push(n);
    }
  }
  const planetIds = new Set(planets.map((p) => p.id));
  const planetEdges = edges.filter(
    (e) => planetIds.has(e.sourceId) && planetIds.has(e.targetId)
  );
  return { planets, satellitesByParent, planetEdges };
}

/** Initial Cytoscape elements — planets and the edges between them. No satellites. */
export function planetElements(p: Partitioned): cytoscape.ElementDefinition[] {
  const nodes: cytoscape.ElementDefinition[] = p.planets.map((n) => {
    const base = (n.metadata?.color as string) ?? DEFAULT_PLANET_COLOR;
    const grad = planetGradient(base);
    return {
      data: {
        id: n.id,
        title: n.title ?? '',
        type: n.type,
        content: n.content,
        isPlanet: true,
        satelliteCount: p.satellitesByParent.get(n.id)?.length ?? 0,
        baseColor: base,
        gradientColors: grad.colors,
        gradientPositions: grad.positions,
        borderColor: planetBorder(base),
        glow: planetGlow(base)
      }
    };
  });
  const edges: cytoscape.ElementDefinition[] = p.planetEdges.map((e) => ({
    data: {
      id: e.id,
      source: e.sourceId,
      target: e.targetId,
      kind: e.kind,
      label: e.label ?? ''
    }
  }));
  return [...nodes, ...edges];
}

/** Satellite elements positioned in a ring around the planet, plus parent→satellite edges. */
export function satelliteElements(
  parent: { id: string; x: number; y: number; glow: string },
  satellites: NodeRow[],
  radius = 130
): cytoscape.ElementDefinition[] {
  const n = satellites.length;
  if (n === 0) return [];

  const startAngle = -Math.PI / 2; // first satellite at "12 o'clock"
  const els: cytoscape.ElementDefinition[] = [];

  for (let i = 0; i < n; i++) {
    const s = satellites[i];
    const angle = startAngle + (i / n) * Math.PI * 2;
    const x = parent.x + Math.cos(angle) * radius;
    const y = parent.y + Math.sin(angle) * radius;
    els.push({
      data: {
        id: s.id,
        title: s.title ?? '',
        type: s.type,
        content: s.content,
        isSatellite: true,
        parentPlanet: parent.id,
        glow: parent.glow // inherit halo colour from the planet
      },
      position: { x, y },
      classes: 'satellite'
    });
    els.push({
      data: {
        id: `orbit:${parent.id}:${s.id}`,
        source: parent.id,
        target: s.id,
        kind: 'orbit',
        glow: parent.glow
      },
      classes: 'orbit-edge'
    });
  }

  return els;
}
