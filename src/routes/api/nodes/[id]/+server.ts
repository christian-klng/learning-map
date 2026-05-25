import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { nodes } from '$lib/server/db/schema';
import { hasRole } from '$lib/server/auth';
import { notify } from '$lib/server/realtime';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (!hasRole(locals.role, 'student')) throw error(403, 'edit mode required');

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') throw error(400, 'invalid body');

  const patch: Record<string, unknown> = {};
  if ('title' in body) patch.title = body.title;
  if ('content' in body) patch.content = body.content;
  if ('metadata' in body) patch.metadata = body.metadata;
  if ('position' in body) patch.position = body.position;
  if ('type' in body) patch.type = body.type;
  if (Object.keys(patch).length === 0) throw error(400, 'nothing to update');
  patch.updatedAt = new Date();
  patch.updatedBy = locals.name;

  const [row] = await db
    .update(nodes)
    .set(patch as any)
    .where(eq(nodes.id, params.id))
    .returning();

  if (!row) throw error(404, 'node not found');
  notify({ kind: 'node.updated', payload: row, actor: locals.name });
  return json(row);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!hasRole(locals.role, 'student')) throw error(403, 'edit mode required');

  // Cascade is wired in the schema (parentId + edge FKs ON DELETE CASCADE).
  const [row] = await db.delete(nodes).where(eq(nodes.id, params.id)).returning();
  if (!row) throw error(404, 'node not found');
  notify({ kind: 'node.deleted', payload: { id: row.id }, actor: locals.name });
  return json({ ok: true });
};
