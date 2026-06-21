# Handoff: Folio — Personal Knowledge Wiki

## Overview
Folio is a personal wiki / note-taking web app with a focused, writing-first aesthetic. A user signs in with Google, organizes notes into colored **folders**, classifies them with **tags**, searches across everything, and writes in a **rich block editor** (slash commands, formatting toolbar, callouts, code, checklists, tables, image embeds). The whole app supports a **light and dark theme** (live-swappable) and an **accent color** choice.

This handoff covers 5 screens: Sign in, Home, Folder view, Editor, and Search.

## About the Design Files
The files in this bundle (`Folio Wiki.dc.html`, `Sidebar.dc.html`) are **design references authored in HTML** — prototypes that show the intended look, layout, and behavior. They are **not production code to copy directly**. They use a small in-house templating runtime (`.dc.html` Design Components) purely to demonstrate the design; ignore that runtime.

Your task: **recreate these designs in the target codebase using its existing stack and conventions** (React, Vue, Svelte, etc.). If no front-end exists yet, choose the most appropriate modern framework (React + a CSS approach such as CSS variables / Tailwind / CSS Modules is a natural fit) and implement there. Reproduce the visual design faithfully, but wire up real auth, data, and persistence.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and component states are specified below with exact values. Recreate pixel-faithfully, then connect to real data. The frames are laid out side-by-side on a gray canvas purely for review — each frame is one full app screen at the listed dimensions.

---

## Design Tokens

The design is themeable. All colors are CSS custom properties switched by a `data-theme` attribute on the app root. Accent is switched by `data-accent`; editor body font by `data-editorfont`.

### Color tokens — Dark theme (default)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#111317` | App background / content area |
| `--surface` | `#16181d` | Sidebar, cards, panels |
| `--surface-2` | `#1d2026` | Hover, chips, popovers, code header |
| `--border` | `#272b33` | Primary borders |
| `--border-soft` | `#1e2229` | Row dividers, subtle separators |
| `--text` | `#e9eaee` | Primary text |
| `--text-2` | `#a3a7b2` | Secondary text |
| `--text-3` | `#6b6f7a` | Muted text, metadata |
| `--code-bg` | `#0d0f13` | Code block body |
| `--gallery-bg` | `#0b0c0e` | (review canvas only — not part of app) |

### Color tokens — Light theme
| Token | Value |
|---|---|
| `--bg` | `#ffffff` |
| `--surface` | `#faf9f7` |
| `--surface-2` | `#f1efea` |
| `--border` | `#e7e3db` |
| `--border-soft` | `#efece6` |
| `--text` | `#1d1c19` |
| `--text-2` | `#6a6862` |
| `--text-3` | `#9a978e` |
| `--code-bg` | `#f6f4f0` |
| `--gallery-bg` | `#e9e7e1` |

### Accent tokens
Accent is 3 vars: `--accent` (solid fills, dots), `--accent-soft` (tinted backgrounds), `--accent-text` (accent-colored text/icons). Default is **amber**. Light theme uses darker accent shades for contrast.

| Accent | Dark `--accent` / `--accent-text` | Light `--accent` / `--accent-text` | `--accent-soft` (dark / light alpha) |
|---|---|---|---|
| amber (default) | `#e0a548` / `#f0c074` | `#b27c22` / `#8c5f16` | `rgba(224,165,72,.15)` / `rgba(178,124,34,.12)` |
| teal | `#3fa896` / `#5cc4b2` | `#2c8475` / `#1f6457` | `rgba(63,168,150,.15)` / `rgba(44,132,117,.12)` |
| blue | `#5b9bd5` / `#7db3e6` | `#2f6fb0` / `#235488` | `rgba(91,155,213,.15)` / `rgba(47,111,176,.12)` |
| rose | `#d97a86` / `#e89aa3` | `#b5505d` / `#8f3a45` | `rgba(217,122,134,.15)` / `rgba(181,80,93,.12)` |

> Note: solid accent buttons use dark text `#1c1408` on top of the accent fill (works for all accents in both themes).

### Folder / category colors (fixed hues, used in both themes)
These are per-folder identity colors (dots, soft-tinted icon backgrounds). Soft background = same hue at `.16` alpha.
| Folder | Hue |
|---|---|
| Engineering | `#e0a548` |
| Reading | `#4fb3a3` |
| Ideas | `#a89adf` |
| Recipes | `#d98a8a` |
| Health | `#7cba6a` |
| Travel | `#6fa8dc` |

### Typography
Three Google Fonts:
- **Schibsted Grotesk** — all UI (nav, buttons, labels, metadata, table text). Weights 400/500/600/700.
- **Newsreader** (serif) — document/editorial type: note titles, editor body, headings inside the editor, card titles. Weights 400/500/600 + italic 400.
- **JetBrains Mono** — tags (`#systems`), counts, code blocks, keyboard hints. Weights 400/500/600.

The editor **body font is swappable** via `--editor-font` (`'Newsreader',serif` default; `'Schibsted Grotesk',sans-serif` when `data-editorfont="Sans"`).

Representative type ramp (size / weight / line-height):
| Role | Font | Size / Weight / LH |
|---|---|---|
| Page H1 (folder/login hero) | Newsreader | 30–44px / 600 / 1.1–1.15, letter-spacing −0.015em |
| Editor note title | Newsreader | 39px / 600 / 1.14, −0.018em |
| Editor H2 | Newsreader | 25px / 600 / 1.25, −0.01em |
| Editor body / paragraph | var(--editor-font) | 17px / 400 / 1.75 |
| Card / list title | Newsreader | 16–17px / 600 / 1.3 |
| Dashboard greeting | Schibsted Grotesk | 23px / 600 |
| Body UI text | Schibsted Grotesk | 13–15px / 400–500 |
| Section label (uppercase) | Schibsted Grotesk | 10.5–11px / 600, letter-spacing .06–.07em, uppercase |
| Tag chip / count / code | JetBrains Mono | 11–13px / 400–500 |

### Spacing, radius, shadows
- Spacing rhythm: 6 / 8 / 10 / 14 / 16 / 18 / 22 / 26 / 32px.
- Radius: chips `5–6px`, buttons/inputs `8–9px`, cards/panels `10–12px`, screen container `14px`, avatar `50%`.
- Card shadow (screen container): `0 2px 4px rgba(0,0,0,.16), 0 24px 60px rgba(0,0,0,.18)`.
- Popover/toolbar shadow: `0 18px 48px rgba(0,0,0,.36)` (slash menu), `0 10px 28px rgba(0,0,0,.32)` (selection toolbar).
- Focused search input ring: `border:1px solid var(--accent); box-shadow:0 0 0 3px var(--accent-soft)`.
- Text selection: `::selection { background: rgba(91,155,213,.32); }`.
- Blinking caret: `@keyframes blink {0%,49%{opacity:1} 50%,100%{opacity:0}}` at `1.1s steps(1) infinite`, 2px wide × ~20px, `background:var(--accent)`.

---

## Shared Component: Sidebar (260px)
Present on Home, Folder, Editor, Search. Fixed `width:260px`, `background:var(--surface)`, right border `1px var(--border)`, vertical flex, `padding:16px 12px`. Top→bottom:
1. **Workspace header** — 30px rounded-8 accent square with serif "F", then "Folio" (700/15) over "Alex's workspace" (500/11, `--text-3`), trailing chevron-down.
2. **Search button** — full width, `--bg` fill, `--border`, search icon + "Search" + `⌘K` kbd chip (mono, `--surface-2`).
3. **New note button** — accent fill, dark text, plus icon + "New note".
4. **Favorites** section (uppercase label) — 3 items, each a star icon (accent) + label. Items: "Distributed Systems", "2026 Reading List", "Home Server Setup".
5. **Folders** section (label + trailing plus icon) — 6 rows: colored dot + name + count (mono, `--text-3`). Engineering 24, Reading 18, Ideas 12, Recipes 9, Health 6, Travel 7. **Active row** = `background:var(--accent-soft); color:var(--accent-text)`; inactive = `color:var(--text-2)`, transparent.
6. **Tags** section — wrapped chips: `#systems #design #philosophy #python #books #productivity` (mono, `--surface-2` bg, `--text-2`).
7. **Account row** (pinned bottom, top border) — 32px gradient avatar `linear-gradient(135deg,#e0a548,#d98a8a)` with white "AM", then "Alex Mercer" (600/13) over "alex@gmail.com" (500/11, `--text-3`), trailing settings/sliders icon.

Nav row base: `display:flex; align-items:center; gap:10px; padding:7px 10px; border-radius:8px; font:500 13.5px Schibsted Grotesk`.

---

## Screens / Views

### 1. Sign in
- **Purpose:** Authenticate, primarily via Google.
- **Layout:** Two-column split, container 1180×760. Left brand panel `flex:1`; right form panel fixed `480px`.
- **Left panel:** `background:var(--surface)`, `padding:60px`, space-between column. Subtle dotted texture overlay: `radial-gradient(var(--border) 1px, transparent 1px)`, `background-size:24px 24px`, opacity .55. Top: F-mark + "Folio". Middle: H1 (Newsreader 44/600) "Your notes, finally in one calm place." + sub-paragraph (Newsreader 17, `--text-2`) + 3 feature rows (27px rounded accent-soft square with check icon + label: "A rich editor with slash commands", "Folders, tags & full-text search", "Yours, and private by default"). Bottom: "© 2026 Folio" (`--text-3`).
- **Right panel:** centered, max-width 340. "Sign in" (Schibsted 27/600), subtitle, then:
  - **Continue with Google** button — white `#ffffff` fill, `1px #dadce0` border, dark text, multicolor Google "G" SVG, `0 1px 2px rgba(0,0,0,.1)` shadow. (White in BOTH themes.)
  - "OR" divider (hairlines + centered label).
  - **Continue with email** secondary button — transparent, `--border`, `--text`, mail icon.
  - Terms/Privacy fine print (`--text-3`, underlined links).

### 2. Home (Dashboard)
- **Purpose:** Re-entry point — resume recent notes, browse folders.
- **Layout:** Sidebar + main (`flex:1`, column). Container 1280×880.
- **Top bar** (`padding:18px 32px`, bottom border): left = uppercase date "WEDNESDAY · JUNE 21" + "Good evening, Alex" (23/600); right = "Filter" outline button + "New note" accent button.
- **Body** (`padding:28px 32px`, gap 30):
  - **"Continue where you left off"** section header with "View all" (accent text) link. 3-col grid of **recent cards**: `--surface` bg, `--border`, radius 12, padding 18, min-height 158. Each: folder dot+name (mono-ish small `--text-3`), serif title (16/600), 2-line snippet (`--text-2`), edited timestamp (`--text-3`). Content: "Notes on Distributed Systems"/Engineering/2h, "On Writing Well — highlights"/Reading/yesterday, "Sourdough: the 70% loaf"/Recipes/3d.
  - **"Folders"** section ("6 folders · 76 notes"). 3-col grid of **folder cards**: top row = 34px rounded folder icon on folder-hue-soft background (hue at .16 alpha) + note count; then folder name (Schibsted 16/600) + description; then 1–2 tag chips. Engineering/Reading/Ideas shown.

### 3. Folder view
- **Purpose:** Browse + filter the notes in one folder (Engineering, active in sidebar).
- **Layout:** Sidebar + main. Container 1280×880.
- **Header** (`padding:26px 34px 0`): breadcrumb "Folders / Engineering" (`--text-3`); then a row with a 14px rounded folder-color square + H1 "Engineering" (Newsreader 31/600) + description line "Systems, architecture & infrastructure notes · 24 notes"; right = "Edited" sort button + a segmented **list/grid view toggle** (list active = `--surface-2`).
- **Filter chips row:** "All" (active, accent-soft) + tag chips `#systems #python #postgres #design`.
- **Note list:** one bordered `--surface` card containing rows divided by `--border-soft`. Each row (`padding:15px 18px`, flex, gap 18): serif title (15.5/600) + 1-line ellipsized snippet (`--text-2`); right group = up to 2 tag chips (`--bg` bg) + right-aligned timestamp (78px wide, `--text-3`). 6 rows: Notes on Distributed Systems (2h), Postgres indexing deep-dive (Yesterday), Designing idempotent APIs (2d), Kafka vs. NATS for our pipeline (4d), Home server setup & backups (1w), Rate limiting strategies (2w).

### 4. Editor  ← hero screen
- **Purpose:** Write/read a note with rich blocks.
- **Layout:** Sidebar + main. Container 1280×**1560** (tall to show full document). Main = top bar + centered document column (`max-width:760px`, `padding:46px 40px 60px`).
- **Top bar** (`padding:14px 26px`, bottom border): left = breadcrumb "● Engineering › Notes on Distributed Systems" (chevron between); right = "Edited 2h ago" + 32px icon buttons (star, more/⋯) + accent **Share** button (upload icon).
- **Document blocks (in order):**
  1. **Title** — Newsreader 39/600, −0.018em: "Notes on Distributed Systems".
  2. **Meta row** — tag chips `#systems #distributed` (mono, `--surface-2`) + "Updated June 21, 2026" (`--text-3`).
  3. **Paragraph** — body 17/1.75.
  4. **Callout** — left accent bar (`3px solid var(--accent)`), `--accent-soft` bg, radius `0 8px 8px 0`, info icon (accent) + text.
  5. **H2** "Consensus & replication".
  6. **Paragraph with active text selection** — a span highlighted `rgba(91,155,213,.32)`, and a **floating selection toolbar** positioned above it (absolute): rounded `--surface-2` pill, `--border`, drop shadow; buttons **B** (serif bold), *i* (italic), **U** (underline), divider, link, `<>` code, **highlight** (active = accent-soft bg + accent-text), divider, **H2**. 30×30 buttons.
  7. **Code block** — `--code-bg`, header bar with filename "leader_election.py" (mono, `--text-3`) + "Copy" on the right; body `<pre>` mono 13/1.75 with simple syntax tint (keywords `def`/`return` → `--accent-text`, numbers → `#7cba6a`, comments → `--text-3`). Python leader-election snippet.
  8. **H2** "Pre-flight for a new service".
  9. **Checklist** — 3 rows. Checked = 18px rounded accent square with dark check icon + text `line-through` `--text-3`; unchecked = 18px square `1.6px solid var(--text-3)` border + normal text. Items: "Define the failure model" ✓, "Pick a consistency level per endpoint" ✓, "Add chaos tests for partition scenarios" ☐.
  10. **H2** "Trade-offs at a glance".
  11. **Table** — bordered, radius 10. Header row `--surface` bg, 600/12.5 `--text-2`. Body cells `padding:11px 15px`, first col `--text`, rest `--text-2`, rows divided by `--border-soft`. Columns Approach / Consistency / Latency; rows Single leader/Strong/Higher, Quorum (R+W>N)/Tunable/Medium, Leaderless/Eventual/Lower.
  12. **Figure (image embed)** — bordered `--surface` box, 210px tall, containing a 3-node topology SVG diagram (n1 outlined in accent, n2/n3 in `--text-3`, connecting lines); centered caption (`--text-3`). *In production this is a real embedded image/diagram; the SVG is a placeholder.*
  13. **Slash-command line + menu** — an empty line showing "/head" with a blinking accent caret, and an open **command popover** (absolute, 312px, `--surface-2`, radius 12, big shadow): uppercase "Basic blocks" label, then rows (32px rounded icon tile + name 13.5/600 + description 12/`--text-3`). First row **active** (accent-soft bg): Heading 1, Heading 2, To-do list, Code block, Callout.
- **Behavior to implement:** selection toolbar appears on text selection; "/" at line start opens the command menu (filterable, arrow-key navigable, Enter inserts block); each block type editable.

### 5. Search
- **Purpose:** Full-text search with facets and highlighted matches.
- **Layout:** Sidebar + main. Container 1280×880.
- **Search header** (`padding:24px 32px`, bottom border): a focused input (`--surface` bg, accent border + accent-soft ring) with accent search icon, query text "distributed systems" + blinking caret, and an "esc" kbd chip. Below: "12 results" + filter chips ("All folders" active accent-soft, `#systems`, `#distributed`) + right-aligned "Relevance ⌄" sort.
- **Body:** two columns. Left **facet rail** (210px, right border, `padding:22px`): "Type" group (Notes 9, Tasks 2, Files 1) and "Folder" group (colored dot + name + count). Counts in mono `--text-3`, first item of each group emphasized `--text`.
- **Results list** (`flex:1`, `padding:8px 28px`): rows divided by `--border-soft`. Each: meta line (folder dot + name + "· time"), serif title (17/600) with `<mark>` highlights, snippet (`--text-2`, max-width 680) with `<mark>` highlights. `mark` style: `background:var(--accent-soft); color:var(--accent-text); padding:0 2px; border-radius:3px`. 5 results referencing the query.

---

## Interactions & Behavior
- **Theme toggle:** Dark/Light switches all `--*` tokens via `data-theme` on the app root. Persist the choice (localStorage / user prefs).
- **Accent + editor-font:** `data-accent` (amber/teal/blue/rose) and `data-editorfont` (Serif/Sans) similarly swap tokens. Expose in Settings.
- **Navigation:** sidebar folder → Folder view; note/row/card → Editor; search button or ⌘K → Search; "New note" → new Editor doc.
- **Editor:** slash menu (open on "/", filter as you type, arrow keys + Enter), selection toolbar on text selection, checkbox toggle, "Copy" on code blocks, "Share" action.
- **Search:** debounce query, highlight all matches in title + snippet, facet click narrows results, sort by Relevance/Edited.
- **Hover/active states:** rows and cards get a subtle `--surface-2` hover; active sidebar/filter items use `--accent-soft` + `--accent-text`. Transitions ~.15s.
- **Auth:** real Google OAuth ("Continue with Google"); email is secondary.

## State Management
- `theme` (`'dark'|'light'`), `accent` (`'amber'|'teal'|'blue'|'rose'`), `editorFont` (`'Serif'|'Sans'`) — persisted user prefs.
- `user` (profile, avatar, email) from auth.
- `folders[]` (id, name, color, count, description, tags), `tags[]`, `favorites[]`.
- `currentFolder`, `currentNote` (rich block document), `notes[]`.
- `searchQuery`, `searchFilters` (type, folder, tags, sort), `searchResults[]`.
- Editor document model: ordered list of blocks (paragraph, heading, callout, code, checklist item, table, image, etc.) — use an existing rich-text/block editor (e.g. Tiptap/ProseMirror, Lexical, BlockNote) rather than hand-rolling.
- Data fetching: notes/folders CRUD + full-text search endpoint.

## Assets
- **Google "G" logo** — inline multicolor SVG in the design (login button). Use the official Google sign-in button per Google's branding guidelines in production.
- **All other icons** — generic inline stroke SVGs (search, plus, chevron, folder, star, share, more, info, link, etc.). Replace with the codebase's existing icon set (Lucide/Heroicons/etc.).
- **Topology diagram** — placeholder SVG inside the editor figure; represents a user-embedded image.
- **No raster image assets** are required from this bundle.

## Files
- `Folio Wiki.dc.html` — all 5 screens + theme/accent/font system + review canvas.
- `Sidebar.dc.html` — the shared 260px sidebar component (with active-state logic).

(These use a small HTML "Design Component" runtime for the prototype — treat them as visual reference only.)
