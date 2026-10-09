// =============================================================================
// App shell controller — view registry, switching, drawer, dark mode.
// Deliberately framework-free: the same ideas power React/Vue routers.
// =============================================================================

import './style.css'

// -----------------------------------------------------------------------------
// View registry
// -----------------------------------------------------------------------------
// `?raw` is a Vite import suffix: the file is read as a plain string instead
// of being parsed as a module. Bundled at build time, so there is NO runtime
// fetch() — opening dist/ from a static host just works.
//
// Each entry: id → HTML string. Views that need JS get an optional init(root)
// called AFTER insertion (see switchView). Registry grows every phase.
// -----------------------------------------------------------------------------
import landing from './views/landing.html?raw'
import dashboard from './views/dashboard.html?raw'
import table from './views/table.html?raw'
import checkout from './views/checkout.html?raw'
import auth from './views/auth.html?raw'
import chat from './views/chat.html?raw'
import settings from './views/settings.html?raw'
import shop from './views/shop.html?raw'
import blog from './views/blog.html?raw'
import faq from './views/faq.html?raw'
import states from './views/states.html?raw'
import components from './views/components.html?raw'

// Entry shape: { html, init? }. init(root) runs after the HTML is injected
// and gets the fresh subtree — attach DIRECT listeners there to widgets that
// only exist while that view is on screen (chat form, settings tabs/modal).
// Views without per-widget JS just declare html. Function declarations below
// are hoisted, so referencing them here is safe.
const views = {
  landing: { html: landing },
  dashboard: { html: dashboard, init: initDashboard },
  table: { html: table, init: initTable }, // real 42-row dataset + pagination
  checkout: { html: checkout, init: initCheckout }, // real 3-step flow
  auth: { html: auth },
  chat: { html: chat, init: initChat },
  settings: { html: settings, init: initSettings },
  shop: { html: shop, init: initShop },
  blog: { html: blog, init: initBlog }, // category pills filter + newsletter
  faq: { html: faq }, // native <details>, zero JS by design
  states: { html: states, init: initStates },
  components: { html: components, init: initComponents }, // overlays & pickers
}

// Element references — query once at load, reuse forever.
const viewEl = document.querySelector('#view')
const sidebarEl = document.querySelector('#sidebar')
const backdropEl = document.querySelector('#drawer-backdrop')
const drawerOpenBtn = document.querySelector('#drawer-open')

// -----------------------------------------------------------------------------
// switchView — swap #view contents and move the "active" nav highlight
// -----------------------------------------------------------------------------
function switchView(id) {
  const view = views[id]
  if (!view) return

  viewEl.innerHTML = view.html

  // Per-view wiring runs against the subtree that was just inserted —
  // listeners from the previous view died with their nodes, so nothing
  // leaks or double-fires. (init functions are hoisted function decls)
  view.init?.(viewEl)

  // Active state: ONE nav button gets bg/aria-current, all others lose it.
  // aria-current="page" is how screen readers announce "you are here". (a11y)
  // Both hover sets are managed here too — an inactive button must not keep
  // the active button's brand-tinted hover (classes live in markup, JS owns
  // which variant applies).
  document.querySelectorAll('[data-view]').forEach((btn) => {
    const active = btn.dataset.view === id
    btn.classList.toggle('bg-brand-50', active)
    btn.classList.toggle('text-brand-700', active)
    btn.classList.toggle('hover:bg-brand-100', active)
    btn.classList.toggle('dark:bg-brand-900/30', active)
    btn.classList.toggle('dark:text-brand-300', active)
    btn.classList.toggle('dark:hover:bg-brand-900/50', active)
    btn.classList.toggle('text-gray-600', !active)
    btn.classList.toggle('hover:bg-gray-100', !active)
    btn.classList.toggle('dark:text-gray-400', !active)
    btn.classList.toggle('dark:hover:bg-gray-800', !active)
    if (active) btn.setAttribute('aria-current', 'page')
    else btn.removeAttribute('aria-current')
  })

  closeDrawer()
  hideTooltip() // the tooltip element dies with the view — don't leave state pointing at it

  // Move scroll to top — each view is a fresh "page".
  window.scrollTo({ top: 0 })

  // Give keyboard users focus after navigation (SPA routes can't do this
  // natively — the browser never noticed a page change). (a11y)
  viewEl.focus({ preventScroll: true })
}

// Collapse a dropdown menu — used by outside-click AND Escape so both paths
// behave identically. Focus check first: if a keyboard user was tabbing
// INSIDE the menu, hiding it would strand focus on a display:none element
// (focus jumps to <body>, Tab restarts from the top of the page). Moving
// focus back to the trigger keeps the user where they were. (a11y)
function collapseDropdown(menu) {
  const trig = menu.closest('[data-dropdown]')?.querySelector('[data-dropdown-trigger]')
  if (menu.contains(document.activeElement)) trig?.focus()
  menu.classList.add('hidden')
  trig?.setAttribute('aria-expanded', 'false')
}

// -----------------------------------------------------------------------------
// Event delegation — ONE click listener for every interactive widget
// -----------------------------------------------------------------------------
// Instead of attaching listeners to buttons that exist right now, we watch
// for clicks on document and ask "what did they hit?" via closest().
// Five behaviours, one listener:
//   1. [data-view]            → switch views (NAV: also gets the active-state
//                                class swap in switchView + feeds the ⌘K
//                                palette — that's why menu items/CTAs must
//                                NOT use it: their classes aren't nav classes)
//   2. [data-goto]            → switch views, no active-state/palette duties
//   3. [data-toast]           → answer for controls whose real backend isn't
//                                in this demo (dead clicks teach the wrong
//                                lesson — every action gets feedback)
//   4. [data-dropdown-trigger]→ toggle its menu (dashboard profile)
//   5. click outside an open dropdown → close it
document.addEventListener('click', (event) => {
  // 1. Navigation (nav buttons are <button>s; guard for <a data-view> anyway)
  const navBtn = event.target.closest('[data-view]')
  if (navBtn) {
    switchView(navBtn.dataset.view)
    if (navBtn.tagName === 'A') event.preventDefault() // no "#" hash jump
  }

  // 2. Plain jump: same router, none of the nav duties above.
  const gotoBtn = event.target.closest('[data-goto]')
  if (gotoBtn) {
    switchView(gotoBtn.dataset.goto)
    if (gotoBtn.tagName === 'A') event.preventDefault()
  }

  // 3. Demo toast.
  const toastEl = event.target.closest('[data-toast]')
  if (toastEl) {
    showToast(toastEl.dataset.toast)
    if (toastEl.tagName === 'A') event.preventDefault()
    // Menu items toast too (dashboard "Sign out") — close any open dropdown
    // so the answer isn't hidden behind a menu that should have dismissed.
    document.querySelectorAll('[data-dropdown-menu]:not(.hidden)').forEach(collapseDropdown)
  }

  // 4. Dropdown trigger: toggle the menu that is a SIBLING inside the
  //    nearest [data-dropdown] wrapper. stopPropagation is NOT needed —
  //    rule 5 runs after and re-checks containment, finding our own click
  //    inside [data-dropdown] and leaving the menu open.
  const trigger = event.target.closest('[data-dropdown-trigger]')
  if (trigger) {
    const menu = trigger.closest('[data-dropdown]')?.querySelector('[data-dropdown-menu]')
    if (menu) {
      const willOpen = menu.classList.contains('hidden')
      menu.classList.toggle('hidden')
      // aria-expanded must track reality — screen readers announce
      // "expanded/collapsed" from this attribute. (a11y)
      trigger.setAttribute('aria-expanded', String(willOpen))
      return // own click handled; skip the outside-close rule
    }
  }

  // 5. Outside-click close: any click NOT inside a [data-dropdown] collapses
  //    every open menu. querySelectorAll + toggle keeps it idempotent
  //    (safe even when nothing is open).
  if (!event.target.closest('[data-dropdown]')) {
    document.querySelectorAll('[data-dropdown-menu]:not(.hidden)').forEach(collapseDropdown)
  }
})

// -----------------------------------------------------------------------------
// Table view — 42-member dataset + initTable (table.html)
// -----------------------------------------------------------------------------
// The markup ships an EMPTY rows tbody and an EMPTY pagination nav: rows are
// DATA, rendered per state (page / query / status chip). Same architecture as
// every real table — swap MEMBERS for an API response and nothing below
// changes.
//
// escapeHtml is defined ONCE at module scope and shared by chat + table.
// Escape even "trusted" strings: the habit costs nothing and survives the
// day the data stops being ours.
// -----------------------------------------------------------------------------
const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Avatars cycle a fixed palette by member INDEX — Ava is indigo on every
// render, page and filter combo. Math, not random(): random() would repaint
// faces each time the rows rebuild.
const AVATAR_STYLES = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
]

const MEMBERS = [
  { name: 'Ava Reynolds', role: 'Admin', status: 'active', last: '2 min ago', team: ['S', 'J', 'M'] },
  { name: 'Ben Torres', role: 'Editor', status: 'active', last: '1 hr ago', team: ['K', 'P'] },
  { name: 'Chloe Kim', role: 'Viewer', status: 'inactive', last: '3 weeks ago', team: ['R'] },
  { name: 'Diego Mendez', role: 'Editor', status: 'active', last: 'Yesterday', team: ['A', 'L', 'T', 'M'] },
  { name: 'Elena Fischer', role: 'Admin', status: 'active', last: '4 hr ago', team: ['N', 'B', 'S'] },
  { name: 'Felix Grant', role: 'Viewer', status: 'inactive', last: '2 months ago', team: ['C'] },
  { name: 'Grace Huang', role: 'Editor', status: 'active', last: '10 min ago', team: ['W', 'D', 'H', 'P', 'X'] },
  { name: 'Hana Ito', role: 'Viewer', status: 'active', last: '3 days ago', team: ['Y', 'F'] },
  { name: 'Ivan Petrov', role: 'Editor', status: 'active', last: 'Just now', team: ['G', 'Q', 'V'] },
  { name: 'Julia Santos', role: 'Admin', status: 'active', last: '5 hr ago', team: ['Z', 'E', 'I', 'O'] },
  { name: 'Kai Nakamura', role: 'Editor', status: 'active', last: 'Last week', team: ['U', 'J'] },
  { name: "Liam O'Brien", role: 'Viewer', status: 'inactive', last: '6 weeks ago', team: ['M'] },
  { name: 'Maya Okafor', role: 'Admin', status: 'active', last: '20 min ago', team: ['B', 'N', 'R', 'T', 'W', 'A'] },
  { name: 'Nora Lindqvist', role: 'Editor', status: 'active', last: '2 hr ago', team: ['C', 'D', 'F'] },
  { name: 'Omar Haddad', role: 'Viewer', status: 'active', last: 'Yesterday', team: ['G', 'H'] },
  { name: 'Priya Sharma', role: 'Editor', status: 'active', last: '1 hr ago', team: ['K', 'L', 'O', 'P'] },
  { name: 'Quinn Alvarez', role: 'Viewer', status: 'inactive', last: '2 months ago', team: ['Q'] },
  { name: 'Rosa Delgado', role: 'Admin', status: 'active', last: '5 min ago', team: ['S', 'T', 'U'] },
  { name: 'Sam Whitfield', role: 'Editor', status: 'active', last: '3 hr ago', team: ['V', 'X', 'Y', 'Z'] },
  { name: 'Tara Nguyen', role: 'Viewer', status: 'active', last: '4 days ago', team: ['E', 'I'] },
  { name: 'Umar Farouk', role: 'Editor', status: 'active', last: 'Just now', team: ['O', 'R', 'W'] },
  { name: 'Vera Kowalski', role: 'Viewer', status: 'inactive', last: '7 weeks ago', team: ['A'] },
  { name: 'Will Barnes', role: 'Admin', status: 'active', last: '2 hr ago', team: ['B', 'C', 'D', 'F'] },
  { name: 'Ximena Cruz', role: 'Editor', status: 'active', last: 'Yesterday', team: ['G', 'H'] },
  { name: 'Yara Mbeki', role: 'Viewer', status: 'active', last: '6 hr ago', team: ['I', 'J', 'K'] },
  { name: 'Zoe Hart', role: 'Editor', status: 'active', last: '30 min ago', team: ['L', 'M', 'N', 'O', 'P'] },
  { name: 'Adam Reyes', role: 'Viewer', status: 'active', last: 'Last week', team: ['Q'] },
  { name: 'Bianca Moreau', role: 'Editor', status: 'inactive', last: '3 months ago', team: ['R', 'S'] },
  { name: 'Caleb Wright', role: 'Admin', status: 'active', last: '12 min ago', team: ['T', 'U', 'V'] },
  { name: 'Dalia Nasser', role: 'Viewer', status: 'active', last: '2 days ago', team: ['W', 'X'] },
  { name: 'Eli Rosenberg', role: 'Editor', status: 'active', last: '4 hr ago', team: ['Y', 'Z', 'A', 'B'] },
  { name: 'Fiona Blake', role: 'Viewer', status: 'active', last: 'Yesterday', team: ['C'] },
  { name: 'Gustav Berg', role: 'Viewer', status: 'inactive', last: '8 weeks ago', team: ['D', 'E'] },
  { name: 'Helena Brandt', role: 'Admin', status: 'active', last: '3 min ago', team: ['F', 'G', 'H', 'I', 'J'] },
  { name: 'Iker Solano', role: 'Editor', status: 'active', last: '1 hr ago', team: ['K', 'L'] },
  { name: 'Jasmine Cole', role: 'Viewer', status: 'active', last: '5 days ago', team: ['M', 'N', 'O'] },
  { name: 'Karim Aziz', role: 'Editor', status: 'inactive', last: '4 months ago', team: ['P'] },
  { name: 'Lena Vogel', role: 'Admin', status: 'active', last: '40 min ago', team: ['Q', 'R', 'S'] },
  { name: 'Marco Silva', role: 'Editor', status: 'active', last: '2 hr ago', team: ['T', 'U', 'V', 'W'] },
  { name: 'Nadia Yusuf', role: 'Viewer', status: 'active', last: 'Yesterday', team: ['X', 'Y'] },
  { name: 'Oscar Lund', role: 'Editor', status: 'active', last: '9 hr ago', team: ['Z', 'A', 'B', 'C', 'D'] },
  { name: 'Petra Novak', role: 'Viewer', status: 'inactive', last: '5 months ago', team: ['E'] },
] // 42 members: 33 active, 9 inactive → 42 / 8 per page = 6 pages

const emailOf = (m) => `${m.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@nimbus.io`

// One row → one <tr> string. `i` = index in MEMBERS (avatar colour stability),
// NOT the slice position: page 2 must not repaint the faces page 1 built.
function rowHtml(m, i) {
  const name = escapeHtml(m.name)
  const email = escapeHtml(emailOf(m))
  const initials = m.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const pill =
    m.status === 'active'
      ? '<span class="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">Active</span>'
      : '<span class="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">Inactive</span>'
  // Team stack: ≤3 faces + a "+N" overflow bubble. ring-2 in the AVATAR colour
  // order... the ring in white/dark-900 cuts each face out of the next — the
  // "notch" from the avatar-stack pattern.
  const faces = m.team
    .slice(0, 3)
    .map(
      (t, ti) =>
        `<span class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-white dark:ring-gray-900 ${AVATAR_STYLES[(i + ti + 1) % AVATAR_STYLES.length]}">${t}</span>`,
    )
    .join('')
  const extra = m.team.length - 3
  const overflow =
    extra > 0
      ? `<span class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500 ring-2 ring-white dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-900">+${extra}</span>`
      : ''

  return `<tr class="even:bg-gray-50 dark:even:bg-gray-800/60">
    <td class="px-5 py-3">
      <div class="flex items-center gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${AVATAR_STYLES[i % AVATAR_STYLES.length]}" aria-hidden="true">${initials}</span>
        <div class="min-w-0">
          <p class="truncate font-medium text-gray-900 dark:text-white">${name}</p>
          <p class="truncate text-xs text-gray-500 dark:text-gray-400">${email}</p>
        </div>
      </div>
    </td>
    <td class="px-5 py-3 text-gray-600 dark:text-gray-400">${m.role}</td>
    <td class="px-5 py-3">${pill}</td>
    <td class="px-5 py-3"><div class="flex -space-x-2">${faces}${overflow}</div></td>
    <td class="px-5 py-3 text-gray-600 dark:text-gray-400">${escapeHtml(m.last)}</td>
    <td class="px-5 py-3 text-right">
      <button type="button" data-row-action="${name}" aria-label="Row actions for ${name}" data-tooltip data-tooltip-placement="top-end" aria-describedby="tip-row-${i}" class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none dark:hover:bg-gray-800 dark:hover:text-gray-300">⋯</button>
      <span id="tip-row-${i}" role="tooltip" class="pointer-events-none fixed z-50 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 transition-opacity duration-150 dark:bg-white dark:text-gray-900">Row actions</span>
    </td>
  </tr>`
}

function initTable(root) {
  const search = root.querySelector('[data-table-search]')
  const rowsBody = root.querySelector('[data-table-rows]')
  const emptyBody = root.querySelector('#table-empty')
  const countEl = root.querySelector('[data-table-count]')
  const pagesNav = root.querySelector('[data-table-pages]')
  const card = root.querySelector('[data-table-card]')
  const chips = [...root.querySelectorAll('[data-status-filter]')]

  // State lives in the CLOSURE, not module scope: the view re-injects on
  // every visit, and a module-level `page = 5` would greet the next visit.
  // Closure state dies with the subtree it belongs to.
  const PAGE_SIZE = 8
  let query = ''
  let status = 'all'
  let page = 1

  // AND between status chip and text query — both must pass. (Same rule the
  // old filter had; only the "keep some rows" part became "build some rows".)
  const matches = (m) =>
    (status === 'all' || m.status === status) &&
    `${m.name} ${emailOf(m)} ${m.role}`.toLowerCase().includes(query)

  function render() {
    const list = MEMBERS.filter(matches)
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
    page = Math.min(page, pages) // filter shrank the list → climb back in range

    const from = list.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
    const to = Math.min(page * PAGE_SIZE, list.length)
    const start = list.length === 0 ? 0 : from - 1

    // Rows rebuilt from scratch on every state change — that is what makes
    // the plain even:bg-gray-50 nth-child striping in rowHtml trustworthy: a
    // page is always ≤8 freshly-built siblings, no hidden leftovers, parity
    // correct by construction. The old JS re-stripe workaround is deleted.
    rowsBody.innerHTML = list
      .slice(start, to)
      .map((m) => rowHtml(m, MEMBERS.indexOf(m)))
      .join('')
    emptyBody.classList.toggle('hidden', list.length > 0)

    // Count line: range + total, plus "(filtered from 42)" when narrowed —
    // 12 results out of 42 reads very differently from 12 out of 12.
    countEl.innerHTML =
      list.length === 0
        ? 'No members match'
        : `Showing <span class="font-medium text-gray-900 dark:text-white">${from}–${to}</span> of <span class="font-medium text-gray-900 dark:text-white">${list.length}</span> members${list.length < MEMBERS.length ? ' <span class="text-gray-400">(filtered from 42)</span>' : ''}`

    renderPages(pages)
  }

  function renderPages(pages) {
    const numBtn = (p) =>
      `<button type="button" data-page="${p}"${p === page ? ' aria-current="page"' : ''} class="min-w-8 rounded-lg px-2.5 py-1.5 text-sm font-medium ${p === page ? 'bg-brand-600 text-white' : 'text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'} focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">${p}</button>`
    const arrow = (label, target, disabled) =>
      `<button type="button" data-page="${target}"${disabled ? ' disabled' : ''} class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800">${label}</button>`
    // 42/8 = 6 pages → every number fits, no "…" windowing. A table with
    // hundreds of rows renders the same markup with dots — identical idea.
    // aria-current="page" marks the active number for screen readers. (a11y)
    pagesNav.innerHTML =
      arrow('← Prev', 'prev', page === 1) +
      Array.from({ length: pages }, (_, i) => numBtn(i + 1)).join('') +
      arrow('Next →', 'next', page === pages)
  }

  // Move active tint + aria-pressed onto one chip — the same class-swap the
  // nav pills use: tinted classes on, defaults off, both directions.
  function setActiveChip(active) {
    chips.forEach((btn) => {
      const on = btn === active
      btn.setAttribute('aria-pressed', String(on))
      btn.classList.toggle('border-brand-200', on)
      btn.classList.toggle('bg-brand-50', on)
      btn.classList.toggle('text-brand-700', on)
      btn.classList.toggle('dark:border-brand-800', on)
      btn.classList.toggle('dark:bg-brand-900/30', on)
      btn.classList.toggle('dark:text-brand-300', on)
      btn.classList.toggle('border-gray-200', !on)
      btn.classList.toggle('bg-white', !on)
      btn.classList.toggle('text-gray-600', !on)
      btn.classList.toggle('dark:border-gray-700', !on)
      btn.classList.toggle('dark:bg-gray-900', !on)
      btn.classList.toggle('dark:text-gray-400', !on)
    })
  }

  // Direct listeners, not delegation: every widget here lives INSIDE this
  // view and gets rebuilt with it — nothing to unbind on view switch.
  // `input` (not `change`) so filtering happens per keystroke.
  search.addEventListener('input', () => {
    query = search.value.trim().toLowerCase()
    page = 1 // a new query starts at page 1 — page 4 of 1 match is nonsense
    render()
  })

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      status = chip.dataset.statusFilter
      page = 1
      setActiveChip(chip)
      render()
    })
  })

  pagesNav.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-page]')
    if (!btn) return // disabled buttons never fire clicks — no extra guard needed
    if (btn.dataset.page === 'prev') page--
    else if (btn.dataset.page === 'next') page++
    else page = Number(btn.dataset.page)
    render()
    card.scrollIntoView({ block: 'nearest' }) // rows sit above the pagination bar
  })

  root.querySelector('[data-table-clear]').addEventListener('click', () => {
    search.value = ''
    query = ''
    status = 'all'
    page = 1
    setActiveChip(chips[0])
    render()
    search.focus() // the button is about to vanish — don't strand focus. (a11y)
  })

  // Demo-only controls: a real product opens an invite modal / row menu.
  // A dead click teaches the wrong lesson — every action gets an answer.
  root.querySelector('[data-invite]').addEventListener('click', () =>
    showToast('Invite flow — not in this demo'),
  )

  rowsBody.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-row-action]')
    if (btn) showToast(`Row actions for ${btn.dataset.rowAction} — demo`)
  })

  render() // paint the initial state: page 1, no filters
}

// -----------------------------------------------------------------------------
// initDashboard — chart range segmented control (dashboard.html)
// -----------------------------------------------------------------------------
function initDashboard(root) {
  const sub = root.querySelector('[data-range-sub]')
  const ranges = [...root.querySelectorAll('[data-range]')]
  const LABELS = { '7m': 'Last 7 months', '1y': 'Last 12 months', all: 'All time' }

  // Same class-swap recipe as the nav + status chips: pressed pill styles on,
  // defaults off, both directions — plus aria-pressed so screen readers hear
  // which range is on. Direct listeners: the set is small and view-scoped.
  ranges.forEach((btn) => {
    btn.addEventListener('click', () => {
      ranges.forEach((other) => {
        const on = other === btn
        other.setAttribute('aria-pressed', String(on))
        other.classList.toggle('bg-white', on)
        other.classList.toggle('shadow-sm', on)
        other.classList.toggle('dark:bg-gray-700', on)
        other.classList.toggle('text-gray-500', !on)
        other.classList.toggle('dark:text-gray-400', !on)
      })
      sub.textContent = LABELS[btn.dataset.range]
    })
  })
}

// -----------------------------------------------------------------------------
// Mobile drawer
// -----------------------------------------------------------------------------
// The aside is hidden below lg via class -translate-x-full (slides it
// off-screen left). Opening = removing that class, CSS transition animates
// the slide back in; backdrop unhides at the same time.
function openDrawer() {
  sidebarEl.classList.remove('-translate-x-full')
  backdropEl.classList.remove('hidden')
  drawerOpenBtn.setAttribute('aria-expanded', 'true')
  syncDrawerInert()
}

function closeDrawer() {
  // Desktop (lg+) keeps the sidebar visible — translate class only matters
  // below the breakpoint, so restoring it is always safe.
  sidebarEl.classList.add('-translate-x-full')
  backdropEl.classList.add('hidden')
  drawerOpenBtn.setAttribute('aria-expanded', 'false')
  syncDrawerInert()
}

// The off-screen drawer still contains focusable things (nav, ⌘K trigger,
// theme toggle). Without this, Tab on mobile walks into an invisible
// sidebar — focus vanishes with no way to see where it went. `inert` =
// not focusable, not clickable, skipped by screen readers — the modern
// replacement for the tabindex="-1" dance. Only applied when the sidebar is
// BOTH translated away AND actually below the lg breakpoint (CSS shows it
// again at lg no matter the transform class).
const mobileMedia = matchMedia('(max-width: 1023px)')

function syncDrawerInert() {
  const offscreen = sidebarEl.classList.contains('-translate-x-full')
  sidebarEl.inert = mobileMedia.matches && offscreen
}

// Viewport crossings change which side of the rule we're on: rotating a
// phone or resizing must re-evaluate, or a desktop-opened sidebar could
// arrive on mobile focusable-but-hidden (or vice versa).
mobileMedia.addEventListener('change', syncDrawerInert)
syncDrawerInert() // initial state (page may boot below lg with drawer closed)

drawerOpenBtn.addEventListener('click', openDrawer)
backdropEl.addEventListener('click', closeDrawer)

// -----------------------------------------------------------------------------
// Forms — checkout agree→pay, auth error reveal, demo submit guards
// -----------------------------------------------------------------------------
// `change` (not `input`) for checkboxes: fires once when state flips, which
// is exactly when we need to react. Delegated like everything else.
// -----------------------------------------------------------------------------
document.addEventListener('change', (event) => {
  if (!event.target.matches('[data-agree]')) return

  // Disabled pay button: main.js OWNS the state; CSS owns the LOOK
  // (disabled:bg-gray-300 etc. react to the attribute automatically).
  const payBtn = document.querySelector('[data-pay-btn]')
  if (payBtn) payBtn.disabled = !event.target.checked
})

// `submit` bubbles from the form to document — one listener covers both views.
document.addEventListener('submit', (event) => {
  // Demo guard: nothing processes payments here. preventDefault stops the
  // page navigation a <form> would otherwise trigger.
  if (event.target.matches('[data-checkout-form]')) {
    event.preventDefault()
    return
  }

  if (event.target.matches('[data-auth-form]')) {
    // Always fail: this demo's job is to SHOW the error state, not to log in.
    // Real apps validate first and only surface the alert on server rejection.
    event.preventDefault()

    const alert = document.querySelector('#auth-error')
    if (!alert) return
    alert.classList.remove('hidden')
    // Move focus to the message: sighted keyboard users see the ring land
    // there, screen reader users hear role="alert" read out. (a11y)
    alert.focus({ preventScroll: false })
  }

  // Newsletter (blog.html): native `required` + `type=email` already
  // validated before submit fires — browser constraint validation means we
  // only handle the success path here.
  if (event.target.matches('[data-newsletter]')) {
    event.preventDefault()
    event.target.reset() // clear the input like a real submit would
    showToast('Subscribed — see you next month!')
  }
})

// -----------------------------------------------------------------------------
// showToast — one transient message, appended to the SHELL's #toast-host
// -----------------------------------------------------------------------------
// Why the shell? #view is wiped on every switchView — a toast injected there
// would vanish instantly when navigating. The host sits outside #view in
// index.html, so messages outlive the view that fired them.
// textContent (not innerHTML) keeps user-adjacent strings inert — no XSS.
function showToast(message) {
  const host = document.querySelector('#toast-host')
  if (!host) return

  const toast = document.createElement('div')
  toast.className =
    'pointer-events-auto rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white opacity-100 shadow-lg transition-opacity duration-300 dark:bg-white dark:text-gray-900'
  toast.textContent = message
  host.appendChild(toast)

  // Two timers = fade, then remove: removing immediately would cut the
  // opacity transition (the "150-300ms aftertaste" of a toast).
  setTimeout(() => toast.classList.add('opacity-0'), 2500)
  setTimeout(() => toast.remove(), 2800)
}

// -----------------------------------------------------------------------------
// initChat — history drawer, canned threads, New reset + send flow (chat.html)
// -----------------------------------------------------------------------------
function initChat(root) {
  const history = root.querySelector('[data-chat-history]')
  const backdrop = root.querySelector('[data-chat-backdrop]')
  const toggle = root.querySelector('[data-chat-history-toggle]')
  const form = root.querySelector('[data-chat-form]')
  const input = root.querySelector('[data-chat-input]')
  const messages = root.querySelector('[data-chat-messages]')
  const title = root.querySelector('[data-chat-title]')
  const newBtn = root.querySelector('[data-chat-new]')

  // Bubble classes copied from chat.html's own markup — thread swaps rebuild
  // messages.innerHTML, so the strings must exist in JS too. (Same reason the
  // table ships a row template.)
  const ME = 'max-w-[80%] self-end rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm leading-relaxed text-white'
  const AI =
    'max-w-[80%] self-start rounded-2xl rounded-bl-sm border bg-white px-4 py-2.5 text-sm leading-relaxed text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200'

  // --- History: ONE element, two modes ------------------------------------
  const chatMobile = matchMedia('(max-width: 767px)') // md = 768px
  const isParked = () => history.classList.contains('-translate-x-full')

  // inert while parked below md: the slide-over is off-screen but still in
  // the tab order and a11y tree without it. Same trick as the shell drawer,
  // scoped to this view's subtree.
  const syncInert = () => {
    history.inert = chatMobile.matches && isParked()
  }

  const closeIfMobile = () => {
    if (!chatMobile.matches) return
    history.classList.add('-translate-x-full')
    backdrop?.classList.add('hidden')
    toggle?.setAttribute('aria-expanded', 'false')
    syncInert()
  }

  // Initial state: parked + mobile = closed; anything else = visible
  // (at md+ the column shows by default, parked class is overridden by
  // md:translate-x-0).
  toggle?.setAttribute('aria-expanded', String(!(chatMobile.matches && isParked())))
  syncInert()
  chatMobile.addEventListener('change', syncInert)

  toggle?.addEventListener('click', () => {
    if (chatMobile.matches) {
      // Slide-over path: toggle returns TRUE when the parking class remains —
      // i.e. we just closed. The backdrop mirrors that state.
      const nowParked = history.classList.toggle('-translate-x-full')
      backdrop?.classList.toggle('hidden', nowParked)
      toggle.setAttribute('aria-expanded', String(!nowParked))
    } else {
      // Inline collapse: md:hidden is a media-query utility, so it reliably
      // beats the base `flex` in the cascade (a base `hidden` would be a
      // stylesheet-order coin flip).
      const collapsed = history.classList.toggle('md:hidden')
      toggle.setAttribute('aria-expanded', String(!collapsed))
    }
    syncInert()
  })

  backdrop?.addEventListener('click', closeIfMobile)

  if (!form || !input || !messages || !title) return

  const scrollDown = () => messages.scrollTo({ top: messages.scrollHeight })

  // --- Threads ----------------------------------------------------------------
  // Snapshot the markup thread = conversation #1. The rest are canned pairs.
  // Static strings ship as raw HTML on purpose (they CONTAIN <code> markup);
  // anything user-typed goes through escapeHtml in the send flow below.
  const defaultThread = messages.innerHTML
  const THREADS = {
    'Debug sticky positioning': [
      ['ai', 'Sticky failing? Usual suspects: an <code class="font-mono text-[13px]">overflow</code> ancestor, or no scroll container. Where is it stuck?'],
      ['me', 'Header scrolls away inside a grid cell.'],
      ['ai', 'Grid items default to <code class="font-mono text-[13px]">min-width: auto</code>. Add <code class="font-mono text-[13px]">min-h-0</code> on the cell so it can scroll, then sticky has a viewport to stick to.'],
    ],
    'Dark mode with @custom-variant': [
      ['ai', 'v4 ships NO dark variant by default — you declare it yourself. Setup?'],
      ['me', 'Class toggle on <code class="font-mono text-[13px]">&lt;html&gt;</code>.'],
      ['ai', 'Then <code class="font-mono text-[13px]">@custom-variant dark (&amp;:where(.dark, .dark *));</code> in style.css — every <code class="font-mono text-[13px]">dark:</code> utility follows the class. The shell theme button flips <code class="font-mono text-[13px]">.dark</code> on the root element.'],
    ],
    'aria-current vs aria-selected': [
      ['ai', 'Both mean \u201cyou are here\u201d. Which context?'],
      ['me', 'Nav items, and a tablist.'],
      ['ai', 'Tabs carry <code class="font-mono text-[13px]">aria-selected</code> (inside <code class="font-mono text-[13px]">role="tablist"</code>); nav items carry <code class="font-mono text-[13px]">aria-current="page"</code>. This app uses both — settings tabs vs the sidebar.'],
    ],
  }

  // Shown after "+ New": icon + heading + motivation — the empty-state rules
  // from states.html, rendered as one template string.
  const EMPTY_THREAD = `<div data-chat-empty class="flex flex-col items-center justify-center py-10 text-center">
      <span class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-2xl dark:bg-gray-800" aria-hidden="true">💬</span>
      <p class="mt-3 text-sm font-semibold text-gray-900 dark:text-white">No messages yet</p>
      <p class="mt-1 max-w-xs text-sm text-gray-500 dark:text-gray-400">Ask about grids, forms or dark mode — replies are canned demo text.</p>
    </div>`

  const renderThread = (pairs) =>
    pairs.map(([who, text]) => `<div class="${who === 'me' ? ME : AI}">${text}</div>`).join('')

  // History item active state — same class-swap recipe as every other toggle
  // in this app, plus aria-current so AT announces which thread is loaded.
  const ACTIVE = ['bg-brand-50', 'text-brand-700', 'font-medium', 'dark:bg-gray-800', 'dark:text-brand-400']
  const IDLE = ['text-gray-600', 'transition', 'hover:bg-gray-100', 'dark:text-gray-400', 'dark:hover:bg-gray-800']
  const items = [...history.querySelectorAll('nav > button')]

  function selectItem(target) {
    items.forEach((b) => {
      const on = b === target
      if (on) b.setAttribute('aria-current', 'true')
      else b.removeAttribute('aria-current')
      ACTIVE.forEach((c) => b.classList.toggle(c, on))
      IDLE.forEach((c) => b.classList.toggle(c, !on))
    })
  }

  items.forEach((item) => {
    item.addEventListener('click', () => {
      const key = item.textContent.trim()
      selectItem(item)
      title.textContent = key
      messages.innerHTML = key in THREADS ? renderThread(THREADS[key]) : defaultThread
      scrollDown()
      closeIfMobile() // content swapped — don't leave the overlay standing
    })
  })

  newBtn?.addEventListener('click', () => {
    messages.innerHTML = EMPTY_THREAD
    title.textContent = 'New conversation'
    selectItem(null) // nobody is current until a thread is picked
    input.value = ''
    closeIfMobile()
    input.focus() // land in the composer — typing is the obvious next action
  })

  form.addEventListener('submit', (event) => {
    // form submit already prevented a page reload — but NOT a hash jump;
    // preventDefault is still the right reflex inside an SPA.
    event.preventDefault()
    const text = input.value.trim()
    if (!text) return // empty send: do nothing (a comment button is worse)

    // The empty-state hint is not a message — first real send clears it.
    messages.querySelector('[data-chat-empty]')?.remove()

    // escapeHtml (module scope) before insertAdjacentHTML — the XSS lesson:
    // <img src=x onerror=…> typed into chat must stay TEXT, not markup.
    messages.insertAdjacentHTML('beforeend', `<div class="${ME}">${escapeHtml(text)}</div>`)
    input.value = ''
    scrollDown()

    // Canned "AI" reply: setTimeout stands in for a real fetch(). The async
    // shape (send → waiting → reply lands) is exactly what a network call
    // looks like, so this stays honest about the flow.
    setTimeout(() => {
      messages.insertAdjacentHTML(
        'beforeend',
        `<div class="${AI}">Canned demo reply — wire this form to a real API to go live.</div>`,
      )
      scrollDown()
    }, 700)
  })
}

// -----------------------------------------------------------------------------
// initSettings — tab switching + native <dialog> modal (settings.html)
// -----------------------------------------------------------------------------
function initSettings(root) {
  // --- Tabs ---------------------------------------------------------------
  // Segmented control: every button + every panel is scoped to `root`
  // (this view's subtree), so we can use direct listeners — simpler than
  // delegation when the set is small and short-lived.
  const tabs = [...root.querySelectorAll('[data-tab]')]

  const selectTab = (btn) => {
    const id = btn.dataset.tab
    tabs.forEach((b) => {
      const on = b === btn
      // aria-selected = which tab is current; AT announces it. (a11y)
      b.setAttribute('aria-selected', String(on))
      // Roving tabindex: ONE tab stays in the tab order (the current one),
      // arrows move between the rest — the WAI-ARIA tablist pattern. (a11y)
      b.tabIndex = on ? 0 : -1
      // Swap the two class SETS. Booleans in classList.toggle(condition)
      // read clearly: one set for active, one for idle — same trick the
      // sidebar nav uses in switchView.
      b.classList.toggle('bg-white', on)
      b.classList.toggle('shadow-sm', on)
      b.classList.toggle('text-gray-900', on)
      b.classList.toggle('dark:bg-gray-700', on)
      b.classList.toggle('dark:text-white', on)
      b.classList.toggle('text-gray-600', !on)
      b.classList.toggle('hover:text-gray-900', !on)
      b.classList.toggle('dark:text-gray-400', !on)
      b.classList.toggle('dark:hover:text-white', !on)
    })

    root.querySelectorAll('[data-tab-panel]').forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.tabPanel !== id)
    })
  }

  tabs.forEach((btn, i) => {
    btn.addEventListener('click', () => selectTab(btn))
    // Arrow keys are what a tablist PROMISES keyboard users (role="tab" sets
    // that expectation). Selection follows focus — "automatic activation".
    btn.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
      let next = null
      if (event.key === 'Home') next = tabs[0]
      else if (event.key === 'End') next = tabs[tabs.length - 1]
      else if (step) next = tabs[(i + step + tabs.length) % tabs.length]
      if (!next) return
      event.preventDefault() // arrows must not scroll the page instead
      selectTab(next)
      next.focus()
    })
  })

  // --- Profile dirty-tracking --------------------------------------------
  // The sticky bar's status line was a lie ("Unsaved changes" shown at rest).
  // Now it's STATE: snapshot the fields on init, mark dirty on any input,
  // Cancel reverts the snapshot, Save clears the flag + answers with a toast.
  const status = root.querySelector('[data-save-status]')
  const fields = [...root.querySelectorAll('[data-tab-panel="profile"] input, [data-tab-panel="profile"] textarea')]
  let saved = fields.map((f) => f.value)

  const setDirty = (dirty) => {
    if (!status) return
    status.textContent = dirty ? 'Unsaved changes' : 'No unsaved changes'
    status.classList.toggle('text-amber-600', dirty)
    status.classList.toggle('dark:text-amber-400', dirty)
  }

  fields.forEach((field) => field.addEventListener('input', () => setDirty(true)))

  root.querySelector('[data-profile-cancel]')?.addEventListener('click', () => {
    fields.forEach((f, i) => {
      f.value = saved[i]
    })
    setDirty(false)
    showToast('Changes reverted')
  })

  root.querySelector('[data-profile-save]')?.addEventListener('click', () => {
    saved = fields.map((f) => f.value) // new snapshot = "clean" baseline
    setDirty(false)
    showToast('Profile saved (demo)')
  })

  // --- Modal (native <dialog>) -------------------------------------------
  const modal = root.querySelector('[data-modal]')
  if (!modal) return

  root.querySelectorAll('[data-modal-open]').forEach((btn) => {
    // showModal() (not open()): renders in the top layer, dims the page via
    // ::backdrop, traps focus, and makes Escape close it — all native.
    btn.addEventListener('click', () => modal.showModal())
  })

  root.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => modal.close())
  })

  // Backdrop click-to-close: a click on the dim layer reports
  // target === <dialog> itself (all card content is wrapped in a child
  // div, so it can never match). Clicks inside the card hit descendants.
  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.close()
  })
}

// -----------------------------------------------------------------------------
// initShop — cart badge + toast feedback (shop.html)
// -----------------------------------------------------------------------------
function initShop(root) {
  const countEl = root.querySelector('[data-cart-count]')
  let count = 0 // view-local state: reset when you leave and come back —
  // a real app would keep this in a store or on the server.

  root.querySelectorAll('[data-add-cart]').forEach((btn) => {
    btn.addEventListener('click', () => {
      count += 1
      if (countEl) countEl.textContent = String(count)

      // Transient button feedback: swap label, restore from a saved
      // reference (reading it AFTER swapping would grab "Added ✓" forever).
      const original = btn.textContent
      btn.textContent = 'Added ✓'
      btn.disabled = true
      setTimeout(() => {
        btn.textContent = original
        btn.disabled = false
      }, 900)

      showToast(`${btn.dataset.name} added to cart`)
    })
  })

  // --- Sort ---------------------------------------------------------------
  // Sorting MOVES the existing <article> nodes (append re-parents, it never
  // copies) — so listeners, heart state and cart counts survive the reorder.
  // innerHTML-rebuilding the grid instead would kill every one of them.
  const grid = root.querySelector('[data-shop-grid]')
  const sort = root.querySelector('#shop-sort')
  const markupOrder = [...grid.querySelectorAll('article')] // "Featured" = markup order
  const SORTS = {
    Featured: (a, b) => markupOrder.indexOf(a) - markupOrder.indexOf(b),
    'Price: low → high': (a, b) => a.dataset.price - b.dataset.price,
    'Price: high → low': (a, b) => b.dataset.price - a.dataset.price,
    Newest: (a, b) => b.dataset.new - a.dataset.new, // dataset = strings → coerce with -
  }

  sort?.addEventListener('change', () => {
    const by = SORTS[sort.value]
    if (by) [...markupOrder].sort(by).forEach((card) => grid.append(card))
  })

  // --- Favourites ---------------------------------------------------------
  // aria-pressed = toggle-button semantics; the GLYPH follows the state
  // (♡ outline → ♥ filled) so the change is visible, not just announced.
  root.querySelectorAll('[data-fav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true'
      btn.setAttribute('aria-pressed', String(on))
      const glyph = btn.querySelector('[aria-hidden]')
      if (glyph) glyph.textContent = on ? '♥' : '♡'
      btn.classList.toggle('text-red-500', on)
      const product = btn.getAttribute('aria-label')?.replace('Save ', '') ?? 'Item'
      showToast(on ? `${product} saved` : `${product} removed from saved`)
    })
  })
}

// -----------------------------------------------------------------------------
// initBlog — category pill filter (blog.html)
// -----------------------------------------------------------------------------
function initBlog(root) {
  // button[data-cat] = the pills; article[data-cat] = the posts. The type
  // prefix keeps one selector from matching BOTH sets.
  const pills = [...root.querySelectorAll('button[data-cat]')]
  const posts = [...root.querySelectorAll('article[data-cat]')]

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      // Filled pill vs outline pill — same class-swap recipe as the nav,
      // dashboard range tabs and every other toggle in this app.
      pills.forEach((other) => {
        const on = other === pill
        other.setAttribute('aria-pressed', String(on))
        other.classList.toggle('bg-gray-900', on)
        other.classList.toggle('text-white', on)
        other.classList.toggle('dark:bg-white', on)
        other.classList.toggle('dark:text-gray-900', on)
        other.classList.toggle('border', !on) // outline pill needs border-width
        other.classList.toggle('text-gray-600', !on)
        other.classList.toggle('hover:bg-gray-100', !on)
        other.classList.toggle('dark:text-gray-400', !on)
        other.classList.toggle('dark:hover:bg-gray-800', !on)
      })

      const cat = pill.dataset.cat
      posts.forEach((post) => {
        post.classList.toggle('hidden', cat !== 'all' && post.dataset.cat !== cat)
      })
    })
  })
}

// -----------------------------------------------------------------------------
// initCheckout — real 3-step flow: validated Continue, back-to-completed
// only, computed stepper states (checkout.html)
// -----------------------------------------------------------------------------
function initCheckout(root) {
  const form = root.querySelector('[data-checkout-form]')
  if (!form) return

  const panel1 = root.querySelector('[data-step-panel="1"]')
  const panel2 = root.querySelector('[data-step-panel="2"]')
  const sub = root.querySelector('[data-checkout-sub]')
  const continueBtn = root.querySelector('[data-continue-btn]')
  const backBtn = root.querySelector('[data-step-back]')
  const payBtn = root.querySelector('[data-pay-btn]')
  const stepBtns = [...root.querySelectorAll('[data-step-go]')]
  const dots = [...root.querySelectorAll('[data-step-dot]')]
  const texts = [...root.querySelectorAll('[data-step-text]')]
  const conns = [...root.querySelectorAll('[data-step-connector]')]

  // Active stepper step: 2 = Shipping (form panel 1), 3 = Payment (panel 2).
  // Cart (1) is complete from the start. `paid` marks the whole flow done.
  let step = 2
  let paid = false

  // Full class LISTS as string literals — Tailwind's scanner only emits
  // utilities it can see in source, and these strings live in JS. (Same
  // reason the table ships rowHtml and chat ships bubble classes.)
  const DOT = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold'
  const TEXT = 'hidden text-sm sm:block'
  const DONE = {
    dot: 'bg-brand-600 border-2 border-brand-600 text-white',
    text: 'font-medium text-gray-900 dark:text-gray-100',
  }
  const CURRENT = {
    dot: 'border-2 border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
    text: 'font-semibold text-brand-700 dark:text-brand-300',
  }
  const TODO = {
    dot: 'border-2 border-gray-200 text-gray-400 dark:border-gray-700',
    text: 'text-gray-400',
  }

  // Inputs before buttons: landing on the first field is the useful jump
  // (panel 2's first BUTTON is "← Back", not the card number).
  const focusFirst = (panel) =>
    (panel?.querySelector('input, select, textarea') || panel?.querySelector('button'))?.focus()

  function render() {
    stepBtns.forEach((btn, i) => {
      const n = i + 1
      const state = paid || n < step ? DONE : n === step ? CURRENT : TODO
      dots[i].className = `${DOT} ${state.dot}`
      dots[i].textContent = state === DONE ? '✓' : String(n)
      texts[i].className = `${TEXT} ${state.text}`

      if (n === step) btn.setAttribute('aria-current', 'step')
      else btn.removeAttribute('aria-current')

      // Future steps are NOT reachable — declare that with aria-disabled
      // instead of accepting clicks and staying silent. The current step
      // stays live: clicking it re-focuses its panel (visible feedback).
      btn.setAttribute('aria-disabled', String(!paid && n > step))
    })

    // Connector i leads to step i+2: brand once that step has been reached.
    conns.forEach((conn, i) => {
      const reached = paid || i + 2 <= step
      conn.className = `h-px flex-1 ${reached ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'}`
    })

    // One panel on screen at a time — the stepper never lies about state.
    panel1.hidden = step === 3
    panel2.hidden = step !== 3

    if (sub) {
      sub.textContent = paid
        ? 'Order confirmed (demo) — nothing was charged.'
        : `Almost there — ${step === 2 ? '2 steps' : '1 step'} left.`
    }
  }

  stepBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const n = i + 1
      // aria-disabled = announced as disabled; returning here is not "silent
      // action", it's respecting a declared state.
      if (!paid && n > step) return

      if (n === 1) {
        // The cart lives in the Shop view — a completed step is a real way
        // back to where the order started, not a dead dot.
        switchView('shop')
        return
      }
      step = n // back-to-completed (n === step just re-focuses the panel)
      render()
      focusFirst(step === 3 ? panel2 : panel1)
    })
  })

  continueBtn?.addEventListener('click', () => {
    // Per-step gate: checkValidity() = silent boolean, reportValidity() =
    // browser bubble + focus + scroll. Query THIS PANEL's controls — a whole
    // form check would also test the hidden step-2 card fields.
    const invalid = [...panel1.querySelectorAll('input, select, textarea')].find(
      (el) => !el.checkValidity(),
    )
    if (invalid) {
      invalid.reportValidity() // names the field, fixes focus, no JS UI needed (a11y)
      return
    }
    step = 3
    render()
    focusFirst(panel2)
  })

  backBtn?.addEventListener('click', () => {
    step = 2 // completed steps: always allowed back, never re-validated
    render()
    focusFirst(panel1)
  })

  form.addEventListener('submit', (event) => {
    // novalidate was REMOVED from the markup: by the time this handler runs,
    // the browser has already accepted every field (invalid → no submit).
    event.preventDefault()
    paid = true
    if (payBtn) {
      payBtn.disabled = true // no double-charging, demo or not
      payBtn.textContent = 'Order placed ✓'
    }
    // Lock the terms box: re-ticking it would re-enable Pay (global handler
    // in the shell), reopening an order that's already placed.
    root.querySelector('[data-agree]')?.toggleAttribute('disabled', true)
    render()
    showToast('Demo — nothing was charged')
  })

  render() // normalize states + declare future steps before first paint
}

// -----------------------------------------------------------------------------
// initStates — retry buttons (states.html)
// -----------------------------------------------------------------------------
// Toasts need NO init here: [data-toast] is handled by the global click
// delegation in the shell (every view gets demo feedback for free).
function initStates(root) {
  // Retry: in a real app this refetches; here it just proves the button
  // is wired and gives immediate feedback instead of a dead click.
  root.querySelector('[data-retry]')?.addEventListener('click', () => {
    showToast('Retrying… (demo: still unreachable)')
  })
}

// -----------------------------------------------------------------------------
// initComponents — popover + accessible menu (components.html)
// -----------------------------------------------------------------------------
// Two disclosure widgets share the overlay stack above. Both:
//   - toggle from a trigger whose aria-expanded tracks reality
//   - position with the same engine as tooltips (positionAnchored)
//   - close on Escape (top-down) and outside-click (global handlers)
//   - return focus to the trigger, so keyboard users never lose their place
// The MENU additionally implements roving tabindex + arrow keys + typeahead —
// the WAI-ARIA menu pattern. (The dashboard profile dropdown stays the simple
// version on purpose: this view is where you compare against the correct one.)
function initComponents(root) {
  // --- Popover: a disclosure holding INTERACTIVE content ------------------
  const popTrigger = root.querySelector('[data-popover-trigger]')
  const popPanel = root.querySelector('[data-popover-panel]')

  if (popTrigger && popPanel) {
    const opts = { placement: 'bottom-start', offset: 8 }

    const closePopover = (refocus) => {
      if (popPanel.classList.contains('hidden')) return
      popPanel.classList.add('hidden')
      popTrigger.setAttribute('aria-expanded', 'false')
      untrackFloat(popPanel)
      unregisterOverlay(popPanel)
      if (refocus) popTrigger.focus()
    }

    const openPopover = () => {
      popPanel.classList.remove('hidden')
      popTrigger.setAttribute('aria-expanded', 'true')
      positionAnchored(popTrigger, popPanel, opts)
      trackFloat(popPanel, popTrigger, opts)
      registerOverlay(popPanel, { close: () => closePopover(true), trigger: popTrigger })
      // Move focus IN: content reachable only by mouse isn't a disclosure. (a11y)
      popPanel.querySelector('input, button, select, textarea, a[href]')?.focus()
    }

    popTrigger.addEventListener('click', () =>
      popPanel.classList.contains('hidden') ? openPopover() : closePopover(true),
    )

    // Tab past the last control → focus leaves the panel → dismiss. A non-modal
    // popover should not linger behind an invisible focused element.
    popPanel.addEventListener('focusout', (event) => {
      if (!popPanel.contains(event.relatedTarget) && event.relatedTarget !== popTrigger) {
        closePopover(false)
      }
    })

    popPanel.querySelector('[data-popover-close]')?.addEventListener('click', () => {
      showToast('Display options applied')
      closePopover(true)
    })
  }

  // --- Menu: the full WAI-ARIA menu keyboard contract ---------------------
  const menuTrigger = root.querySelector('[data-menu-trigger]')
  const menuPanel = root.querySelector('[data-menu-panel]')

  if (menuTrigger && menuPanel) {
    const items = [...menuPanel.querySelectorAll('[role="menuitem"]')]
    const opts = { placement: 'bottom-start', offset: 6 }
    let activeIndex = 0

    // Roving tabindex: exactly ONE item stays in the tab order (the active
    // one); arrows move focus between them. Same idea as the settings tablist.
    const setActive = (i) => {
      activeIndex = (i + items.length) % items.length
      items.forEach((item, n) => {
        item.tabIndex = n === activeIndex ? 0 : -1
      })
      items[activeIndex].focus()
    }

    const closeMenu = (refocus) => {
      if (menuPanel.classList.contains('hidden')) return
      menuPanel.classList.add('hidden')
      menuTrigger.setAttribute('aria-expanded', 'false')
      untrackFloat(menuPanel)
      unregisterOverlay(menuPanel)
      if (refocus) menuTrigger.focus()
    }

    const openMenu = () => {
      menuPanel.classList.remove('hidden')
      menuTrigger.setAttribute('aria-expanded', 'true')
      positionAnchored(menuTrigger, menuPanel, opts)
      trackFloat(menuPanel, menuTrigger, opts)
      registerOverlay(menuPanel, { close: () => closeMenu(true), trigger: menuTrigger })
      setActive(0) // menu contract: opening focuses the FIRST item
    }

    menuTrigger.addEventListener('click', () =>
      menuPanel.classList.contains('hidden') ? openMenu() : closeMenu(true),
    )

    menuPanel.addEventListener('keydown', (event) => {
      const key = event.key
      if (key === 'ArrowDown') {
        event.preventDefault() // arrows must not scroll the page
        setActive(activeIndex + 1)
      } else if (key === 'ArrowUp') {
        event.preventDefault()
        setActive(activeIndex - 1)
      } else if (key === 'Home') {
        event.preventDefault()
        setActive(0)
      } else if (key === 'End') {
        event.preventDefault()
        setActive(items.length - 1)
      } else if (key.length === 1 && key.trim()) {
        // Typeahead: jump to the next item starting with the typed character.
        const letter = key.toLowerCase()
        for (let step = 1; step <= items.length; step++) {
          const i = (activeIndex + step) % items.length
          if (items[i].textContent.trim().toLowerCase().startsWith(letter)) {
            event.preventDefault()
            setActive(i)
            break
          }
        }
      }
      // Enter/Space need no code: role=menuitem on a <button> fires click natively.
    })

    items.forEach((item) => {
      item.addEventListener('click', () => {
        showToast(`${item.textContent.trim()} — demo action`)
        closeMenu(true)
      })
    })

    // Tab/click away dismisses without yanking focus back to the trigger.
    menuPanel.addEventListener('focusout', (event) => {
      if (!menuPanel.contains(event.relatedTarget)) closeMenu(false)
    })
  }
}

// -----------------------------------------------------------------------------
// Anchored overlays — the positioning engine
// -----------------------------------------------------------------------------
// A tooltip, a popover, a menu and the combobox listbox are the SAME animal:
// a floating box pinned to a trigger. So the geometry lives here once, and the
// four widgets above just describe WHERE they want to sit. (Reused below.)
//
// `position: fixed` + getBoundingClientRect() = viewport coordinates, immune
// to any ancestor's overflow/transform clipping. The trade-off: a fixed box
// does NOT follow its anchor, so callers must reposition on scroll/resize
// (see the tracked-floats registry right after this).
//
// placement = "side-align":
//   side  ∈ top | bottom      (which side of the anchor)
//   align ∈ start | end | center  (how the box lines up along that edge)
// FLIP  = if the chosen side overflows the viewport, use the other side.
// SHIFT = clamp horizontally so the box never runs off-screen.
// This is a ~30-line version of what Floating UI / Popper resolve in hundreds.
function positionAnchored(anchor, floating, options = {}) {
  const { placement = 'bottom-start', offset = 8, margin = 8 } = options
  const [side, align = 'center'] = placement.split('-')
  const a = anchor.getBoundingClientRect()
  const f = floating.getBoundingClientRect()

  // --- vertical: requested side, then flip if it would overflow ---
  const roomBelow = window.innerHeight - a.bottom
  const roomAbove = a.top
  let top
  if (side === 'top') {
    top = a.top - f.height - offset
    if (top < margin && roomBelow >= roomAbove) top = a.bottom + offset
  } else {
    top = a.bottom + offset
    if (top + f.height > window.innerHeight - margin && roomAbove > roomBelow) {
      top = a.top - f.height - offset
    }
  }

  // --- horizontal: align, then shift to stay inside the viewport ---
  let left
  if (align === 'end') left = a.right - f.width
  else if (align === 'center') left = a.left + (a.width - f.width) / 2
  else left = a.left
  left = Math.max(margin, Math.min(left, window.innerWidth - f.width - margin))

  floating.style.position = 'fixed'
  floating.style.left = `${Math.round(left)}px`
  floating.style.top = `${Math.round(top)}px`
}

// Registry of currently-visible floats → their anchor + options, so ONE
// scroll/resize listener can keep every open overlay glued to the right place.
const anchoredFloats = new Map()
const trackFloat = (floating, anchor, options) => anchoredFloats.set(floating, { anchor, options })
const untrackFloat = (floating) => anchoredFloats.delete(floating)
const repositionFloats = () =>
  anchoredFloats.forEach(({ anchor, options }, floating) => positionAnchored(anchor, floating, options))

// capture: true = also hear scroll events from inner overflow containers
// (the table's `overflow-x-auto` box), not just the page itself.
window.addEventListener('scroll', repositionFloats, true)
window.addEventListener('resize', repositionFloats)

// -----------------------------------------------------------------------------
// Overlay stack — one Escape-to-close order for NESTED overlays
// -----------------------------------------------------------------------------
// A menu can open inside a popover, which can open inside a dialog. Escape must
// close the TOPMOST only, or a single keypress tears down the whole stack and
// the user loses their place. This registry answers "what's open, newest last?"
// and is shared by Escape AND outside-click — so both routes agree.
//
// WeakMap for the per-overlay closer (avoids leaks when views are wiped), plus
// an array for ordering (WeakMaps aren't iterable).
const overlayStack = [] // open overlay elements, oldest → newest
const overlayInfo = new WeakMap() // el → { close, trigger }

function registerOverlay(el, info) {
  overlayInfo.set(el, info)
  overlayStack.push(el)
}
function unregisterOverlay(el) {
  const i = overlayStack.indexOf(el)
  if (i !== -1) overlayStack.splice(i, 1)
  overlayInfo.delete(el)
}
// Returns true when an overlay handled the close — callers use that to STOP
// (Escape shouldn't also close the drawer behind it).
function closeTopOverlay() {
  const el = overlayStack[overlayStack.length - 1]
  if (!el) return false
  overlayInfo.get(el)?.close()
  return true
}
function closeAllOverlays() {
  ;[...overlayStack].reverse().forEach((el) => overlayInfo.get(el)?.close())
}

// Outside-click close. Newest first: a nested menu dismisses before the popover
// that hosts it. A click on the overlay's OWN trigger counts as inside — the
// trigger is what opened it, and re-clicking should toggle, not double-close.
document.addEventListener('click', (event) => {
  ;[...overlayStack].reverse().forEach((el) => {
    const info = overlayInfo.get(el)
    if (el.contains(event.target) || info?.trigger?.contains(event.target)) return
    info?.close()
  })
})

// -----------------------------------------------------------------------------
// Tooltips — hover AND focus, app-wide (delegated)
// -----------------------------------------------------------------------------
// Teaching points:
//   - role="tooltip" + aria-describedby on the trigger: a screen reader reads
//     the description when the trigger is focused, so the hint isn't visual-only. (a11y)
//   - Opens on hover AND focus; closes on leave, blur and Escape. A tooltip you
//     can only see with a mouse excludes keyboard users. (a11y)
//   - NO interactive content inside a tooltip: it appears on hover, so anything
//     you'd want to CLICK belongs in a popover instead.
//   - The label text ships in the view's markup (the referenced element); this
//     controller only positions and reveals it.
//
// Delegated so it works on every view with zero per-view wiring — a trigger
// only needs `data-tooltip aria-describedby="<id>"`.
let tooltipTrigger = null
let tooltipEl = null
let tooltipShowTimer = null

function showTooltip(trigger) {
  const el = document.getElementById(trigger.getAttribute('aria-describedby') || '')
  if (!el) return
  clearTimeout(tooltipShowTimer)
  if (tooltipEl && tooltipEl !== el) hideTooltip() // never two at once

  tooltipTrigger = trigger
  tooltipEl = el
  const options = { placement: trigger.dataset.tooltipPlacement || 'top', offset: 8 }
  // Measure AFTER we reveal: a `hidden` element is 0×0 and would be placed
  // against nothing. The tooltip ships opacity-0 (never hidden), so it has
  // size to measure while still invisible.
  positionAnchored(trigger, el, options)
  trackFloat(el, trigger, options)
  el.classList.replace('opacity-0', 'opacity-100')
}

function hideTooltip() {
  clearTimeout(tooltipShowTimer)
  if (!tooltipEl) return
  untrackFloat(tooltipEl)
  tooltipEl.classList.replace('opacity-100', 'opacity-0')
  tooltipEl = null
  tooltipTrigger = null
}

// Hover: wait ~350ms before showing (instant tooltips flicker whenever the
// pointer merely crosses an icon), hide at once on leave.
function scheduleTooltip(trigger) {
  clearTimeout(tooltipShowTimer)
  tooltipShowTimer = setTimeout(() => showTooltip(trigger), 350)
}

document.addEventListener('mouseover', (event) => {
  const trigger = event.target.closest?.('[data-tooltip]')
  // relatedTarget check: moving within the trigger (e.g. onto its inner icon
  // span) re-fires mouseover — ignore those, only treat real entrances.
  if (!trigger || trigger.contains(event.relatedTarget)) return
  scheduleTooltip(trigger)
})

document.addEventListener('mouseout', (event) => {
  const trigger = event.target.closest?.('[data-tooltip]')
  if (!trigger || trigger.contains(event.relatedTarget)) return
  clearTimeout(tooltipShowTimer)
  if (tooltipEl && tooltipTrigger === trigger) hideTooltip()
})

// Keyboard: show at once — a deliberate Tab deserves an immediate answer, not
// a hover delay. focusout (not blur) bubbles, so one listener covers the app.
document.addEventListener('focusin', (event) => {
  const trigger = event.target.closest?.('[data-tooltip]')
  if (trigger) showTooltip(trigger)
})

document.addEventListener('focusout', (event) => {
  const trigger = event.target.closest?.('[data-tooltip]')
  if (trigger && tooltipTrigger === trigger) hideTooltip()
})

// -----------------------------------------------------------------------------
// Escape closes overlays — keyboard users expect it. (a11y)
// -----------------------------------------------------------------------------
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  hideTooltip()
  // Nested overlays (popover/menu/combobox) dismiss TOP-DOWN first; if one
  // handled this Escape, the shell-level layers stay put.
  if (closeTopOverlay()) return
  closeDrawer()
  closePalette() // hoisted function declaration below — safe to call
  // Also collapse any open dropdown (same rules as outside-click close;
  // collapseDropdown moves focus to the trigger first if it was inside).
  document.querySelectorAll('[data-dropdown-menu]:not(.hidden)').forEach(collapseDropdown)
})

// -----------------------------------------------------------------------------
// Command palette (⌘K / Ctrl+K) — shell-level, works on every view
// -----------------------------------------------------------------------------
// Entries are DERIVED from the sidebar's own [data-view] buttons — one source
// of truth. Add a nav button tomorrow and the palette picks it up with zero
// extra wiring. Labels = the text nodes only, so the emoji <span> is skipped.
// -----------------------------------------------------------------------------
const paletteEl = document.querySelector('#palette')
const paletteInput = document.querySelector('#palette-input')
const paletteList = document.querySelector('#palette-list')

const paletteEntries = [...document.querySelectorAll('[data-view]')].map((btn) => ({
  id: btn.dataset.view,
  label: [...btn.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent)
    .join('')
    .trim(),
  emoji: btn.querySelector('span')?.textContent ?? '',
}))

let paletteFiltered = paletteEntries
let paletteActive = 0

function renderPalette(query = '') {
  const q = query.trim().toLowerCase()
  paletteFiltered = paletteEntries.filter((entry) => entry.label.toLowerCase().includes(q))
  paletteActive = 0

  if (!paletteFiltered.length) {
    paletteList.innerHTML =
      '<li role="option" aria-disabled="true" class="px-3 py-6 text-center text-sm text-gray-400 dark:text-gray-500">No matching views</li>'
    return
  }

  // innerHTML is safe HERE because only static repo strings are interpolated.
  // The user's query is used for filtering only, never pasted into markup —
  // interpolating it would be a reflected-XSS hole. Keep that line intact.
  paletteList.innerHTML = paletteFiltered
    .map(
      (entry, i) => `
      <li
        role="option"
        aria-selected="${i === 0}"
        data-palette-id="${entry.id}"
        class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${
          i === 0
            ? 'bg-brand-50 text-brand-700 dark:bg-gray-800 dark:text-brand-300'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }"
      >
        <span aria-hidden="true">${entry.emoji}</span>
        ${entry.label}
      </li>`,
    )
    .join('')
}

function setPaletteActive(next) {
  if (!paletteFiltered.length) return
  // Wrap-around: ArrowUp from first lands on last (like every OS launcher).
  paletteActive = (next + paletteFiltered.length) % paletteFiltered.length

  ;[...paletteList.children].forEach((li, i) => {
    const on = i === paletteActive
    li.setAttribute('aria-selected', String(on))
    li.classList.toggle('bg-brand-50', on)
    li.classList.toggle('text-brand-700', on)
    li.classList.toggle('dark:bg-gray-800', on)
    li.classList.toggle('dark:text-brand-300', on)
    li.classList.toggle('text-gray-700', !on)
    li.classList.toggle('dark:text-gray-300', !on)
  })

  // nearest = scroll only as far as needed; 'auto' would jerk the list.
  paletteList.children[paletteActive]?.scrollIntoView({ block: 'nearest' })
}

let paletteOpener = null // element that had focus when the palette opened

function openPalette() {
  // Stash BEFORE moving focus — used to hand focus back on close (a11y).
  paletteOpener = document.activeElement
  paletteEl.classList.remove('hidden')
  paletteInput.value = ''
  renderPalette() // full list on open — muscle memory beats typing
  paletteInput.focus()
}

function closePalette() {
  // Idempotent: Escape fires even when the palette never opened.
  const wasOpen = !paletteEl.classList.contains('hidden')
  paletteEl.classList.add('hidden')
  if (!wasOpen) return

  // Focus must land SOMEWHERE visible. Falling back to <body> loses the
  // user's Tab position entirely — return to the opener when we have one.
  if (paletteOpener instanceof HTMLElement && paletteOpener !== document.body) {
    paletteOpener.focus()
  } else {
    document.querySelector('#palette-open')?.focus()
  }
  paletteOpener = null
}

// Minimal modal focus trap: the input is the palette's ONLY focusable
// element, so Tab (either direction) simply pins focus back on it instead
// of escaping into the page behind the overlay. (a11y)
paletteEl.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    event.preventDefault()
    paletteInput.focus()
  }
})

document.querySelector('#palette-open')?.addEventListener('click', openPalette)

// Backdrop dismiss: click landed on #palette-backdrop specifically (the
// card is a sibling), so card clicks never reach this branch.
document.querySelector('#palette-backdrop')?.addEventListener('click', closePalette)

paletteInput.addEventListener('input', () => renderPalette(paletteInput.value))

paletteInput.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault() // stop the caret from doing anything visual
    setPaletteActive(paletteActive + 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    setPaletteActive(paletteActive - 1)
  } else if (event.key === 'Enter') {
    const entry = paletteFiltered[paletteActive]
    if (entry) {
      closePalette()
      switchView(entry.id)
    }
  }
  // Escape: bubbles up to the global handler → closePalette() + drawer.
})

// Mouse path (delegated — list items are re-rendered on every keystroke,
// so per-item listeners would leak every render).
paletteList.addEventListener('click', (event) => {
  const item = event.target.closest('[data-palette-id]')
  if (!item) return
  closePalette()
  switchView(item.dataset.paletteId)
})

// ⌘K on macOS, Ctrl+K everywhere else. metaKey || ctrlKey covers both with
// one condition — the palette is expected on both platforms.
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault() // browsers reserve Ctrl+K (search in some) —
    // preventDefault keeps the shortcut ours.

    // A native <dialog> renders in the TOP LAYER — no z-index on a plain
    // div can paint above it, so the palette would open invisibly and
    // focus() would be rejected. Close dialogs first, then toggle.
    document.querySelectorAll('dialog[open]').forEach((dlg) => dlg.close())

    paletteEl.classList.contains('hidden') ? openPalette() : closePalette()
  }
})

// -----------------------------------------------------------------------------
// Dark mode (carried over from Phase 0)
// -----------------------------------------------------------------------------
// style.css binds the `dark:` variant to a CLASS named `dark`
// (@custom-variant). Toggle it on <html> → every dark:* utility activates.
const root = document.documentElement
const storageKey = 'theme-dark'

if (localStorage.getItem(storageKey) === 'true') {
  root.classList.add('dark')
}

// Two toggle buttons (mobile top bar + sidebar) share one handler.
// NodeList supports forEach — no array conversion needed.
document.querySelectorAll('#theme-toggle, #theme-toggle-mobile').forEach((btn) => {
  btn.addEventListener('click', () => {
    const isDark = root.classList.toggle('dark')
    localStorage.setItem(storageKey, String(isDark))
  })
})

// -----------------------------------------------------------------------------
// First paint — show the landing view without waiting for a click.
// -----------------------------------------------------------------------------
switchView('landing')
