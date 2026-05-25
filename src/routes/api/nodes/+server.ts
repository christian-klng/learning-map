import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { nodes, type NewNode, type NodeType } from '$lib/server/db/schema';
import { hasRole } from '$lib/server/auth';
import { notify } from '$lib/server/realtime';
import type { RequestHandler } from './$types';

const VALID_TYPES: NodeType[] = ['note', 'image', 'file', 'iframe', 'quiz'];

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!hasRole(locals.role, 'student')) throw error(403, 'edit mode required');

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') throw error(400, 'invalid body');

  const { type, title, content, parentId, metadata, position } = body as Partial<NewNode>;
  if (!type || !VALID_TYPES.includes(type as NodeType)) {
    throw error(400, 'type must be one of: ' + VALID_TYPES.join(', '));
  }

  const [row] = await db
    .insert(nodes)
    .values({
      type: type as NodeType,
      title: title ?? null,
      content: (content as any) ?? {},
      parentId: parentId ?? null,
      metadata: (metadata as any) ?? {},
      position: (position as any) ?? null,
      createdBy: locals.name,
      updatedBy: locals.name
    })
    .returning();

  notify({ kind: 'node.created', payload: row, actor: locals.name });
  return json(row, { status: 201 });
};
