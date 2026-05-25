import { db } from '$lib/server/db';
import { nodes, edges } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [nodeRows, edgeRows] = await Promise.all([db.select().from(nodes), db.select().from(edges)]);
  return { nodes: nodeRows, edges: edgeRows };
};
