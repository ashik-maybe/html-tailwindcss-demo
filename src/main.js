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

// Entry shape: { html, init? }. init(root) runs after the HTML is injected
// and gets the fresh subtree — attach DIRECT listeners there to widgets that
// only exist while that view is on screen (chat form, settings tabs/modal).
// Views without per-widget JS just declare html. Function declarations below
// are hoisted, so referencing them here is safe.
const views = {
  landing: { html: landing },
  dashboard: { html: dashboard },
  table: { html: table },
  checkout: { html: checkout },
  auth: { html: auth },
  chat: { html: chat, init: initChat },
  settings: { html: settings, init: initSettings },
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
    document.querySelectorAll('[data-dropdown-menu]:not(.hidden)').forEach((menu) => {
      menu.classList.add('hidden')
      const trig = menu.closest('[data-dropdown]')?.querySelector('[data-dropdown-trigger]')
      trig?.setAttribute('aria-expanded', 'false')
    })
  }
})

// -----------------------------------------------------------------------------
// Table filtering — search box + status chips (table view)
// -----------------------------------------------------------------------------
// `input` fires on every keystroke (unlike `change`, which waits for blur).
// Delegated again: the table is re-injected per visit, listeners would leak.
// -----------------------------------------------------------------------------
document.addEventListener('input', (event) => {
  if (event.target.matches('[data-table-search]')) applyTableFilter()
})

document.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-status-filter]')
  if (!chip) return

  // Move active tint + aria-pressed to the clicked chip, undo it on siblings.
  // aria-pressed = toggle-button semantics for screen readers. (a11y)
  chip.parentElement.querySelectorAll('[data-status-filter]').forEach((btn) => {
    const active = btn === chip
    btn.setAttribute('aria-pressed', String(active))
    // Same swap pattern as the nav: tinted classes on, defaults off (and back).
    btn.classList.toggle('border-brand-200', active)
    btn.classList.toggle('bg-brand-50', active)
    btn.classList.toggle('text-brand-700', active)
    btn.classList.toggle('dark:border-brand-800', active)
    btn.classList.toggle('dark:bg-brand-900/30', active)
    btn.classList.toggle('dark:text-brand-300', active)
    btn.classList.toggle('border-gray-200', !active)
    btn.classList.toggle('bg-white', !active)
    btn.classList.toggle('text-gray-600', !active)
    btn.classList.toggle('dark:border-gray-700', !active)
    btn.classList.toggle('dark:bg-gray-900', !active)
    btn.classList.toggle('dark:text-gray-400', !active)
  })

  applyTableFilter()
})

// Core filter logic: AND between text query and status chip.
// Both conditions must pass for a row to stay visible.
function applyTableFilter() {
  const search = document.querySelector('[data-table-search]')
  const table = document.querySelector('table')
  if (!search || !table) return // table view not on screen — ignore

  const query = search.value.trim().toLowerCase()
  const status = document.querySelector('[data-status-filter][aria-pressed="true"]')?.dataset.statusFilter ?? 'all'
  const rows = table.querySelectorAll('tbody tr[data-status]')

  let visible = 0
  rows.forEach((row) => {
    const matchText = row.textContent.toLowerCase().includes(query)
    const matchStatus = status === 'all' || row.dataset.status === status
    const show = matchText && matchStatus
    row.classList.toggle('hidden', !show)
    if (show) visible++
  })

  // ---------------------------------------------------------------------------
  // Zebra striping after filtering
  // ---------------------------------------------------------------------------
  // The markup uses even:bg-gray-50 — Tailwind compiles that to a rule with
  // :nth-child(even), and nth-child counts ALL siblings, hidden ones included.
  // Hide row 1 and the remaining rows keep their old DOM parity → stripes go
  // stripe/blank/stripe. CSS cannot "recount"; JS takes over once a filter
  // runs: strip the nth-child utilities, apply PLAIN bg classes in VISIBLE
  // order. Both plain classes already exist in the built CSS (dashboard +
  // table header use them), so no extra source entry is needed.
  let stripeIndex = 0
  rows.forEach((row) => {
    row.classList.remove('even:bg-gray-50', 'dark:even:bg-gray-800/60', 'bg-gray-50', 'dark:bg-gray-800/60')
    if (row.classList.contains('hidden')) return
    stripeIndex++
    if (stripeIndex % 2 === 0) row.classList.add('bg-gray-50', 'dark:bg-gray-800/60')
  })

  // Empty state row (colspan=6 message) shows only on zero matches.
  document.querySelector('#table-empty')?.classList.toggle('hidden', visible > 0)
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
}

function closeDrawer() {
  // Desktop (lg+) keeps the sidebar visible — translate class only matters
  // below the breakpoint, so restoring it is always safe.
  sidebarEl.classList.add('-translate-x-full')
  backdropEl.classList.add('hidden')
  drawerOpenBtn.setAttribute('aria-expanded', 'false')
}

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
})

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

  // Escape HTML before injecting user text — the classic XSS lesson.
  // <img src=x onerror=…> typed into the chat must stay TEXT, not markup.
  const escapeHtml = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

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
// Escape closes overlays — keyboard users expect it. (a11y)
// -----------------------------------------------------------------------------
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  closeDrawer()
  // Also collapse any open dropdown (same rules as outside-click close).
  document.querySelectorAll('[data-dropdown-menu]:not(.hidden)').forEach((menu) => {
    menu.classList.add('hidden')
    menu.closest('[data-dropdown]')?.querySelector('[data-dropdown-trigger]')?.setAttribute('aria-expanded', 'false')
  })
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
