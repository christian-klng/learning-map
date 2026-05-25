# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A graph-based learning interface for classroom teaching. Planets (top-level notes) float on a canvas; satellites (images, links, files, sub-notes) cluster around them on click. Built to be used by a teacher in front of a class first; individual student use comes later.

## Common commands

| Task | Command |
|---|---|
| Start dev server (Vite + SvelteKit on :5173) | `npm run dev` |
| Type-check the project | `npm run check` |
| Type-check on save | `npm run check:watch` |
| Production build (output to `build/`) | `npm run build` |
| Preview the production build locally | `npm run preview` |
| Generate a migration from `schema.ts` | `npm run db:generate` |
| Apply migrations to the DB | `npm run db:migrate` |
| Seed the demo data (truncates first) | `npm run db:seed` |
| Open Drizzle Studio | `npm run db:studio` |

Postgres for local dev runs in Docker — bring it up with `docker compose up -d` before running any `db:*` command. There is **no test suite** in this repo yet; don't go looking for `vitest`/`jest`/`playwright` configs.

## Stack

- **SvelteKit** (TS, Svelte 5 runes) + **adapter-node**
- **Cytoscape.js** + **cytoscape-fcose** layout + **cytoscape-edgehandles** for edge creation
- **Postgres** + **Drizzle ORM** (schema-as-TS, generated SQL migrations)
- **marked** for note markdown rendering (trusted input only for now)
- **Coolify on Hetzner** for deploy; **Coolify built-in persistent volumes** for future file uploads (no MinIO)

Each stack pick was a deliberate call in dialogue — see `/Users/christianklang/.claude/projects/-Users-christianklang-Documents-GitHub-learning-map/memory/project-stack-decisions.md` for the rationale. Don't propose alternatives (Supabase, S3, React Flow…) without a strong new reason.

## Data model — two relationships, kept distinct

```
nodes(id, type, title, content jsonb, parent_id, position jsonb, metadata jsonb, …)
edges(id, source_id, target_id, kind, label, metadata)
```

- **`parent_id`** → satellite-of (moons around a planet). Visualised as a ring on planet click.
- **`edges`** → knowledge connections between planets. Visualised as bezier curves on the canvas.

These two are *deliberately* separate. Don't merge them. Top-level "planets" are nodes with `parent_id IS NULL`. Satellites have a `parent_id` and are display-only on the canvas (`events: 'no'` in Cytoscape).

## Planet visuals — single SVG, baked, no Cytoscape gradient fill

Planet body (radial gradient) AND design overlay (rings / craters / bands / swirl) are baked into **one** SVG per planet — see `src/lib/graph/visual.ts`. The SVG is set as Cytoscape `background-image`. We do NOT use Cytoscape's `background-fill: radial-gradient` because layering gradient-fill with background-image is unreliable in the canvas renderer (we hit this bug and burned an iteration on it).

Same pattern for **satellite icons** — single SVG per satellite (coloured disc + monochrome line icon).

When a planet's `metadata.color` or `metadata.design` changes via the modal picker, we regenerate the SVG and push it via `cyNode.style('background-image', …)` (data-mapper alone doesn't always re-fire for `background-image`).

## Modal interaction model

- Click a planet → camera fits + satellites bloom out → **1300ms delay** → modal slides in. Delay exists so the user sees the ring before content covers it. Delay is cancellable (click another planet or background).
- Satellites are **not clickable** — they're shown together with the planet in the modal grid (1-or-2 column layout).
- Edge creation is gated behind a **Connect-mode toggle** (FAB at bottom-right). cytoscape-edgehandles v4 has no hover-handle anymore — it uses `enableDrawMode()`. The toggle prevents accidental connections during class.
- Edge deletion: click an edge → confirm → DELETE.

## Layout persistence

Planets persist `position`. On load:
- All planets positioned → `preset` layout (zero movement)
- Some positioned → `fcose` with `fixedNodeConstraint` pinning the positioned ones
- None positioned → fresh `fcose`

After the first `layoutstop`, positions for any new planets are auto-saved so subsequent reloads are stable.

## Local dev

```bash
docker compose up -d        # Postgres on host port 5433
npm run db:generate          # produce migration from schema
npm run db:migrate
npm run db:seed              # 3 planets, 6 satellites, 3 edges
npm run dev
```

**Postgres runs on host port 5433, not 5432**, because another container (`mac_scanner-db-1`) already holds 5432 on Christian's machine. The `.env` and `docker-compose.yml` both reflect this. Production via Coolify has no such conflict.

## Deploy

`Dockerfile` runs `node migrate.mjs && node build` on boot — migrations apply automatically before the server starts. `migrate.mjs` is plain ESM (no tsx in prod). Required Coolify env vars: `DATABASE_URL`, `ORIGIN`. See README for the full setup checklist.

## Conventions / gotchas

- **Markdown is currently trusted** (seed data + your own input). `marked` output rendered via `{@html}`. When user-authored content lands in Phase 5+, wrap with DOMPurify — there's an inline comment in `NodeDetail.svelte` reminding to do this.
- **Themes drive both DOM and Cytoscape.** CSS variables on `:root.theme-<name>`; Cytoscape stylesheet reads them via `getComputedStyle` at build time and rebuilds on theme switch.
- **Don't make satellites clickable.** They were briefly, but the design now is: planet click → modal with all content. If a future feature needs satellite-level interaction, design it explicitly.
- **Don't silently style-tweak when a visual bug is reported.** Christian iterates on visuals and expects a brief root-cause diagnosis alongside the fix (CSS layer-cycling, Cytoscape gradient-vs-image layering, etc. were teaching moments worth naming).

## Roadmap

- Phase 0 — scaffolding + visual polish ✅
- Phase 1a — content CRUD via modal ✅
- Phase 1b — edges + drag-to-pin + edit mode ✅
- Phase 4 — Coolify deploy plumbing (Dockerfile, migrate-on-boot, env docs) ✅
- Phase 2 — file/image uploads to `/app/uploads`, richer media handling
- Phase 3 — Postgres `LISTEN/NOTIFY` + Socket.IO realtime (classroom live-sync)
- Phase 5 — Auth (Lucia), per-user paths/highlights
- Phase 6 — Quiz node type + interactive elements

## Where to look first

- **`src/routes/+page.svelte`** — orchestrates everything: Cytoscape init, focus/expand state, edge-handles, FABs, mutation callbacks. The most complex file by far.
- **`src/lib/graph/`** — pure functions for visuals: `visual.ts` (SVG generators), `to-cytoscape.ts` (DB→element defs), `cytoscape-style.ts` (stylesheet from theme tokens), `color.ts` (lighten/darken).
- **`src/lib/components/NodeDetail.svelte`** — the modal: grid of cards, edit mode, design+color picker.
- **`src/lib/server/db/schema.ts`** — the canonical data model.
- **`src/routes/api/{nodes,edges}/`** — REST endpoints (POST / PATCH / DELETE).
- **`migrate.mjs`** at root — production migrator (plain ESM, runs on container boot).
