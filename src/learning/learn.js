// =============================================================================
// Learning pages — shared behaviour
// =============================================================================
// Every lesson in src/learning/ is a STANDALONE HTML document. That is on
// purpose: unlike the app's src/views/*.html fragments (which hide the
// <html>/<head>/<body> skeleton), a lesson shows you a complete page you can
// View Source on and understand end to end.
//
// Because they are separate documents rather than SPA views, they cannot use
// main.js. They share this small script instead, which does only four things:
//   1. pulls in the SAME Tailwind stylesheet + brand tokens as the app
//   2. keeps the dark-mode choice in sync with the app (same localStorage key)
//   3. wires the Prev/Next footer + reading-progress bar
//   4. adds a "Copy" button to every code block
// It deliberately does NOT inject page content — the markup stays in the HTML
// where you can read it.
// =============================================================================

// One shared stylesheet keeps the lesson pages pixel-identical to the app:
// same @theme brand-* colors, same dark variant, same reduced-motion rule.
import '../style.css'

// -----------------------------------------------------------------------------
// Theme — identical storage key to src/main.js, so your choice follows you
// between the app and the lessons.
// -----------------------------------------------------------------------------
const root = document.documentElement
const storageKey = 'theme-dark'

if (localStorage.getItem(storageKey) === 'true') {
  root.classList.add('dark')
}

document.querySelectorAll('#theme-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const isDark = root.classList.toggle('dark')
    localStorage.setItem(storageKey, String(isDark))
  })
})

// -----------------------------------------------------------------------------
// Lesson order — the single source of truth for Prev/Next and progress.
// -----------------------------------------------------------------------------
const lessons = [
  { id: '01-html-basics', title: 'HTML basics', stage: 'Beginner' },
  { id: '02-tailwind-basics', title: 'Tailwind basics', stage: 'Beginner' },
  { id: '03-layout-basics', title: 'Layout basics', stage: 'Beginner' },
  { id: '04-forms-and-validation', title: 'Forms & validation', stage: 'Intermediate' },
  { id: '05-animations-and-transitions', title: 'Animations & transitions', stage: 'Intermediate' },
  { id: '06-js-and-the-dom', title: 'JS & the DOM', stage: 'Intermediate' },
  { id: '07-design-tokens-and-css', title: 'Design tokens & CSS', stage: 'Intermediate' },
  { id: '08-data-and-async', title: 'Data & async', stage: 'Advanced' },
  { id: '09-accessibility', title: 'Accessibility', stage: 'Advanced' },
  { id: '10-architecture-and-frameworks', title: 'Architecture & frameworks', stage: 'Advanced' },
]

// Which lesson are we on? Derive it from the URL filename, e.g.
// ".../01-html-basics.html" -> "01-html-basics". The hub (index.html) simply
// won't match, and every block below guards against that.
const current = location.pathname.split('/').pop().replace(/\.html$/, '')
const at = lessons.findIndex((l) => l.id === current)

if (at !== -1) {
  // Header stage badge, e.g. "Beginner · Lesson 1 of 10".
  const stage = document.querySelector('[data-stage]')
  if (stage) stage.textContent = `${lessons[at].stage} · Lesson ${at + 1} of ${lessons.length}`

  // Top progress bar under the header.
  const bar = document.querySelector('[data-progress]')
  if (bar) bar.style.width = `${((at + 1) / lessons.length) * 100}%`

  // Prev/Next footer. On the last lesson, "next" points back to the hub.
  const nav = document.querySelector('#lesson-nav')
  if (nav) {
    const prev = lessons[at - 1]
    const next = lessons[at + 1]
    const link =
      'flex max-w-[45%] flex-col rounded-xl border border-gray-200 px-4 py-3 text-sm transition hover:border-gray-300 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-900'
    nav.className = 'mt-12 flex items-stretch justify-between gap-3 border-t border-gray-200 pt-6 dark:border-gray-800'
    nav.innerHTML = `
      ${
        prev
          ? `<a class="${link} text-left" href="./${prev.id}.html"><span class="text-[11px] uppercase tracking-wider text-gray-400">Previous</span><span class="font-medium text-gray-900 dark:text-white">${prev.title}</span></a>`
          : '<span></span>'
      }
      ${
        next
          ? `<a class="${link} text-right" href="./${next.id}.html"><span class="text-[11px] uppercase tracking-wider text-gray-400">Next</span><span class="font-medium text-gray-900 dark:text-white">${next.title}</span></a>`
          : `<a class="${link} text-right" href="./index.html"><span class="text-[11px] uppercase tracking-wider text-gray-400">Finished</span><span class="font-medium text-gray-900 dark:text-white">Back to the hub</span></a>`
      }
    `
  }
}

// -----------------------------------------------------------------------------
// Copy buttons on every <pre> code block.
// -----------------------------------------------------------------------------
// navigator.clipboard needs a secure context (https or localhost); the catch
// keeps the button honest on plain http instead of silently failing.
document.querySelectorAll('pre').forEach((pre) => {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = 'Copy'
  btn.className =
    'absolute top-2 right-2 rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-[11px] font-medium text-gray-200 transition hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none'
  btn.addEventListener('click', async () => {
    const code = pre.querySelector('code')
    try {
      await navigator.clipboard.writeText(code ? code.innerText : pre.innerText)
      btn.textContent = 'Copied'
      setTimeout(() => (btn.textContent = 'Copy'), 1500)
    } catch {
      btn.textContent = 'Select + Ctrl-C'
    }
  })
  pre.classList.add('relative')
  pre.appendChild(btn)
})
