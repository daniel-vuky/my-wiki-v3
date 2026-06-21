# Folio Wiki Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Folio — a self-hosted, fully-Dockerized personal knowledge wiki with Google sign-in, colored folders, tags, a rich block editor, and full-text search, matching the README's high-fidelity design across all 5 screens.

**Architecture:** Five Docker services behind a Cloudflare Tunnel — `web` (nginx serving the Vite/React SPA + reverse-proxying `/api`), `api` (Fastify + Drizzle), `db` (PostgreSQL), `redis` (cache/session/rate-limit), and `cloudflared`. The browser talks only to `/api`; the API owns auth, CRUD, Postgres full-text search, image uploads, and Redis-backed caching.

**Tech Stack:** Vite + React 19 + TypeScript, React Router, TanStack Query, BlockNote (frontend); Node + Fastify + Drizzle ORM + PostgreSQL + Redis + Google OAuth (backend); Docker Compose + nginx + cloudflared (infra). Tests: Vitest everywhere; Fastify `.inject()` for API; React Testing Library for UI.

**Source spec:** `docs/superpowers/specs/2026-06-21-folio-wiki-design.md` (refer to it for exact design tokens, type ramp, and per-screen detail).

---

## File Structure

Monorepo with two app packages (`web/`, `api/`) plus root infra. Files grouped by responsibility.

```
folio/
├─ docker-compose.yml              # 5 services, volumes, internal network
├─ .env.example                    # all secrets/config keys
├─ .gitignore
├─ scripts/backup.sh               # pg_dump → ./backups
├─ api/
│  ├─ Dockerfile                   # node build → runtime
│  ├─ package.json, tsconfig.json, vitest.config.ts
│  ├─ drizzle.config.ts
│  └─ src/
│     ├─ server.ts                 # Fastify bootstrap + plugin wiring
│     ├─ app.ts                    # buildApp(): returns configured Fastify (testable)
│     ├─ env.ts                    # parsed/validated env
│     ├─ db/
│     │  ├─ client.ts              # drizzle + pg pool
│     │  ├─ schema.ts              # all tables
│     │  └─ migrate.ts             # run migrations on boot
│     ├─ cache/redis.ts            # redis client + cache helpers
│     ├─ auth/
│     │  ├─ google.ts              # OAuth URL + code→token + profile
│     │  ├─ session.ts            # create/verify session in redis + cookie
│     │  └─ middleware.ts          # requireAuth hook
│     ├─ lib/markdown.ts           # BlockNote JSON → plaintext
│     ├─ services/
│     │  ├─ folders.ts             # folder data access
│     │  ├─ notes.ts               # note data access
│     │  ├─ tags.ts                # tag data access
│     │  └─ search.ts              # FTS query + facets
│     └─ routes/
│        ├─ auth.ts, folders.ts, notes.ts, tags.ts, search.ts, uploads.ts
└─ web/
   ├─ Dockerfile                   # vite build → nginx
   ├─ nginx.conf
   ├─ package.json, tsconfig.json, vite.config.ts, vitest.config.ts
   ├─ index.html
   └─ src/
      ├─ main.tsx, App.tsx
      ├─ theme/tokens.css, fonts.css
      ├─ api/client.ts             # typed fetch + React Query hooks
      ├─ types.ts                  # shared TS types (Folder, Note, …)
      ├─ state/AuthContext.tsx, PrefsContext.tsx
      ├─ components/
      │  ├─ Sidebar.tsx, icons.tsx
      │  └─ ui/{Button,Chip,Card,Kbd,Avatar,Toggle,Popover}.tsx
      ├─ editor/FolioEditor.tsx, blocknote-folio.css
      └─ screens/{SignIn,Home,Folder,Editor,Search}.tsx
```

**Conventions used throughout:**
- API runs on port `3000`; Postgres `5432`; Redis `6379` (internal only).
- All API responses are JSON; errors use `{ error: { code, message } }`.
- TypeScript types shared by hand-copy between `api/src` and `web/src/types.ts` (no shared package — keep it simple; types are small).
- Commit after every task with the message shown in its final step.

---

## Phase 0 — Repo scaffolding & Docker infrastructure

### Task 1: Root scaffolding & .gitignore

**Files:**
- Create: `.gitignore`, `.env.example`, `README-DEV.md`

- [ ] **Step 1: Write `.gitignore`**

```gitignore
.DS_Store
node_modules/
dist/
.env
backups/*
!backups/.gitkeep
*.log
```

- [ ] **Step 2: Write `.env.example`**

```bash
# Postgres
POSTGRES_USER=folio
POSTGRES_PASSWORD=change-me
POSTGRES_DB=folio
DATABASE_URL=postgres://folio:change-me@db:5432/folio

# Redis
REDIS_URL=redis://redis:6379

# API
API_PORT=3000
SESSION_SECRET=change-me-32-bytes-min
PUBLIC_BASE_URL=https://folio.example.com
ALLOWED_EMAILS=          # comma-separated; empty = allow any Google account

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Cloudflare Tunnel
CLOUDFLARE_TUNNEL_TOKEN=
```

- [ ] **Step 3: Create backups placeholder**

```bash
mkdir -p backups && touch backups/.gitkeep
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore .env.example backups/.gitkeep
git commit -m "chore: root scaffolding and env template"
```

### Task 2: API package init

**Files:**
- Create: `api/package.json`, `api/tsconfig.json`, `api/vitest.config.ts`

- [ ] **Step 1: Write `api/package.json`**

```json
{
  "name": "folio-api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "migrate": "tsx src/db/migrate.ts",
    "db:generate": "drizzle-kit generate",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@fastify/cookie": "^10.0.0",
    "@fastify/multipart": "^9.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "drizzle-orm": "^0.36.0",
    "fastify": "^5.0.0",
    "ioredis": "^5.4.0",
    "pg": "^8.13.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/pg": "^8.11.0",
    "drizzle-kit": "^0.28.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Write `api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `api/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 4: Install & verify**

Run: `cd api && npm install && npx tsc --noEmit`
Expected: installs cleanly; `tsc` passes (no source files yet → no errors).

- [ ] **Step 5: Commit**

```bash
git add api/package.json api/tsconfig.json api/vitest.config.ts api/package-lock.json
git commit -m "chore(api): package init"
```

### Task 3: Web package init

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/vite.config.ts`, `web/vitest.config.ts`, `web/index.html`

- [ ] **Step 1: Scaffold with Vite**

Run: `npm create vite@latest web -- --template react-ts` then `cd web && npm install`
Expected: a React+TS Vite app in `web/`.

- [ ] **Step 2: Add deps**

Run:
```bash
cd web && npm install react-router-dom @tanstack/react-query @blocknote/core @blocknote/react @blocknote/mantine lucide-react
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 3: Write `web/vite.config.ts` (dev proxy to API)**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:3000" } },
});
```

- [ ] **Step 4: Write `web/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: ["./src/test-setup.ts"] },
});
```

Create `web/src/test-setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Verify build**

Run: `cd web && npm run build`
Expected: builds to `dist/`.

- [ ] **Step 6: Commit**

```bash
git add web -- ':!web/node_modules'
git commit -m "chore(web): vite + react + deps init"
```

### Task 4: Docker Compose & service Dockerfiles

**Files:**
- Create: `docker-compose.yml`, `api/Dockerfile`, `web/Dockerfile`, `web/nginx.conf`

- [ ] **Step 1: Write `api/Dockerfile`**

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

- [ ] **Step 2: Write `web/nginx.conf`**

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  # Hashed assets — immutable, long cache
  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }

  # API proxy
  location /api/ {
    proxy_pass http://api:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  # SPA fallback — never cache index.html
  location / {
    add_header Cache-Control "no-cache";
    try_files $uri /index.html;
  }
}
```

- [ ] **Step 3: Write `web/Dockerfile`**

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

- [ ] **Step 4: Write `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redisdata:/data

  api:
    build: ./api
    env_file: .env
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_started }
    volumes:
      - uploads:/app/uploads

  web:
    build: ./web
    depends_on:
      - api

  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run
    environment:
      TUNNEL_TOKEN: ${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - web

volumes:
  pgdata:
  redisdata:
  uploads:
```

- [ ] **Step 5: Validate compose config**

Run: `cp .env.example .env && docker compose config`
Expected: prints the resolved config with no errors.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml api/Dockerfile web/Dockerfile web/nginx.conf
git commit -m "chore: docker compose with db, redis, api, web, cloudflared"
```

---

## Phase 1 — Database schema & env

### Task 5: Env parsing

**Files:**
- Create: `api/src/env.ts`, `api/src/env.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// api/src/env.test.ts
import { describe, it, expect } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("parses required vars", () => {
    const env = parseEnv({
      DATABASE_URL: "postgres://x", REDIS_URL: "redis://x",
      SESSION_SECRET: "s".repeat(32), PUBLIC_BASE_URL: "https://h",
      GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret",
    });
    expect(env.PUBLIC_BASE_URL).toBe("https://h");
    expect(env.ALLOWED_EMAILS).toEqual([]);
  });
  it("throws when a required var is missing", () => {
    expect(() => parseEnv({})).toThrow();
  });
  it("splits ALLOWED_EMAILS", () => {
    const env = parseEnv({
      DATABASE_URL: "x", REDIS_URL: "x", SESSION_SECRET: "s".repeat(32),
      PUBLIC_BASE_URL: "h", GOOGLE_CLIENT_ID: "i", GOOGLE_CLIENT_SECRET: "s",
      ALLOWED_EMAILS: "a@x.com, b@x.com",
    });
    expect(env.ALLOWED_EMAILS).toEqual(["a@x.com", "b@x.com"]);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL** — Run: `cd api && npx vitest run src/env.test.ts` → fails (no `parseEnv`).

- [ ] **Step 3: Implement `api/src/env.ts`**

```ts
const REQUIRED = [
  "DATABASE_URL", "REDIS_URL", "SESSION_SECRET",
  "PUBLIC_BASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
] as const;

export interface Env {
  DATABASE_URL: string; REDIS_URL: string; SESSION_SECRET: string;
  PUBLIC_BASE_URL: string; GOOGLE_CLIENT_ID: string; GOOGLE_CLIENT_SECRET: string;
  API_PORT: number; ALLOWED_EMAILS: string[];
}

export function parseEnv(src: Record<string, string | undefined>): Env {
  for (const k of REQUIRED) {
    if (!src[k]) throw new Error(`Missing required env var: ${k}`);
  }
  return {
    DATABASE_URL: src.DATABASE_URL!, REDIS_URL: src.REDIS_URL!,
    SESSION_SECRET: src.SESSION_SECRET!, PUBLIC_BASE_URL: src.PUBLIC_BASE_URL!,
    GOOGLE_CLIENT_ID: src.GOOGLE_CLIENT_ID!, GOOGLE_CLIENT_SECRET: src.GOOGLE_CLIENT_SECRET!,
    API_PORT: Number(src.API_PORT ?? 3000),
    ALLOWED_EMAILS: (src.ALLOWED_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  };
}

export const env = (globalThis as any).__TEST__ ? ({} as Env) : parseEnv(process.env);
```

- [ ] **Step 4: Run test — expect PASS** — Run: `cd api && npx vitest run src/env.test.ts`

- [ ] **Step 5: Commit**

```bash
git add api/src/env.ts api/src/env.test.ts
git commit -m "feat(api): env parsing and validation"
```

### Task 6: Drizzle schema

**Files:**
- Create: `api/src/db/schema.ts`, `api/drizzle.config.ts`

- [ ] **Step 1: Write `api/src/db/schema.ts`**

```ts
import { pgTable, uuid, text, boolean, integer, timestamp, primaryKey, customType } from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  googleSub: text("google_sub").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const prefs = pgTable("prefs", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").default("dark").notNull(),
  accent: text("accent").default("amber").notNull(),
  editorFont: text("editor_font").default("Serif").notNull(),
});

export const folders = pgTable("folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  color: text("color").notNull(),
  description: text("description").default("").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
  title: text("title").default("Untitled").notNull(),
  content: text("content").default("[]").notNull(), // BlockNote JSON (stringified)
  plaintext: text("plaintext").default("").notNull(),
  favorite: boolean("favorite").default(false).notNull(),
  searchVector: tsvector("search_vector"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const noteTags = pgTable("note_tags", {
  noteId: uuid("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => ({ pk: primaryKey({ columns: [t.noteId, t.tagId] }) }));

export const uploads = pgTable("uploads", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  noteId: uuid("note_id").references(() => notes.id, { onDelete: "set null" }),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Write `api/drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 3: Generate migration**

Run: `cd api && DATABASE_URL=postgres://x npx drizzle-kit generate`
Expected: a SQL migration file appears in `api/drizzle/`.

- [ ] **Step 4: Add FTS trigger migration `api/drizzle/9999_search_vector.sql`**

```sql
-- Maintain notes.search_vector: title (A), plaintext (C). Tags appended in app layer via plaintext.
CREATE FUNCTION notes_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.plaintext,'')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_search_vector_trg BEFORE INSERT OR UPDATE OF title, plaintext
  ON notes FOR EACH ROW EXECUTE FUNCTION notes_search_vector_update();

CREATE INDEX notes_search_idx ON notes USING GIN (search_vector);
```

- [ ] **Step 5: Verify types compile** — Run: `cd api && npx tsc --noEmit` → passes.

- [ ] **Step 6: Commit**

```bash
git add api/src/db/schema.ts api/drizzle.config.ts api/drizzle
git commit -m "feat(api): drizzle schema + FTS trigger migration"
```

### Task 7: DB client & migration runner

**Files:**
- Create: `api/src/db/client.ts`, `api/src/db/migrate.ts`

- [ ] **Step 1: Write `api/src/db/client.ts`**

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../env.js";
import * as schema from "./schema.js";

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

- [ ] **Step 2: Write `api/src/db/migrate.ts`**

```ts
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client.js";

export async function runMigrations() {
  await migrate(db, { migrationsFolder: "./drizzle" });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().then(() => pool.end()).then(() => console.log("migrated"));
}
```

- [ ] **Step 3: Integration check (requires db up)**

Run: `docker compose up -d db && cd api && DATABASE_URL=postgres://folio:change-me@localhost:5432/folio npm run migrate`
Expected: prints `migrated`; tables exist (`docker compose exec db psql -U folio -c '\dt'`).

> If running the API outside Docker for dev, expose db port by adding `ports: ["5432:5432"]` to the `db` service temporarily, or run migrations from inside the api container.

- [ ] **Step 4: Commit**

```bash
git add api/src/db/client.ts api/src/db/migrate.ts
git commit -m "feat(api): db client and migration runner"
```

---

## Phase 2 — Backend foundation (app, redis, markdown)

### Task 8: Redis cache helpers

**Files:**
- Create: `api/src/cache/redis.ts`, `api/src/cache/redis.test.ts`

- [ ] **Step 1: Write the failing test (pure key-builder logic)**

```ts
// api/src/cache/redis.test.ts
import { describe, it, expect } from "vitest";
import { cacheKey } from "./redis";

describe("cacheKey", () => {
  it("builds stable namespaced keys", () => {
    expect(cacheKey("folders", "user1")).toBe("folders:user1");
    expect(cacheKey("search", "user1", "q=hi&f=eng")).toBe("search:user1:q=hi&f=eng");
  });
});
```

- [ ] **Step 2: Run — expect FAIL** — Run: `cd api && npx vitest run src/cache/redis.test.ts`

- [ ] **Step 3: Implement `api/src/cache/redis.ts`**

```ts
import Redis from "ioredis";
import { env } from "../env.js";

export const redis = (globalThis as any).__TEST__ ? (null as any) : new Redis(env.REDIS_URL);

export function cacheKey(ns: string, userId: string, suffix?: string): string {
  return suffix ? `${ns}:${userId}:${suffix}` : `${ns}:${userId}`;
}

export async function cached<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit) as T;
  const value = await fn();
  await redis.set(key, JSON.stringify(value), "EX", ttlSec);
  return value;
}

export async function invalidate(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length) await redis.del(keys);
}
```

- [ ] **Step 4: Run — expect PASS** — Run: `cd api && npx vitest run src/cache/redis.test.ts`

- [ ] **Step 5: Commit**

```bash
git add api/src/cache/redis.ts api/src/cache/redis.test.ts
git commit -m "feat(api): redis client and cache helpers"
```

### Task 9: BlockNote → plaintext extraction

**Files:**
- Create: `api/src/lib/markdown.ts`, `api/src/lib/markdown.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// api/src/lib/markdown.test.ts
import { describe, it, expect } from "vitest";
import { blocksToPlaintext } from "./markdown";

describe("blocksToPlaintext", () => {
  it("flattens inline text across blocks", () => {
    const blocks = [
      { type: "heading", content: [{ type: "text", text: "Consensus" }] },
      { type: "paragraph", content: [{ type: "text", text: "Hello " }, { type: "text", text: "world" }] },
    ];
    expect(blocksToPlaintext(JSON.stringify(blocks))).toBe("Consensus\nHello world");
  });
  it("handles empty/invalid input", () => {
    expect(blocksToPlaintext("")).toBe("");
    expect(blocksToPlaintext("not json")).toBe("");
  });
  it("recurses into nested children", () => {
    const blocks = [{ type: "checkListItem", content: [{ type: "text", text: "Define failure model" }] }];
    expect(blocksToPlaintext(JSON.stringify(blocks))).toBe("Define failure model");
  });
});
```

- [ ] **Step 2: Run — expect FAIL** — Run: `cd api && npx vitest run src/lib/markdown.test.ts`

- [ ] **Step 3: Implement `api/src/lib/markdown.ts`**

```ts
type Inline = { type: string; text?: string };
type Block = { type: string; content?: Inline[] | string; children?: Block[] };

function inlineText(content: Block["content"]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((c) => c.text ?? "").join("");
}

export function blocksToPlaintext(json: string): string {
  let blocks: Block[];
  try { blocks = JSON.parse(json); } catch { return ""; }
  if (!Array.isArray(blocks)) return "";
  const lines: string[] = [];
  const walk = (bs: Block[]) => {
    for (const b of bs) {
      const t = inlineText(b.content);
      if (t) lines.push(t);
      if (Array.isArray(b.children)) walk(b.children);
    }
  };
  walk(blocks);
  return lines.join("\n");
}
```

- [ ] **Step 4: Run — expect PASS** — Run: `cd api && npx vitest run src/lib/markdown.test.ts`

- [ ] **Step 5: Commit**

```bash
git add api/src/lib/markdown.ts api/src/lib/markdown.test.ts
git commit -m "feat(api): blocknote-to-plaintext extraction"
```

### Task 10: Fastify app factory + health route

**Files:**
- Create: `api/src/app.ts`, `api/src/app.test.ts`, `api/src/server.ts`

- [ ] **Step 1: Write the failing test**

```ts
// api/src/app.test.ts
import { describe, it, expect } from "vitest";
import { buildApp } from "./app";

describe("app", () => {
  it("responds on /api/health", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
    await app.close();
  });
});
```

- [ ] **Step 2: Run — expect FAIL** — Run: `cd api && npx vitest run src/app.test.ts`

- [ ] **Step 3: Implement `api/src/app.ts`**

```ts
import Fastify, { FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(cookie);
  app.get("/api/health", async () => ({ status: "ok" }));
  return app;
}
```

- [ ] **Step 4: Write `api/src/server.ts`**

```ts
import { buildApp } from "./app.js";
import { env } from "./env.js";
import { runMigrations } from "./db/migrate.js";

const app = buildApp();
await runMigrations();
await app.listen({ host: "0.0.0.0", port: env.API_PORT });
console.log(`api listening on ${env.API_PORT}`);
```

- [ ] **Step 5: Run — expect PASS** — Run: `cd api && npx vitest run src/app.test.ts`

- [ ] **Step 6: Commit**

```bash
git add api/src/app.ts api/src/app.test.ts api/src/server.ts
git commit -m "feat(api): fastify app factory + health route"
```

---

## Phase 3 — Authentication (Google OAuth + sessions)

### Task 11: Google OAuth helpers

**Files:**
- Create: `api/src/auth/google.ts`, `api/src/auth/google.test.ts`

- [ ] **Step 1: Write the failing test (URL builder is pure)**

```ts
// api/src/auth/google.test.ts
import { describe, it, expect } from "vitest";
import { buildAuthUrl } from "./google";

describe("buildAuthUrl", () => {
  it("includes client id, redirect, scope, state", () => {
    const url = new URL(buildAuthUrl({
      clientId: "cid", redirectUri: "https://h/api/auth/google/callback", state: "xyz",
    }));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("cid");
    expect(url.searchParams.get("state")).toBe("xyz");
    expect(url.searchParams.get("scope")).toContain("email");
    expect(url.searchParams.get("response_type")).toBe("code");
  });
});
```

- [ ] **Step 2: Run — expect FAIL** — Run: `cd api && npx vitest run src/auth/google.test.ts`

- [ ] **Step 3: Implement `api/src/auth/google.ts`**

```ts
export function buildAuthUrl(o: { clientId: string; redirectUri: string; state: string }): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", o.clientId);
  u.searchParams.set("redirect_uri", o.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", o.state);
  return u.toString();
}

export interface GoogleProfile { sub: string; email: string; name: string; picture?: string }

export async function exchangeCode(o: {
  code: string; clientId: string; clientSecret: string; redirectUri: string;
}): Promise<GoogleProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: o.code, client_id: o.clientId, client_secret: o.clientSecret,
      redirect_uri: o.redirectUri, grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error("token exchange failed");
  const { access_token } = await tokenRes.json() as { access_token: string };
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) throw new Error("userinfo failed");
  return await infoRes.json() as GoogleProfile;
}
```

- [ ] **Step 4: Run — expect PASS** — Run: `cd api && npx vitest run src/auth/google.test.ts`

- [ ] **Step 5: Commit**

```bash
git add api/src/auth/google.ts api/src/auth/google.test.ts
git commit -m "feat(api): google oauth url builder + code exchange"
```

### Task 12: Session management (Redis-backed)

**Files:**
- Create: `api/src/auth/session.ts`, `api/src/auth/session.test.ts`

- [ ] **Step 1: Write the failing test (token generation is pure & unique)**

```ts
// api/src/auth/session.test.ts
import { describe, it, expect } from "vitest";
import { newSessionToken, sessionRedisKey } from "./session";

describe("session helpers", () => {
  it("generates 64-hex-char tokens", () => {
    const t = newSessionToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(newSessionToken()).not.toBe(t);
  });
  it("namespaces redis keys", () => {
    expect(sessionRedisKey("abc")).toBe("session:abc");
  });
});
```

- [ ] **Step 2: Run — expect FAIL** — Run: `cd api && npx vitest run src/auth/session.test.ts`

- [ ] **Step 3: Implement `api/src/auth/session.ts`**

```ts
import { randomBytes } from "node:crypto";
import { redis } from "../cache/redis.js";

const TTL_SEC = 60 * 60 * 24 * 30; // 30 days
export const COOKIE_NAME = "folio_session";

export function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}
export function sessionRedisKey(token: string): string {
  return `session:${token}`;
}

export async function createSession(userId: string): Promise<string> {
  const token = newSessionToken();
  await redis.set(sessionRedisKey(token), userId, "EX", TTL_SEC);
  return token;
}
export async function getSessionUser(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const userId = await redis.get(sessionRedisKey(token));
  if (userId) await redis.expire(sessionRedisKey(token), TTL_SEC); // sliding
  return userId;
}
export async function destroySession(token: string | undefined): Promise<void> {
  if (token) await redis.del(sessionRedisKey(token));
}
export function cookieOptions() {
  return { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: TTL_SEC };
}
```

- [ ] **Step 4: Run — expect PASS** — Run: `cd api && npx vitest run src/auth/session.test.ts`

- [ ] **Step 5: Commit**

```bash
git add api/src/auth/session.ts api/src/auth/session.test.ts
git commit -m "feat(api): redis-backed sessions + cookie options"
```

### Task 13: requireAuth middleware

**Files:**
- Create: `api/src/auth/middleware.ts`

- [ ] **Step 1: Implement `api/src/auth/middleware.ts`** (no separate unit test — covered by route integration tests later)

```ts
import { FastifyReply, FastifyRequest } from "fastify";
import { COOKIE_NAME, getSessionUser } from "./session.js";

declare module "fastify" {
  interface FastifyRequest { userId?: string }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const token = req.cookies[COOKIE_NAME];
  const userId = await getSessionUser(token);
  if (!userId) {
    reply.code(401).send({ error: { code: "unauthorized", message: "Not signed in" } });
    return;
  }
  req.userId = userId;
}
```

- [ ] **Step 2: Verify compile** — Run: `cd api && npx tsc --noEmit` → passes.

- [ ] **Step 3: Commit**

```bash
git add api/src/auth/middleware.ts
git commit -m "feat(api): requireAuth middleware"
```

### Task 14: Auth routes

**Files:**
- Create: `api/src/routes/auth.ts`
- Modify: `api/src/app.ts` (register routes)

- [ ] **Step 1: Implement `api/src/routes/auth.ts`**

```ts
import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, prefs } from "../db/schema.js";
import { env } from "../env.js";
import { buildAuthUrl, exchangeCode } from "../auth/google.js";
import { createSession, destroySession, getSessionUser, COOKIE_NAME, cookieOptions } from "../auth/session.js";

const redirectUri = () => `${env.PUBLIC_BASE_URL}/api/auth/google/callback`;

export async function authRoutes(app: FastifyInstance) {
  app.get("/api/auth/google", async (_req, reply) => {
    const state = Math.random().toString(36).slice(2);
    reply.setCookie("oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    reply.redirect(buildAuthUrl({ clientId: env.GOOGLE_CLIENT_ID, redirectUri: redirectUri(), state }));
  });

  app.get("/api/auth/google/callback", async (req, reply) => {
    const { code, state } = req.query as { code?: string; state?: string };
    if (!code || !state || state !== req.cookies.oauth_state) {
      return reply.code(400).send({ error: { code: "bad_state", message: "Invalid OAuth state" } });
    }
    const profile = await exchangeCode({
      code, clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, redirectUri: redirectUri(),
    });
    if (env.ALLOWED_EMAILS.length && !env.ALLOWED_EMAILS.includes(profile.email)) {
      return reply.code(403).send({ error: { code: "forbidden", message: "Email not allowed" } });
    }
    const existing = await db.select().from(users).where(eq(users.googleSub, profile.sub));
    let userId: string;
    if (existing[0]) {
      userId = existing[0].id;
      await db.update(users).set({ name: profile.name, email: profile.email, avatarUrl: profile.picture, updatedAt: new Date() }).where(eq(users.id, userId));
    } else {
      const [row] = await db.insert(users).values({
        googleSub: profile.sub, email: profile.email, name: profile.name, avatarUrl: profile.picture,
      }).returning({ id: users.id });
      userId = row.id;
      await db.insert(prefs).values({ userId });
    }
    const token = await createSession(userId);
    reply.setCookie(COOKIE_NAME, token, cookieOptions());
    reply.redirect("/");
  });

  app.post("/api/auth/logout", async (req, reply) => {
    await destroySession(req.cookies[COOKIE_NAME]);
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", async (req, reply) => {
    const userId = await getSessionUser(req.cookies[COOKIE_NAME]);
    if (!userId) return reply.code(401).send({ error: { code: "unauthorized", message: "Not signed in" } });
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    const [p] = await db.select().from(prefs).where(eq(prefs.userId, userId));
    return { user: u, prefs: p };
  });
}
```

- [ ] **Step 2: Register in `api/src/app.ts`**

Modify `buildApp()` to register the route (add import + `app.register(authRoutes)`):
```ts
import { authRoutes } from "./routes/auth.js";
// ...inside buildApp, after cookie:
app.register(authRoutes);
```

- [ ] **Step 3: Compile check** — Run: `cd api && npx tsc --noEmit` → passes.

- [ ] **Step 4: Manual smoke (requires db+redis up + Google creds)** — Visit `/api/auth/google`, complete consent, confirm redirect to `/` with `folio_session` cookie set, and `GET /api/auth/me` returns the user. Document result.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/auth.ts api/src/app.ts
git commit -m "feat(api): google oauth login, logout, me routes"
```

---

## Phase 4 — Backend CRUD, search, uploads

### Task 15: Folders service + routes

**Files:**
- Create: `api/src/services/folders.ts`, `api/src/routes/folders.ts`, `api/src/services/folders.test.ts`
- Modify: `api/src/app.ts`

- [ ] **Step 1: Write the failing test (slugify is pure)**

```ts
// api/src/services/folders.test.ts
import { describe, it, expect } from "vitest";
import { slugify } from "./folders";

describe("slugify", () => {
  it("lowercases and dashes", () => {
    expect(slugify("Home Server Setup")).toBe("home-server-setup");
    expect(slugify("  R&D Ideas!! ")).toBe("r-d-ideas");
  });
});
```

- [ ] **Step 2: Run — expect FAIL** — Run: `cd api && npx vitest run src/services/folders.test.ts`

- [ ] **Step 3: Implement `api/src/services/folders.ts`**

```ts
import { and, eq, asc } from "drizzle-orm";
import { db } from "../db/client.js";
import { folders, notes } from "../db/schema.js";
import { count } from "drizzle-orm";

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function listFolders(userId: string) {
  const rows = await db.select().from(folders).where(eq(folders.userId, userId)).orderBy(asc(folders.sortOrder));
  const counts = await db.select({ folderId: notes.folderId, c: count() })
    .from(notes).where(eq(notes.userId, userId)).groupBy(notes.folderId);
  const map = new Map(counts.map((r) => [r.folderId, Number(r.c)]));
  return rows.map((f) => ({ ...f, count: map.get(f.id) ?? 0 }));
}

export async function createFolder(userId: string, data: { name: string; color: string; description?: string }) {
  const [row] = await db.insert(folders).values({
    userId, name: data.name, slug: slugify(data.name), color: data.color, description: data.description ?? "",
  }).returning();
  return row;
}

export async function updateFolder(userId: string, id: string, data: Partial<{ name: string; color: string; description: string; sortOrder: number }>) {
  const patch: any = { ...data, updatedAt: new Date() };
  if (data.name) patch.slug = slugify(data.name);
  const [row] = await db.update(folders).set(patch).where(and(eq(folders.id, id), eq(folders.userId, userId))).returning();
  return row;
}

export async function deleteFolder(userId: string, id: string) {
  await db.delete(folders).where(and(eq(folders.id, id), eq(folders.userId, userId)));
}
```

- [ ] **Step 4: Run — expect PASS** — Run: `cd api && npx vitest run src/services/folders.test.ts`

- [ ] **Step 5: Implement `api/src/routes/folders.ts`**

```ts
import { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/middleware.js";
import { listFolders, createFolder, updateFolder, deleteFolder } from "../services/folders.js";
import { cacheKey, cached, invalidate } from "../cache/redis.js";

export async function folderRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/api/folders", async (req) =>
    cached(cacheKey("folders", req.userId!), 60, () => listFolders(req.userId!)));

  app.post("/api/folders", async (req) => {
    const row = await createFolder(req.userId!, req.body as any);
    await invalidate(`folders:${req.userId}*`);
    return row;
  });

  app.patch("/api/folders/:id", async (req) => {
    const row = await updateFolder(req.userId!, (req.params as any).id, req.body as any);
    await invalidate(`folders:${req.userId}*`);
    return row;
  });

  app.delete("/api/folders/:id", async (req) => {
    await deleteFolder(req.userId!, (req.params as any).id);
    await invalidate(`folders:${req.userId}*`);
    return { ok: true };
  });
}
```

- [ ] **Step 6: Register in `app.ts`** — add `import { folderRoutes }` and `app.register(folderRoutes)`.

- [ ] **Step 7: Compile + commit**

Run: `cd api && npx tsc --noEmit`
```bash
git add api/src/services/folders.ts api/src/services/folders.test.ts api/src/routes/folders.ts api/src/app.ts
git commit -m "feat(api): folders crud with caching"
```

### Task 16: Notes service + routes (with tags & plaintext/search-vector)

**Files:**
- Create: `api/src/services/notes.ts`, `api/src/services/tags.ts`, `api/src/routes/notes.ts`, `api/src/routes/tags.ts`
- Modify: `api/src/app.ts`

- [ ] **Step 1: Implement `api/src/services/tags.ts`**

```ts
import { and, eq, count } from "drizzle-orm";
import { db } from "../db/client.js";
import { tags, noteTags, notes } from "../db/schema.js";

export async function ensureTags(userId: string, names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of names) {
    const existing = await db.select().from(tags).where(and(eq(tags.userId, userId), eq(tags.name, name)));
    if (existing[0]) ids.push(existing[0].id);
    else {
      const [row] = await db.insert(tags).values({ userId, name }).returning({ id: tags.id });
      ids.push(row.id);
    }
  }
  return ids;
}

export async function setNoteTags(userId: string, noteId: string, names: string[]) {
  await db.delete(noteTags).where(eq(noteTags.noteId, noteId));
  const ids = await ensureTags(userId, names);
  if (ids.length) await db.insert(noteTags).values(ids.map((tagId) => ({ noteId, tagId })));
}

export async function listTags(userId: string) {
  return db.select({ id: tags.id, name: tags.name, c: count(noteTags.noteId) })
    .from(tags)
    .leftJoin(noteTags, eq(noteTags.tagId, tags.id))
    .where(eq(tags.userId, userId))
    .groupBy(tags.id, tags.name);
}

export async function tagsForNote(noteId: string): Promise<string[]> {
  const rows = await db.select({ name: tags.name }).from(noteTags)
    .innerJoin(tags, eq(tags.id, noteTags.tagId)).where(eq(noteTags.noteId, noteId));
  return rows.map((r) => r.name);
}
```

- [ ] **Step 2: Implement `api/src/services/notes.ts`**

```ts
import { and, eq, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { notes } from "../db/schema.js";
import { blocksToPlaintext } from "../lib/markdown.js";
import { setNoteTags, tagsForNote } from "./tags.js";

export async function listNotes(userId: string, opts: { folderId?: string; favorite?: boolean } = {}) {
  const conds = [eq(notes.userId, userId)];
  if (opts.folderId) conds.push(eq(notes.folderId, opts.folderId));
  if (opts.favorite) conds.push(eq(notes.favorite, true));
  const rows = await db.select().from(notes).where(and(...conds)).orderBy(desc(notes.updatedAt));
  return Promise.all(rows.map(async (n) => ({ ...n, tags: await tagsForNote(n.id) })));
}

export async function getNote(userId: string, id: string) {
  const [n] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  if (!n) return null;
  return { ...n, tags: await tagsForNote(n.id) };
}

export async function createNote(userId: string, data: { folderId?: string; title?: string }) {
  const [row] = await db.insert(notes).values({
    userId, folderId: data.folderId ?? null, title: data.title ?? "Untitled",
  }).returning();
  return { ...row, tags: [] as string[] };
}

export async function updateNote(userId: string, id: string, data: {
  title?: string; content?: string; folderId?: string | null; tags?: string[];
}) {
  const patch: any = { updatedAt: new Date() };
  if (data.title !== undefined) patch.title = data.title;
  if (data.folderId !== undefined) patch.folderId = data.folderId;
  if (data.content !== undefined) {
    patch.content = data.content;
    patch.plaintext = blocksToPlaintext(data.content);
  }
  await db.update(notes).set(patch).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  if (data.tags) await setNoteTags(userId, id, data.tags);
  return getNote(userId, id);
}

export async function toggleFavorite(userId: string, id: string) {
  const [n] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  if (!n) return null;
  await db.update(notes).set({ favorite: !n.favorite }).where(eq(notes.id, id));
  return { id, favorite: !n.favorite };
}

export async function deleteNote(userId: string, id: string) {
  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
}
```

- [ ] **Step 3: Implement `api/src/routes/notes.ts`**

```ts
import { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/middleware.js";
import * as svc from "../services/notes.js";
import { invalidate } from "../cache/redis.js";

export async function noteRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  const bust = (u: string) => Promise.all([invalidate(`folders:${u}*`), invalidate(`notes:${u}*`), invalidate(`search:${u}*`)]);

  app.get("/api/notes", async (req) => {
    const q = req.query as { folder?: string; favorite?: string };
    return svc.listNotes(req.userId!, { folderId: q.folder, favorite: q.favorite === "true" });
  });
  app.get("/api/notes/:id", async (req, reply) => {
    const n = await svc.getNote(req.userId!, (req.params as any).id);
    if (!n) return reply.code(404).send({ error: { code: "not_found", message: "Note not found" } });
    reply.header("ETag", `"${new Date(n.updatedAt).getTime()}"`);
    return n;
  });
  app.post("/api/notes", async (req) => { const n = await svc.createNote(req.userId!, req.body as any); await bust(req.userId!); return n; });
  app.patch("/api/notes/:id", async (req) => { const n = await svc.updateNote(req.userId!, (req.params as any).id, req.body as any); await bust(req.userId!); return n; });
  app.post("/api/notes/:id/favorite", async (req) => { const r = await svc.toggleFavorite(req.userId!, (req.params as any).id); await bust(req.userId!); return r; });
  app.delete("/api/notes/:id", async (req) => { await svc.deleteNote(req.userId!, (req.params as any).id); await bust(req.userId!); return { ok: true }; });
}
```

- [ ] **Step 4: Implement `api/src/routes/tags.ts`**

```ts
import { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/middleware.js";
import { listTags } from "../services/tags.js";

export async function tagRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.get("/api/tags", async (req) => listTags(req.userId!));
}
```

- [ ] **Step 5: Register both in `app.ts`** — add imports + `app.register(noteRoutes)` + `app.register(tagRoutes)`.

- [ ] **Step 6: Compile + commit**

Run: `cd api && npx tsc --noEmit`
```bash
git add api/src/services/notes.ts api/src/services/tags.ts api/src/routes/notes.ts api/src/routes/tags.ts api/src/app.ts
git commit -m "feat(api): notes + tags crud with plaintext and cache busting"
```

### Task 17: Search service + route (Postgres FTS with ts_headline)

**Files:**
- Create: `api/src/services/search.ts`, `api/src/routes/search.ts`
- Modify: `api/src/app.ts`

- [ ] **Step 1: Implement `api/src/services/search.ts`**

```ts
import { sql } from "drizzle-orm";
import { db } from "../db/client.js";

export interface SearchResult {
  id: string; title: string; folderId: string | null; updatedAt: string;
  titleHl: string; snippetHl: string; rank: number;
}

export async function searchNotes(userId: string, q: string, opts: { folderId?: string } = {}) {
  if (!q.trim()) return { results: [] as SearchResult[], folderFacets: [] as { folderId: string | null; c: number }[] };
  const folderFilter = opts.folderId ? sql`AND folder_id = ${opts.folderId}` : sql``;
  const rows = await db.execute(sql`
    SELECT id, title, folder_id AS "folderId", updated_at AS "updatedAt",
      ts_headline('english', title, websearch_to_tsquery('english', ${q}),
        'StartSel=<mark>,StopSel=</mark>') AS "titleHl",
      ts_headline('english', plaintext, websearch_to_tsquery('english', ${q}),
        'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=30,MinWords=10') AS "snippetHl",
      ts_rank(search_vector, websearch_to_tsquery('english', ${q})) AS rank
    FROM notes
    WHERE user_id = ${userId} ${folderFilter}
      AND search_vector @@ websearch_to_tsquery('english', ${q})
    ORDER BY rank DESC LIMIT 50
  `);
  const facets = await db.execute(sql`
    SELECT folder_id AS "folderId", count(*)::int AS c FROM notes
    WHERE user_id = ${userId} AND search_vector @@ websearch_to_tsquery('english', ${q})
    GROUP BY folder_id
  `);
  return { results: rows.rows as unknown as SearchResult[], folderFacets: facets.rows as any };
}
```

- [ ] **Step 2: Implement `api/src/routes/search.ts`**

```ts
import { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/middleware.js";
import { searchNotes } from "../services/search.js";
import { cacheKey, cached } from "../cache/redis.js";

export async function searchRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.get("/api/search", async (req) => {
    const { q = "", folder } = req.query as { q?: string; folder?: string };
    return cached(cacheKey("search", req.userId!, `${q}|${folder ?? ""}`), 30,
      () => searchNotes(req.userId!, q, { folderId: folder }));
  });
}
```

- [ ] **Step 3: Register in `app.ts`** — add import + `app.register(searchRoutes)`.

- [ ] **Step 4: Compile + integration smoke** — Run `cd api && npx tsc --noEmit`; with db+redis up and a seeded note, `GET /api/search?q=distributed` returns results with `<mark>` in `titleHl`/`snippetHl`.

- [ ] **Step 5: Commit**

```bash
git add api/src/services/search.ts api/src/routes/search.ts api/src/app.ts
git commit -m "feat(api): postgres full-text search with ts_headline highlights"
```

### Task 18: Uploads + rate limiting

**Files:**
- Create: `api/src/routes/uploads.ts`
- Modify: `api/src/app.ts` (register multipart, rate-limit, uploads)

- [ ] **Step 1: Implement `api/src/routes/uploads.ts`**

```ts
import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { requireAuth } from "../auth/middleware.js";
import { db } from "../db/client.js";
import { uploads } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

const DIR = process.env.UPLOAD_DIR ?? "/app/uploads";

export async function uploadRoutes(app: FastifyInstance) {
  app.post("/api/uploads", { preHandler: requireAuth }, async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: { code: "no_file", message: "No file" } });
    const id = randomUUID();
    const filename = id + extname(file.filename);
    await mkdir(DIR, { recursive: true });
    const buf = await file.toBuffer();
    await writeFile(join(DIR, filename), buf);
    await db.insert(uploads).values({
      id, userId: req.userId!, filename, mime: file.mimetype, size: buf.length, path: join(DIR, filename),
    });
    return { url: `/api/uploads/${id}` };
  });

  app.get("/api/uploads/:id", { preHandler: requireAuth }, async (req, reply) => {
    const [u] = await db.select().from(uploads).where(and(eq(uploads.id, (req.params as any).id), eq(uploads.userId, req.userId!)));
    if (!u) return reply.code(404).send({ error: { code: "not_found", message: "Not found" } });
    reply.header("Content-Type", u.mime);
    reply.header("Cache-Control", "private, max-age=31536000, immutable");
    return reply.send(await readFile(u.path));
  });
}
```

- [ ] **Step 2: Register multipart + rate-limit + uploads in `app.ts`**

```ts
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { uploadRoutes } from "./routes/uploads.js";
// inside buildApp:
app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
app.register(uploadRoutes);
```

> Note: Redis-backed rate limiting can be enabled by passing `redis` to the plugin once the redis client is wired in non-test mode; in-memory is acceptable for a single-instance deploy.

- [ ] **Step 3: Compile + commit**

Run: `cd api && npx tsc --noEmit`
```bash
git add api/src/routes/uploads.ts api/src/app.ts
git commit -m "feat(api): image uploads + rate limiting"
```

---

## Phase 5 — Frontend foundation

### Task 19: Design tokens & fonts

**Files:**
- Create: `web/src/theme/tokens.css`, `web/src/theme/fonts.css`
- Modify: `web/src/main.tsx` (import both)

- [ ] **Step 1: Write `web/src/theme/fonts.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,18..72,400;0,18..72,500;0,18..72,600;1,18..72,400&family=JetBrains+Mono:wght@400;500;600&display=swap');
```

- [ ] **Step 2: Write `web/src/theme/tokens.css`** — copy the exact values from spec §2/README. Include `:root,[data-theme="dark"]`, `[data-theme="light"]`, the four `[data-accent="…"]` blocks, `[data-editorfont="Sans"]`, plus base resets:

```css
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Schibsted Grotesk', sans-serif; background: var(--bg); color: var(--text); }
::selection { background: rgba(91,155,213,.32); }

:root, [data-theme="dark"] {
  --bg:#111317; --surface:#16181d; --surface-2:#1d2026;
  --border:#272b33; --border-soft:#1e2229;
  --text:#e9eaee; --text-2:#a3a7b2; --text-3:#6b6f7a; --code-bg:#0d0f13;
  --editor-font: 'Newsreader', serif;
}
[data-theme="light"] {
  --bg:#ffffff; --surface:#faf9f7; --surface-2:#f1efea;
  --border:#e7e3db; --border-soft:#efece6;
  --text:#1d1c19; --text-2:#6a6862; --text-3:#9a978e; --code-bg:#f6f4f0;
}
[data-editorfont="Sans"] { --editor-font: 'Schibsted Grotesk', sans-serif; }

/* amber default */
:root, [data-accent="amber"] { --accent:#e0a548; --accent-text:#f0c074; --accent-soft:rgba(224,165,72,.15); }
[data-theme="light"][data-accent="amber"] { --accent:#b27c22; --accent-text:#8c5f16; --accent-soft:rgba(178,124,34,.12); }
[data-accent="teal"]  { --accent:#3fa896; --accent-text:#5cc4b2; --accent-soft:rgba(63,168,150,.15); }
[data-theme="light"][data-accent="teal"]  { --accent:#2c8475; --accent-text:#1f6457; --accent-soft:rgba(44,132,117,.12); }
[data-accent="blue"]  { --accent:#5b9bd5; --accent-text:#7db3e6; --accent-soft:rgba(91,155,213,.15); }
[data-theme="light"][data-accent="blue"]  { --accent:#2f6fb0; --accent-text:#235488; --accent-soft:rgba(47,111,176,.12); }
[data-accent="rose"]  { --accent:#d97a86; --accent-text:#e89aa3; --accent-soft:rgba(217,122,134,.15); }
[data-theme="light"][data-accent="rose"]  { --accent:#b5505d; --accent-text:#8f3a45; --accent-soft:rgba(181,80,93,.12); }
```

- [ ] **Step 3: Import in `web/src/main.tsx`** — add `import "./theme/fonts.css"; import "./theme/tokens.css";` (replace the default Vite CSS imports).

- [ ] **Step 4: Visual check** — Run `cd web && npm run dev`; confirm dark background + correct fonts load.

- [ ] **Step 5: Commit**

```bash
git add web/src/theme web/src/main.tsx
git commit -m "feat(web): design tokens, themes, accents, fonts"
```

### Task 20: Shared types & API client

**Files:**
- Create: `web/src/types.ts`, `web/src/api/client.ts`

- [ ] **Step 1: Write `web/src/types.ts`**

```ts
export type Theme = "dark" | "light";
export type Accent = "amber" | "teal" | "blue" | "rose";
export type EditorFont = "Serif" | "Sans";

export interface User { id: string; email: string; name: string; avatarUrl?: string | null }
export interface Prefs { theme: Theme; accent: Accent; editorFont: EditorFont }
export interface Folder { id: string; name: string; slug: string; color: string; description: string; sortOrder: number; count: number }
export interface Note {
  id: string; folderId: string | null; title: string; content: string;
  favorite: boolean; updatedAt: string; createdAt: string; tags: string[];
}
export interface TagCount { id: string; name: string; c: number }
export interface SearchResult { id: string; title: string; folderId: string | null; updatedAt: string; titleHl: string; snippetHl: string; rank: number }
export interface SearchResponse { results: SearchResult[]; folderFacets: { folderId: string | null; c: number }[] }
```

- [ ] **Step 2: Write `web/src/api/client.ts`**

```ts
async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
  if (res.status === 401) { window.location.href = "/signin"; throw new Error("unauthorized"); }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error?.message ?? res.statusText);
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>);
}

export const api = {
  me: () => req<{ user: import("../types").User; prefs: import("../types").Prefs }>("/api/auth/me"),
  logout: () => req("/api/auth/logout", { method: "POST" }),
  folders: () => req<import("../types").Folder[]>("/api/folders"),
  createFolder: (b: { name: string; color: string; description?: string }) => req("/api/folders", { method: "POST", body: JSON.stringify(b) }),
  notes: (q?: { folder?: string; favorite?: boolean }) =>
    req<import("../types").Note[]>("/api/notes" + (q?.folder ? `?folder=${q.folder}` : q?.favorite ? "?favorite=true" : "")),
  note: (id: string) => req<import("../types").Note>(`/api/notes/${id}`),
  createNote: (b: { folderId?: string; title?: string }) => req<import("../types").Note>("/api/notes", { method: "POST", body: JSON.stringify(b) }),
  updateNote: (id: string, b: Partial<{ title: string; content: string; folderId: string | null; tags: string[] }>) =>
    req<import("../types").Note>(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  favorite: (id: string) => req<{ id: string; favorite: boolean }>(`/api/notes/${id}/favorite`, { method: "POST" }),
  deleteNote: (id: string) => req(`/api/notes/${id}`, { method: "DELETE" }),
  tags: () => req<import("../types").TagCount[]>("/api/tags"),
  search: (q: string, folder?: string) => req<import("../types").SearchResponse>(`/api/search?q=${encodeURIComponent(q)}${folder ? `&folder=${folder}` : ""}`),
};
```

- [ ] **Step 3: Compile check** — Run: `cd web && npx tsc --noEmit` → passes.

- [ ] **Step 4: Commit**

```bash
git add web/src/types.ts web/src/api/client.ts
git commit -m "feat(web): shared types and api client"
```

### Task 21: Prefs context (theme/accent/font) — TDD

**Files:**
- Create: `web/src/state/PrefsContext.tsx`, `web/src/state/PrefsContext.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// web/src/state/PrefsContext.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrefsProvider, usePrefs } from "./PrefsContext";

function Probe() {
  const { prefs, setTheme } = usePrefs();
  return <button onClick={() => setTheme(prefs.theme === "dark" ? "light" : "dark")}>{prefs.theme}</button>;
}

test("toggles theme and reflects on <html>", async () => {
  render(<PrefsProvider><Probe /></PrefsProvider>);
  expect(screen.getByText("dark")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button"));
  expect(document.documentElement.getAttribute("data-theme")).toBe("light");
});
```

- [ ] **Step 2: Run — expect FAIL** — Run: `cd web && npx vitest run src/state/PrefsContext.test.tsx`

- [ ] **Step 3: Implement `web/src/state/PrefsContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Prefs, Theme, Accent, EditorFont } from "../types";

const DEFAULT: Prefs = { theme: "dark", accent: "amber", editorFont: "Serif" };
const KEY = "folio.prefs";

interface Ctx {
  prefs: Prefs;
  setTheme: (t: Theme) => void; setAccent: (a: Accent) => void; setEditorFont: (f: EditorFont) => void;
}
const PrefsCtx = createContext<Ctx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return DEFAULT; }
  });
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-theme", prefs.theme);
    el.setAttribute("data-accent", prefs.accent);
    el.setAttribute("data-editorfont", prefs.editorFont);
    localStorage.setItem(KEY, JSON.stringify(prefs));
  }, [prefs]);
  return (
    <PrefsCtx.Provider value={{
      prefs,
      setTheme: (theme) => setPrefs((p) => ({ ...p, theme })),
      setAccent: (accent) => setPrefs((p) => ({ ...p, accent })),
      setEditorFont: (editorFont) => setPrefs((p) => ({ ...p, editorFont })),
    }}>{children}</PrefsCtx.Provider>
  );
}
export function usePrefs() {
  const c = useContext(PrefsCtx);
  if (!c) throw new Error("usePrefs outside provider");
  return c;
}
```

- [ ] **Step 4: Run — expect PASS** — Run: `cd web && npx vitest run src/state/PrefsContext.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add web/src/state/PrefsContext.tsx web/src/state/PrefsContext.test.tsx
git commit -m "feat(web): prefs context with theme/accent/font + persistence"
```

### Task 22: Auth context + router shell + route guard

**Files:**
- Create: `web/src/state/AuthContext.tsx`, `web/src/App.tsx` (replace default)
- Modify: `web/src/main.tsx`

- [ ] **Step 1: Implement `web/src/state/AuthContext.tsx`**

```tsx
import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { User } from "../types";

interface Ctx { user: User | null; loading: boolean }
const AuthCtx = createContext<Ctx>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: api.me, retry: false });
  return <AuthCtx.Provider value={{ user: data?.user ?? null, loading: isLoading }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
```

- [ ] **Step 2: Implement `web/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrefsProvider } from "./state/PrefsContext";
import { AuthProvider, useAuth } from "./state/AuthContext";
import SignIn from "./screens/SignIn";
import Home from "./screens/Home";
import Folder from "./screens/Folder";
import Editor from "./screens/Editor";
import Search from "./screens/Search";

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } });

function Guard({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/signin" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <PrefsProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/signin" element={<SignIn />} />
              <Route path="/" element={<Guard><Home /></Guard>} />
              <Route path="/folder/:id" element={<Guard><Folder /></Guard>} />
              <Route path="/note/:id" element={<Guard><Editor /></Guard>} />
              <Route path="/search" element={<Guard><Search /></Guard>} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </PrefsProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Update `web/src/main.tsx`** to render `<App/>` (keep the CSS imports from Task 19).

- [ ] **Step 4: Create placeholder screens** so it compiles — each `web/src/screens/{SignIn,Home,Folder,Editor,Search}.tsx` exports `export default function X(){ return <div>X</div>; }` (will be replaced in later tasks).

- [ ] **Step 5: Compile + commit**

Run: `cd web && npx tsc --noEmit && npm run build`
```bash
git add web/src/state/AuthContext.tsx web/src/App.tsx web/src/main.tsx web/src/screens
git commit -m "feat(web): auth context, router shell, route guard, screen stubs"
```

---

## Phase 6 — UI primitives & Sidebar

### Task 23: Icons & UI primitives

**Files:**
- Create: `web/src/components/icons.tsx`, `web/src/components/ui/{Chip,Kbd,Avatar,Card}.tsx`

- [ ] **Step 1: Implement `web/src/components/icons.tsx`** — re-export the Lucide icons used across screens:

```tsx
export {
  Search, Plus, ChevronDown, ChevronRight, Folder, Star, Share, MoreHorizontal,
  Info, Link as LinkIcon, Bold, Italic, Underline, Code, Hash, Check, Upload,
  SlidersHorizontal, LayoutGrid, List, Filter, X,
} from "lucide-react";
```

- [ ] **Step 2: Implement primitives** — small presentational components using tokens. Example `web/src/components/ui/Chip.tsx`:

```tsx
import { ReactNode } from "react";
export function Chip({ children, active, mono = true }: { children: ReactNode; active?: boolean; mono?: boolean }) {
  return (
    <span style={{
      font: `${mono ? "500 11.5px 'JetBrains Mono', monospace" : "500 12px 'Schibsted Grotesk', sans-serif"}`,
      padding: "3px 8px", borderRadius: 6,
      background: active ? "var(--accent-soft)" : "var(--surface-2)",
      color: active ? "var(--accent-text)" : "var(--text-2)",
    }}>{children}</span>
  );
}
```

Create `Kbd.tsx` (mono kbd chip), `Avatar.tsx` (gradient initials circle), `Card.tsx` (surface/border/radius-12 container) following the same token-driven style per README.

- [ ] **Step 3: Compile + commit**

Run: `cd web && npx tsc --noEmit`
```bash
git add web/src/components/icons.tsx web/src/components/ui
git commit -m "feat(web): icons and ui primitives"
```

### Task 24: Sidebar component

**Files:**
- Create: `web/src/components/Sidebar.tsx`

- [ ] **Step 1: Implement `web/src/components/Sidebar.tsx`** — 260px sidebar per spec §4.3 / README §Sidebar. Pull live data: `useQuery(["folders"], api.folders)`, `useQuery(["tags"], api.tags)`, `useAuth()` for the account row, `usePrefs()` not needed here. Sections in order: workspace header, Search button (`⌘K` opens `/search`), accent New-note button (creates a note → navigate to `/note/:id`), Favorites (notes with `favorite`), Folders (colored dot + name + count; active row when `useParams().id === folder.id` uses `--accent-soft`/`--accent-text`), Tags chips, account row pinned bottom. Use `NavLink`/`useNavigate` for navigation.

```tsx
// Skeleton — fill in each section's markup per README spacing/typography.
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../state/AuthContext";
import { Search, Plus, Star } from "./icons";

export function Sidebar() {
  const nav = useNavigate();
  const { id: activeFolderId } = useParams();
  const qc = useQueryClient();
  const folders = useQuery({ queryKey: ["folders"], queryFn: api.folders });
  const tags = useQuery({ queryKey: ["tags"], queryFn: api.tags });
  const favs = useQuery({ queryKey: ["notes", "fav"], queryFn: () => api.notes({ favorite: true }) });
  const { user } = useAuth();
  const newNote = useMutation({
    mutationFn: () => api.createNote({}),
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ["folders"] }); nav(`/note/${n.id}`); },
  });
  return (
    <aside style={{ width: 260, flex: "none", background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", padding: "16px 12px", height: "100%", overflow: "hidden" }}>
      {/* workspace header, search button (onClick nav('/search')), new-note button (newNote.mutate()),
          Favorites (favs.data), Folders (folders.data, active = activeFolderId), Tags (tags.data),
          account row (user) — all per README typography/spacing */}
    </aside>
  );
}
```

- [ ] **Step 2: Visual check** — temporarily render `<Sidebar/>` in Home; run `npm run dev` and compare against `design/Sidebar.dc.html`. Adjust spacing/fonts to match.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/Sidebar.tsx
git commit -m "feat(web): shared sidebar with live folders/tags/favorites"
```

---

## Phase 7 — Screens

### Task 25: Sign In screen

**Files:**
- Modify: `web/src/screens/SignIn.tsx`

- [ ] **Step 1: Implement** the two-column layout per spec §4.4 / README §1: left brand panel (dotted `radial-gradient` texture, F-mark, H1 "Your notes, finally in one calm place.", 3 feature rows, footer); right panel (max-width 340) with the **Continue with Google** button (white in both themes, multicolor Google G SVG) linking to `/api/auth/google` via `window.location.href`, "OR" divider, a **disabled** "Continue with email" secondary button (visual only per spec §9), and terms fine print.

```tsx
export default function SignIn() {
  const google = () => { window.location.href = "/api/auth/google"; };
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* left brand panel: background var(--surface), padding 60, dotted overlay */}
      {/* right panel: 480px, centered form, Google button onClick={google}, disabled email button */}
    </div>
  );
}
```

- [ ] **Step 2: Visual check** against README; confirm Google button styling (white `#fff`, `1px #dadce0`, shadow) in both themes.

- [ ] **Step 3: Commit**

```bash
git add web/src/screens/SignIn.tsx
git commit -m "feat(web): sign-in screen with google oauth entry"
```

### Task 26: App shell layout (sidebar + main)

**Files:**
- Create: `web/src/components/AppShell.tsx`

- [ ] **Step 1: Implement** a flex layout wrapping `<Sidebar/>` + `<main style={{ flex:1, display:'flex', flexDirection:'column', height:'100vh', overflow:'auto' }}>{children}</main>`. Home/Folder/Editor/Search wrap their content in `<AppShell>`.

- [ ] **Step 2: Commit**

```bash
git add web/src/components/AppShell.tsx
git commit -m "feat(web): app shell layout"
```

### Task 27: Home (Dashboard) screen

**Files:**
- Modify: `web/src/screens/Home.tsx`

- [ ] **Step 1: Implement** per spec §4.4 / README §2: top bar (uppercase date via `toLocaleDateString`, greeting, Filter outline button, accent New-note button), "Continue where you left off" 3-col grid of recent cards (from `api.notes()` sorted by `updatedAt`, top 3; each card → `/note/:id`), and "Folders" 3-col grid of folder cards (from `api.folders()`; hue-soft icon background = folder color at .16 alpha; → `/folder/:id`). Use `useQuery` for both.

- [ ] **Step 2: Visual check** against README §2.

- [ ] **Step 3: Commit**

```bash
git add web/src/screens/Home.tsx
git commit -m "feat(web): home dashboard"
```

### Task 28: Folder view screen

**Files:**
- Modify: `web/src/screens/Folder.tsx`

- [ ] **Step 1: Implement** per spec §4.4 / README §3: breadcrumb, folder header (color square + title + description + note count), sort + list/grid toggle (local state), filter chips ("All" + the folder's tags), and the bordered note list (rows from `api.notes({ folder: id })`; each row → `/note/:id`, shows title, 1-line snippet from `note.content`→plaintext-ish, up to 2 tag chips, right-aligned relative time). Add a `relativeTime(date)` helper in `web/src/lib/time.ts`.

- [ ] **Step 2: Create `web/src/lib/time.ts`** with `relativeTime(iso: string): string` ("2h", "Yesterday", "3d", "2w") + a unit test `time.test.ts` (TDD: write test first, run fail, implement, run pass).

- [ ] **Step 3: Visual check** against README §3.

- [ ] **Step 4: Commit**

```bash
git add web/src/screens/Folder.tsx web/src/lib/time.ts web/src/lib/time.test.ts
git commit -m "feat(web): folder view with note list and relative time"
```

### Task 29: BlockNote editor component

**Files:**
- Create: `web/src/editor/FolioEditor.tsx`, `web/src/editor/blocknote-folio.css`

- [ ] **Step 1: Implement `web/src/editor/FolioEditor.tsx`**

```tsx
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "./blocknote-folio.css";
import { useEffect, useRef } from "react";

export function FolioEditor({ initialContent, onChange }: {
  initialContent: string; onChange: (json: string) => void;
}) {
  const editor = useCreateBlockNote({
    initialContent: safeParse(initialContent),
  });
  const timer = useRef<number>();
  return (
    <BlockNoteView editor={editor} theme="dark" onChange={() => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => onChange(JSON.stringify(editor.document)), 600);
    }} />
  );
}
function safeParse(s: string) {
  try { const v = JSON.parse(s); return Array.isArray(v) && v.length ? v : undefined; } catch { return undefined; }
}
```

- [ ] **Step 2: Implement `web/src/editor/blocknote-folio.css`** — map BlockNote/Mantine CSS variables to Folio tokens (background → `--bg`, text → `--text`, borders → `--border`, code block → `--code-bg`, body font → `var(--editor-font)`, headings → Newsreader). Style the slash menu popover, selection toolbar pill, callout accent bar, checklist squares, code-block header to match README §4 Editor blocks. Theme follows `data-theme` (pass `theme={prefs.theme}` from the screen).

- [ ] **Step 3: Visual check** — render in the Editor screen (next task) and compare blocks to README §4.

- [ ] **Step 4: Commit**

```bash
git add web/src/editor
git commit -m "feat(web): blocknote editor restyled to folio tokens"
```

### Task 30: Editor screen (hero)

**Files:**
- Modify: `web/src/screens/Editor.tsx`

- [ ] **Step 1: Implement** per spec §4.4–4.5 / README §4: top bar (breadcrumb folder›title, "Edited Xh ago", star toggle via `api.favorite`, more menu, accent Share button [Share is a placeholder per spec §9]), centered document column (max-width 760, padding per README), an editable **title** input (Newsreader 39/600) bound to `api.updateNote`, a tag meta row, and `<FolioEditor>` for the body. Load with `useQuery(["note", id], () => api.note(id))`. Save via `useMutation` with **optimistic update**: on title/content change, `setQueryData(["note", id], …)` then `api.updateNote`, debounced; invalidate `["notes"]`/`["folders"]` on settle.

```tsx
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { FolioEditor } from "../editor/FolioEditor";
import { usePrefs } from "../state/PrefsContext";
import { AppShell } from "../components/AppShell";

export default function Editor() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { prefs } = usePrefs();
  const note = useQuery({ queryKey: ["note", id], queryFn: () => api.note(id!) });
  const save = useMutation({
    mutationFn: (patch: any) => api.updateNote(id!, patch),
    onMutate: async (patch) => { qc.setQueryData(["note", id], (o: any) => ({ ...o, ...patch })); },
    onSettled: () => { qc.invalidateQueries({ queryKey: ["notes"] }); qc.invalidateQueries({ queryKey: ["folders"] }); },
  });
  if (!note.data) return <AppShell><div /></AppShell>;
  return (
    <AppShell>
      {/* top bar + document column: title input (onChange save.mutate({title})),
          tags row, <FolioEditor initialContent={note.data.content}
          onChange={(content) => save.mutate({ content })} /> with theme from prefs */}
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify** slash menu (`/`), selection toolbar, code/checklist/table/callout/image blocks all work and autosave persists (reload note → content retained).

- [ ] **Step 3: Commit**

```bash
git add web/src/screens/Editor.tsx
git commit -m "feat(web): editor screen with optimistic autosave"
```

### Task 31: Search screen

**Files:**
- Modify: `web/src/screens/Search.tsx`

- [ ] **Step 1: Implement** per spec §4.4 / README §5: focused search header (input with accent ring + `esc` chip), results count, filter chips (All folders + folder facets), sort control, left facet rail (Type + Folder counts from `folderFacets`), and results list rendering `titleHl`/`snippetHl` via `dangerouslySetInnerHTML` (server-sanitized `<mark>` only). Debounce the query (300ms) and call `useQuery(["search", q, folder], () => api.search(q, folder), { enabled: q.length>0 })`. `<mark>` styled per README (`--accent-soft`/`--accent-text`). Each result → `/note/:id`. `Esc` navigates back.

- [ ] **Step 2: Visual check** against README §5; confirm highlights render.

- [ ] **Step 3: Commit**

```bash
git add web/src/screens/Search.tsx
git commit -m "feat(web): search screen with facets and highlighted results"
```

---

## Phase 8 — Integration, seed, backups, verification

### Task 32: Seed data for first run

**Files:**
- Create: `api/src/db/seed.ts`

- [ ] **Step 1: Implement `api/src/db/seed.ts`** — idempotent: for a given `userId` (or the first user), insert the 6 README folders (Engineering #e0a548, Reading #4fb3a3, Ideas #a89adf, Recipes #d98a8a, Health #7cba6a, Travel #6fa8dc) with descriptions, and a few sample notes (the README's Engineering notes) with tags, only if the user has no folders yet. Run on first login (call from auth callback when creating a new user) OR via `npm run seed`.

- [ ] **Step 2: Wire** new-user seeding into `routes/auth.ts` (after `db.insert(prefs)` for a brand-new user, call `seedUser(userId)`).

- [ ] **Step 3: Compile + commit**

Run: `cd api && npx tsc --noEmit`
```bash
git add api/src/db/seed.ts api/src/routes/auth.ts
git commit -m "feat(api): seed default folders and sample notes for new users"
```

### Task 33: Backup script

**Files:**
- Create: `scripts/backup.sh`

- [ ] **Step 1: Implement `scripts/backup.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="./backups/folio-${STAMP}.sql.gz"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-folio}" "${POSTGRES_DB:-folio}" | gzip > "$OUT"
echo "Backup written: $OUT"
# Optional retention: keep last 14
ls -1t ./backups/folio-*.sql.gz | tail -n +15 | xargs -r rm --
```

- [ ] **Step 2: Make executable & smoke test (db up)**

Run: `chmod +x scripts/backup.sh && ./scripts/backup.sh`
Expected: a `.sql.gz` file appears in `./backups`.

- [ ] **Step 3: Commit**

```bash
git add scripts/backup.sh
git commit -m "feat: pg_dump backup script with retention"
```

### Task 34: Full-stack integration smoke & docs

**Files:**
- Create: `README-DEV.md`

- [ ] **Step 1: Bring the whole stack up**

Run: `docker compose up -d --build`
Expected: all 5 services healthy (`docker compose ps`). Note: set real Google OAuth creds + tunnel token in `.env` first.

- [ ] **Step 2: End-to-end manual checklist** (record results in `README-DEV.md`):
  - Visit the tunnel domain → redirected to `/signin`.
  - Sign in with Google → lands on Home with seeded folders.
  - Create a note → edit with slash menu, code block, checklist, table, callout → reload → content persists.
  - Toggle favorite → appears in sidebar Favorites.
  - Open a folder → note list renders with relative times.
  - Search a term → highlighted results + working folder facets.
  - Toggle theme/accent/editor-font → all tokens swap live; reload → choices persist.
  - Sign out → back to `/signin`.

- [ ] **Step 3: Caching verification** (record in `README-DEV.md`):
  - DevTools Network: hashed `/assets/*` return `Cache-Control: immutable`; `index.html` `no-cache`.
  - Second load of folders/notes served from React Query cache (no refetch within staleTime).
  - `GET /api/notes/:id` returns an `ETag`; repeat with `If-None-Match` → `304` (or framework-handled).
  - `redis-cli KEYS '*'` shows `session:*`, `folders:*`, `search:*` keys; writing a note clears the matching cache keys.

- [ ] **Step 4: Commit**

```bash
git add README-DEV.md
git commit -m "docs: dev/run instructions and verification checklist"
```

---

## Self-Review Notes (coverage)

- **Spec §2 stack** → Tasks 2–4, 19–22, 29.
- **Spec §3 containers/topology** → Task 4 (compose + nginx + cloudflared).
- **Spec §4 frontend (theming, sidebar, all 5 screens, client caching)** → Tasks 19–31.
- **Spec §5 backend (auth, endpoints, search, redis caching, rate limit)** → Tasks 10–18.
- **Spec §6 data model** → Task 6.
- **Spec §7 deployment/backups** → Tasks 4, 33, 34.
- **Spec §8 state** → Tasks 21, 22, 30.
- **Spec §10 acceptance criteria** → Task 34 (E2E + caching checklists).

All required block types, search highlighting, theme/accent/font persistence, Google OAuth, and the five-container Docker deploy are covered by concrete tasks.
