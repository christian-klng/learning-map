import type { Handle } from '@sveltejs/kit';
import { COOKIE_NAME, decodeSession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const { role, name } = decodeSession(event.cookies.get(COOKIE_NAME));
  event.locals.role = role;
  event.locals.name = name;
  return resolve(event);
};
