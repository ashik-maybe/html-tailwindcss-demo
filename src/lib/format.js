// Pure string helpers shared by the app's views.
//
// These were inline in src/main.js until the testing phase: pulling them into
// their own module is what makes them unit-testable without a DOM. Pure
// function in → value out; no document, no globals, no side effects.

// Escape the four characters that can break out of HTML text/attribute
// context. `&` MUST go first, or the entities we insert get re-escaped.
export const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Derive a display email from a member's name — deterministic, so the same
// person shows the same address on every render.
export const emailOf = (m) => `${m.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@nimbus.io`

// "Ada Lovelace" → "AL", "Grace Brewster Hopper" → "GB" (first two words).
export const initialsOf = (name) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
