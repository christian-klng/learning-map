import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { edges } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
  const [row] = await db.delete(edges).where(eq(edges.id, params.id)).returning();
  if (!row) throw error(404, 'edge not found');
  return json({ ok: true });
};
