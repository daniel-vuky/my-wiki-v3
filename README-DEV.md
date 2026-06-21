# Folio — Developer & Operations Guide

## Overview

Folio is a personal wiki / note-taking app with a Fastify (TypeScript) API backend, PostgreSQL full-text search, Redis-backed sessions and caching, and a React (Vite + BlockNote) frontend. In production it is accessed through a Cloudflare Tunnel — no ports are published directly.

### 5-container architecture

| Service | Image | Role |
|---|---|---|
| **db** | postgres:16-alpine | Primary store, full-text search via tsvector/GIN |
| **redis** | redis:7-alpine | Sessions, hot-read cache, search cache, rate-limit counter |
| **api** | ./api (node:22-alpine) | Fastify REST API on port 3000, runs migrations on boot |
| **web** | ./web (nginx:alpine) | Serves Vite SPA, proxies `/api/` → `api:3000` |
| **cloudflared** | cloudflare/cloudflared | Tunnel client — routes public HTTPS → `web:80` |

No host ports are published in the compose file; all traffic reaches the stack through the Cloudflare tunnel in production.

---

## Prerequisites

- Docker + Docker Compose v2
- A **Google OAuth 2.0** client ID and secret — create one at <https://console.cloud.google.com/apis/credentials>
  - Authorised redirect URI: `https://<your-tunnel-domain>/api/auth/google/callback`
- A **Cloudflare Tunnel** token — create a tunnel at <https://one.dash.cloudflare.com> and copy the token

---

## Setup

```bash
cp .env.example .env
```

Edit `.env` and fill in every value:

| Variable | Notes |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Postgres credentials (also used in `DATABASE_URL`) |
| `DATABASE_URL` | `postgres://<user>:<password>@db:5432/<db>` |
| `REDIS_URL` | `redis://redis:6379` (default works unchanged) |
| `SESSION_SECRET` | Random string, minimum 32 bytes |
| `PUBLIC_BASE_URL` | Full HTTPS URL of your tunnel domain, e.g. `https://folio.example.com` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `CLOUDFLARE_TUNNEL_TOKEN` | From Cloudflare dashboard |
| `ALLOWED_EMAILS` | Optional comma-separated list to restrict logins; leave empty to allow any Google account |

> **Important:** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` must be non-empty — the api validates all required env vars on boot and will crash with `Missing required env var: <name>` if any are blank.

---

## Run

### Full production stack (all 5 services)

```bash
docker compose up -d --build
```

### Local dev without a Cloudflare tunnel

Start only the infrastructure and static frontend:

```bash
docker compose up -d db redis api web
```

Then use the Vite dev server for hot-reload frontend development:

```bash
cd web && npm run dev    # Vite proxies /api → localhost:3000
```

Run the api locally (against the compose db/redis) — db and redis are not published by default so you need to either:

- Add temporary `ports:` entries to `docker-compose.yml` for db (`5432:5432`) and redis (`6379:6379`), or
- Run the api inside compose and develop only the frontend locally.

```bash
cd api && npm run dev    # tsx watch — auto-reloads on save
```

---

## Migrations

Migrations run automatically when the api container starts. To run them manually:

```bash
# inside the repo (requires DATABASE_URL pointing at a running db)
cd api && npm run migrate

# or via docker compose
docker compose exec api node dist/db/migrate.js
```

Migration files live in `api/drizzle/`.

---

## Seeding

New users are automatically seeded with 6 default folders and sample notes on their first Google sign-in (handled in the auth callback). To seed a user manually by their UUID:

```bash
cd api && npm run seed <userId>
```

---

## Backups

```bash
./scripts/backup.sh
```

Writes a gzip-compressed pg_dump to `./backups/folio-YYYYMMDD-HHMMSS.sql.gz`. Keeps the 14 most recent backups (older ones are deleted automatically).

**Restore:**

```bash
gunzip -c backups/<file>.sql.gz | docker compose exec -T db psql -U folio -d folio
```

---

## Integration Smoke Test Results

The following was verified on 2026-06-21 using `docker compose build api web` + `docker compose up -d db redis api web`.

| Check | Command | Result |
|---|---|---|
| **api image build** | `docker compose build api` | PASS — TypeScript compiled clean (`tsc` exit 0) |
| **web image build** | `docker compose build web` | PASS — Vite built 4 chunks (453 B index.html, 1.3 MB main JS gzipped to 393 kB) |
| **api boot** | `docker compose logs api` | PASS — `api listening on 3000`; migrations ran silently (drizzle migrator prints nothing on success) |
| **api health (direct)** | `wget -qO- http://127.0.0.1:3000/api/health` inside api container | PASS — `{"status":"ok"}` |
| **api health (via nginx)** | `wget -qO- http://127.0.0.1/api/health` inside web container | PASS — `{"status":"ok"}` |
| **db tables** | `psql … \dt` | PASS — 7 tables: folders, note_tags, notes, prefs, tags, uploads, users |
| **notes schema** | `psql … \d notes` | PASS — `search_vector tsvector`, `tags_text text`, GIN index `notes_search_idx`, trigger `notes_search_vector_trg` |
| **index.html cache header** | nginx response headers | PASS — `Cache-Control: no-cache` |
| **hashed asset cache header** | `/assets/index-Dcxj5smR.js` headers | PASS — `Cache-Control: public, max-age=31536000, immutable` |
| **redis** | `redis-cli ping` | PASS — `PONG` |
| **api unit tests** | `cd api && npx vitest run` | PASS — 12 tests in 7 files |
| **web unit tests** | `cd web && npx vitest run` | PASS — 2 tests in 2 files |

**Note on `wget localhost` inside alpine containers:** busybox wget fails to connect to `localhost` in these containers but `127.0.0.1` works. This is a busybox DNS resolution quirk inside the container network; it has no effect on real traffic routing (nginx → api works correctly).

---

## Caching Architecture

| Layer | Mechanism |
|---|---|
| Static JS/CSS (hashed filenames) | nginx: `Cache-Control: public, max-age=31536000, immutable` |
| `index.html` | nginx: `Cache-Control: no-cache` (forces revalidation on each load) |
| API reads (notes list, single note) | React Query with stale-while-revalidate; `GET /api/notes/:id` returns `ETag` / `304 Not Modified` |
| Editor saves | Optimistic updates in React Query (local state reflects save immediately) |
| Sessions | Redis-backed via `@fastify/cookie` + ioredis |
| Hot-read cache (notes, search results) | Redis keys set/invalidated in the api cache layer |
| Rate limiting | Redis counter via `@fastify/rate-limit` |

---

## Deferred / Manual Steps (Require Real Secrets)

The following steps cannot be automated without a real Google OAuth client and a Cloudflare tunnel token. Run them manually once credentials are in `.env`:

1. **Google sign-in flow** — navigate to `https://<your-domain>/`, click "Sign in with Google", confirm redirect to `/api/auth/google` and callback to `/api/auth/google/callback`, then landing on the dashboard.
2. **Auto-seeding on first login** — confirm 6 default folders and sample notes appear for the new user.
3. **Create / edit a note** — open a note, type content in the BlockNote editor, navigate away and return; confirm content persisted.
4. **Favorite a note** — toggle the favorite star; confirm it appears in the Favorites section of the sidebar.
5. **Folder browse** — create a folder, move a note into it, browse the folder view.
6. **Full-text search** — search for a word in a note body; confirm highlighted results appear.
7. **Theme / accent / font persistence** — change theme, accent colour, and font in Settings; reload the page; confirm preferences persisted.
8. **ALLOWED_EMAILS restriction** — set `ALLOWED_EMAILS` to a specific address; confirm a different Google account is rejected.
9. **Cloudflare tunnel** — set `CLOUDFLARE_TUNNEL_TOKEN` and `docker compose up -d cloudflared`; confirm the public domain is reachable and TLS is valid.
10. **Backup script** — run `./scripts/backup.sh` with a real running stack and confirm the `.sql.gz` is restorable.
