import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
  return {
    session: { role: locals.role, name: locals.name }
  };
};
