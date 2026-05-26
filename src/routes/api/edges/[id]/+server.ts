import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { edges } from '$lib/server/db/schema';
import { hasRole } from '$lib/server/auth';
import { notify } from '$lib/server/realtime';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (!hasRole(locals.role, 'student')) throw error(403, 'edit mode required');

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') throw error(400, 'invalid body');

  const patch: Record<string, unknown> = {};
  if ('kind' in body) patch.kind = body.kind;
  if ('label' in body) patch.label = body.label;
  if ('unlockDirection' in body) {
    const dir = body.unlockDirection;
    if (dir !== null && dir !== 'source' && dir !== 'target') {
      throw error(400, 'unlockDirection must be "source", "target", or null');
    }
    patch.unlockDirection = dir;
  }
  if ('metadata' in body) patch.metadata = body.metadata;
  if (Object.keys(patch).length === 0) throw error(400, 'nothing to update');

  const [row] = await db
    .update(edges)
    .set(patch as any)
    .where(eq(edges.id, params.id))
    .returning();

  if (!row) throw error(404, 'edge not found');
  notify({ kind: 'edge.updated', payload: row, actor: locals.name });
  return json(row);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!hasRole(locals.role, 'student')) throw error(403, 'edit mode required');

  const [row] = await db.delete(edges).where(eq(edges.id, params.id)).returning();
  if (!row) throw error(404, 'edge not found');
  notify({ kind: 'edge.deleted', payload: { id: row.id }, actor: locals.name });
  return json({ ok: true });
};
