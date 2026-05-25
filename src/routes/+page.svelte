<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type cytoscape from 'cytoscape';
  import { toCytoscapeElements } from '$lib/graph/to-cytoscape';
  import { buildStylesheet } from '$lib/graph/cytoscape-style';
  import { theme } from '$lib/stores/theme';
  import NodeDetail from '$lib/components/NodeDetail.svelte';
  import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';

  let { data } = $props();

  let container: HTMLDivElement;
  let cy: cytoscape.Core | undefined;
  let selected = $state<{ id: string; title: string; type: string; content: unknown } | null>(null);

  async function init() {
    const cytoscape = (await import('cytoscape')).default;
    const fcose = (await import('cytoscape-fcose')).default;
    cytoscape.use(fcose);

    cy = cytoscape({
      container,
      elements: toCytoscapeElements(data.nodes, data.edges),
      style: buildStylesheet(),
      layout: {
        name: 'fcose',
        animate: true,
        animationDuration: 600,
        nodeRepulsion: 8000,
        idealEdgeLength: 160,
        nodeSeparation: 80,
        randomize: true
      } as any,
      wheelSensitivity: 0.2,
      minZoom: 0.2,
      maxZoom: 3
    });

    cy.on('tap', 'node', (e) => {
      const n = e.target;
      if (n.data('isGroup')) return; // ignore taps on synthetic compound nodes
      focus(n);
    });

    cy.on('tap', (e) => {
      if (e.target === cy) clearFocus();
    });
  }

  function focus(node: cytoscape.NodeSingular) {
    if (!cy) return;
    const ring = node.neighborhood().add(node).add(node.descendants()).add(node.parents());
    cy.elements().removeClass('focused dimmed');
    ring.addClass('focused');
    cy.elements().difference(ring).addClass('dimmed');
    cy.animate({ fit: { eles: ring, padding: 100 } }, { duration: 400 });
    selected = {
      id: node.id(),
      title: node.data('title'),
      type: node.data('type'),
      content: node.data('content')
    };
  }

  function clearFocus() {
    cy?.elements().removeClass('focused dimmed');
    cy?.animate({ fit: { padding: 60 } }, { duration: 400 });
    selected = null;
  }

  onMount(() => {
    init();
    const unsub = theme.subscribe(() => {
      // theme switched — rebuild Cytoscape stylesheet from new CSS vars
      if (!cy) return;
      // small delay to let CSS vars resolve in the DOM
      requestAnimationFrame(() => cy?.style(buildStylesheet() as any));
    });
    return unsub;
  });

  onDestroy(() => cy?.destroy());
</script>

<div class="app">
  <header>
    <h1>Learning Map</h1>
    <ThemeSwitcher />
  </header>

  <div class="graph" bind:this={container}></div>

  {#if selected}
    <NodeDetail node={selected} onClose={clearFocus} />
  {/if}
</div>

<style>
  .app {
    position: fixed;
    inset: 0;
    background: var(--bg);
    color: var(--text);
    font-family: ui-sans-serif, system-ui, sans-serif;
  }
  header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 12px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 10;
    pointer-events: none;
  }
  header > :global(*) {
    pointer-events: auto;
  }
  h1 {
    font-size: 16px;
    font-weight: 500;
    margin: 0;
    letter-spacing: 0.02em;
    opacity: 0.85;
  }
  .graph {
    position: absolute;
    inset: 0;
  }
</style>
