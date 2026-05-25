import type { NodeRow, EdgeRow } from '$lib/server/db/schema';
import type cytoscape from 'cytoscape';

export function toCytoscapeElements(
  nodes: NodeRow[],
  edges: EdgeRow[]
): cytoscape.ElementDefinition[] {
  const parentIds = new Set(nodes.map((n) => n.parentId).filter((id): id is string => !!id));

  const nodeEls: cytoscape.ElementDefinition[] = [];

  // For every node that has children we render BOTH:
  // - the real node (id = nodes.id)
  // - a synthetic compound parent (id = `group:<nodes.id>`) that contains the real node + its satellites
  // This lets the planet itself still be a clickable, styled node while Cytoscape's compound layout
  // still constrains the satellites visually around it.
  for (const n of nodes) {
    const isPlanet = parentIds.has(n.id);
    const realParent = n.parentId ? `group:${n.parentId}` : undefined;

    if (isPlanet) {
      nodeEls.push({
        data: { id: `group:${n.id}`, title: '', isGroup: true, parent: realParent }
      });
      nodeEls.push({
        data: {
          id: n.id,
          title: n.title ?? '',
          type: n.type,
          content: n.content,
          parent: `group:${n.id}`
        }
      });
    } else {
      nodeEls.push({
        data: {
          id: n.id,
          title: n.title ?? '',
          type: n.type,
          content: n.content,
          parent: realParent
        }
      });
    }
  }

  const edgeEls: cytoscape.ElementDefinition[] = edges.map((e) => ({
    data: {
      id: e.id,
      source: e.sourceId,
      target: e.targetId,
      kind: e.kind,
      label: e.label ?? ''
    }
  }));

  return [...nodeEls, ...edgeEls];
}
