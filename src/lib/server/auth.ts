import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';

export type Role = 'view' | 'student' | 'admin';

export const COOKIE_NAME = 'lm_session';

// Session lifetimes (chosen so a class day fits in the student window, while admin re-prompts often)
const TTL_SECONDS: Record<Exclude<Role, 'view'>, number> = {
  student: 4 * 60 * 60,
  admin: 1 * 60 * 60
};

type Payload = { role: Exclude<Role, 'view'>; name: string | null; exp: number };

function secret(): string {
  const s = env.SESSION_SECRET;
  if (!s || s.length < 16) {
    // Hard fail in prod, soft fallback in dev with a stable warning
    if (env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set to a 32+ char random string in production');
    }
    console.warn('[auth] SESSION_SECRET missing — using a dev fallback. Set it in .env.');
    return 'dev-only-fallback-secret-do-not-use-in-prod';
  }
  return s;
}

function base64url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf;
  return b.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function fromBase64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function sign(payload: string): string {
  return base64url(createHmac('sha256', secret()).update(payload).digest());
}

export function encodeSession(role: Exclude<Role, 'view'>, name: string | null): {
  value: string;
  maxAge: number;
} {
  const ttl = TTL_SECONDS[role];
  const payload: Payload = { role, name, exp: Math.floor(Date.now() / 1000) + ttl };
  const body = base64url(JSON.stringify(payload));
  const sig = sign(body);
  return { value: `${body}.${sig}`, maxAge: ttl };
}

export function decodeSession(cookie: string | undefined): { role: Role; name: string | null } {
  if (!cookie) return { role: 'view', name: null };
  const [body, sig] = cookie.split('.');
  if (!body || !sig) return { role: 'view', name: null };
  const expected = sign(body);
  // timingSafeEqual requires equal-length buffers — bail early on length mismatch
  if (expected.length !== sig.length) return { role: 'view', name: null };
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    return { role: 'view', name: null };
  }
  try {
    const payload = JSON.parse(fromBase64url(body).toString('utf8')) as Payload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return { role: 'view', name: null };
    if (payload.role !== 'student' && payload.role !== 'admin') return { role: 'view', name: null };
    return { role: payload.role, name: payload.name };
  } catch {
    return { role: 'view', name: null };
  }
}

export function checkPassword(role: 'student' | 'admin', password: string): boolean {
  const expected = role === 'admin' ? env.ADMIN_PASSWORD : env.STUDENT_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still do a compare against a same-length dummy to keep timing flat
    timingSafeEqual(a, Buffer.alloc(a.length));
    return false;
  }
  return timingSafeEqual(a, b);
}

const RANK: Record<Role, number> = { view: 0, student: 1, admin: 2 };

export function hasRole(actual: Role, min: 'student' | 'admin'): boolean {
  return RANK[actual] >= RANK[min];
}

export function newSecretSuggestion(): string {
  return randomBytes(32).toString('hex');
}
