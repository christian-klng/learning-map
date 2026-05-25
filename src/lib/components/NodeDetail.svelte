<script lang="ts">
  import { marked } from 'marked';
  import {
    PLANET_PALETTE,
    PLANET_DESIGNS,
    planetBgImage,
    type PlanetDesign
  } from '$lib/graph/visual';

  marked.setOptions({ gfm: true, breaks: true });

  type ElementBox = {
    id: string;
    title: string;
    type: string;
    content: any;
    createdBy?: string | null;
    updatedBy?: string | null;
  };
  type PlanetMeta = { color: string; design: PlanetDesign };

  interface Props {
    planet: ElementBox;
    planetMeta?: PlanetMeta;
    satellites: ElementBox[];
    onClose: () => void;
    onUpdate?: (node: ElementBox) => void;
    onDelete?: (id: string) => void;
    onAdd?: (node: ElementBox) => void;
    onPlanetDelete?: (id: string) => void;
    onMetadataChange?: (patch: Partial<PlanetMeta>) => void;
    startInEdit?: boolean;
    canEdit?: boolean;
  }
  let {
    planet,
    planetMeta,
    satellites,
    onClose,
    onUpdate,
    onDelete,
    onAdd,
    onPlanetDelete,
    onMetadataChange,
    startInEdit = false,
    canEdit = false
  }: Props = $props();

  let editing = $state(startInEdit && canEdit);
  $effect(() => {
    // Drop out of edit mode if the session loses editing rights mid-modal
    if (!canEdit && editing) editing = false;
  });

  function authorTooltip(box: ElementBox): string | undefined {
    const c = box.createdBy?.trim();
    const u = box.updatedBy?.trim();
    if (!c && !u) return undefined;
    if (c && u && u !== c) return `by ${c} · last edit ${u}`;
    return c ? `by ${c}` : `last edit ${u}`;
  }

  const boxes = $derived<ElementBox[]>([planet, ...satellites]);

  // NOTE: input is trusted (DB-seeded). When user-authored markdown lands in a later
  // phase, wrap with DOMPurify before {@html}.
  function renderMarkdown(src: string | undefined): string {
    if (!src) return '';
    return marked.parse(src) as string;
  }

  function stop(e: Event) {
    e.stopPropagation();
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && !editing) onClose();
  }

  // -------- mutations --------
  async function patchNode(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/nodes/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function saveTitle(box: ElementBox, value: string) {
    if (value === (box.title ?? '')) return;
    const updated = await patchNode(box.id, { title: value });
    onUpdate?.({ ...box, title: updated.title ?? '' });
  }

  async function saveContent(box: ElementBox, content: any) {
    const updated = await patchNode(box.id, { content });
    onUpdate?.({ ...box, content: updated.content });
  }

  async function deleteBox(box: ElementBox) {
    const isPlanet = box.id === planet.id;
    const msg = isPlanet
      ? `Delete "${box.title}" and all its satellites?`
      : `Delete "${box.title}"?`;
    if (!confirm(msg)) return;
    const res = await fetch(`/api/nodes/${box.id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Failed to delete: ' + (await res.text()));
      return;
    }
    if (isPlanet) onPlanetDelete?.(box.id);
    else onDelete?.(box.id);
  }

  let uploading = $state(false);

  async function uploadFile(
    file: File
  ): Promise<{ url: string; filename: string; mime: string; size: number }> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/uploads', { method: 'POST', body: form });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function onImagePick(box: ElementBox, ev: Event) {
    const input = ev.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    uploading = true;
    try {
      const up = await uploadFile(file);
      await saveContent(box, { ...box.content, url: up.url });
    } catch (e) {
      alert('Upload failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      uploading = false;
      input.value = ''; // allow re-uploading the same file
    }
  }

  async function onFilePick(box: ElementBox, ev: Event) {
    const input = ev.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    uploading = true;
    try {
      const up = await uploadFile(file);
      await saveContent(box, {
        ...box.content,
        url: up.url,
        filename: up.filename,
        mime: up.mime,
        size: up.size
      });
      if (!box.title.trim()) await saveTitle(box, up.filename);
    } catch (e) {
      alert('Upload failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      uploading = false;
      input.value = '';
    }
  }

  async function createSatellite(type: 'note' | 'image' | 'iframe' | 'file') {
    const defaults = {
      note: { title: 'New note', content: { body: '' } },
      image: { title: '', content: { url: '', alt: '' } },
      iframe: { title: 'External page', content: { url: '' } },
      file: { title: 'File', content: { url: '', filename: '', mime: '', size: 0 } }
    }[type];

    const res = await fetch('/api/nodes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, parentId: planet.id, ...defaults })
    });
    if (!res.ok) {
      alert('Failed to create: ' + (await res.text()));
      return;
    }
    const node = await res.json();
    onAdd?.({
      id: node.id,
      title: node.title ?? '',
      type: node.type,
      content: node.content
    });
  }
</script>

<svelte:window on:keydown={onKey} />

<div class="overlay" onclick={onClose} role="presentation">
  <article
    class="journal"
    onclick={stop}
    role="dialog"
    aria-modal="true"
    aria-label={planet.title}
    tabindex="-1"
    style="--planet-accent: {planetMeta?.color ?? '#6366f1'}"
  >
    <!-- thin vertical ribbon in the planet's color, like a bookmark -->
    <div class="ribbon"></div>

    <header class="masthead">
      <div class="ident">
        {#if planetMeta}
          <div
            class="planet-mark"
            style="background-image: url(&quot;{planetBgImage(planetMeta.color, planetMeta.design)}&quot;)"
            aria-hidden="true"
          ></div>
        {/if}
        <div class="title-block">
          {#if editing}
            <input
              class="title-input"
              value={planet.title}
              onblur={(e) => saveTitle(planet, e.currentTarget.value)}
              placeholder="Untitled"
            />
          {:else}
            <h1 class="title">{planet.title || 'Untitled'}</h1>
          {/if}
        </div>
      </div>

      <div class="controls">
        {#if canEdit}
          <button
            class="control"
            class:active={editing}
            onclick={() => (editing = !editing)}
            aria-label={editing ? 'Done editing' : 'Edit'}
            title={editing ? 'Done' : 'Edit'}
          >
            {#if editing}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 7L6 10L11 4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            {:else}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M9 2L12 5L5 12L2 12L2 9L9 2Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                />
              </svg>
            {/if}
          </button>
        {/if}
        <button class="control" onclick={onClose} aria-label="Close" title="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </header>

    {#if editing && planetMeta}
      <div class="picker">
        <div class="picker-group">
          <span class="picker-label">PALETTE</span>
          <div class="picker-items">
            {#each PLANET_PALETTE as color (color)}
              <button
                class="swatch"
                class:active={planetMeta.color.toLowerCase() === color.toLowerCase()}
                style="background: {color}"
                onclick={() => onMetadataChange?.({ color })}
                aria-label="Use color {color}"
                title={color}
              ></button>
            {/each}
          </div>
        </div>
        <div class="picker-divider"></div>
        <div class="picker-group">
          <span class="picker-label">SURFACE</span>
          <div class="picker-items">
            {#each PLANET_DESIGNS as design (design)}
              <button
                class="design-btn"
                class:active={planetMeta.design === design}
                onclick={() => onMetadataChange?.({ design })}
                aria-label="Use {design} design"
                title={design}
                style="background-image: url(&quot;{planetBgImage(planetMeta.color, design)}&quot;); background-size: cover; background-position: center;"
              ></button>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <div class="rule">
      <span class="rule-tick"></span>
      <span class="rule-line"></span>
      <span class="rule-tick"></span>
    </div>

    <div class="entries">
      {#each boxes as box (box.id)}
        <article class="entry" data-type={box.type} title={authorTooltip(box)}>
          {#if editing && box.title && box.type !== 'image' && box.type !== 'note'}
            <input
              class="entry-title-input"
              value={box.title}
              placeholder="Title"
              onblur={(e) => saveTitle(box, e.currentTarget.value)}
            />
          {:else if !editing && box.title && box.type !== 'image' && box.type !== 'note'}
            <h2 class="entry-title">{box.title}</h2>
          {/if}

          <div class="entry-body">
            {#if box.type === 'note'}
              {#if editing}
                <textarea
                  class="md-edit"
                  value={box.content?.body ?? ''}
                  placeholder="# Heading

Write markdown here. Lists, **bold**, *italic*, [links](url), `code` all work."
                  onblur={(e) => saveContent(box, { body: e.currentTarget.value })}
                ></textarea>
              {:else}
                <div class="note">{@html renderMarkdown(box.content?.body)}</div>
              {/if}
            {:else if box.type === 'image'}
              {#if editing}
                <label class="upload-btn" class:busy={uploading}>
                  <span>{uploading ? 'UPLOADING…' : 'UPLOAD IMAGE'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onchange={(e) => onImagePick(box, e)}
                  />
                </label>
                <label class="field">
                  <span>OR PASTE A URL</span>
                  <input
                    value={box.content?.url ?? ''}
                    placeholder="https://…"
                    onblur={(e) =>
                      saveContent(box, { ...box.content, url: e.currentTarget.value })}
                  />
                </label>
                <label class="field">
                  <span>ALT TEXT</span>
                  <input
                    value={box.content?.alt ?? ''}
                    placeholder="Describes the image"
                    onblur={(e) =>
                      saveContent(box, { ...box.content, alt: e.currentTarget.value })}
                  />
                </label>
                <label class="field">
                  <span>SOURCE / CAPTION</span>
                  <input
                    value={box.title}
                    placeholder="Photographer / source"
                    onblur={(e) => saveTitle(box, e.currentTarget.value)}
                  />
                </label>
                {#if box.content?.url}
                  <img src={box.content.url} alt={box.content?.alt ?? ''} />
                {/if}
              {:else}
                <img src={box.content?.url} alt={box.content?.alt ?? box.title ?? ''} />
                {#if box.content?.caption}
                  <p class="caption">{box.content.caption}</p>
                {/if}
                {#if box.title}
                  <p class="source"><span class="source-mark">—</span> {box.title}</p>
                {/if}
              {/if}
            {:else if box.type === 'iframe'}
              {#if editing}
                <label class="field">
                  <span>URL</span>
                  <input
                    value={box.content?.url ?? ''}
                    placeholder="https://…"
                    onblur={(e) =>
                      saveContent(box, { ...box.content, url: e.currentTarget.value })}
                  />
                </label>
                {#if box.content?.url}
                  <iframe
                    src={box.content?.url}
                    title={box.title}
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    loading="lazy"
                  ></iframe>
                {/if}
              {:else}
                <iframe
                  src={box.content?.url}
                  title={box.title}
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  loading="lazy"
                ></iframe>
                <a class="external" href={box.content?.url} target="_blank" rel="noopener">
                  Open in new tab →
                </a>
              {/if}
            {:else if box.type === 'file'}
              {#if editing}
                <label class="upload-btn" class:busy={uploading}>
                  <span>{uploading ? 'UPLOADING…' : 'UPLOAD FILE'}</span>
                  <input
                    type="file"
                    disabled={uploading}
                    onchange={(e) => onFilePick(box, e)}
                  />
                </label>
                <label class="field">
                  <span>OR PASTE A URL</span>
                  <input
                    value={box.content?.url ?? ''}
                    placeholder="https://…"
                    onblur={(e) =>
                      saveContent(box, { ...box.content, url: e.currentTarget.value })}
                  />
                </label>
                <label class="field">
                  <span>FILENAME</span>
                  <input
                    value={box.content?.filename ?? ''}
                    placeholder="example.pdf"
                    onblur={(e) =>
                      saveContent(box, { ...box.content, filename: e.currentTarget.value })}
                  />
                </label>
              {:else}
                <a class="download" href={box.content?.url} download={box.content?.filename}>
                  <div class="download-glyph">↓</div>
                  <div class="download-meta">
                    <div class="download-name">{box.content?.filename}</div>
                    <div class="download-size">
                      {Math.round((box.content?.size ?? 0) / 1024)} KB · click to download
                    </div>
                  </div>
                </a>
              {/if}
            {:else}
              <pre>{JSON.stringify(box.content, null, 2)}</pre>
            {/if}
          </div>

          {#if editing}
            <button
              class="entry-delete"
              onclick={() => deleteBox(box)}
              aria-label="Delete element"
              title="Delete"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 4H11M5 4V2.5C5 2.22 5.22 2 5.5 2H8.5C8.78 2 9 2.22 9 2.5V4M4 4V11.5C4 11.78 4.22 12 4.5 12H9.5C9.78 12 10 11.78 10 11.5V4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          {/if}
        </article>
      {/each}

      {#if editing}
        <article class="entry add-entry">
          <p class="add-prompt">APPEND AN ELEMENT</p>
          <div class="type-grid">
            <button onclick={() => createSatellite('note')}>
              <span class="type-glyph">¶</span>
              <span>Note</span>
            </button>
            <button onclick={() => createSatellite('image')}>
              <span class="type-glyph">◐</span>
              <span>Image</span>
            </button>
            <button onclick={() => createSatellite('iframe')}>
              <span class="type-glyph">↗</span>
              <span>External</span>
            </button>
            <button onclick={() => createSatellite('file')}>
              <span class="type-glyph">▤</span>
              <span>File</span>
            </button>
          </div>
        </article>
      {/if}
    </div>
  </article>
</div>

<style>
  /* ===== Overlay & journal frame ===== */
  .overlay {
    position: fixed;
    inset: 0;
    background: var(--modal-overlay);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: grid;
    place-items: center;
    z-index: 50;
    padding: 32px;
    animation: fadeIn 240ms ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .journal {
    position: relative;
    width: min(1180px, 92vw);
    max-height: min(880px, 90vh);
    background: var(--panel-bg);
    color: var(--text);
    border: 1px solid var(--panel-border);
    border-radius: 6px; /* squarer than before — more "page" than "card" */
    overflow: hidden;
    backdrop-filter: blur(var(--panel-blur)) saturate(160%);
    -webkit-backdrop-filter: blur(var(--panel-blur)) saturate(160%);
    display: flex;
    flex-direction: column;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.04) inset,
      0 40px 120px -20px rgba(0, 0, 0, 0.65),
      0 14px 40px -10px rgba(0, 0, 0, 0.45);
    animation: rise 360ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes rise {
    from { transform: translateY(14px) scale(0.985); opacity: 0; }
    to   { transform: none; opacity: 1; }
  }
  .ribbon {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 4px;
    background: var(--planet-accent);
    box-shadow: 0 0 18px var(--planet-accent);
    opacity: 0.85;
  }

  /* ===== Masthead (header) ===== */
  .masthead {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding: 28px 36px 22px;
    flex-shrink: 0;
  }
  .ident {
    display: flex;
    gap: 18px;
    align-items: flex-start;
    min-width: 0;
    flex: 1;
  }
  .planet-mark {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background-size: cover;
    background-position: center;
    flex-shrink: 0;
    border: 1px solid var(--panel-border);
    box-shadow: 0 4px 14px -4px rgba(0, 0, 0, 0.5);
    margin-top: 6px;
  }
  .title-block { min-width: 0; flex: 1; }
  .title {
    margin: 0;
    font-family: 'Fraunces', ui-serif, Georgia, serif;
    font-optical-sizing: auto;
    font-weight: 500;
    font-size: clamp(28px, 3.4vw, 42px);
    line-height: 1.05;
    letter-spacing: -0.015em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .title-input {
    background: transparent;
    border: none;
    border-bottom: 1px dashed var(--panel-border);
    color: var(--text);
    font-family: 'Fraunces', ui-serif, Georgia, serif;
    font-weight: 500;
    font-size: clamp(28px, 3.4vw, 42px);
    line-height: 1.05;
    letter-spacing: -0.015em;
    padding: 2px 0;
    width: 100%;
    outline: none;
  }
  .title-input:focus {
    border-bottom-color: var(--planet-accent);
  }

  .controls {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
  .control {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--text);
    cursor: pointer;
    opacity: 0.55;
    transition: all 150ms;
  }
  .control:hover {
    opacity: 1;
    border-color: var(--panel-border);
  }
  .control.active {
    opacity: 1;
    color: var(--planet-accent);
    border-color: var(--planet-accent);
  }

  /* ===== Picker bar ===== */
  .picker {
    display: flex;
    gap: 24px;
    align-items: center;
    padding: 14px 36px 16px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  .picker-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .picker-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.18em;
    color: var(--text-dim);
  }
  .picker-items {
    display: flex;
    gap: 6px;
  }
  .picker-divider {
    width: 1px;
    height: 24px;
    background: var(--panel-border);
  }
  .swatch {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1.5px solid transparent;
    cursor: pointer;
    padding: 0;
    transition: transform 130ms, border-color 130ms;
  }
  .swatch:hover { transform: scale(1.12); }
  .swatch.active {
    border-color: var(--text);
    box-shadow: 0 0 0 2px var(--panel-bg), 0 0 0 3.5px var(--text);
  }
  .design-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1.5px solid transparent;
    cursor: pointer;
    padding: 0;
    background-repeat: no-repeat;
    transition: transform 130ms, border-color 130ms;
  }
  .design-btn:hover { transform: scale(1.1); }
  .design-btn.active {
    border-color: var(--text);
    box-shadow: 0 0 0 2px var(--panel-bg), 0 0 0 3.5px var(--text);
  }

  /* ===== Decorative rule ===== */
  .rule {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 36px;
    margin-bottom: 8px;
    flex-shrink: 0;
  }
  .rule-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, var(--panel-border), var(--planet-accent) 50%, var(--panel-border));
    opacity: 0.6;
  }
  .rule-tick {
    width: 6px;
    height: 6px;
    border: 1px solid var(--panel-border);
    background: var(--planet-accent);
    transform: rotate(45deg);
    flex-shrink: 0;
  }

  /* ===== Entries grid ===== */
  .entries {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: 1fr;
    gap: 22px;
    padding: 22px 36px 36px;
    overflow: auto;
    flex: 1;
    min-height: 0;
  }
  /* Solo element fills the modal */
  .entries:has(.entry:only-child) {
    grid-template-columns: 1fr;
  }
  /* An orphan last item (sitting alone in its row) spans both columns —
     keeps every "slide" balanced regardless of count. */
  .entry:nth-child(odd):last-child:not(:only-child) {
    grid-column: 1 / -1;
  }
  .entry {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 22px 22px 22px 22px;
    background: rgba(255, 255, 255, 0.018);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    min-height: 260px;
    transition: background 200ms, border-color 200ms;
    animation: entryIn 420ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }
  /* Stagger entry reveal */
  .entry:nth-child(1) { animation-delay: 100ms; }
  .entry:nth-child(2) { animation-delay: 180ms; }
  .entry:nth-child(3) { animation-delay: 260ms; }
  .entry:nth-child(4) { animation-delay: 340ms; }
  .entry:nth-child(5) { animation-delay: 420ms; }
  .entry:nth-child(6) { animation-delay: 500ms; }
  .entry:nth-child(n+7) { animation-delay: 580ms; }
  @keyframes entryIn {
    from { transform: translateY(8px); opacity: 0; }
    to   { transform: none; opacity: 1; }
  }
  .entry-title {
    margin: 0;
    font-family: 'Fraunces', ui-serif, Georgia, serif;
    font-weight: 600;
    font-size: 18px;
    letter-spacing: -0.005em;
    line-height: 1.2;
  }
  .entry-title-input {
    background: transparent;
    border: none;
    border-bottom: 1px dashed var(--panel-border);
    color: var(--text);
    font-family: 'Fraunces', ui-serif, Georgia, serif;
    font-weight: 600;
    font-size: 18px;
    line-height: 1.2;
    padding: 2px 0;
    width: 100%;
    outline: none;
  }
  .entry-title-input:focus { border-bottom-color: var(--planet-accent); }

  .entry-body {
    flex: 1;
    overflow: auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;
  }

  .entry-delete {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--text-dim);
    cursor: pointer;
    opacity: 0;
    transition: all 150ms;
  }
  .entry:hover .entry-delete {
    opacity: 0.85;
  }
  .entry-delete:hover {
    opacity: 1;
    border-color: var(--panel-border);
    color: var(--text);
  }

  /* ===== Note (markdown) ===== */
  .note {
    font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.7;
    color: var(--text);
    opacity: 0.94;
  }
  .note :global(h1) {
    font-family: 'Fraunces', ui-serif, Georgia, serif;
    font-weight: 500;
    font-size: 24px;
    margin: 0 0 14px;
    letter-spacing: -0.01em;
    line-height: 1.1;
  }
  .note :global(h2) {
    font-family: 'Fraunces', ui-serif, Georgia, serif;
    font-weight: 500;
    font-size: 17px;
    margin: 20px 0 8px;
    line-height: 1.2;
  }
  .note :global(h3) {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    margin: 18px 0 6px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--text-dim);
  }
  .note :global(p) {
    margin: 0 0 12px;
  }
  .note :global(p:last-child) {
    margin-bottom: 0;
  }
  /* Drop cap on the opening paragraph for editorial flair */
  .note :global(> p:first-of-type::first-letter),
  .note :global(> h1:first-of-type + p::first-letter) {
    font-family: 'Fraunces', ui-serif, Georgia, serif;
    font-size: 2.6em;
    line-height: 0.9;
    float: left;
    margin: 4px 8px 0 0;
    color: var(--planet-accent);
    font-weight: 600;
  }
  .note :global(ul),
  .note :global(ol) {
    margin: 0 0 12px;
    padding-left: 22px;
  }
  .note :global(li) { margin: 3px 0; }
  .note :global(a) {
    color: var(--planet-accent);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }
  .note :global(a:hover) { text-decoration-thickness: 2px; }
  .note :global(strong) { font-weight: 600; }
  .note :global(em) { font-style: italic; }
  .note :global(code) {
    background: rgba(255, 255, 255, 0.06);
    padding: 1px 6px;
    border-radius: 3px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
  }
  .note :global(pre) {
    background: var(--bg-base);
    padding: 12px 14px;
    border-radius: 4px;
    overflow: auto;
    margin: 10px 0;
    font-size: 12px;
    line-height: 1.55;
    font-family: 'IBM Plex Mono', monospace;
  }
  .note :global(pre code) {
    background: none;
    padding: 0;
  }
  .note :global(blockquote) {
    border-left: 2px solid var(--planet-accent);
    margin: 12px 0;
    padding: 2px 14px;
    color: var(--text-dim);
    font-family: 'Fraunces', ui-serif, Georgia, serif;
    font-style: italic;
    font-size: 15px;
  }
  .note :global(hr) {
    border: none;
    border-top: 1px solid var(--panel-border);
    margin: 16px 0;
  }
  .note :global(img) {
    max-width: 100%;
    border-radius: 4px;
    display: block;
    margin: 10px 0;
  }

  /* ===== Image, iframe, file ===== */
  img {
    width: 100%;
    height: auto;
    max-height: 100%;
    object-fit: contain;
    border-radius: 3px;
    display: block;
  }
  .caption {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px;
    color: var(--text-dim);
    margin: 8px 0 0;
    font-style: italic;
  }
  .source {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.04em;
    margin: 8px 0 0;
    display: flex;
    gap: 6px;
  }
  .source-mark {
    color: var(--planet-accent);
  }
  iframe {
    width: 100%;
    flex: 1;
    min-height: 220px;
    border: 1px solid var(--panel-border);
    border-radius: 3px;
    background: var(--bg-base);
  }
  .external {
    align-self: flex-start;
    margin-top: 8px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--planet-accent);
    text-decoration: none;
    border-bottom: 1px solid var(--planet-accent);
    padding-bottom: 2px;
  }
  .external:hover {
    opacity: 0.7;
  }
  .download {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 20px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    text-decoration: none;
    color: var(--text);
    transition: transform 150ms, background 150ms, border-color 150ms;
  }
  .download:hover {
    transform: translateY(-1px);
    border-color: var(--planet-accent);
  }
  .download-glyph {
    font-family: 'Fraunces', serif;
    font-size: 32px;
    line-height: 1;
    color: var(--planet-accent);
    font-weight: 400;
  }
  .download-name {
    font-family: 'Fraunces', serif;
    font-weight: 500;
    font-size: 16px;
  }
  .download-size {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
    margin-top: 4px;
    letter-spacing: 0.04em;
  }
  pre {
    background: var(--bg-base);
    padding: 10px;
    border-radius: 4px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    overflow: auto;
    margin: 0;
  }

  /* ===== Editor fields ===== */
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
  .field input,
  .md-edit {
    background: rgba(0, 0, 0, 0.15);
    border: 1px solid var(--panel-border);
    color: var(--text);
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13.5px;
    padding: 9px 11px;
    border-radius: 3px;
    outline: none;
    width: 100%;
  }
  .field input:focus,
  .md-edit:focus {
    border-color: var(--planet-accent);
  }
  .md-edit {
    flex: 1;
    min-height: 200px;
    resize: vertical;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    line-height: 1.6;
  }

  /* ===== Upload button (label wraps a hidden <input type=file>) ===== */
  .upload-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1.5px dashed var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
    transition: all 150ms;
  }
  .upload-btn:hover {
    border-color: var(--planet-accent);
    background: rgba(255, 255, 255, 0.05);
  }
  .upload-btn.busy {
    cursor: wait;
    opacity: 0.7;
  }
  .upload-btn span {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.16em;
    color: var(--planet-accent);
    font-weight: 500;
  }
  .upload-btn input[type='file'] {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    width: 100%;
    height: 100%;
  }
  .upload-btn input[type='file']:disabled {
    cursor: wait;
  }

  /* ===== Add entry card ===== */
  .add-entry {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    border-style: dashed;
    background: transparent;
  }
  .add-prompt {
    margin: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    letter-spacing: 0.18em;
    color: var(--text-dim);
    text-transform: uppercase;
  }
  .type-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    width: 80%;
  }
  .type-grid button {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.03);
    color: var(--text);
    border: 1px solid var(--panel-border);
    border-radius: 3px;
    padding: 10px 14px;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 12.5px;
    cursor: pointer;
    transition: all 150ms;
  }
  .type-grid button:hover {
    border-color: var(--planet-accent);
    transform: translateY(-1px);
  }
  .type-glyph {
    font-family: 'Fraunces', serif;
    font-size: 18px;
    color: var(--planet-accent);
    width: 18px;
    text-align: center;
  }

  /* ===== Responsive ===== */
  @media (max-width: 720px) {
    .entries { grid-template-columns: 1fr; padding: 18px 22px 22px; }
    .masthead { padding: 20px 22px 16px; }
    .picker { padding: 12px 22px 14px; }
    .rule { padding: 0 22px; }
  }
</style>
