import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { COOKIE_NAME, checkPassword, encodeSession } from '$lib/server/auth';
import { dev } from '$app/environment';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') throw error(400, 'invalid body');

  const role = body.role as 'student' | 'admin';
  const password = String(body.password ?? '');
  const rawName = typeof body.name === 'string' ? body.name.trim().slice(0, 40) : '';

  if (role !== 'student' && role !== 'admin') throw error(400, 'role must be student or admin');
  if (role === 'student' && !rawName) throw error(400, 'name required for student mode');
  if (!checkPassword(role, password)) throw error(401, 'wrong password');

  const name = role === 'admin' ? rawName || 'Teacher' : rawName;
  const { value, maxAge } = encodeSession(role, name);

  cookies.set(COOKIE_NAME, value, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: !dev,
    maxAge
  });

  return json({ role, name });
};

export const DELETE: RequestHandler = async ({ cookies }) => {
  cookies.delete(COOKIE_NAME, { path: '/' });
  return json({ role: 'view', name: null });
};
