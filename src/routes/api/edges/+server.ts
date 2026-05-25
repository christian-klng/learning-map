import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { edges, type NewEdge, type EdgeKind } from '$lib/server/db/schema';
import { hasRole } from '$lib/server/auth';
import { notify } from '$lib/server/realtime';
import type { RequestHandler } from './$types';

const VALID_KINDS: EdgeKind[] = ['reference', 'related', 'prerequisite', 'leads_to'];

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!hasRole(locals.role, 'student')) throw error(403, 'edit mode required');

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') throw error(400, 'invalid body');

  const { sourceId, targetId, kind, label, metadata } = body as Partial<NewEdge>;
  if (!sourceId || !targetId) throw error(400, 'sourceId and targetId required');
  if (sourceId === targetId) throw error(400, 'self-loops not allowed');
  if (kind && !VALID_KINDS.includes(kind as EdgeKind)) {
    throw error(400, 'invalid edge kind');
  }

  const [row] = await db
    .insert(edges)
    .values({
      sourceId,
      targetId,
      kind: (kind as EdgeKind) ?? 'reference',
      label: label ?? null,
      metadata: (metadata as any) ?? {},
      createdBy: locals.name
    })
    .returning();

  notify({ kind: 'edge.created', payload: row, actor: locals.name });
  return json(row, { status: 201 });
};
