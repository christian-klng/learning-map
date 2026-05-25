import { writable } from 'svelte/store';

export type Role = 'view' | 'student' | 'admin';
export type SessionState = { role: Role; name: string | null };

export const session = writable<SessionState>({ role: 'view', name: null });

export async function enterMode(
  role: 'student' | 'admin',
  password: string,
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ role, password, name })
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => 'failed');
    return { ok: false, error: msg || `error ${res.status}` };
  }
  const next = (await res.json()) as SessionState;
  session.set(next);
  return { ok: true };
}

export async function exitMode(): Promise<void> {
  await fetch('/api/session', { method: 'DELETE' }).catch(() => {});
  session.set({ role: 'view', name: null });
}
