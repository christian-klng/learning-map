import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { edges } from '$lib/server/db/schema';
import { hasRole } from '$lib/server/auth';
import { notify } from '$lib/server/realtime';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!hasRole(locals.role, 'student')) throw error(403, 'edit mode required');

  const [row] = await db.delete(edges).where(eq(edges.id, params.id)).returning();
  if (!row) throw error(404, 'edge not found');
  notify({ kind: 'edge.deleted', payload: { id: row.id }, actor: locals.name });
  return json({ ok: true });
};
