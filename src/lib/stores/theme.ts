import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'space';

const KEY = 'learning-map:theme';

function initial(): Theme {
  if (!browser) return 'space';
  return (localStorage.getItem(KEY) as Theme) ?? 'space';
}

export const theme = writable<Theme>(initial());

if (browser) {
  theme.subscribe((t) => localStorage.setItem(KEY, t));
}
