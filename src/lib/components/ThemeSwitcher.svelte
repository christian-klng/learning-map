<script lang="ts">
  import { theme, type Theme } from '$lib/stores/theme';

  const themes: { id: Theme; label: string }[] = [
    { id: 'space', label: '🌌 Space' },
    { id: 'light', label: '☀ Light' }
  ];
</script>

<div class="switcher" role="radiogroup" aria-label="Theme">
  {#each themes as { id, label }}
    <button
      class:active={$theme === id}
      onclick={() => theme.set(id)}
      role="radio"
      aria-checked={$theme === id}>{label}</button
    >
  {/each}
</div>

<style>
  .switcher {
    display: inline-flex;
    background: var(--panel-bg);
    border: 1px solid var(--node-border);
    border-radius: 8px;
    padding: 2px;
    font-size: 12px;
  }
  button {
    background: transparent;
    border: none;
    color: var(--text);
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 150ms;
  }
  button.active {
    opacity: 1;
    background: var(--node-bg);
  }
  button:hover {
    opacity: 1;
  }
</style>
