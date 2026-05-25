<script lang="ts">
  import { enterMode } from '$lib/stores/session';

  interface Props {
    role: 'student' | 'admin';
    suggestedName?: string;
    onClose: () => void;
    onSuccess?: () => void;
  }
  let { role, suggestedName = '', onClose, onSuccess }: Props = $props();

  let name = $state(suggestedName);
  let password = $state('');
  let err = $state<string | null>(null);
  let busy = $state(false);

  async function submit(e: Event) {
    e.preventDefault();
    if (busy) return;
    err = null;
    if (role === 'student' && !name.trim()) {
      err = 'Name is required';
      return;
    }
    if (!password) {
      err = 'Password is required';
      return;
    }
    busy = true;
    const result = await enterMode(role, password, name.trim());
    busy = false;
    if (result.ok) {
      onSuccess?.();
      onClose();
    } else {
      err = result.error;
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window on:keydown={onKey} />

<div class="overlay" onclick={onClose} role="presentation">
  <form class="dialog" onclick={(e) => e.stopPropagation()} onsubmit={submit}>
    <header>
      <p class="kicker">
        {role === 'admin' ? 'ADMIN MODE' : 'EDIT MODE'}
      </p>
      <h2>{role === 'admin' ? 'Unlock admin' : 'Join as editor'}</h2>
      <p class="sub">
        {role === 'admin'
          ? 'For the teacher. Lets you change the theme.'
          : 'Add planets, satellites, and connections. Your name shows on whatever you create.'}
      </p>
    </header>

    <label class="field">
      <span>{role === 'admin' ? 'NAME (OPTIONAL)' : 'YOUR NAME'}</span>
      <input
        type="text"
        bind:value={name}
        placeholder={role === 'admin' ? 'Teacher' : 'e.g. Sara'}
        autocomplete="off"
        maxlength="40"
      />
    </label>

    <label class="field">
      <span>PASSWORD</span>
      <input
        type="password"
        bind:value={password}
        autocomplete="current-password"
      />
    </label>

    {#if err}
      <p class="err">{err}</p>
    {/if}

    <div class="actions">
      <button type="button" class="ghost" onclick={onClose}>Cancel</button>
      <button type="submit" class="primary" disabled={busy}>
        {busy ? 'Checking…' : role === 'admin' ? 'Unlock admin' : 'Start editing'}
      </button>
    </div>
  </form>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: var(--modal-overlay);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: grid;
    place-items: center;
    z-index: 80;
    animation: fadeIn 200ms ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .dialog {
    width: min(420px, 92vw);
    background: var(--panel-bg);
    color: var(--text);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    padding: 28px 28px 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    backdrop-filter: blur(var(--panel-blur)) saturate(160%);
    -webkit-backdrop-filter: blur(var(--panel-blur)) saturate(160%);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.04) inset,
      0 28px 80px -16px rgba(0, 0, 0, 0.6);
    animation: rise 280ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes rise {
    from { transform: translateY(10px) scale(0.985); opacity: 0; }
    to   { transform: none; opacity: 1; }
  }
  header {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 4px;
  }
  .kicker {
    margin: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    letter-spacing: 0.18em;
    color: var(--planet-border);
    text-transform: uppercase;
  }
  h2 {
    margin: 0;
    font-family: 'Fraunces', ui-serif, Georgia, serif;
    font-weight: 500;
    font-size: 22px;
    letter-spacing: -0.01em;
  }
  .sub {
    margin: 0;
    color: var(--text-dim);
    font-size: 13px;
    line-height: 1.5;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field span {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.16em;
    color: var(--text-dim);
    font-weight: 500;
  }
  .field input {
    background: rgba(0, 0, 0, 0.15);
    border: 1px solid var(--panel-border);
    color: var(--text);
    font-family: inherit;
    font-size: 14px;
    padding: 10px 12px;
    border-radius: 3px;
    outline: none;
  }
  .field input:focus {
    border-color: var(--planet-border);
  }
  .err {
    margin: 0;
    color: #f87171;
    font-size: 13px;
  }
  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 4px;
  }
  .actions button {
    font-family: inherit;
    font-size: 13px;
    padding: 9px 16px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid var(--panel-border);
    background: transparent;
    color: var(--text);
    transition: all 150ms;
  }
  .actions button:hover {
    border-color: var(--text);
  }
  .actions .primary {
    background: var(--planet-border);
    color: var(--bg-base);
    border-color: var(--planet-border);
    font-weight: 600;
  }
  .actions .primary:hover {
    opacity: 0.9;
  }
  .actions .primary:disabled {
    opacity: 0.5;
    cursor: wait;
  }
</style>
