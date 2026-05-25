import type { NodeRow, EdgeRow } from '$lib/server/db/schema';
import type cytoscape from 'cytoscape';
import { planetGlow, planetBorder, lighten } from './color';
import {
  planetBgImage,
  satelliteBgImage,
  satelliteTypeColor,
  type PlanetDesign,
  type SatelliteType
} from './visual';

const DEFAULT_PLANET_COLOR = '#6366f1'; // indigo fallback
const DEFAULT_PLANET_DESIGN: PlanetDesign = 'plain';

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

/** Build one planet's element definition (used for initial load AND on-demand creation). */
export function planetElement(n: NodeRow, satelliteCount: number): cytoscape.ElementDefinition {
  const base = (n.metadata?.color as string) ?? DEFAULT_PLANET_COLOR;
  const design = (n.metadata?.design as PlanetDesign) ?? DEFAULT_PLANET_DESIGN;
  const el: cytoscape.ElementDefinition = {
    data: {
      id: n.id,
      title: n.title ?? '',
      type: n.type,
      content: n.content,
      isPlanet: true,
      satelliteCount,
      baseColor: base,
      design,
      borderColor: planetBorder(base),
      glow: planetGlow(base),
      bgImage: planetBgImage(base, design)
    }
  };
  if (n.position) el.position = n.position as { x: number; y: number };
  return el;
}

/** Initial Cytoscape elements — planets and the edges between them. No satellites. */
export function planetElements(p: Partitioned): cytoscape.ElementDefinition[] {
  const nodes: cytoscape.ElementDefinition[] = p.planets.map((n) =>
    planetElement(n, p.satellitesByParent.get(n.id)?.length ?? 0)
  );
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

/** Satellite elements positioned in a ring around the planet, plus parent→satellite edges.
 *  Satellites are spread along the UPPER semicircle only — leaving the bottom clear
 *  for the planet's title (which sits below the body). */
export function satelliteElements(
  parent: { id: string; x: number; y: number; glow: string },
  satellites: NodeRow[],
  radius = 130
): cytoscape.ElementDefinition[] {
  const n = satellites.length;
  if (n === 0) return [];

  // Arc from 9 o'clock (-π) to 3 o'clock (0), passing through 12 o'clock (-π/2).
  const arcStart = -Math.PI;
  const arcLength = Math.PI;
  const els: cytoscape.ElementDefinition[] = [];

  for (let i = 0; i < n; i++) {
    const s = satellites[i];
    const t = (i + 0.5) / n;
    const angle = arcStart + t * arcLength;
    const x = parent.x + Math.cos(angle) * radius;
    const y = parent.y + Math.sin(angle) * radius;

    const satType = (s.type as SatelliteType) ?? 'note';
    const satColor = satelliteTypeColor(satType);
    els.push({
      data: {
        id: s.id,
        title: s.title ?? '',
        type: s.type,
        content: s.content,
        isSatellite: true,
        parentPlanet: parent.id,
        glow: parent.glow, // inherit halo colour from the planet
        bgImage: satelliteBgImage(satType, satColor),
        satBorder: lighten(satColor, 0.25)
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
