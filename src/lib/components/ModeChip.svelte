<script lang="ts">
  import { session, exitMode } from '$lib/stores/session';
  import PasswordDialog from './PasswordDialog.svelte';

  let open = $state(false);
  let dialog = $state<null | 'student' | 'admin'>(null);

  function close() {
    open = false;
  }
  function onWinClick() {
    open = false;
  }

  // Snapshot the current name so a student who locks → re-enters doesn't have to retype it
  let lastName = $state<string>('');
  $effect(() => {
    if ($session.name) lastName = $session.name;
  });

  function label(): string {
    if ($session.role === 'admin') return $session.name || 'Admin';
    if ($session.role === 'student') return $session.name || 'Editor';
    return 'Viewing';
  }

  function icon(): string {
    if ($session.role === 'admin') return '★';
    if ($session.role === 'student') return '✎';
    return '◦';
  }
</script>

<svelte:window onclick={onWinClick} />

<div class="wrap" onclick={(e) => e.stopPropagation()} role="presentation">
  <button
    class="chip"
    class:role-student={$session.role === 'student'}
    class:role-admin={$session.role === 'admin'}
    onclick={() => (open = !open)}
    aria-expanded={open}
    title="Switch mode"
  >
    <span class="icon">{icon()}</span>
    <span class="label">{label()}</span>
    <span class="chev" aria-hidden="true">▾</span>
  </button>

  {#if open}
    <div class="menu" role="menu">
      {#if $session.role !== 'view'}
        <button class="item" onclick={() => { exitMode(); close(); }}>
          <span class="item-icon">◦</span>
          <div>
            <div class="item-title">Lock to view</div>
            <div class="item-sub">Read-only, no edit affordances</div>
          </div>
        </button>
      {/if}
      {#if $session.role !== 'student'}
        <button class="item" onclick={() => { dialog = 'student'; close(); }}>
          <span class="item-icon">✎</span>
          <div>
            <div class="item-title">Enter edit mode</div>
            <div class="item-sub">For students — add, edit, connect</div>
          </div>
        </button>
      {/if}
      {#if $session.role !== 'admin'}
        <button class="item" onclick={() => { dialog = 'admin'; close(); }}>
          <span class="item-icon">★</span>
          <div>
            <div class="item-title">Enter admin mode</div>
            <div class="item-sub">For teacher — adds theme control</div>
          </div>
        </button>
      {/if}
    </div>
  {/if}
</div>

{#if dialog}
  <PasswordDialog role={dialog} suggestedName={lastName} onClose={() => (dialog = null)} />
{/if}

<style>
  .wrap {
    position: relative;
    display: inline-block;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    color: var(--text);
    border-radius: 6px;
    padding: 6px 11px 6px 10px;
    font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10.5px;
    letter-spacing: 0.08em;
    font-weight: 500;
    cursor: pointer;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.25);
    transition: all 180ms ease;
  }
  .chip:hover {
    border-color: var(--text);
  }
  .chip.role-student {
    border-color: var(--focus-ring);
    box-shadow: 0 0 0 1px var(--focus-ring), 0 4px 18px -4px rgba(0, 0, 0, 0.3);
  }
  .chip.role-admin {
    background: var(--focus-ring);
    color: var(--bg-base);
    border-color: var(--focus-ring);
  }
  .icon {
    font-size: 13px;
    line-height: 1;
  }
  .label {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chev {
    font-size: 9px;
    opacity: 0.6;
    margin-left: 2px;
  }
  .menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 280px;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    backdrop-filter: blur(14px) saturate(160%);
    -webkit-backdrop-filter: blur(14px) saturate(160%);
    box-shadow: 0 18px 50px -12px rgba(0, 0, 0, 0.5);
    z-index: 30;
    animation: menuIn 160ms ease-out;
  }
  @keyframes menuIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: none; }
  }
  .item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 11px 13px;
    background: transparent;
    border: none;
    color: var(--text);
    text-align: left;
    border-radius: 4px;
    cursor: pointer;
    font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;
    transition: background 140ms;
  }
  .item:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .item-icon {
    font-family: 'Fraunces', serif;
    font-size: 16px;
    width: 18px;
    text-align: center;
    color: var(--focus-ring);
    font-weight: 500;
  }
  .item-title {
    font-family: 'Fraunces', serif;
    font-size: 14px;
    font-weight: 500;
  }
  .item-sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    margin-top: 3px;
    text-transform: uppercase;
  }
</style>
