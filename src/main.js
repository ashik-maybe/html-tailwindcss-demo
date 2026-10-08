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

const views = {
  landing,
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
  const html = views[id]
  if (!html) return

  viewEl.innerHTML = html

  // Active state: ONE nav button gets bg/aria-current, all others lose it.
  // aria-current="page" is how screen readers announce "you are here". (a11y)
  document.querySelectorAll('[data-view]').forEach((btn) => {
    const active = btn.dataset.view === id
    btn.classList.toggle('bg-brand-50', active)
    btn.classList.toggle('text-brand-700', active)
    btn.classList.toggle('dark:bg-brand-900/30', active)
    btn.classList.toggle('dark:text-brand-300', active)
    btn.classList.toggle('text-gray-600', !active)
    btn.classList.toggle('dark:text-gray-400', !active)
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
// Event delegation
// -----------------------------------------------------------------------------
// ONE click listener on document instead of one per button.
// data-view buttons work now; buttons added in later phases work with zero
// JS changes — the handler reads the attribute at click time.
document.addEventListener('click', (event) => {
  const navBtn = event.target.closest('[data-view]')
  if (navBtn) switchView(navBtn.dataset.view)
})

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

// Escape closes overlays — keyboard users expect it. (a11y)
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeDrawer()
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
