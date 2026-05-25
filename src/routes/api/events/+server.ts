import type { RequestHandler } from './$types';
import { presenceSnapshot, subscribe, type RealtimeEvent } from '$lib/server/realtime';
import { randomBytes } from 'node:crypto';

// SSE keep-alive: many proxies idle out long-lived GETs after ~30-60s. A comment frame every
// 25s prevents that and is invisible to EventSource consumers.
const HEARTBEAT_MS = 25_000;

export const GET: RequestHandler = ({ locals, request }) => {
  const connId = randomBytes(6).toString('hex');
  const encoder = new TextEncoder();

  let cleanup: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: RealtimeEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Controller already closed — unsubscribe will fire via the abort handler
        }
      };

      // Initial frame: snapshot of who's already here (including self once subscribe() runs)
      const snapshot = presenceSnapshot();
      controller.enqueue(
        encoder.encode(
          `event: snapshot\ndata: ${JSON.stringify({ connId, presence: snapshot })}\n\n`
        )
      );

      cleanup = subscribe({
        connId,
        role: locals.role,
        name: locals.name,
        send
      });

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          /* closed */
        }
      }, HEARTBEAT_MS);
    },
    cancel() {
      cleanup?.();
      if (heartbeat) clearInterval(heartbeat);
    }
  });

  request.signal.addEventListener('abort', () => {
    cleanup?.();
    if (heartbeat) clearInterval(heartbeat);
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable proxy buffering (nginx/traefik honour this)
      'X-Accel-Buffering': 'no'
    }
  });
};
