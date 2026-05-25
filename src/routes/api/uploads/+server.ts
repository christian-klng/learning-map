import { json, error } from '@sveltejs/kit';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RequestHandler } from './$types';
import { hasRole } from '$lib/server/auth';
import { generateStoredName, uploadDir } from '$lib/server/uploads';

// Outer cap. The Dockerfile sets BODY_SIZE_LIMIT=20M for the server overall; this is a defensive
// per-file check so a single huge upload can't sneak in via a tweaked client.
const MAX_BYTES = 20 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!hasRole(locals.role, 'student')) throw error(403, 'edit mode required');

  const form = await request.formData().catch(() => null);
  if (!form) throw error(400, 'expected multipart/form-data');

  const file = form.get('file');
  if (!(file instanceof File)) throw error(400, 'missing "file" field');
  if (file.size === 0) throw error(400, 'empty file');
  if (file.size > MAX_BYTES) throw error(413, `file exceeds ${MAX_BYTES} bytes`);

  const stored = generateStoredName(file.name);
  const dir = await uploadDir();
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(join(dir, stored), buf);

  return json(
    {
      url: `/uploads/${stored}`,
      filename: file.name,
      mime: file.type || 'application/octet-stream',
      size: file.size
    },
    { status: 201 }
  );
};
