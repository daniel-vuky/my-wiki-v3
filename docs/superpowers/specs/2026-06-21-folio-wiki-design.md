# Folio — Personal Knowledge Wiki: Design Spec

**Date:** 2026-06-21
**Status:** Approved design, pre-implementation
**Source design:** `README.md` (high-fidelity handoff) + `design/*.dc.html` (visual reference prototypes)

---

## 1. Overview

Folio is a self-hosted personal knowledge wiki with a writing-first aesthetic. A user signs in
with Google, organizes notes into colored **folders**, classifies them with **tags**, searches
across everything, and writes in a **rich block editor** (slash commands, formatting toolbar,
callouts, code, checklists, tables, image embeds). The whole app supports **light/dark themes**
(live-swappable), an **accent color** choice (amber/teal/blue/rose), and a swappable **editor body
font** (serif/sans).

The app is delivered as a **fully Dockerized full-stack application**, deployed to a personal
local server and exposed to the internet via **Cloudflare Tunnel**. It comprises five containers:
`db` (PostgreSQL), `redis` (cache/session/rate-limit), `api` (Fastify backend), `web` (nginx
serving the React build + reverse-proxying the API), and `cloudflared` (the tunnel).

This spec covers all 5 screens from the README: **Sign in, Home, Folder view, Editor, Search.**

### Design fidelity
High-fidelity. The README specifies exact colors, typography, spacing, and component states. The
UI must be recreated pixel-faithfully and then wired to real auth, data, and persistence. The
`design/*.dc.html` files are **visual reference only** — their in-house `.dc.html` runtime is
ignored; we rebuild in React.

---

## 2. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Vite + React 19 + TypeScript | SPA; CSS variables (no Tailwind) mapped 1:1 to README tokens |
| Routing | React Router | `/signin`, `/`, `/folder/:id`, `/note/:id`, `/search` |
| Client state | React Context + TanStack Query | Context for prefs/auth/UI; React Query for server data |
| Editor | BlockNote (Tiptap/ProseMirror) | Restyled to Folio tokens |
| Backend | Node + TypeScript + Fastify | REST API under `/api` |
| ORM | Drizzle ORM | TS-native; raw-SQL escape hatch for Postgres FTS |
| Database | PostgreSQL (Docker) | Full-text search via `tsvector` + `ts_headline` |
| Cache | Redis (Docker) | Hot reads, search results, sessions, rate limiting |
| Auth | Google OAuth 2.0 | Backend code→token exchange; session cookie |
| Static serving | nginx (Docker) | Immutable hashed assets; reverse-proxy `/api` |
| Tunnel | cloudflared (Docker) | Public ingress; no host ports exposed except via tunnel |

---

## 3. Architecture

### 3.1 Container topology (`docker-compose.yml`)

```
                    Internet
                       │
              Cloudflare Tunnel
                       │
        ┌──────────────┴───────────────┐
        │   cloudflared  (container)    │   tunnel; no exposed host ports
        └──────────────┬───────────────┘
                       │ http
   ┌───────────────────┴────────────────────┐
   │   web   (nginx)                          │  serves built React app,
   │   - static Vite build (immutable cache)  │  reverse-proxies /api/* → api
   └───────────────────┬────────────────────┘
                       │ /api/*
   ┌───────────────────┴────────────────────┐
   │   api   (Node + Fastify + TypeScript)    │  auth, CRUD, search, uploads
   └───────┬───────────────────────┬────────┘
           │                       │
   ┌───────┴────────┐     ┌────────┴─────────┐
   │  db (Postgres) │     │  redis (cache)   │
   │  vol: pgdata   │     │                  │
   └────────────────┘     └──────────────────┘

   volumes: pgdata (DB), uploads (note images), backups (host-mounted)
```

Five services: `db`, `redis`, `api`, `web`, `cloudflared`. The Cloudflare Tunnel points only at
`web`. Database, cache, and API are reachable only on the internal Docker network.

### 3.2 Request flow
1. Browser → Cloudflare Tunnel → `web` (nginx).
2. nginx serves the static SPA for non-`/api` routes; proxies `/api/*` to `api`.
3. `api` authenticates via session cookie, reads/writes Postgres through Drizzle, uses Redis for
   caching/sessions, and serves/stores uploaded images on the `uploads` volume.

### 3.3 Repository layout

```
folio/
├─ docker-compose.yml
├─ .env.example                      # secrets: DB creds, Google OAuth, session, tunnel token
├─ backups/                          # host-mounted; pg_dump output
├─ scripts/
│  └─ backup.sh                      # pg_dump → ./backups (cron-friendly)
├─ web/
│  ├─ Dockerfile                     # multi-stage: build Vite → nginx
│  ├─ nginx.conf                     # immutable assets, SPA fallback, /api proxy
│  └─ src/                           # React app (see §4)
└─ api/
   ├─ Dockerfile
   └─ src/                           # Fastify app (see §5)
```

---

## 4. Frontend Design

### 4.1 Directory structure
```
web/src/
├─ main.tsx, App.tsx                 # router + providers (Query, Auth, Prefs)
├─ theme/
│  ├─ tokens.css                     # all README CSS vars: theme/accent/font
│  └─ fonts.css                      # Google Fonts (Schibsted Grotesk, Newsreader, JetBrains Mono)
├─ api/
│  └─ client.ts                      # typed fetch wrapper; React Query hooks
├─ state/
│  ├─ AuthContext.tsx                # current user, sign-in/out
│  └─ PrefsContext.tsx               # theme/accent/editorFont; persisted; sets data-* on <html>
├─ components/
│  ├─ Sidebar.tsx                    # shared 260px sidebar
│  ├─ icons.tsx                      # Lucide icons
│  └─ ui/                            # Button, Chip, Card, Kbd, Avatar, Toggle, Popover, ...
├─ editor/
│  ├─ FolioEditor.tsx                # BlockNote instance
│  └─ blocknote-folio.css            # token-mapped editor theme
└─ screens/
   ├─ SignIn.tsx, Home.tsx, Folder.tsx, Editor.tsx, Search.tsx
```

### 4.2 Theming
`tokens.css` declares every README variable under `:root`/`[data-theme="dark|light"]`,
`[data-accent="amber|teal|blue|rose"]`, and `[data-editorfont="Serif|Sans"]`. `PrefsContext` sets
these attributes on `<html>` and persists choices to localStorage. Folder hue colors are fixed per
the README table and stored per-folder. BlockNote is themed by mapping its CSS variables to ours.

Exact token values, the type ramp, spacing rhythm, radii, shadows, focus rings, selection color,
and the blinking caret animation are taken verbatim from README §"Design Tokens".

### 4.3 Shared Sidebar (260px)
Per README §"Shared Component: Sidebar": workspace header, search button (`⌘K`), accent New-note
button, Favorites, Folders (with colored dots + counts; active row uses `--accent-soft` /
`--accent-text`), Tags chips, and a pinned account row. Data is live (folders/favorites/tags from
the API), not hardcoded.

### 4.4 Screens (all per README §"Screens / Views")
1. **Sign in** — two-column split; left brand panel with dotted texture + feature rows; right panel
   with the official **Continue with Google** button (white in both themes). Initiates the Google
   OAuth flow. The README's secondary "Continue with email" button is rendered for visual fidelity
   but **disabled / non-functional** in this build (auth is Google-only — see §5.3).
2. **Home (Dashboard)** — top bar (date, greeting, Filter, New note); "Continue where you left off"
   recent-cards grid; "Folders" cards grid with hue-soft icons, counts, descriptions, tag chips.
3. **Folder view** — breadcrumb, folder header (color square, title, description, sort + list/grid
   toggle), filter chips, and the bordered note list (rows with title, snippet, tag chips, time).
4. **Editor (hero)** — top bar (breadcrumb, edited time, star/more, accent Share); centered
   document column (max-width 760). BlockNote renders Title (Newsreader), tag meta row, paragraphs,
   **callout**, headings, **code block** (filename header + Copy + syntax tint), **checklist**,
   **table**, **image embed**, and the **slash-command menu** + **floating selection toolbar**.
5. **Search** — focused search header with `esc` chip; results count + filter chips + sort; left
   facet rail (Type, Folder with counts); results list with `<mark>` highlights in titles + snippets.

### 4.5 Editor specifics (BlockNote)
- Block types required: paragraph, heading (H1/H2), to-do/checklist, code block, callout, table,
  image. BlockNote provides slash menu, selection/formatting toolbar, and these blocks out of the
  box; we **restyle** them to match the README exactly (toolbar pill, slash popover, code header
  with filename + Copy, checklist square styles, callout accent bar, table borders).
- Behaviors: `/` opens a filterable, arrow-navigable command menu; selecting text shows the
  floating toolbar (B/i/U, link, code, highlight, H2); checkbox toggle; Copy on code blocks; Share.
- Autosave: debounced; **optimistic** UI via React Query mutation so typing never blocks on network.

### 4.6 Client-side caching (layers 1–3 of the caching strategy)
- **Static assets:** nginx serves content-hashed JS/CSS/fonts with `Cache-Control: immutable,
  max-age=31536000`; `index.html` with `no-cache`.
- **Data cache:** TanStack Query with stale-while-revalidate — screens render from cache instantly,
  then revalidate. Query keys: `folders`, `notes`, `note:{id}`, `search:{query+filters}`.
  Mutations (note save, favorite, folder edit) invalidate the relevant keys; editor save is optimistic.
- **HTTP revalidation:** API read endpoints emit `ETag`/`Last-Modified`; browser revalidates with
  cheap `304`s. Note content ETag is derived from `updated_at`.

---

## 5. Backend Design

### 5.1 Directory structure
```
api/src/
├─ server.ts                         # Fastify bootstrap, plugins, error handling
├─ db/
│  ├─ schema.ts                      # Drizzle schema (see §6)
│  └─ migrate.ts                     # migrations runner
├─ cache/redis.ts                    # Redis client + helpers (get/set TTL, invalidate)
├─ auth/
│  ├─ google.ts                      # OAuth code→token exchange, profile fetch
│  ├─ session.ts                     # session create/verify (Redis-backed), cookie
│  └─ middleware.ts                  # requireAuth hook
├─ routes/
│  ├─ auth.ts                        # GET /api/auth/google, /callback, POST /logout, GET /me
│  ├─ folders.ts                     # CRUD
│  ├─ notes.ts                       # CRUD + favorite toggle
│  ├─ search.ts                      # full-text search + facets
│  └─ uploads.ts                     # image upload/serve (uploads volume)
└─ lib/markdown.ts                   # BlockNote JSON → plaintext/markdown (for FTS + export)
```

### 5.2 API endpoints (REST under `/api`)
- **Auth:** `GET /auth/google` (redirect to Google), `GET /auth/google/callback` (exchange code,
  upsert user, create session, set cookie), `POST /auth/logout`, `GET /auth/me`.
- **Folders:** `GET /folders`, `POST /folders`, `PATCH /folders/:id`, `DELETE /folders/:id`.
- **Notes:** `GET /notes?folder=&favorite=&tag=`, `GET /notes/:id`, `POST /notes`,
  `PATCH /notes/:id`, `DELETE /notes/:id`, `POST /notes/:id/favorite`.
- **Tags:** `GET /tags` (with counts).
- **Search:** `GET /search?q=&folder=&type=&tag=&sort=` → results with `ts_headline` highlight
  fragments + facet counts.
- **Uploads:** `POST /uploads` (multipart → `uploads` volume), `GET /uploads/:id`.

### 5.3 Authentication (Google OAuth 2.0)
- Backend holds the Google OAuth client ID/secret (env). The redirect URI is the Cloudflare tunnel
  domain (`https://<tunnel-domain>/api/auth/google/callback`).
- Flow: frontend hits `/api/auth/google` → redirect to Google → callback exchanges the code for
  tokens → fetch profile → upsert `users` row → create a server session stored in Redis → set a
  secure, httpOnly session cookie. `requireAuth` validates the cookie on protected routes.
- This is a single-user / small-trusted-user wiki; new Google identities are accepted and upserted
  (optionally restricted by an allowlist env var).

### 5.4 Search (Postgres full-text)
- Each note maintains a generated `search_vector tsvector` built from title (weight A), tags
  (weight B), and derived plaintext (weight C), with a GIN index.
- `/search` runs `websearch_to_tsquery`, ranks with `ts_rank`, and returns highlighted fragments
  via `ts_headline` (wrapped so the frontend renders `<mark>` per README styling). Facet counts
  (by type/folder/tag) are computed in the same request.
- Search results are cached in Redis keyed by `q+filters` with a short TTL; invalidated on note
  writes.

### 5.5 Server-side caching (layer 4: Redis)
- **Sessions:** server sessions stored in Redis (TTL + sliding expiry).
- **Hot reads:** folder lists, tag counts, recent notes cached with short TTLs; invalidated on the
  corresponding write.
- **Search results:** cached per query+filters (short TTL).
- **Rate limiting:** Fastify rate-limit backed by Redis on auth and write endpoints.

---

## 6. Data Model (PostgreSQL via Drizzle)

```
users
  id (uuid pk), google_sub (unique), email (unique), name, avatar_url,
  created_at, updated_at

prefs            (1:1 with users)
  user_id (pk/fk), theme ('dark'|'light'), accent ('amber'|'teal'|'blue'|'rose'),
  editor_font ('Serif'|'Sans')

folders
  id (uuid pk), user_id (fk), name, slug, color (hex), description,
  sort_order (int), created_at, updated_at

notes
  id (uuid pk), user_id (fk), folder_id (fk null), title,
  content (jsonb)        -- BlockNote block array (source of truth)
  plaintext (text)       -- derived from content; feeds search + export
  favorite (bool), created_at, updated_at,
  search_vector (tsvector generated)   -- GIN indexed

tags
  id (uuid pk), user_id (fk), name (unique per user)

note_tags        (m:n)
  note_id (fk), tag_id (fk), pk(note_id, tag_id)

uploads
  id (uuid pk), user_id (fk), note_id (fk null), filename, mime, size,
  path (uploads volume), created_at
```

Notes: `content` JSONB is the editing source of truth (perfect BlockNote fidelity); `plaintext`
and Markdown export are derived for search + portable backups. Favorites are `notes.favorite`;
folder counts and tag counts are computed (and cached).

---

## 7. Deployment & Operations

### 7.1 docker-compose services
- **db** — `postgres:16`, env creds, volume `pgdata`, healthcheck.
- **redis** — `redis:7`, optional appendonly persistence, internal only.
- **api** — built from `api/Dockerfile`; depends on db + redis; runs migrations on start; env:
  DB URL, Redis URL, Google OAuth client/secret, session secret, public base URL.
- **web** — multi-stage build (Vite → nginx); serves SPA + proxies `/api` to `api`.
- **cloudflared** — `cloudflare/cloudflared`, runs the tunnel from a token/credentials; routes the
  public hostname to `web:80`. No host ports published for app services.

### 7.2 Configuration (`.env`)
DB name/user/password, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`,
`PUBLIC_BASE_URL` (tunnel domain), `CLOUDFLARE_TUNNEL_TOKEN`, optional `ALLOWED_EMAILS`.

### 7.3 Backups
- Postgres data persists in the `pgdata` named volume.
- `scripts/backup.sh` runs `pg_dump` into the host-mounted `./backups` directory (timestamped,
  cron-friendly) — the user later syncs `./backups` to a drive.
- Secondary portable backup: notes are exportable as Markdown (from `content`/`plaintext`).

---

## 8. State Management Summary
- **Persisted prefs:** `theme`, `accent`, `editorFont` (localStorage + `prefs` table).
- **Auth:** session cookie (httpOnly); `GET /auth/me` hydrates `AuthContext`.
- **Server data (React Query):** `folders`, `notes`, `note:{id}`, `tags`, `search:{…}`.
- **Local UI state:** current folder/note, search query + filters, view toggles, popover/menu open
  state, editor selection.

---

## 9. Out of Scope (YAGNI for this build)
- Multi-user collaboration / real-time co-editing.
- Sharing links / public note publishing (the Share button is present per design but wires to a
  no-op/placeholder for now unless trivially supported).
- Mobile-native apps.
- Note version history UI (Postgres backups exist, but no in-app history browser).
- Email/password sign-in (the README's secondary email button is visual-only; auth is Google-only).

---

## 10. Acceptance Criteria
1. `docker compose up` brings up all five services; the app is reachable via the Cloudflare tunnel
   domain.
2. Google sign-in completes and persists a session; sign-out works.
3. All 5 screens match the README design (tokens, type, spacing, states) in both themes, all four
   accents, and both editor fonts, with choices persisted.
4. Notes/folders/tags CRUD works against Postgres; the editor autosaves optimistically with all
   required block types.
5. Search returns ranked results with `<mark>` highlights and working facets.
6. Caching is demonstrably active: immutable static assets, React Query SWR, ETag/304s, and Redis
   for sessions/hot reads/search/rate-limiting.
7. `scripts/backup.sh` produces a restorable `pg_dump` in `./backups`.
