<script lang="ts">
  interface Props {
    node: { id: string; title: string; type: string; content: any };
    onClose: () => void;
  }
  let { node, onClose }: Props = $props();
</script>

<aside class="panel" role="dialog" aria-label={node.title}>
  <button class="close" onclick={onClose} aria-label="Close">×</button>
  <div class="type-tag">{node.type}</div>
  <h2>{node.title}</h2>

  <div class="body">
    {#if node.type === 'note'}
      <pre class="note">{node.content?.body ?? ''}</pre>
    {:else if node.type === 'image'}
      <img src={node.content?.url} alt={node.content?.alt ?? ''} />
      {#if node.content?.caption}
        <p class="caption">{node.content.caption}</p>
      {/if}
    {:else if node.type === 'iframe'}
      <iframe
        src={node.content?.url}
        title={node.title}
        height={node.content?.height ?? 400}
        sandbox="allow-scripts allow-same-origin allow-popups"
      ></iframe>
    {:else if node.type === 'file'}
      <a href={node.content?.url} download={node.content?.filename}>
        Download {node.content?.filename} ({Math.round((node.content?.size ?? 0) / 1024)} KB)
      </a>
    {:else}
      <pre>{JSON.stringify(node.content, null, 2)}</pre>
    {/if}
  </div>
</aside>

<style>
  .panel {
    position: absolute;
    top: 60px;
    right: 20px;
    bottom: 20px;
    width: min(440px, 40vw);
    background: var(--panel-bg);
    color: var(--text);
    border: 1px solid var(--node-border);
    border-radius: 12px;
    padding: 20px 24px;
    overflow: auto;
    z-index: 20;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(8px);
  }
  .close {
    position: absolute;
    top: 8px;
    right: 12px;
    background: transparent;
    border: none;
    color: var(--text);
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    opacity: 0.6;
  }
  .close:hover {
    opacity: 1;
  }
  .type-tag {
    display: inline-block;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    opacity: 0.6;
    margin-bottom: 4px;
  }
  h2 {
    margin: 0 0 16px;
    font-size: 18px;
    font-weight: 600;
  }
  .body img,
  .body iframe {
    max-width: 100%;
    border-radius: 8px;
    border: 1px solid var(--node-border);
  }
  .body iframe {
    width: 100%;
    height: 400px;
  }
  .note {
    white-space: pre-wrap;
    font-family: inherit;
    margin: 0;
    line-height: 1.5;
  }
  .caption {
    font-size: 13px;
    opacity: 0.7;
    margin-top: 8px;
  }
  .body a {
    color: var(--focus-ring);
    text-decoration: underline;
  }
</style>
