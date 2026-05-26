<script lang="ts">
  interface Props {
    sourceTitle: string;
    targetTitle: string;
    unlockDirection: 'source' | 'target' | null;
    x: number;
    y: number;
    onDirectionChange: (dir: 'source' | 'target' | null) => void;
    onDelete: () => void;
    onClose: () => void;
  }
  let {
    sourceTitle,
    targetTitle,
    unlockDirection,
    x,
    y,
    onDirectionChange,
    onDelete,
    onClose
  }: Props = $props();

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  function handleDelete() {
    if (confirm('Delete this connection?')) onDelete();
  }
</script>

<svelte:window on:keydown={onKey} />

<div class="popover-backdrop" onclick={onClose} role="presentation"></div>
<div
  class="popover"
  style="left: {x}px; top: {y}px"
  role="dialog"
  aria-label="Edge options"
>
  <div class="popover-header">
    <span class="popover-label">UNLOCK DIRECTION</span>
  </div>

  <div class="popover-options">
    <button
      class="popover-option"
      class:active={!unlockDirection}
      onclick={() => onDirectionChange(null)}
    >
      <span class="option-radio" class:checked={!unlockDirection}></span>
      <span>None</span>
    </button>
    <button
      class="popover-option"
      class:active={unlockDirection === 'source'}
      onclick={() => onDirectionChange('source')}
    >
      <span class="option-radio" class:checked={unlockDirection === 'source'}></span>
      <span class="option-text">{sourceTitle} <span class="arrow">→</span> {targetTitle}</span>
    </button>
    <button
      class="popover-option"
      class:active={unlockDirection === 'target'}
      onclick={() => onDirectionChange('target')}
    >
      <span class="option-radio" class:checked={unlockDirection === 'target'}></span>
      <span class="option-text">{targetTitle} <span class="arrow">→</span> {sourceTitle}</span>
    </button>
  </div>

  <div class="popover-divider"></div>

  <button class="popover-delete" onclick={handleDelete}>
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 4H11M5 4V2.5C5 2.22 5.22 2 5.5 2H8.5C8.78 2 9 2.22 9 2.5V4M4 4V11.5C4 11.78 4.22 12 4.5 12H9.5C9.78 12 10 11.78 10 11.5V4"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <span>Delete connection</span>
  </button>
</div>

<style>
  .popover-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
  }
  .popover {
    position: fixed;
    z-index: 41;
    transform: translate(-50%, -100%) translateY(-12px);
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    padding: 10px 0;
    min-width: 240px;
    max-width: 320px;
    backdrop-filter: blur(14px) saturate(160%);
    -webkit-backdrop-filter: blur(14px) saturate(160%);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.04) inset,
      0 20px 60px -12px rgba(0, 0, 0, 0.55),
      0 8px 24px -6px rgba(0, 0, 0, 0.35);
    animation: popIn 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes popIn {
    from { transform: translate(-50%, -100%) translateY(-8px) scale(0.95); opacity: 0; }
    to   { transform: translate(-50%, -100%) translateY(-12px); opacity: 1; }
  }
  .popover-header {
    padding: 2px 14px 8px;
  }
  .popover-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.18em;
    color: var(--text-dim);
  }
  .popover-options {
    display: flex;
    flex-direction: column;
  }
  .popover-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    background: transparent;
    border: none;
    color: var(--text);
    cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px;
    text-align: left;
    transition: background 120ms;
    width: 100%;
  }
  .popover-option:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .popover-option.active {
    background: rgba(255, 255, 255, 0.06);
  }
  .option-radio {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1.5px solid var(--text-dim);
    flex-shrink: 0;
    position: relative;
  }
  .option-radio.checked {
    border-color: var(--focus-ring);
  }
  .option-radio.checked::after {
    content: '';
    position: absolute;
    inset: 2.5px;
    border-radius: 50%;
    background: var(--focus-ring);
  }
  .option-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .arrow {
    color: var(--text-dim);
    font-size: 11px;
  }
  .popover-divider {
    height: 1px;
    background: var(--panel-border);
    margin: 6px 0;
  }
  .popover-delete {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: transparent;
    border: none;
    color: #ef4444;
    cursor: pointer;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.06em;
    transition: background 120ms;
    width: 100%;
  }
  .popover-delete:hover {
    background: rgba(239, 68, 68, 0.08);
  }
</style>
