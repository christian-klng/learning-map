<script lang="ts">
  import { theme, type Theme } from '$lib/stores/theme';

  const themes: { id: Theme; label: string; icon: string }[] = [
    { id: 'space', label: 'Space', icon: '✦' },
    { id: 'light', label: 'Light', icon: '☀' }
  ];
</script>

<div class="switcher" role="radiogroup" aria-label="Theme">
  {#each themes as { id, label, icon }}
    <button
      class:active={$theme === id}
      onclick={() => theme.set(id)}
      role="radio"
      aria-checked={$theme === id}
      title={label}
    >
      <span class="icon">{icon}</span>
      <span class="label">{label}</span>
    </button>
  {/each}
</div>

<style>
  .switcher {
    display: inline-flex;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    padding: 2px;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.22);
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    color: var(--text);
    padding: 5px 10px;
    border-radius: 4px;
    font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 500;
    cursor: pointer;
    opacity: 0.55;
    transition: all 180ms ease;
  }
  button:hover {
    opacity: 0.85;
  }
  button.active {
    opacity: 1;
    background: var(--focus-ring);
    color: var(--bg-base);
  }
  .icon {
    font-size: 11px;
  }
</style>
