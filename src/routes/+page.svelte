<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type cytoscape from 'cytoscape';
  import {
    partition,
    planetElements,
    planetElement,
    satelliteElements
  } from '$lib/graph/to-cytoscape';
  import { buildStylesheet } from '$lib/graph/cytoscape-style';
  import { theme } from '$lib/stores/theme';
  import type { NodeRow, EdgeRow } from '$lib/server/db/schema';
  import NodeDetail from '$lib/components/NodeDetail.svelte';
  import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';

  type ElementBox = { id: string; title: string; type: string; content: any };

  let { data } = $props();

  // Mutable local copies so we can reflect creates/updates/deletes without a reload
  let allNodes = $state<NodeRow[]>(data.nodes);
  let allEdges = $state<EdgeRow[]>(data.edges);
  const part = $derived(partition(allNodes, allEdges));

  let container: HTMLDivElement;
  let cy: cytoscape.Core | undefined;
  let expandedPlanetId: string | null = null;
  let selected = $state<{ planet: ElementBox; satellites: ElementBox[] } | null>(null);
  let openInEdit = $state(false);

  // Palette for auto-assigning colours to new planets (cycles).
  const PLANET_PALETTE = [
    '#10b981', '#f97316', '#3b82f6', '#a855f7',
    '#ef4444', '#eab308', '#06b6d4', '#ec4899'
  ];

  async function init() {
    const cytoscape = (await import('cytoscape')).default;
    const fcose = (await import('cytoscape-fcose')).default;
    const edgehandles = (await import('cytoscape-edgehandles')).default;
    cytoscape.use(fcose);
    cytoscape.use(edgehandles);

    // If every planet already has a saved position, skip auto-layout and use them as-is
    const haveAllPositions =
      part.planets.length > 0 && part.planets.every((p) => p.position);

    cy = cytoscape({
      container,
      elements: planetElements(part),
      style: buildStylesheet(),
      layout: haveAllPositions
        ? ({ name: 'preset' } as any)
        : ({
            name: 'fcose',
            animate: true,
            animationDuration: 700,
            animationEasing: 'ease-out',
            nodeRepulsion: 12000,
            idealEdgeLength: 220,
            nodeSeparation: 120,
            randomize: true,
            padding: 80
          } as any),
      wheelSensitivity: 0.2,
      minZoom: 0.25,
      maxZoom: 3
    });

    cy.on('tap', 'node', (e) => onNodeTap(e.target));
    cy.on('tap', 'edge:not(.orbit-edge)', (e) => onEdgeTap(e.target));
    cy.on('tap', (e) => {
      if (e.target === cy) clearAll();
    });

    // Drag-to-pin: save planet position after the user lets go
    cy.on('dragfree', 'node[?isPlanet]', (e) => {
      void savePosition(e.target);
    });

    // Edge handles — hover a planet, drag the handle to another planet
    const eh = (cy as any).edgehandles({
      snap: true,
      noEdgeEventsInDraw: true,
      disableBrowserGestures: true,
      handleNodes: 'node[?isPlanet]',
      hoverDelay: 120,
      edgeParams: () => ({ data: { kind: 'reference', label: '' } })
    });
    eh.enable();

    cy.on('ehcomplete', (_evt: any, source: any, target: any, addedEdge: any) => {
      // edgehandles already added a placeholder edge — drop it and create the real one
      addedEdge.remove();
      void createEdge(source.id(), target.id());
    });
  }

  function onNodeTap(node: cytoscape.NodeSingular) {
    const data = node.data();
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
    openInEdit = false;
    selected = {
      planet: { id: node.id(), title: data.title, type: data.type, content: data.content },
      satellites: sats.map(asBox)
    };
  }

  function asBox(n: NodeRow): ElementBox {
    return { id: n.id, title: n.title ?? '', type: n.type, content: n.content };
  }

  // Ring radius scales with satellite count so they don't crowd
  function ringRadius(count: number): number {
    const perSatellite = 75;
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

    added.style('opacity', 0);
    requestAnimationFrame(() => {
      added.nodes().animate({ style: { opacity: 1 } as any }, { duration: 320, easing: 'ease-out' });
      added.edges().animate({ style: { opacity: 0.45 } as any }, { duration: 320 });
    });

    const allGlowing = planet.union(added.nodes());
    focusOn(allGlowing, planet.union(added));
  }

  /** Re-draw the satellite ring without changing camera/expanded state. Used after add/delete. */
  function refreshRing(planetId: string) {
    if (!cy) return;
    cy.elements('node.satellite').remove();
    cy.elements('edge.orbit-edge').remove();

    const planet = cy.getElementById(planetId);
    if (!planet.length) return;

    const sats = part.satellitesByParent.get(planetId) ?? [];
    if (sats.length === 0) {
      // still keep planet as primary, just no ring
      planet.addClass('primary');
      return;
    }

    const pos = planet.position();
    const radius = ringRadius(sats.length);
    const els = satelliteElements(
      { id: planetId, x: pos.x, y: pos.y, glow: planet.data('glow') },
      sats,
      radius
    );
    const added = cy.add(els);
    added.style('opacity', 1);
    added.edges().style('opacity', 0.45);

    cy.elements().removeClass('primary dimmed');
    planet.union(added.nodes()).addClass('primary');
    cy.elements().difference(planet.union(added)).addClass('dimmed');
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

  function focusOn(
    primary: cytoscape.NodeSingular | cytoscape.Collection,
    scene: cytoscape.Collection
  ) {
    if (!cy) return;
    cy.elements().removeClass('primary dimmed');
    primary.addClass('primary');
    const sceneEdges = scene.connectedEdges().filter(
      (e) => scene.contains(e.source()) && scene.contains(e.target())
    );
    const visible = scene.union(sceneEdges);
    cy.elements().difference(visible).addClass('dimmed');
    cy.animate({ fit: { eles: visible, padding: 140 } }, { duration: 500, easing: 'ease-out' });
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

  /* ---------- mutation callbacks ---------- */

  function handleUpdate(updated: ElementBox) {
    // 1. local data
    allNodes = allNodes.map((n) =>
      n.id === updated.id
        ? { ...n, title: updated.title, content: updated.content as any }
        : n
    );
    // 2. cy data (planet only — satellites are recreated from local data on next expand)
    const cyNode = cy?.getElementById(updated.id);
    if (cyNode?.length) {
      cyNode.data('title', updated.title);
      cyNode.data('content', updated.content);
    }
    // 3. modal state
    if (selected) {
      if (selected.planet.id === updated.id) {
        selected = { ...selected, planet: updated };
      } else {
        selected = {
          ...selected,
          satellites: selected.satellites.map((s) => (s.id === updated.id ? updated : s))
        };
      }
    }
  }

  function handleSatelliteAdd(newNode: ElementBox) {
    if (!selected) return;
    // We need the full NodeRow for partition() to pick it up. The server returned
    // the row but we only got an ElementBox in the callback. Reconstruct enough fields.
    const planetId = selected.planet.id;
    const row: NodeRow = {
      id: newNode.id,
      type: newNode.type as any,
      title: newNode.title,
      content: newNode.content,
      parentId: planetId,
      position: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    allNodes = [...allNodes, row];
    selected = { ...selected, satellites: [...selected.satellites, newNode] };
    if (expandedPlanetId === planetId) refreshRing(planetId);
  }

  function handleSatelliteDelete(id: string) {
    allNodes = allNodes.filter((n) => n.id !== id);
    if (selected) {
      selected = { ...selected, satellites: selected.satellites.filter((s) => s.id !== id) };
    }
    if (expandedPlanetId) refreshRing(expandedPlanetId);
  }

  function handlePlanetDelete(id: string) {
    // remove the planet itself + any cascade (its satellites + edges locally — the server already cascaded)
    allNodes = allNodes.filter((n) => n.id !== id && n.parentId !== id);
    allEdges = allEdges.filter((e) => e.sourceId !== id && e.targetId !== id);
    cy?.getElementById(id).remove();
    cy?.elements('node.satellite').remove();
    cy?.elements('edge.orbit-edge').remove();
    expandedPlanetId = null;
    selected = null;
    clearFocus();
  }

  /* ---------- edges + positions ---------- */

  async function createEdge(sourceId: string, targetId: string) {
    // Prevent duplicate edges in either direction
    const exists = allEdges.some(
      (e) =>
        (e.sourceId === sourceId && e.targetId === targetId) ||
        (e.sourceId === targetId && e.targetId === sourceId)
    );
    if (exists) return;

    const res = await fetch('/api/edges', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceId, targetId, kind: 'reference' })
    });
    if (!res.ok) {
      alert('Failed to create edge: ' + (await res.text()));
      return;
    }
    const edge: EdgeRow = await res.json();
    allEdges = [...allEdges, edge];
    cy?.add({
      data: {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        kind: edge.kind,
        label: edge.label ?? ''
      }
    });
  }

  async function onEdgeTap(edge: cytoscape.EdgeSingular) {
    if (!confirm('Delete this connection?')) return;
    const id = edge.id();
    const res = await fetch(`/api/edges/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Failed to delete edge: ' + (await res.text()));
      return;
    }
    allEdges = allEdges.filter((e) => e.id !== id);
    edge.remove();
  }

  async function savePosition(node: cytoscape.NodeSingular) {
    const id = node.id();
    const pos = node.position();
    const position = { x: pos.x, y: pos.y };
    allNodes = allNodes.map((n) => (n.id === id ? { ...n, position } : n));
    await fetch(`/api/nodes/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ position })
    }).catch(() => {
      // best effort — drift will reset on next load if save failed
    });
  }

  /* ---------- create new planet ---------- */

  async function createNewPlanet() {
    if (!cy) return;
    const color = PLANET_PALETTE[part.planets.length % PLANET_PALETTE.length];
    const res = await fetch('/api/nodes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'note',
        title: 'New planet',
        content: { body: '' },
        metadata: { color }
      })
    });
    if (!res.ok) {
      alert('Failed to create planet: ' + (await res.text()));
      return;
    }
    const node: NodeRow = await res.json();
    allNodes = [...allNodes, node];

    // Place at viewport centre so it's immediately visible
    const pan = cy.pan();
    const zoom = cy.zoom();
    const cx = (cy.width() / 2 - pan.x) / zoom;
    const cyY = (cy.height() / 2 - pan.y) / zoom;
    const el = planetElement(node, 0);
    cy.add({ ...el, position: { x: cx, y: cyY } });

    // Collapse any existing scene, then open this new planet in edit mode
    if (expandedPlanetId) collapse();
    clearFocus();
    openInEdit = true;
    selected = { planet: asBox(node), satellites: [] };
    expand(cy.getElementById(node.id));
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
    {#key selected.planet.id}
      <NodeDetail
        planet={selected.planet}
        satellites={selected.satellites}
        onClose={clearAll}
        onUpdate={handleUpdate}
        onDelete={handleSatelliteDelete}
        onAdd={handleSatelliteAdd}
        onPlanetDelete={handlePlanetDelete}
        startInEdit={openInEdit}
      />
    {/key}
  {/if}

  {#if !selected}
    <div class="hint">click a planet to reveal its satellites</div>
  {/if}

  <button class="fab" onclick={createNewPlanet} aria-label="New planet" title="New planet">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
  </button>
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
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .fab {
    position: absolute;
    bottom: 24px;
    right: 24px;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
    display: grid;
    place-items: center;
    backdrop-filter: blur(12px) saturate(140%);
    -webkit-backdrop-filter: blur(12px) saturate(140%);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.04) inset,
      0 12px 32px -8px rgba(0, 0, 0, 0.5),
      0 4px 16px -4px rgba(0, 0, 0, 0.3);
    transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1), border-color 200ms;
    z-index: 9;
  }
  .fab:hover {
    transform: translateY(-2px) scale(1.05);
    border-color: var(--focus-ring);
  }
  .fab:active {
    transform: translateY(0) scale(1);
  }
</style>
