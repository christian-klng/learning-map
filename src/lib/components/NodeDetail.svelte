<script lang="ts">
  import { marked } from 'marked';

  marked.setOptions({ gfm: true, breaks: true });

  interface ElementBox {
    id: string;
    title: string;
    type: string;
    content: any;
  }

  // NOTE: input is trusted (DB-seeded by you). When user-authored markdown lands
  // in a later phase, wrap with DOMPurify before {@html}.
  function renderMarkdown(src: string | undefined): string {
    if (!src) return '';
    return marked.parse(src) as string;
  }

  interface Props {
    planet: ElementBox;
    satellites: ElementBox[];
    onClose: () => void;
  }
  let { planet, satellites, onClose }: Props = $props();

  // Planet's own content is the first box; each satellite is its own box.
  const boxes = $derived<ElementBox[]>([planet, ...satellites]);

  // Max 2 columns. Single element fills the modal.
  const cols = $derived(boxes.length <= 1 ? 1 : 2);

  function stop(e: Event) {
    e.stopPropagation();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window on:keydown={onKey} />

<div class="overlay" onclick={onClose} role="presentation">
  <div
    class="modal"
    onclick={stop}
    role="dialog"
    aria-modal="true"
    aria-label={planet.title}
    tabindex="-1"
  >
    <header>
      <h2>{planet.title}</h2>
      <button class="close" onclick={onClose} aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M2 2L12 12M12 2L2 12"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </header>

    <div class="grid" style="--cols: {cols}">
      {#each boxes as box (box.id)}
        <article class="card" data-type={box.type}>
          {#if box.title && box.type !== 'image' && box.type !== 'note'}
            <div class="card-header">
              <h3>{box.title}</h3>
            </div>
          {/if}

          <div class="card-body">
            {#if box.type === 'note'}
              <div class="note">{@html renderMarkdown(box.content?.body)}</div>
            {:else if box.type === 'image'}
              <img src={box.content?.url} alt={box.content?.alt ?? box.title ?? ''} />
              {#if box.content?.caption}
                <p class="caption">{box.content.caption}</p>
              {/if}
              {#if box.title}
                <p class="source">{box.title}</p>
              {/if}
            {:else if box.type === 'iframe'}
              <iframe
                src={box.content?.url}
                title={box.title}
                sandbox="allow-scripts allow-same-origin allow-popups"
                loading="lazy"
              ></iframe>
              <a class="external" href={box.content?.url} target="_blank" rel="noopener">
                Open ↗
              </a>
            {:else if box.type === 'file'}
              <a class="download" href={box.content?.url} download={box.content?.filename}>
                <div class="file-icon">📄</div>
                <div>
                  <div class="file-name">{box.content?.filename}</div>
                  <div class="file-meta">{Math.round((box.content?.size ?? 0) / 1024)} KB</div>
                </div>
              </a>
            {:else}
              <pre>{JSON.stringify(box.content, null, 2)}</pre>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(5, 6, 26, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: grid;
    place-items: center;
    z-index: 50;
    padding: 32px;
    animation: fadeIn 220ms ease-out;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  .modal {
    width: min(1200px, 92vw);
    max-height: min(880px, 90vh);
    background: var(--panel-bg);
    color: var(--text);
    border: 1px solid var(--panel-border);
    border-radius: 18px;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.04) inset,
      0 32px 96px -16px rgba(0, 0, 0, 0.6),
      0 12px 32px -8px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(var(--panel-blur)) saturate(140%);
    -webkit-backdrop-filter: blur(var(--panel-blur)) saturate(140%);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: pop 280ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes pop {
    from {
      transform: scale(0.96);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px;
    border-bottom: 1px solid var(--panel-border);
    flex-shrink: 0;
  }
  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .close {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--text);
    cursor: pointer;
    opacity: 0.6;
    transition: all 150ms;
    flex-shrink: 0;
  }
  .close:hover {
    opacity: 1;
    background: var(--panel-border);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    grid-auto-rows: 1fr;
    gap: 16px;
    padding: 20px 24px 24px;
    overflow: auto;
    flex: 1;
    min-height: 0;
  }
  /* Single-element layout fills the modal */
  .grid:has(.card:only-child) {
    grid-auto-rows: minmax(0, 1fr);
  }

  .card {
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--panel-border);
    border-radius: 12px;
    overflow: hidden;
    min-height: 240px;
  }
  .card-header {
    padding: 12px 14px 8px;
    flex-shrink: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .card-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.3;
  }
  .card-body {
    padding: 12px 14px 14px;
    flex: 1;
    overflow: auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* Per-type body styling */
  .note {
    font-size: 13.5px;
    line-height: 1.6;
    opacity: 0.94;
  }
  .note :global(h1) {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 12px;
    letter-spacing: -0.01em;
  }
  .note :global(h2) {
    font-size: 15px;
    font-weight: 600;
    margin: 16px 0 8px;
  }
  .note :global(h3) {
    font-size: 13px;
    font-weight: 600;
    margin: 14px 0 6px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-dim);
  }
  .note :global(p) {
    margin: 0 0 10px;
  }
  .note :global(p:last-child) {
    margin-bottom: 0;
  }
  .note :global(ul),
  .note :global(ol) {
    margin: 0 0 10px;
    padding-left: 22px;
  }
  .note :global(li) {
    margin: 2px 0;
  }
  .note :global(a) {
    color: var(--focus-ring);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }
  .note :global(a:hover) {
    text-decoration-thickness: 2px;
  }
  .note :global(strong) {
    font-weight: 600;
  }
  .note :global(em) {
    font-style: italic;
  }
  .note :global(code) {
    background: rgba(255, 255, 255, 0.08);
    padding: 1px 5px;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
  }
  .note :global(pre) {
    background: var(--bg-base);
    padding: 10px 12px;
    border-radius: 8px;
    overflow: auto;
    margin: 8px 0;
    font-size: 12px;
    line-height: 1.5;
  }
  .note :global(pre code) {
    background: none;
    padding: 0;
  }
  .note :global(blockquote) {
    border-left: 3px solid var(--panel-border);
    margin: 8px 0;
    padding: 2px 12px;
    color: var(--text-dim);
    font-style: italic;
  }
  .note :global(hr) {
    border: none;
    border-top: 1px solid var(--panel-border);
    margin: 14px 0;
  }
  .note :global(img) {
    max-width: 100%;
    border-radius: 8px;
    display: block;
    margin: 8px 0;
  }
  img {
    width: 100%;
    height: auto;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
    display: block;
  }
  .caption {
    font-size: 12px;
    color: var(--text-dim);
    margin: 8px 0 0;
    font-style: italic;
  }
  .source {
    font-size: 11px;
    color: var(--text-dim);
    margin: 6px 0 0;
    opacity: 0.75;
    letter-spacing: 0.01em;
  }
  iframe {
    width: 100%;
    flex: 1;
    min-height: 200px;
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    background: var(--bg-base);
  }
  .external {
    align-self: flex-end;
    margin-top: 8px;
    font-size: 12px;
    color: var(--focus-ring);
    text-decoration: none;
  }
  .external:hover {
    text-decoration: underline;
  }
  .download {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: var(--panel-border);
    border-radius: 10px;
    text-decoration: none;
    color: var(--text);
    transition: transform 150ms, background 150ms;
    align-self: stretch;
  }
  .download:hover {
    transform: translateY(-1px);
    background: var(--panel-bg);
  }
  .file-icon {
    font-size: 26px;
  }
  .file-name {
    font-weight: 600;
    font-size: 13px;
  }
  .file-meta {
    font-size: 11px;
    color: var(--text-dim);
    margin-top: 2px;
  }
  pre {
    background: var(--bg-base);
    padding: 10px;
    border-radius: 6px;
    font-size: 11px;
    overflow: auto;
    margin: 0;
  }

  /* Responsive: collapse to single column on narrow screens */
  @media (max-width: 720px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
