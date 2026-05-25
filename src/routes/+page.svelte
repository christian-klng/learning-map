<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type cytoscape from 'cytoscape';
  import { partition, planetElements, satelliteElements } from '$lib/graph/to-cytoscape';
  import { buildStylesheet } from '$lib/graph/cytoscape-style';
  import { theme } from '$lib/stores/theme';
  import NodeDetail from '$lib/components/NodeDetail.svelte';
  import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';

  let { data } = $props();

  type ElementBox = { id: string; title: string; type: string; content: any };
  let container: HTMLDivElement;
  let cy: cytoscape.Core | undefined;
  let expandedPlanetId: string | null = null;
  let selected = $state<{ planet: ElementBox; satellites: ElementBox[] } | null>(null);

  const part = $derived(partition(data.nodes, data.edges));

  async function init() {
    const cytoscape = (await import('cytoscape')).default;
    const fcose = (await import('cytoscape-fcose')).default;
    cytoscape.use(fcose);

    cy = cytoscape({
      container,
      elements: planetElements(part),
      style: buildStylesheet(),
      layout: {
        name: 'fcose',
        animate: true,
        animationDuration: 700,
        animationEasing: 'ease-out',
        nodeRepulsion: 12000,
        idealEdgeLength: 220,
        nodeSeparation: 120,
        randomize: true,
        padding: 80
      } as any,
      wheelSensitivity: 0.2,
      minZoom: 0.25,
      maxZoom: 3
    });

    cy.on('tap', 'node', (e) => onNodeTap(e.target));
    cy.on('tap', (e) => {
      if (e.target === cy) clearAll();
    });
  }

  function onNodeTap(node: cytoscape.NodeSingular) {
    const data = node.data();
    // Satellites are display-only (events: 'no' in stylesheet), so only planets reach here.
    if (!data.isPlanet) return;

    if (expandedPlanetId === node.id()) {
      collapse();
      clearFocus();
      selected = null;
      return;
    }
    if (expandedPlanetId) collapse();
    expand(node);
    const sats = part.satellitesByParent.get(node.id()) ?? [];
    selected = {
      planet: { id: node.id(), title: data.title, type: data.type, content: data.content },
      satellites: sats.map((s) => ({
        id: s.id,
        title: s.title ?? '',
        type: s.type,
        content: s.content
      }))
    };
  }

  // Ring radius scales with satellite count so they don't crowd
  function ringRadius(count: number): number {
    const perSatellite = 75; // arc length per satellite (px)
    const fromCircumference = (count * perSatellite) / (2 * Math.PI);
    return Math.max(120, fromCircumference);
  }

  function expand(planet: cytoscape.NodeSingular) {
    if (!cy) return;
    const sats = part.satellitesByParent.get(planet.id()) ?? [];
    expandedPlanetId = planet.id();

    if (sats.length === 0) {
      focusOn(planet, planet);
      return;
    }

    const pos = planet.position();
    const radius = ringRadius(sats.length);
    const els = satelliteElements(
      { id: planet.id(), x: pos.x, y: pos.y, glow: planet.data('glow') },
      sats,
      radius
    );
    const added = cy.add(els);

    // Satellites already at their ring positions — just fade them in
    added.style('opacity', 0);
    requestAnimationFrame(() => {
      added.nodes().animate({ style: { opacity: 1 } as any }, { duration: 320, easing: 'ease-out' });
      added.edges().animate({ style: { opacity: 0.45 } as any }, { duration: 320 });
    });

    // Planet + all its satellites glow with the planet's colour
    const allGlowing = planet.union(added.nodes());
    focusOn(allGlowing, planet.union(added));
  }

  function collapse() {
    if (!cy || !expandedPlanetId) return;
    const sats = cy.elements('node.satellite');
    const orbits = cy.elements('edge.orbit-edge');
    sats.animate(
      { style: { opacity: 0 } as any },
      { duration: 220, easing: 'ease-in', complete: () => sats.remove() }
    );
    orbits.animate(
      { style: { opacity: 0 } as any },
      { duration: 220, complete: () => orbits.remove() }
    );
    expandedPlanetId = null;
  }

  /** Promote `primary` to the gold-halo state; dim everything outside `scene`. */
  function focusOn(primary: cytoscape.NodeSingular | cytoscape.Collection, scene: cytoscape.Collection) {
    if (!cy) return;
    cy.elements().removeClass('primary dimmed');
    primary.addClass('primary');
    const sceneEdges = scene.connectedEdges().filter(
      (e) => scene.contains(e.source()) && scene.contains(e.target())
    );
    const visible = scene.union(sceneEdges);
    cy.elements().difference(visible).addClass('dimmed');
    cy.animate(
      { fit: { eles: visible, padding: 140 } },
      { duration: 500, easing: 'ease-out' }
    );
  }

  function clearFocus() {
    cy?.elements().removeClass('primary dimmed');
    cy?.animate({ fit: { padding: 80 } }, { duration: 500, easing: 'ease-out' });
  }

  function clearAll() {
    collapse();
    clearFocus();
    selected = null;
  }

  onMount(() => {
    init();
    const unsub = theme.subscribe(() => {
      if (!cy) return;
      requestAnimationFrame(() => cy?.style(buildStylesheet() as any));
    });
    return unsub;
  });

  onDestroy(() => cy?.destroy());
</script>

<div class="app">
  <header>
    <div class="brand">
      <span class="dot"></span>
      <h1>Learning Map</h1>
    </div>
    <ThemeSwitcher />
  </header>

  <div class="graph" bind:this={container}></div>

  {#if selected}
    <NodeDetail planet={selected.planet} satellites={selected.satellites} onClose={clearAll} />
  {/if}

  {#if !selected}
    <div class="hint">click a planet to reveal its satellites</div>
  {/if}
</div>

<style>
  .app {
    position: fixed;
    inset: 0;
    color: var(--text);
  }
  header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 18px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 10;
    pointer-events: none;
  }
  header > :global(*) {
    pointer-events: auto;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, var(--planet-border), var(--planet-edge));
    box-shadow: 0 0 12px var(--planet-glow);
  }
  h1 {
    font-size: 14px;
    font-weight: 600;
    margin: 0;
    letter-spacing: 0.02em;
    opacity: 0.85;
  }
  .graph {
    position: absolute;
    inset: 0;
  }
  .hint {
    position: absolute;
    bottom: 22px;
    left: 50%;
    transform: translateX(-50%);
    color: var(--text-dim);
    font-size: 12px;
    letter-spacing: 0.04em;
    pointer-events: none;
    animation: fadeIn 1.6s ease-out;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
