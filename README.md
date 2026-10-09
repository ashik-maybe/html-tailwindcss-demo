# Tailwind CSS v4 Pattern Library

A production-shaped SPA built with **Tailwind v4 + Vite + vanilla JavaScript** —
thirteen commented page patterns you can read, break, and copy into real projects.
No framework, no build magic beyond Vite: the goal is to show what the
platform already does before reaching for libraries.

**New to HTML or Tailwind?** There is a beginner-to-advanced teaching track in
[`src/learning/`](src/learning/index.html) — ten standalone lessons — plus a full
three-track roadmap in [GETTING-STARTED.md](GETTING-STARTED.md). Start there,
then come back to the pattern library.

**Ready for the backend?** [`app/`](#full-stack-app-app) is a full-stack task
manager — Bun + Hono API, SQLite, cookie sessions, and a React client.

## Quick start

```bash
bun install     # or: npm install
bun run dev     # dev server at http://localhost:5173
bun run build   # output → dist/
bun run test    # unit tests
```

Then open `/src/learning/index.html` for the guided lessons, or `/` for the app.

## How it works

- **`index.html`** — the persistent app shell: sidebar, mobile drawer, dark-mode
  toggle, ⌘K palette, toast host. It never reloads.
- **`src/main.js`** — view registry, `switchView()`, hash routing, event
  delegation, and per-view `init()` hooks. ~2,000 commented lines.
- **`src/views/*.html`** — one file per page, imported as strings with Vite's
  `?raw` suffix (bundled at build time). The one deliberate exception is the
  Live Data view, which really calls a public API to show the request lifecycle.
- **`src/lib/*.js`** — pure, framework-free helpers (formatting, table paging,
  float positioning, the hash router) extracted so they're unit-testable.
- **`src/style.css`** — the CSS-first v4 setup: `@import "tailwindcss"`,
  `@custom-variant dark`, `@theme` brand tokens.

Views swap by injecting HTML into `#view` and re-running the active-nav state —
the same job a React/Vue router does, in ~20 lines you can actually read.
Routing uses the URL hash (`#/table`): deep links work, and Back/Forward move
between views.

## Pattern index

| View | File | Key patterns |
| --- | --- | --- |
| Landing / Hero | `src/views/landing.html` | Hero, feature grid, gradient text, footer |
| SaaS Dashboard | `src/views/dashboard.html` | Stats cards, CSS bar chart, dropdown, activity feed |
| Data Table | `src/views/table.html` | Search + status chips + **role combobox**, **real 42-row dataset with pagination**, empty state, row actions |
| AI Chat | `src/views/chat.html` | Viewport-filling flex, bubbles, slide-over history with canned threads, XSS-safe send |
| Settings | `src/views/settings.html` | Arrow-key tablist, dirty-tracking profile form, native `<dialog>`, toggle switches |
| Loading & States | `src/views/states.html` | Skeletons, empty state, `role="alert"` error, toasts |
| Checkout & Billing | `src/views/checkout.html` | **Real 3-step stepper** (per-step `checkValidity`), `peer`/`:has()` radio cards, disabled→enabled pay gate, sticky summary |
| Authentication | `src/views/auth.html` | Split screen, social buttons, error alert with focus management |
| Shop | `src/views/shop.html` | Product grid, JS sort + favourite toggles, `group-hover` zoom, cart badge |
| Blog | `src/views/blog.html` | Featured post, card grid, byline, newsletter form |
| FAQ | `src/views/faq.html` | Native `<details>` accordion, `group-open:` chevron, focus-ringed summaries |
| Overlays & Pickers | `src/views/components.html` | Anchored positioning (fixed + flip + shift), hover+focus tooltip, popover, keyboard menu, combobox |
| Live Data (fetch) | `src/views/api.html` | Real `fetch` from a public API, loading/success/empty/error states, `AbortController` cancel + stale-response guard, XSS-safe rendering |

Cross-cutting: dark mode everywhere (`@custom-variant`), focus rings on every
interactive element (`focus-visible:ring-2`), `aria-*` state on everything JS
toggles, event delegation instead of per-button listeners, a global
`prefers-reduced-motion` opt-out, one locked primary-button/input/heading
spec, and comments that explain **why** a class was chosen — not just what it
does.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds and publishes on push to `main`.
In the repo settings set **Pages → Source: GitHub Actions**.
`vite.config.js` sets `base: './'` so assets resolve under `/repo-name/`.
The deploy is gated: lint, unit tests, and the Playwright suite must pass first.

## Testing & tooling

```bash
bun run lint          # ESLint (flat config)
bun run test          # Vitest unit tests (~32) — pure helpers in src/lib
bun run test:e2e      # Playwright end-to-end tests against a real browser
bun run format:check  # Prettier check (src/lib, tests, e2e)
bun run check         # lint + unit tests + build
```

- **Vitest** covers the pure logic extracted into `src/lib/` — the hash router,
  table filtering/paging, formatting, and float positioning — with no DOM needed.
- **Playwright** drives the real app: routing (deep links, Back, unknown ids),
  the table, the ⌘K palette, dark-mode persistence, the learning link, and all
  four Live Data states (the API is mocked with `page.route`).
- First local e2e run needs browsers: `bunx playwright install chromium`.

## Full-stack app (`app/`)

The pattern library is deliberately static. `app/` is the other half: a real
**task manager** with a backend, authentication, and a database — the same
release every web product needs.

- **Stack:** Bun + [Hono](https://hono.dev) API, SQLite via `bun:sqlite`
  (no ORM), React 19 + Vite + Tailwind v4 client.
- **Auth:** passwords hashed with Argon2 (`Bun.password`), random session id in
  an `httpOnly` / `SameSite=Lax` cookie, sessions stored in the DB so they can
  be revoked. Every task query is scoped by `user_id`.
- **API:** `POST /api/auth/register|login|logout`, `GET /api/auth/me`, and
  `GET|POST|PATCH|DELETE /api/tasks` (all task routes require a session).

```bash
cd app
bun install
bun run dev      # API on :5181 + client on :5180 (Vite proxies /api)
bun run test     # API unit tests (Bun's test runner)
bun run test:e2e # Playwright: real browser against the real API
bun run build && bun run start   # one process serves API + built client
```

Layout: `app/server/` (Hono app, auth, tasks, db, store) · `app/src/` (React) ·
`app/tests/` (API tests) · `app/e2e/` (browser flows). CI in
`.github/workflows/app.yml` runs lint, unit, e2e, and build on `app/` changes.

## Suggested reading order

0. [GETTING-STARTED.md](GETTING-STARTED.md) + [`src/learning/`](src/learning/index.html) —
   the guided path. Skip if the views already make sense.
1. `index.html` — the shell and why an SPA needs one.
2. `src/style.css` — v4's CSS-first config in ~120 lines.
3. `src/main.js` top half — registry + `switchView` + delegation + routing
   (paired with `src/lib/router.js`).
4. `src/views/landing.html` → `checkout.html` → `chat.html` — from static to
   interactive, easiest to hardest.

## What next

**CSS fundamentals** — the utilities will make far more sense after you know
what they compile to:

- The cascade, specificity, and inheritance (every `dark:` fight is really a
  specificity question).
- Flexbox and grid for real: every layout here is one of those two.
- Pseudo-classes (`:hover`, `:focus-visible`, `:checked`, `:nth-child`) and
  combinators (`>`, `+`, `~`) — they power `peer-*`, `has-*`, and `even:*`.
- Read the [Tailwind v4 docs](https://tailwindcss.com/docs) `@theme` and
  variants pages — this repo's `style.css` is a tiny example of both.

**Exercises** — do these before picking a framework:

1. ~~Add hash routing (`#/table`) so `switchView` runs on `hashchange` and the
   URL bar stays honest.~~ **Done** — see `src/lib/router.js` and the
   `hashchange` handler in `src/main.js`. Read it, then break it.
2. Rebuild the table's search with zero JS using `:has()` + a hidden
   checkbox trick — then compare with the delegated listener version.
3. Add a real product to Shop by copying one `<article>` — feel how far copy
   paste gets you, then refactor all six cards into one JS template
   function.
4. Replace the dashboard's fake bar chart with CSS grid columns driven by
   inline `style="--h: 60%"` custom properties.
5. Make the FAQ a single-open accordion: one `name` attribute on all
   `<details>` (the native exclusive-accordion feature).

**Then, frameworks** — learn one, not all:

- **React** (or Preact, for a smaller taste): the mental model transfer is
  direct — `switchView` becomes a router, `init()` hooks become `useEffect`,
  the registry becomes components. Start with the official tutorial, then
  re-implement this repo's sidebar in it.
- **Vue**: gentler if the DOM-direct style here already feels right; its
  templates read like this markup with superpowers.
- Whatever you pick: you'll now recognise every pattern here as "the same
  thing, just with a library doing the DOM swap".

**Also worth knowing before job hunting**: TypeScript basics, fetching +
loading/error states from real APIs (the Live Data view does the real thing;
the States view is the UI-only half), testing (this repo ships Vitest +
Playwright you can copy), Git workflows, and accessibility — screen-reader
testing with NVDA/VoiceOver once is worth a hundred `aria-` comments.

For the full roadmap with checkpoints, projects, and resources for each stage,
see [GETTING-STARTED.md](GETTING-STARTED.md).

## License

MIT — copy, modify, ship.
