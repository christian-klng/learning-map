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

## Deploy (Coolify on Hetzner)

The `Dockerfile` runs `node migrate.mjs && node build` on boot — schema migrations are applied automatically before the server starts.

### One-time Coolify setup

1. **Application** resource → connect to this GitHub repo. Build pack should auto-detect **Dockerfile**.
2. **Postgres** resource in the same project (Coolify template is fine).
3. In the Application's **Storage** tab, add a **Persistent Storage Volume**:
   - Name: `uploads`
   - Mount path: `/app/uploads`
   - (Used in Phase 2 for file/image uploads. Add it now so the volume survives later deploys.)

### Required environment variables

Set these on the Application in Coolify:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgres://...` | Coolify offers an "Connect" button on the Postgres resource — use the **internal** URL (resolves over the Docker network). |
| `ORIGIN` | `https://your-domain.example` | **Required.** SvelteKit's adapter-node uses this for CSRF protection on POST/PATCH/DELETE. Must match the public URL Coolify routes to. |
| `STUDENT_PASSWORD` | _your choice_ | Password for student edit mode. Share with the class. |
| `ADMIN_PASSWORD` | _your choice_ | Teacher-only password. Reserved for admin-only operations on top of student edit. |
| `SESSION_SECRET` | _32+ random chars_ | HMAC key for signed session cookies. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. **App refuses to start in production without this.** |
| `NODE_ENV` | `production` | Already set in the Dockerfile, harmless to repeat. |

The Dockerfile already sets `HOST=0.0.0.0`, `PORT=3000`, and `BODY_SIZE_LIMIT=20M`. Coolify exposes 3000 internally and Traefik handles SSL on the public side.

### Health & deploy

- The container exposes `GET /` as a healthcheck (HTTP 200 once SvelteKit is ready).
- Push to the connected branch → Coolify rebuilds the image → runs migrations → starts the server.
- First deploy: the DB is empty. Run `npm run db:seed` against the prod DB once if you want the demo content (or just create planets via the `+` button).

## Modes

A chip in the top-right toggles between three modes. The current mode lives in a signed,
http-only cookie, so it survives refresh and works per-browser.

| Mode | What you can do | How to enter |
|---|---|---|
| **View** | Read everything. Click planets, open modals, read content. No edit affordances. | Default. Click "Lock to view" from any other mode. |
| **Edit** (student) | Add / edit / delete planets, satellites, edges. Drag to reposition. Change planet color & design. | Type your name + the student password. Lasts 4h. |
| **Admin** (teacher) | Everything above. Reserved for future admin-only operations. | Admin password. Optional name (defaults to "Teacher"). Lasts 1h. |

A presence pill near the chip shows other people currently connected. Edits broadcast over
Server-Sent Events (Postgres `LISTEN/NOTIFY` → fan-out) so classmates see changes in real time
without refreshing.

## Roadmap

- **Phase 0** — scaffolding, schema, Cytoscape rendering, theme system ✅
- **Phase 1a/b** — full node/edge CRUD, drag-to-pin, edge creation UI ✅
- **Phase 3** — realtime sync via Postgres `LISTEN/NOTIFY` + SSE ✅
- **Phase 4** — Coolify deploy ✅
- **Phase 5a** — student access with mode toggle + author stamping ✅
- **Phase 2** — file/image upload to `/app/uploads`, richer media handling
- **Phase 5b** — proper auth (Lucia), per-user paths and highlights
- **Phase 6** — Quiz node type, interactive elements
