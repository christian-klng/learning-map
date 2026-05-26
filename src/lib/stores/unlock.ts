import { writable } from 'svelte/store';
import type { EdgeRow, NodeRow } from '$lib/server/db/schema';

export const unlockedIds = writable<Set<string>>(new Set());

export function computeInitialUnlocked(planets: NodeRow[], edges: EdgeRow[]): Set<string> {
  const lockedIds = new Set<string>();

  for (const e of edges) {
    const dir = e.unlockDirection;
    if (!dir) continue;
    if (dir === 'source') lockedIds.add(e.targetId);
    else if (dir === 'target') lockedIds.add(e.sourceId);
  }

  const unlocked = new Set<string>();
  for (const p of planets) {
    if (!lockedIds.has(p.id)) unlocked.add(p.id);
  }
  return unlocked;
}

export function getChildPlanetIds(planetId: string, edges: EdgeRow[]): string[] {
  const children: string[] = [];
  for (const e of edges) {
    if (!e.unlockDirection) continue;
    if (e.unlockDirection === 'source' && e.sourceId === planetId) children.push(e.targetId);
    if (e.unlockDirection === 'target' && e.targetId === planetId) children.push(e.sourceId);
  }
  return children;
}
