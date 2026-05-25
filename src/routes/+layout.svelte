<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores/theme';
  import { session } from '$lib/stores/session';

  let { children, data } = $props();

  // Hydrate the session store from the server-rendered locals on every navigation
  $effect(() => {
    session.set(data.session);
  });

  onMount(() => {
    const unsub = theme.subscribe((t) => {
      document.documentElement.classList.remove('theme-light', 'theme-space');
      document.documentElement.classList.add(`theme-${t}`);
    });
    return unsub;
  });
</script>

{@render children()}
