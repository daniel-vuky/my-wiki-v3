# Folio

A self-hosted personal knowledge wiki with a writing-first aesthetic. Sign in with Google, organise notes into nested colour-coded folders, tag and search across everything, and write in a rich block editor — all running as a small Docker stack you host yourself.

## Features

- **Rich block editor** (BlockNote) — slash commands, formatting toolbar, headings, callouts, code blocks, checklists, tables, and image embeds, with debounced autosave.
- **Folders** — nested/multi-level, colour-coded, with descriptions; favourite the ones you use most.
- **Tags** — tag notes and browse a tag-filtered view.
- **Full-text search** — Postgres-powered with prefix matching (typing `dist` matches `distributed`) and highlighted results, with folder facets.
- **Favourites** — favourite posts and folders; both surface in the sidebar.
- **Theming** — light/dark themes, four accent colours, and a swappable editor font; preferences persist per user (server-side).
- **Google sign-in** — OAuth 2.0, with an optional email allowlist.
- **Self-hosted** — one `docker compose up` brings up the whole stack; you put your own reverse proxy / Cloudflare tunnel in front.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript, Vite, React Router, TanStack Query, BlockNote |
| Backend | Node + TypeScript, Fastify, Drizzle ORM |
| Database | PostgreSQL (full-text search via `tsvector`/GIN) |
| Cache | Redis (sessions, hot-read & search cache, rate limiting) |
| Serving | nginx (serves the SPA, proxies `/api`) |

## Architecture

Four containers on a private Docker network:

| Service | Role |
|---|---|
| **web** | nginx — serves the built SPA and proxies `/api/` → `api`. The only service that publishes a host port. |
| **api** | Fastify REST API; runs DB migrations on boot. |
| **db** | PostgreSQL — notes, folders, tags, users, prefs. |
| **redis** | Sessions, caching, rate-limit counters. |

Only `web` is published to the host (configurable via `WEB_PORT`); `api`, `db`, and `redis` are reachable only on the internal network, so the stack coexists cleanly with other projects on the same server. Point your own reverse proxy or Cloudflare tunnel at `localhost:${WEB_PORT}` for public access.

## Prerequisites

- Docker + Docker Compose v2
- A **Google OAuth 2.0** client ID and secret ([Google Cloud Console](https://console.cloud.google.com/apis/credentials))
  - Authorised redirect URI: `<PUBLIC_BASE_URL>/api/auth/google/callback`
    (e.g. `http://localhost:8080/api/auth/google/callback` locally, or `https://your-domain/api/auth/google/callback` behind a proxy)

## Setup

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Notes |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Postgres credentials (also referenced by `DATABASE_URL`) |
| `DATABASE_URL` | `postgres://<user>:<password>@db:5432/<db>` |
| `REDIS_URL` | `redis://redis:6379` (default works) |
| `WEB_PORT` | Host port the app is published on (default `8080`); change to avoid clashes |
| `API_PORT` | Internal api port (default `3000`); not published to the host |
| `SESSION_SECRET` | Random string, ≥ 32 bytes |
| `PUBLIC_BASE_URL` | Origin the app is served from — `http://localhost:<WEB_PORT>` locally, or your public `https://` domain |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From Google Cloud Console (must be set — the api validates required env on boot) |
| `ALLOWED_EMAILS` | Optional comma-separated allowlist; empty = any Google account |

## Run

```bash
docker compose up -d --build
```

The app is served at `http://localhost:${WEB_PORT}` (default <http://localhost:8080>). Migrations run automatically on api startup. There is **no sample data** — a fresh deploy starts empty, and a new account begins with no folders or notes.

### Local development (hot reload)

The compose stack runs everything; for frontend hot-reload, use the Vite dev server (it proxies `/api` to the running api):

```bash
cd web && npm run dev
```

## Backups

`db` data lives in the `pgdata` Docker volume. Create a timestamped, gzip-compressed dump (keeps the last 14):

```bash
./scripts/backup.sh        # writes to ./backups/folio-<timestamp>.sql.gz
```

Restore:

```bash
gunzip -c backups/<file>.sql.gz | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

## Project structure

```
folio/
├─ docker-compose.yml      # web, api, db, redis
├─ .env.example            # configuration template
├─ scripts/backup.sh       # pg_dump backup helper
├─ api/                    # Fastify + Drizzle backend
│  ├─ src/                 # routes, services, auth, db schema, cache
│  └─ drizzle/             # SQL migrations
└─ web/                    # React + Vite frontend
   ├─ src/                 # screens, components, editor, state, api client
   └─ nginx.conf.template  # SPA serving + /api proxy (API_PORT templated at start)
```

## Tests

```bash
cd api && npm test     # Fastify/Drizzle unit tests (Vitest)
cd web && npm test     # React unit tests (Vitest)
```

## License

Private project.
