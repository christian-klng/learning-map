// Realtime fan-out: one Postgres LISTEN connection on boot, broadcasts to all SSE clients.
//
// Why one shared pg.Client (not the pool): LISTEN reserves the connection for the lifetime of
// the subscription. We don't want to lock up a pool slot.
//
// Why NOTIFY at all (vs. just calling broadcast() directly from each endpoint): so that in the
// future, if we add more app instances behind a load balancer, every instance sees every change.
// For today's single-container Coolify deploy we'd be fine without it, but the cost is trivial.

import pg from 'pg';
import { env } from '$env/dynamic/private';

export type DataEvent =
  | { kind: 'node.created'; payload: unknown; actor: string | null }
  | { kind: 'node.updated'; payload: unknown; actor: string | null }
  | { kind: 'node.deleted'; payload: { id: string }; actor: string | null }
  | { kind: 'edge.created'; payload: unknown; actor: string | null }
  | { kind: 'edge.deleted'; payload: { id: string }; actor: string | null };

export type PresenceEvent =
  | { kind: 'presence.joined'; payload: { connId: string; role: string; name: string | null } }
  | { kind: 'presence.left'; payload: { connId: string } };

export type RealtimeEvent = DataEvent | PresenceEvent;

const CHANNEL = 'lm_changes';

type Subscriber = {
  connId: string;
  role: string;
  name: string | null;
  send: (event: RealtimeEvent) => void;
};

const subscribers = new Map<string, Subscriber>();

let listenClient: pg.Client | null = null;
let listenStarted = false;

async function ensureListen(): Promise<void> {
  if (listenStarted) return;
  listenStarted = true;

  const connectionString =
    env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/learning_map';
  const client = new pg.Client({ connectionString });

  client.on('notification', (msg) => {
    if (msg.channel !== CHANNEL || !msg.payload) return;
    let parsed: RealtimeEvent;
    try {
      parsed = JSON.parse(msg.payload) as RealtimeEvent;
    } catch {
      return;
    }
    for (const sub of subscribers.values()) sub.send(parsed);
  });

  client.on('error', (err) => {
    console.error('[realtime] LISTEN client error:', err);
    // Drop and retry on next call
    listenStarted = false;
    listenClient = null;
    client.end().catch(() => {});
  });

  await client.connect();
  await client.query(`LISTEN ${CHANNEL}`);
  listenClient = client;
}

/** Fire-and-forget broadcast of a DB change. Safe to call from inside an endpoint after commit. */
export function notify(event: DataEvent): void {
  // Eager-start the listener on first call so dev HMR + cold prod boot both wake it.
  void ensureListen().catch((err) => console.error('[realtime] ensureListen:', err));
  if (!listenClient) {
    // Listener not ready yet — fall back to local in-process fan-out so we don't lose the event
    for (const sub of subscribers.values()) sub.send(event as RealtimeEvent);
    return;
  }
  listenClient
    .query('SELECT pg_notify($1, $2)', [CHANNEL, JSON.stringify(event)])
    .catch((err) => console.error('[realtime] notify failed:', err));
}

/** Register an SSE subscriber. Returns an unsubscribe function. */
export function subscribe(sub: Subscriber): () => void {
  void ensureListen().catch((err) => console.error('[realtime] ensureListen:', err));
  subscribers.set(sub.connId, sub);

  // Broadcast presence to everyone else (skip own).
  for (const other of subscribers.values()) {
    if (other.connId === sub.connId) continue;
    other.send({
      kind: 'presence.joined',
      payload: { connId: sub.connId, role: sub.role, name: sub.name }
    });
  }

  return () => {
    subscribers.delete(sub.connId);
    for (const other of subscribers.values()) {
      other.send({ kind: 'presence.left', payload: { connId: sub.connId } });
    }
  };
}

/** Snapshot of currently connected subscribers (for the initial SSE handshake). */
export function presenceSnapshot(): Array<{ connId: string; role: string; name: string | null }> {
  return Array.from(subscribers.values()).map((s) => ({
    connId: s.connId,
    role: s.role,
    name: s.name
  }));
}
