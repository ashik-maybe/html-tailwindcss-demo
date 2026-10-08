// =============================================================================
// Phase 0 entry point — JS stays deliberately tiny for now.
// Views, sidebar switching and interactions arrive in Phases 1+.
// =============================================================================

// Side-effect import: Vite bundles this stylesheet into the page's CSS.
// In Tailwind v4 the file starts with `@import "tailwindcss";` — the plugin
// scans index.html + src/**, generates the utilities actually used, and inlines them.
import './style.css'

// -----------------------------------------------------------------------------
// Dark-mode toggle
// -----------------------------------------------------------------------------
// The `dark:` variant in src/style.css is bound to a CLASS named `dark`
// (@custom-variant dark (&:where(.dark, .dark *))). Put that class on <html>
// and every dark:* utility on the page activates at once.
//
// Theme choice persists in localStorage so a reload keeps the user's mode.
// localStorage stores strings only — we convert with String(...) for reads
// and compare against the literal "true".
// -----------------------------------------------------------------------------

const root = document.documentElement
const storageKey = 'theme-dark'

// Initialize BEFORE first paint would ideally go in <head> (inline script) to
// avoid a flash of the wrong theme. For this single demo the end of body is
// acceptable; the shipped app moves this logic so it runs before render.
if (localStorage.getItem(storageKey) === 'true') {
  root.classList.add('dark')
}

document.querySelector('#theme-toggle')?.addEventListener('click', () => {
  // classList.toggle returns true/false = new state, so we can reuse it.
  const isDark = root.classList.toggle('dark')
  localStorage.setItem(storageKey, String(isDark))
})
