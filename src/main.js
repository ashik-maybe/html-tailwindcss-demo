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

// Entry shape: { html, init? }. init(root) runs after the HTML is injected
// and gets the fresh subtree — attach DIRECT listeners there to widgets that
// only exist while that view is on screen (chat form, settings tabs/modal).
// Views without per-widget JS just declare html. Function declarations below
// are hoisted, so referencing them here is safe.
const views = {
  landing: { html: landing },
  dashboard: { html: dashboard },
  table: { html: table, init: initTable }, // real 42-row dataset + pagination
  checkout: { html: checkout },
  auth: { html: auth },
  chat: { html: chat, init: initChat },
  settings: { html: settings, init: initSettings },
  shop: { html: shop, init: initShop },
  blog: { html: blog }, // only the delegated newsletter handler — no init
  faq: { html: faq }, // native <details>, zero JS by design
  states: { html: states, init: initStates },
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
// Three behaviours, one listener:
//   1. [data-view]            → switch views (nav)
//   2. [data-dropdown-trigger]→ toggle its menu (dashboard profile)
//   3. click outside an open dropdown → close it
document.addEventListener('click', (event) => {
  // 1. Navigation
  const navBtn = event.target.closest('[data-view]')
  if (navBtn) switchView(navBtn.dataset.view)

  // 2. Dropdown trigger: toggle the menu that is a SIBLING inside the
  //    nearest [data-dropdown] wrapper. stopPropagation is NOT needed —
  //    rule 3 runs after and re-checks containment, finding our own click
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

  // 3. Outside-click close: any click NOT inside a [data-dropdown] collapses
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
  'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
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
      <button type="button" data-row-action="${name}" aria-label="Row actions for ${name}" class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none dark:hover:bg-gray-800 dark:hover:text-gray-300">⋯</button>
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
// initChat — history collapse + send flow (chat.html)
// -----------------------------------------------------------------------------
function initChat(root) {
  const history = root.querySelector('[data-chat-history]')
  const toggle = root.querySelector('[data-chat-history-toggle]')
  const form = root.querySelector('[data-chat-form]')
  const input = root.querySelector('[data-chat-input]')
  const messages = root.querySelector('[data-chat-messages]')

  // Collapse: the aside carries `hidden md:flex` in markup. Toggling
  // `md:flex` off makes `hidden` win at EVERY width (below md it was never
  // visible anyway — toggle button is md:block too). aria-expanded must
  // follow reality or screen reader users hear the wrong state. (a11y)
  toggle?.addEventListener('click', () => {
    const expanded = history.classList.toggle('md:flex')
    toggle.setAttribute('aria-expanded', String(expanded))
  })

  if (!form || !input || !messages) return

  const scrollDown = () => messages.scrollTo({ top: messages.scrollHeight })

  form.addEventListener('submit', (event) => {
    // form submit already prevented a page reload — but NOT a hash jump;
    // preventDefault is still the right reflex inside an SPA.
    event.preventDefault()
    const text = input.value.trim()
    if (!text) return // empty send: do nothing (a comment button is worse)

    messages.insertAdjacentHTML(
      'beforeend',
      `<div class="max-w-[80%] self-end rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm leading-relaxed text-white">${escapeHtml(text)}</div>`,
    )
    input.value = ''
    scrollDown()

    // Canned "AI" reply: setTimeout stands in for a real fetch(). The async
    // shape (send → waiting → reply lands) is exactly what a network call
    // looks like, so this stays honest about the flow.
    setTimeout(() => {
    // escapeHtml (module scope) before insertAdjacentHTML — the XSS lesson:
    // <img src=x onerror=…> typed into chat must stay TEXT, not markup.
    messages.insertAdjacentHTML(
        'beforeend',
        `<div class="max-w-[80%] self-start rounded-2xl rounded-bl-sm border bg-white px-4 py-2.5 text-sm leading-relaxed text-gray-800 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">Canned demo reply — wire this form to a real API to go live.</div>`,
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
  const tabs = root.querySelectorAll('[data-tab]')
  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.tab

      tabs.forEach((b) => {
        const on = b === btn
        // aria-selected = which tab is current; AT announces it. (a11y)
        b.setAttribute('aria-selected', String(on))
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
    })
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
}

// -----------------------------------------------------------------------------
// initStates — toast demo + retry buttons (states.html)
// -----------------------------------------------------------------------------
function initStates(root) {
  root.querySelectorAll('[data-toast-demo]').forEach((btn) => {
    btn.addEventListener('click', () => showToast(btn.dataset.toastDemo))
  })

  // Retry: in a real app this refetches; here it just proves the button
  // is wired and gives immediate feedback instead of a dead click.
  root.querySelector('[data-retry]')?.addEventListener('click', () => {
    showToast('Retrying… (demo: still unreachable)')
  })
}

// -----------------------------------------------------------------------------
// Escape closes overlays — keyboard users expect it. (a11y)
// -----------------------------------------------------------------------------
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
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
