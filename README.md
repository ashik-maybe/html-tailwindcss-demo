# Tailwind CSS v4 Pattern Library

A production-shaped SPA built with **Tailwind v4 + Vite + vanilla JavaScript** —
eleven commented page patterns you can read, break, and copy into real projects.
No framework, no build magic beyond Vite: the goal is to show what the
platform already does before reaching for libraries.

## Quick start

```bash
bun install     # or: npm install
bun run dev     # dev server at http://localhost:5173
bun run build   # output → dist/
```

## How it works

- **`index.html`** — the persistent app shell: sidebar, mobile drawer, dark-mode
  toggle, ⌘K palette, toast host. It never reloads.
- **`src/main.js`** — view registry, `switchView()`, event delegation, and
  per-view `init()` hooks. ~500 commented lines.
- **`src/views/*.html`** — one file per page, imported as strings with Vite's
  `?raw` suffix (bundled at build time — no runtime `fetch()`).
- **`src/style.css`** — the CSS-first v4 setup: `@import "tailwindcss"`,
  `@custom-variant dark`, `@theme` brand tokens.

Views swap by injecting HTML into `#view` and re-running the active-nav state —
the same job a React/Vue router does, in ~20 lines you can actually read.

## Pattern index

| View | File | Key patterns |
| --- | --- | --- |
| Landing / Hero | `src/views/landing.html` | Hero, feature grid, gradient text, footer |
| SaaS Dashboard | `src/views/dashboard.html` | Stats cards, CSS bar chart, dropdown, activity feed |
| Data Table | `src/views/table.html` | Search filter, chip toggles, zebra rows, status pills, avatar stacks |
| AI Chat | `src/views/chat.html` | Viewport-filling flex layout, bubbles, collapsible history, XSS-safe send |
| Settings | `src/views/settings.html` | JS tabs, native `<dialog>` modal, toggle switches, sticky save bar |
| Loading & States | `src/views/states.html` | Skeletons, empty state, `role="alert"` error, toasts |
| Checkout & Billing | `src/views/checkout.html` | Stepper, `peer`/`:has()` radio cards, disabled→enabled pay gate, sticky summary |
| Authentication | `src/views/auth.html` | Split screen, social buttons, error alert with focus management |
| Shop | `src/views/shop.html` | Responsive product grid, `group-hover` zoom, cart badge + toast |
| Blog | `src/views/blog.html` | Featured post, card grid, byline, newsletter form |
| FAQ | `src/views/faq.html` | Native `<details>` accordion, `group-open:` chevron |

Cross-cutting: dark mode everywhere (`@custom-variant`), focus rings on every
interactive element (`focus-visible:ring-2`), `aria-*` state on everything JS
toggles, event delegation instead of per-button listeners, and comments that
explain **why** a class was chosen — not just what it does.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds and publishes on push to `main`.
In the repo settings set **Pages → Source: GitHub Actions**.
`vite.config.js` sets `base: './'` so assets resolve under `/repo-name/`.

## Suggested reading order

1. `index.html` — the shell and why an SPA needs one.
2. `src/style.css` — v4's CSS-first config in 90 lines.
3. `src/main.js` top half — registry + `switchView` + delegation.
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

1. Add hash routing (`#/table`) so `switchView` runs on `hashchange` and the
   URL bar stays honest.
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
loading/error states from real APIs (the States view is the UI half),
Git workflows, and accessibility — screen-reader testing with NVDA/VoiceOver
once is worth a hundred `aria-` comments.

## License

MIT — copy, modify, ship.
