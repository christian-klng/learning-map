# Learning Map

An Obsidian-style graph UI for classroom learning. Nodes (notes / images / iframes / files) float on a canvas with knowledge-graph edges between them; satellites (e.g. an image attached to a note) orbit their parent.

**Stack:** SvelteKit + TypeScript · Cytoscape.js (fcose layout) · Postgres + Drizzle · Deployed via Coolify on Hetzner.

## Local setup

Prerequisites: Node 22+, Docker.

```bash
# 1. Install deps
npm install

# 2. Env
cp .env.example .env

# 3. Start Postgres
docker compose up -d

# 4. Generate Drizzle migration from the schema, then apply
npm run db:generate
npm run db:migrate

# 5. Seed (3 planets + 6 satellites + 3 edges)
npm run db:seed

# 6. Dev server
npm run dev
```

Open <http://localhost:5173>. Click a node to focus; click background to unfocus. Toggle theme top-right.

## Project layout

```
src/
├── app.css                     ← imports theme files; base resets
├── app.html
├── lib/
│   ├── components/             ← NodeDetail, ThemeSwitcher
│   ├── graph/
│   │   ├── cytoscape-style.ts  ← stylesheet built from CSS variables
│   │   └── to-cytoscape.ts     ← DB rows → Cytoscape elements
│   ├── server/
│   │   └── db/
│   │       ├── index.ts        ← drizzle client + pg pool
│   │       ├── schema.ts       ← nodes + edges tables (typed)
│   │       ├── migrate.ts      ← apply migrations
│   │       └── seed.ts         ← seed script
│   ├── stores/theme.ts         ← theme writable store
│   └── styles/themes/          ← space.css, light.css
└── routes/
    ├── +layout.svelte          ← applies theme class to <html>
    ├── +page.server.ts         ← loads nodes + edges
    └── +page.svelte            ← Cytoscape mount + focus logic
drizzle/                        ← generated migrations
docker-compose.yml              ← local Postgres
Dockerfile                      ← prod image (for Coolify)
```

## Data model

- **nodes** — id, type, title, content (jsonb per-type), parent_id (satellite-of), position, metadata
- **edges** — source_id, target_id, kind, label

Satellites use `parent_id`; knowledge connections use `edges`. The two relationships are kept distinct on purpose.

## Themes

`<html>` gets `theme-light` or `theme-space`. Each theme file defines CSS custom properties (`--bg`, `--node-bg`, `--text`, `--focus-ring`, ...). Both the DOM **and** the Cytoscape stylesheet read from these tokens — switching theme rebuilds Cytoscape's style on the fly.

To add a new theme: create `src/lib/styles/themes/<name>.css` with a `:root.theme-<name>` selector defining the same tokens, import it from `app.css`, and extend the `Theme` type + switcher.

## Deploy (Coolify)

Out of scope for Phase 0 — covered in Phase 5. In short:

1. Coolify project with two resources: **Postgres** (managed template) + **Application** (this repo, Dockerfile build).
2. Application → **Persistent Storage** → add named volume `uploads` mounted at `/app/uploads`.
3. Set `DATABASE_URL` env var to the in-network Postgres URL Coolify provides.
4. First deploy runs migrations on boot (TODO in Phase 5).

## Roadmap

- **Phase 0** (this) — scaffolding, schema, Cytoscape rendering of seed data, theme system ✅
- **Phase 1** — full node/edge CRUD via REST, drag-to-pin, edge creation UI
- **Phase 2** — file/image upload to `/app/uploads`, richer detail panel, markdown editor
- **Phase 3** — Postgres `LISTEN/NOTIFY` + Socket.IO for live classroom sync
- **Phase 4** — Coolify deploy + first classroom test
- **Phase 5** — Auth (Lucia), per-user paths and highlights
- **Phase 6** — Quiz node type, interactive elements
