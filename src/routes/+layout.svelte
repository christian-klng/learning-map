<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores/theme';

  let { children } = $props();

  onMount(() => {
    const unsub = theme.subscribe((t) => {
      document.documentElement.classList.remove('theme-light', 'theme-space');
      document.documentElement.classList.add(`theme-${t}`);
    });
    return unsub;
  });
</script>

{@render children()}
