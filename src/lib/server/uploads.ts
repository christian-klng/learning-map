import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { env } from '$env/dynamic/private';

// Where uploaded files live. Defaults: ./uploads in dev, /app/uploads in prod (set in Dockerfile).
function rootDir(): string {
  return resolve(env.UPLOAD_DIR ?? './uploads');
}

let ensured = false;
export async function uploadDir(): Promise<string> {
  const dir = rootDir();
  if (!ensured) {
    await mkdir(dir, { recursive: true });
    ensured = true;
  }
  return dir;
}

/** Extract a safe extension from a filename (alphanumeric, max 8 chars, lowercased). */
export function safeExtension(filename: string): string {
  const m = filename.match(/\.([a-zA-Z0-9]{1,8})$/);
  return m ? `.${m[1].toLowerCase()}` : '';
}

/** Generate a collision-free storage name preserving extension. */
export function generateStoredName(originalName: string): string {
  return randomBytes(12).toString('hex') + safeExtension(originalName);
}

/** Resolve a request like "abc.png" to a path inside UPLOAD_DIR — refuses traversal. */
export function resolveStoredPath(name: string): string | null {
  const safe = basename(name);
  // basename strips path separators; also reject hidden-files and empties
  if (!safe || safe.startsWith('.') || safe !== name) return null;
  return resolve(rootDir(), safe);
}
