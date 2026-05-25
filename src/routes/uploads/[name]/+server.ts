import { error } from '@sveltejs/kit';
import { stat, open } from 'node:fs/promises';
import type { RequestHandler } from './$types';
import { resolveStoredPath } from '$lib/server/uploads';

// Tiny mime sniff from extension. We don't pull a dep for this — covers the common cases the
// class will hit and falls back to octet-stream so the browser still downloads it cleanly.
const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function mimeFor(name: string): string {
  const m = name.match(/\.[a-z0-9]+$/i);
  return (m && MIME[m[0].toLowerCase()]) ?? 'application/octet-stream';
}

export const GET: RequestHandler = async ({ params }) => {
  const path = resolveStoredPath(params.name);
  if (!path) throw error(400, 'bad filename');

  let info: Awaited<ReturnType<typeof stat>>;
  try {
    info = await stat(path);
  } catch {
    throw error(404, 'not found');
  }
  if (!info.isFile()) throw error(404, 'not found');

  const handle = await open(path, 'r');
  const stream = handle.readableWebStream() as unknown as ReadableStream<Uint8Array>;

  return new Response(stream, {
    headers: {
      'Content-Type': mimeFor(params.name),
      'Content-Length': String(info.size),
      // Long cache — file contents are immutable for a given name (we generate a new name per upload)
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
};
