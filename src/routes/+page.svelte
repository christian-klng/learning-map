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
  import { planetGlow, planetBorder } from '$lib/graph/color';
  import { PLANET_PALETTE, planetBgImage, type PlanetDesign } from '$lib/graph/visual';
  import type { NodeRow, EdgeRow } from '$lib/server/db/schema';
  import NodeDetail from '$lib/components/NodeDetail.svelte';
  import EdgePopover from '$lib/components/EdgePopover.svelte';
  import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
  import ModeChip from '$lib/components/ModeChip.svelte';
  import { session } from '$lib/stores/session';
  import { unlockedIds, computeInitialUnlocked, getChildPlanetIds } from '$lib/stores/unlock';

  type ElementBox = {
    id: string;
    title: string;
    type: string;
    content: any;
    createdBy?: string | null;
    updatedBy?: string | null;
  };
  type PlanetMeta = { color: string; design: PlanetDesign };
  type Presence = { connId: string; role: string; name: string | null };

  let { data } = $props();

  // Mutable local copies so we can reflect creates/updates/deletes without a reload
  let allNodes = $state<NodeRow[]>(data.nodes);
  let allEdges = $state<EdgeRow[]>(data.edges);
  const part = $derived(partition(allNodes, allEdges));

  let container: HTMLDivElement;
  let cy: cytoscape.Core | undefined;
  let cyReady = $state(false);
  let eh: { enableDrawMode: () => void; disableDrawMode: () => void } | undefined;
  let expandedPlanetId: string | null = null;
  let drawMode = $state(false);
  let modalTimer: ReturnType<typeof setTimeout> | null = null;

  // Role-derived capability flags. Today: view = read-only, student/admin can edit anything,
  // admin additionally controls the theme. Keep the two flags separate so adding admin-only
  // features later doesn't require revisiting every gate.
  const canEdit = $derived($session.role === 'student' || $session.role === 'admin');
  const canAdmin = $derived($session.role === 'admin');

  // Realtime presence (from /api/events SSE stream)
  let myConnId = $state<string | null>(null);
  let others = $state<Presence[]>([]);
  let evtSource: EventSource | null = null;

  function clearModalTimer() {
    if (modalTimer) {
      clearTimeout(modalTimer);
      modalTimer = null;
    }
  }
  let selected = $state<{
    planet: ElementBox;
    planetMeta: PlanetMeta;
    satellites: ElementBox[];
  } | null>(null);
  let openInEdit = $state(false);
  let edgePopover = $state<{
    edgeId: string;
    sourceTitle: string;
    targetTitle: string;
    unlockDirection: 'source' | 'target' | null;
    x: number;
    y: number;
  } | null>(null);

  function planetMetaFromNode(n: NodeRow): PlanetMeta {
    const md = (n.metadata ?? {}) as Record<string, unknown>;
    return {
      color: (md.color as string) ?? '#6366f1',
      design: ((md.design as PlanetDesign) ?? 'plain') as PlanetDesign
    };
  }

  async function init() {
    const cytoscape = (await import('cytoscape')).default;
    const fcose = (await import('cytoscape-fcose')).default;
    const edgehandles = (await import('cytoscape-edgehandles')).default;
    cytoscape.use(fcose);
    cytoscape.use(edgehandles);

    // Layout strategy:
    //  - All planets positioned → preset (zero movement)
    //  - Some positioned, some not → fcose, but PIN the positioned ones so they don't drift
    //  - None positioned → fcose from scratch
    const positioned = part.planets.filter((p) => !!p.position);
    const allPositioned = positioned.length === part.planets.length && positioned.length > 0;
    const fixedNodeConstraint = positioned.map((p) => ({
      nodeId: p.id,
      position: p.position as { x: number; y: number }
    }));

    cy = cytoscape({
      container,
      elements: planetElements(part),
      style: buildStylesheet(),
      layout: allPositioned
        ? ({ name: 'preset' } as any)
        : ({
            name: 'fcose',
            animate: true,
            animationDuration: 700,
            animationEasing: 'ease-out',
            nodeRepulsion: 12000,
            idealEdgeLength: 220,
            nodeSeparation: 120,
            randomize: positioned.length === 0,
            fixedNodeConstraint,
            padding: 80
          } as any),
      wheelSensitivity: 0.2,
      minZoom: 0.25,
      maxZoom: 3
    });

    // After the first layout completes, persist computed positions for planets that didn't
    // have one — so subsequent reloads use `preset` and nothing ever drifts again.
    if (!allPositioned) {
      cy.one('layoutstop', () => {
        cy!.nodes('node[?isPlanet]').forEach((node) => {
          const local = allNodes.find((n) => n.id === node.id());
          if (local && !local.position) void savePosition(node);
        });
      });
    }

    cy.on('tap', 'node', (e) => onNodeTap(e.target));
    cy.on('tap', 'edge:not(.orbit-edge)', (e) => onEdgeTap(e.target));
    cy.on('tap', (e) => {
      if (e.target === cy) clearAll();
    });

    // Drag-to-pin: save planet position after the user lets go.
    // View mode is read-only, so don't persist drift (Cytoscape still lets the user pan/zoom).
    cy.on('dragfree', 'node[?isPlanet]', (e) => {
      if (!canEdit) return;
      void savePosition(e.target);
    });

    // cytoscape-edgehandles v4 uses "draw mode" — toggled via UI button (no hover handle).
    // When draw mode is on, a click+drag from one planet to another creates an edge.
    eh = (cy as any).edgehandles({
      canConnect: (source: any, target: any) =>
        !source.same(target) && !!source.data('isPlanet') && !!target.data('isPlanet'),
      snap: true,
      noEdgeEventsInDraw: true,
      disableBrowserGestures: true,
      edgeParams: () => ({ data: { kind: 'reference', label: '' } })
    });

    cy.on('ehcomplete', (_evt: any, source: any, target: any, addedEdge: any) => {
      // edgehandles already added a placeholder edge — drop it and create the real one
      addedEdge.remove();
      void createEdge(source.id(), target.id());
    });

    cyReady = true;
  }

  function onNodeTap(node: cytoscape.NodeSingular) {
    if (drawMode) return; // edge drawing owns the gesture
    const data = node.data();
    if (!data.isPlanet) return;

    // In view mode, locked planets can't be opened — flash red as rejection
    if (!canEdit && !$unlockedIds.has(node.id())) {
      node.animate(
        { style: { 'border-color': '#ef4444', 'border-width': 4, 'border-opacity': 1 } as any },
        { duration: 200, easing: 'ease-out', complete: () => {
          node.animate(
            { style: { 'border-color': node.data('borderColor'), 'border-width': 2, 'border-opacity': 0.5 } as any },
            { duration: 400, easing: 'ease-in' }
          );
        }}
      );
      return;
    }

    if (expandedPlanetId === node.id()) {
      collapse();
      clearFocus();
      clearModalTimer();
      selected = null;
      return;
    }
    if (expandedPlanetId) collapse();
    clearModalTimer();
    expand(node);

    // Show satellites blooming first, THEN open the modal — so the user sees the ring
    // exists before content covers it. Cancelled if they click another planet / bg first.
    const sats = part.satellitesByParent.get(node.id()) ?? [];
    const planetRow = allNodes.find((n) => n.id === node.id());
    const next = {
      planet: planetRow
        ? asBox(planetRow)
        : { id: node.id(), title: data.title, type: data.type, content: data.content },
      planetMeta: planetRow ? planetMetaFromNode(planetRow) : { color: '#6366f1', design: 'plain' },
      satellites: sats.map(asBox)
    };
    openInEdit = canEdit;
    modalTimer = setTimeout(() => {
      selected = next;
      modalTimer = null;
    }, 1300);
  }

  function asBox(n: NodeRow): ElementBox {
    return {
      id: n.id,
      title: n.title ?? '',
      type: n.type,
      content: n.content,
      createdBy: n.createdBy ?? null,
      updatedBy: n.updatedBy ?? null
    };
  }

  // Ring radius scales with satellite count so they don't crowd.
  // Satellites span the upper semicircle (arc = π), not the full circle.
  function ringRadius(count: number): number {
    const perSatellite = 75;
    const fromArc = (count * perSatellite) / Math.PI;
    return Math.max(120, fromArc);
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
    clearModalTimer();
    collapse();
    clearFocus();
    selected = null;
    edgePopover = null;
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
      createdBy: newNode.createdBy ?? null,
      updatedBy: newNode.updatedBy ?? null,
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

  function onEdgeTap(edge: cytoscape.EdgeSingular) {
    if (!canEdit) return;
    const id = edge.id();
    const edgeRow = allEdges.find((e) => e.id === id);
    if (!edgeRow) return;

    const sourceNode = allNodes.find((n) => n.id === edgeRow.sourceId);
    const targetNode = allNodes.find((n) => n.id === edgeRow.targetId);

    // Convert edge midpoint to screen coordinates
    const mid = edge.midpoint();
    const pan = cy!.pan();
    const zoom = cy!.zoom();
    const screenX = mid.x * zoom + pan.x;
    const screenY = mid.y * zoom + pan.y;

    edgePopover = {
      edgeId: id,
      sourceTitle: sourceNode?.title ?? 'Source',
      targetTitle: targetNode?.title ?? 'Target',
      unlockDirection: edgeRow.unlockDirection ?? null,
      x: screenX,
      y: screenY
    };
  }

  async function handleEdgeDirectionChange(dir: 'source' | 'target' | null) {
    if (!edgePopover) return;
    const id = edgePopover.edgeId;

    // Optimistic local update
    allEdges = allEdges.map((e) =>
      e.id === id ? { ...e, unlockDirection: dir } : e
    );
    const cyEdge = cy?.getElementById(id);
    if (cyEdge?.length) cyEdge.data('unlockDirection', dir);
    edgePopover = { ...edgePopover, unlockDirection: dir };

    await fetch(`/api/edges/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ unlockDirection: dir })
    }).catch(() => {});
  }

  async function handleEdgeDelete() {
    if (!edgePopover) return;
    const id = edgePopover.edgeId;
    edgePopover = null;

    const res = await fetch(`/api/edges/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Failed to delete edge: ' + (await res.text()));
      return;
    }
    allEdges = allEdges.filter((e) => e.id !== id);
    cy?.getElementById(id).remove();
  }

  /** Live-update planet metadata (color + design) from the modal's picker. */
  async function handleMetadataChange(patch: Partial<PlanetMeta>) {
    if (!selected) return;
    const planetId = selected.planet.id;
    const current = allNodes.find((n) => n.id === planetId);
    if (!current) return;

    const newMeta = { ...(current.metadata as any), ...patch };

    // Optimistic local + cy update
    allNodes = allNodes.map((n) => (n.id === planetId ? { ...n, metadata: newMeta } : n));

    const cyNode = cy?.getElementById(planetId);
    if (cyNode?.length) {
      // The new metadata after applying the patch
      const newColor = patch.color ?? selected.planetMeta.color;
      const newDesign = patch.design ?? selected.planetMeta.design;
      const newBorder = planetBorder(newColor);
      const newGlow = planetGlow(newColor);
      const bgImage = planetBgImage(newColor, newDesign);

      cyNode.data('baseColor', newColor);
      cyNode.data('design', newDesign);
      cyNode.data('bgImage', bgImage);
      cyNode.data('borderColor', newBorder);
      cyNode.data('glow', newGlow);

      // Inline style overrides force the canvas to refresh — data() mappers don't always re-fire
      cyNode.style({
        'background-image': bgImage,
        'border-color': newBorder
      } as any);

      // Satellites inherit the planet's glow — update them too if the ring is showing
      if (patch.color && expandedPlanetId === planetId) {
        cy?.elements('node.satellite').forEach((s) => s.data('glow', newGlow));
        cy?.elements('edge.orbit-edge').forEach((o) => o.data('glow', newGlow));
      }
    }

    // Update modal state
    selected = {
      ...selected,
      planetMeta: {
        color: patch.color ?? selected.planetMeta.color,
        design: patch.design ?? selected.planetMeta.design
      }
    };

    // Persist
    await fetch(`/api/nodes/${planetId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ metadata: newMeta })
    }).catch(() => {});
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

  function toggleDrawMode() {
    if (!eh) return;
    drawMode = !drawMode;
    if (drawMode) {
      eh.enableDrawMode();
      // Drop any existing focus so the user can see the whole graph while connecting
      collapse();
      clearFocus();
      selected = null;
    } else {
      eh.disableDrawMode();
    }
  }

  function onWindowKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && drawMode) {
      drawMode = false;
      eh?.disableDrawMode();
    }
  }

  // If the user drops out of edit mode while drawing (e.g. session expired), kill drawMode
  $effect(() => {
    if (!canEdit && drawMode) {
      drawMode = false;
      eh?.disableDrawMode();
    }
  });

  // Recompute which planets are unlocked whenever edges change
  $effect(() => {
    const initial = computeInitialUnlocked(part.planets, allEdges);
    unlockedIds.set(initial);
  });

  // Sync unlock state → Cytoscape `.locked` class (view mode only)
  $effect(() => {
    if (!cyReady || !cy) return;
    if (canEdit) {
      cy.nodes('node[?isPlanet]').removeClass('locked');
      return;
    }
    const unlocked = $unlockedIds;
    cy.nodes('node[?isPlanet]').forEach((node: cytoscape.NodeSingular) => {
      if (unlocked.has(node.id())) {
        node.removeClass('locked');
      } else {
        node.addClass('locked');
      }
    });
  });

  function handleQuizCorrect(planetId: string) {
    const children = getChildPlanetIds(planetId, allEdges);
    if (children.length === 0) {
      selected = null;
      collapse();
      clearFocus();
      return;
    }

    // Update unlock store
    unlockedIds.update((s) => {
      const next = new Set(s);
      for (const id of children) next.add(id);
      return next;
    });

    // Close modal + collapse ring
    selected = null;
    collapse();
    clearFocus();

    // After a beat, animate the reveal
    setTimeout(() => {
      if (!cy) return;

      // Remove locked class — the Cytoscape CSS transition (280ms) handles the fade-in
      for (const id of children) {
        const node = cy.getElementById(id);
        if (!node.length) continue;
        node.removeClass('locked');
        node.style('opacity', 1);
      }

      // Glow the connecting edges
      const glowEdges = allEdges.filter((e) => {
        if (!e.unlockDirection) return false;
        if (e.unlockDirection === 'source' && e.sourceId === planetId && children.includes(e.targetId)) return true;
        if (e.unlockDirection === 'target' && e.targetId === planetId && children.includes(e.sourceId)) return true;
        return false;
      });
      for (const e of glowEdges) {
        const cyEdge = cy.getElementById(e.id);
        if (!cyEdge.length) continue;
        cyEdge.addClass('unlock-glow');
      }

      // Fit camera to show parent + newly unlocked children
      const fitEles = cy.getElementById(planetId);
      let collection = fitEles.union(fitEles);
      for (const id of children) {
        collection = collection.union(cy.getElementById(id));
      }
      cy.animate({ fit: { eles: collection, padding: 140 } }, { duration: 600, easing: 'ease-out' });

      // Remove glow after 2s
      setTimeout(() => {
        for (const e of glowEdges) {
          cy?.getElementById(e.id).removeClass('unlock-glow');
        }
      }, 2000);
    }, 100);
  }

  async function createNewPlanet() {
    if (!cy) return;
    const idx = part.planets.length;
    const color = PLANET_PALETTE[idx % PLANET_PALETTE.length];
    const designs: PlanetDesign[] = ['plain', 'bands', 'craters', 'rings', 'swirl'];
    const design = designs[idx % designs.length];

    const pan = cy.pan();
    const zoom = cy.zoom();
    const position = {
      x: (cy.width() / 2 - pan.x) / zoom,
      y: (cy.height() / 2 - pan.y) / zoom
    };

    const res = await fetch('/api/nodes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'note',
        title: 'New planet',
        content: { body: '' },
        metadata: { color, design },
        position
      })
    });
    if (!res.ok) {
      alert('Failed to create planet: ' + (await res.text()));
      return;
    }
    const node: NodeRow = await res.json();
    allNodes = [...allNodes, node];

    cy.add(planetElement(node, 0));

    if (expandedPlanetId) collapse();
    clearFocus();
    openInEdit = true;
    selected = {
      planet: asBox(node),
      planetMeta: planetMetaFromNode(node),
      satellites: []
    };
    expand(cy.getElementById(node.id));
  }

  /* ---------- SSE: remote change reconciliation ---------- */

  type RemoteEvent = {
    kind: string;
    payload: any;
    actor?: string | null;
  };

  function applyRemoteEvent(event: RemoteEvent) {
    switch (event.kind) {
      case 'node.created': {
        const raw = event.payload as NodeRow;
        if (allNodes.some((n) => n.id === raw.id)) return; // we created it locally
        const node: NodeRow = {
          ...raw,
          createdAt: new Date(raw.createdAt as any),
          updatedAt: new Date(raw.updatedAt as any)
        };
        allNodes = [...allNodes, node];

        if (!node.parentId) {
          cy?.add(planetElement(node, 0));
        } else {
          if (expandedPlanetId === node.parentId) refreshRing(node.parentId);
          if (selected && node.parentId === selected.planet.id) {
            selected = { ...selected, satellites: [...selected.satellites, asBox(node)] };
          }
        }
        break;
      }
      case 'node.updated': {
        const raw = event.payload as NodeRow;
        const before = allNodes.find((n) => n.id === raw.id);
        if (!before) return;
        const node: NodeRow = {
          ...raw,
          createdAt: before.createdAt,
          updatedAt: new Date(raw.updatedAt as any)
        };
        allNodes = allNodes.map((n) => (n.id === node.id ? node : n));

        const cyNode = cy?.getElementById(node.id);
        if (cyNode?.length) {
          cyNode.data('title', node.title);
          cyNode.data('content', node.content);

          const md = (node.metadata ?? {}) as Record<string, unknown>;
          const newColor = (md.color as string) ?? '#6366f1';
          const newDesign = ((md.design as PlanetDesign) ?? 'plain') as PlanetDesign;
          if (
            cyNode.data('baseColor') !== newColor ||
            cyNode.data('design') !== newDesign
          ) {
            const newBorder = planetBorder(newColor);
            const newGlow = planetGlow(newColor);
            const bgImage = planetBgImage(newColor, newDesign);
            cyNode.data('baseColor', newColor);
            cyNode.data('design', newDesign);
            cyNode.data('bgImage', bgImage);
            cyNode.data('borderColor', newBorder);
            cyNode.data('glow', newGlow);
            cyNode.style({ 'background-image': bgImage, 'border-color': newBorder } as any);
          }

          if (node.position) {
            const cur = cyNode.position();
            const pos = node.position as { x: number; y: number };
            if (cur.x !== pos.x || cur.y !== pos.y) cyNode.position(pos);
          }
        }

        if (selected) {
          const box = asBox(node);
          if (selected.planet.id === node.id) {
            selected = { ...selected, planet: box, planetMeta: planetMetaFromNode(node) };
          } else if (selected.satellites.some((s) => s.id === node.id)) {
            selected = {
              ...selected,
              satellites: selected.satellites.map((s) => (s.id === node.id ? box : s))
            };
          }
        }
        break;
      }
      case 'node.deleted': {
        const id = event.payload?.id as string | undefined;
        if (!id) return;
        const wasPlanet = !allNodes.find((n) => n.id === id)?.parentId;
        allNodes = allNodes.filter((n) => n.id !== id && n.parentId !== id);
        allEdges = allEdges.filter((e) => e.sourceId !== id && e.targetId !== id);

        cy?.getElementById(id).remove();

        if (selected) {
          if (selected.planet.id === id) {
            clearAll(); // someone deleted the planet I had open
            break;
          }
          if (selected.satellites.some((s) => s.id === id)) {
            selected = {
              ...selected,
              satellites: selected.satellites.filter((s) => s.id !== id)
            };
            if (expandedPlanetId) refreshRing(expandedPlanetId);
          }
        }
        if (wasPlanet && expandedPlanetId === id) expandedPlanetId = null;
        break;
      }
      case 'edge.created': {
        const raw = event.payload as EdgeRow;
        if (allEdges.some((e) => e.id === raw.id)) return;
        const edge: EdgeRow = { ...raw, createdAt: new Date(raw.createdAt as any) };
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
        break;
      }
      case 'edge.updated': {
        const raw = event.payload as EdgeRow;
        allEdges = allEdges.map((e) => (e.id === raw.id ? { ...raw, createdAt: new Date(raw.createdAt as any) } : e));
        const cyEdge = cy?.getElementById(raw.id);
        if (cyEdge?.length) {
          cyEdge.data('unlockDirection', raw.unlockDirection ?? null);
          cyEdge.data('kind', raw.kind);
          cyEdge.data('label', raw.label ?? '');
        }
        break;
      }
      case 'edge.deleted': {
        const id = event.payload?.id as string | undefined;
        if (!id) return;
        allEdges = allEdges.filter((e) => e.id !== id);
        cy?.getElementById(id).remove();
        break;
      }
      case 'presence.joined': {
        const p = event.payload as Presence;
        if (p.connId === myConnId) return;
        if (others.some((o) => o.connId === p.connId)) return;
        others = [...others, p];
        break;
      }
      case 'presence.left': {
        const id = event.payload?.connId as string | undefined;
        if (!id) return;
        others = others.filter((o) => o.connId !== id);
        break;
      }
    }
  }

  function connectSse() {
    evtSource?.close();
    const es = new EventSource('/api/events');
    evtSource = es;

    es.addEventListener('snapshot', (e) => {
      try {
        const { connId, presence } = JSON.parse((e as MessageEvent).data);
        myConnId = connId;
        others = (presence as Presence[]).filter((p) => p.connId !== connId);
      } catch {
        // bad snapshot frame — ignore
      }
    });

    es.onmessage = (e) => {
      try {
        applyRemoteEvent(JSON.parse(e.data) as RemoteEvent);
      } catch (err) {
        console.error('[sse] bad event:', err);
      }
    };
    // EventSource auto-reconnects on transient errors; we don't need an onerror handler.
  }

  // Re-open the SSE stream whenever the session role/name changes, so the server's
  // presence broadcast reflects who is now connected.
  let lastSessionKey = '';
  $effect(() => {
    const key = `${$session.role}:${$session.name ?? ''}`;
    if (key === lastSessionKey) return;
    lastSessionKey = key;
    connectSse();
  });

  onMount(() => {
    init();
    const unsub = theme.subscribe(() => {
      if (!cy) return;
      requestAnimationFrame(() => cy?.style(buildStylesheet() as any));
    });
    return unsub;
  });

  onDestroy(() => {
    cy?.destroy();
    evtSource?.close();
  });
</script>

<div class="app">
  <header>
    <div class="brand">
      <span class="brand-mark" aria-hidden="true"></span>
      <div class="brand-text">
        <p class="brand-kicker">OBSERVATORY</p>
        <h1>Learning Map</h1>
      </div>
    </div>
    <div class="header-right">
      {#if others.length > 0}
        <div
          class="presence"
          title={others.map((p) => `${p.name ?? 'Anon'} (${p.role})`).join(', ')}
        >
          <span class="pulse"></span>
          <span>{others.length} OTHER{others.length === 1 ? '' : 'S'}</span>
        </div>
      {/if}
      <ModeChip />
      <ThemeSwitcher />
    </div>
  </header>

  <div class="graph" bind:this={container}></div>

  {#if selected}
    {#key selected.planet.id}
      <NodeDetail
        planet={selected.planet}
        planetMeta={selected.planetMeta}
        satellites={selected.satellites}
        onClose={clearAll}
        onUpdate={handleUpdate}
        onDelete={handleSatelliteDelete}
        onAdd={handleSatelliteAdd}
        onPlanetDelete={handlePlanetDelete}
        onMetadataChange={handleMetadataChange}
        onQuizCorrect={() => handleQuizCorrect(selected!.planet.id)}
        startInEdit={openInEdit}
        canEdit={canEdit}
      />
    {/key}
  {/if}

  {#if edgePopover}
    <EdgePopover
      sourceTitle={edgePopover.sourceTitle}
      targetTitle={edgePopover.targetTitle}
      unlockDirection={edgePopover.unlockDirection}
      x={edgePopover.x}
      y={edgePopover.y}
      onDirectionChange={handleEdgeDirectionChange}
      onDelete={handleEdgeDelete}
      onClose={() => (edgePopover = null)}
    />
  {/if}

  {#if !selected && !drawMode}
    <div class="hint">
      <span class="hint-tick">—</span>
      <span>
        {canEdit
          ? 'CLICK A PLANET TO REVEAL ITS SATELLITES · USE + TO ADD'
          : 'CLICK A PLANET TO REVEAL ITS SATELLITES'}
      </span>
      <span class="hint-tick">—</span>
    </div>
  {/if}

  {#if drawMode}
    <div class="hint banner">
      <span class="banner-glyph">⊕</span>
      <span>CONNECT MODE · DRAG FROM ONE PLANET TO ANOTHER</span>
    </div>
  {/if}

  {#if canEdit}
    <div class="fab-stack">
      <button
        class="fab small"
        class:active={drawMode}
        onclick={toggleDrawMode}
        aria-label={drawMode ? 'Exit connect mode' : 'Connect planets'}
        title={drawMode ? 'Exit connect mode' : 'Connect planets'}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path
            d="M8 12a3 3 0 0 1 0-4l2-2a3 3 0 0 1 4 4l-1 1M12 8a3 3 0 0 1 0 4l-2 2a3 3 0 0 1-4-4l1-1"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <button class="fab" onclick={createNewPlanet} aria-label="New planet" title="New planet">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  {/if}
</div>

<svelte:window on:keydown={onWindowKey} />

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
    gap: 14px;
  }
  /* Tiny "ringed planet" ornament drawn purely from borders */
  .brand-mark {
    position: relative;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, var(--planet-border), var(--planet-edge) 70%);
    box-shadow: 0 0 14px rgba(140, 160, 255, 0.18);
    flex-shrink: 0;
  }
  .brand-mark::after {
    content: '';
    position: absolute;
    left: -5px;
    right: -5px;
    top: 50%;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--text), transparent);
    opacity: 0.45;
    transform: rotate(-18deg);
  }
  .brand-text {
    display: flex;
    flex-direction: column;
    line-height: 1;
  }
  .brand-kicker {
    margin: 0 0 2px;
    font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 9.5px;
    letter-spacing: 0.22em;
    color: var(--text-dim);
    text-transform: uppercase;
    opacity: 0.7;
  }
  h1 {
    margin: 0;
    font-family: 'Fraunces', ui-serif, Georgia, serif;
    font-optical-sizing: auto;
    font-weight: 500;
    font-size: 18px;
    letter-spacing: -0.005em;
    line-height: 1.1;
  }
  .graph {
    position: absolute;
    inset: 0;
  }
  .hint {
    position: absolute;
    bottom: 26px;
    left: 50%;
    transform: translateX(-50%);
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10.5px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    pointer-events: none;
    animation: fadeIn 1.6s ease-out;
    display: flex;
    align-items: center;
    gap: 10px;
    white-space: nowrap;
  }
  .hint-tick {
    color: var(--focus-ring);
    opacity: 0.6;
    font-family: 'Fraunces', serif;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .fab-stack {
    position: absolute;
    bottom: 24px;
    right: 24px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 9;
  }
  .fab {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
    display: grid;
    place-items: center;
    backdrop-filter: blur(14px) saturate(160%);
    -webkit-backdrop-filter: blur(14px) saturate(160%);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.04) inset,
      0 10px 28px -8px rgba(0, 0, 0, 0.45),
      0 3px 12px -3px rgba(0, 0, 0, 0.28);
    transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1), border-color 200ms, background 200ms;
    position: relative;
  }
  /* Hairline tick at the FAB's edge — instrument-panel detail */
  .fab::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 50%;
    border: 1px solid transparent;
    transition: border-color 250ms;
    pointer-events: none;
  }
  .fab.small {
    width: 40px;
    height: 40px;
  }
  .fab:hover {
    transform: translateY(-2px);
    border-color: var(--focus-ring);
  }
  .fab:hover::after {
    border-color: rgba(255, 255, 255, 0.06);
  }
  .fab:active {
    transform: translateY(0);
  }
  .fab.active {
    background: var(--focus-ring);
    color: var(--bg-base);
    border-color: var(--focus-ring);
  }
  .fab.active::after {
    border-color: var(--focus-ring);
    opacity: 0.35;
  }
  .banner {
    bottom: 92px;
    padding: 8px 14px;
    background: var(--panel-bg);
    border: 1px solid var(--focus-ring);
    border-radius: 4px; /* squarer — feels like a status read-out, not a pill */
    color: var(--text);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.45);
    letter-spacing: 0.16em;
    font-size: 10.5px;
    gap: 8px;
  }
  .banner-glyph {
    color: var(--focus-ring);
    font-family: 'Fraunces', serif;
    font-size: 13px;
    line-height: 1;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .presence {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px 6px 10px;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10.5px;
    letter-spacing: 0.14em;
    color: var(--text-dim);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    cursor: default;
  }
  .pulse {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5);
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
    70%  { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
    100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }
</style>
