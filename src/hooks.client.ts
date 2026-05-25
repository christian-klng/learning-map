import type { HandleClientError } from '@sveltejs/kit';

// SvelteKit emits hashed chunk filenames on every build. After a deploy, any browser tab still
// holding old chunk references will fail with "Importing a module script failed" (or the
// equivalent Chrome/Firefox phrasing) when it tries to fetch a chunk that no longer exists.
// We catch that here and do one hard reload — which re-fetches the current HTML with the
// new chunk hashes. A session-storage guard prevents an infinite reload loop in the (unlikely)
// case the error is from something other than a stale deploy.

const CHUNK_PATTERNS = [
  /Importing a module script failed/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Unable to preload CSS for/i
];

const RELOAD_GUARD = 'lm:stale-chunk-reloaded';

function looksLikeStaleChunk(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return CHUNK_PATTERNS.some((p) => p.test(msg));
}

export const handleError: HandleClientError = ({ error }) => {
  if (looksLikeStaleChunk(error)) {
    if (!sessionStorage.getItem(RELOAD_GUARD)) {
      sessionStorage.setItem(RELOAD_GUARD, '1');
      window.location.reload();
      return; // SvelteKit will navigate to the error page momentarily; reload races it and wins
    }
  }
  // Clear the guard on any successful subsequent error (means the reload worked and a *different*
  // error happened, which we shouldn't suppress)
  sessionStorage.removeItem(RELOAD_GUARD);
};

// Some chunk-load failures surface as unhandled promise rejections rather than going through
// SvelteKit's error pipeline (e.g. a dynamic import inside an event handler).
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => {
    if (looksLikeStaleChunk(e.reason)) {
      if (!sessionStorage.getItem(RELOAD_GUARD)) {
        sessionStorage.setItem(RELOAD_GUARD, '1');
        e.preventDefault();
        window.location.reload();
      }
    }
  });
}
