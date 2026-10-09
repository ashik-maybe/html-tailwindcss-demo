# Getting Started — beginner to advanced

This repo contains a **teaching track** (`src/learning/`) alongside the
**pattern library** (the thirteen views in the app). This document is the honest
roadmap through both, and around them.

There is one thing to say up front, because it will save you months:

> No single repo, course, or book takes you from zero to "build any modern UI".
> That goal needs **three tracks**, and this repo is only one of them. Reaching
> it is reps, not discovery. Here is the full map.

## The three tracks

| Track | What it gives you | Where it lives |
| --- | --- | --- |
| **Patterns** (this repo) | How real UI is structured and *why* each decision was made | `src/learning/` + the app views |
| **CSS depth** | Flexbox, grid, positioning, animation as instinct | MDN + deliberate practice |
| **JavaScript + a framework** | Interactivity, data, state, and the tooling jobs use | javascript.info + React or Vue |

Do the lessons here, but do not stop at reading. The practice loop is:

**Read a lesson → close the file → rebuild one example from memory → diff your
version against the original.** Typing it is what makes it stick.

Start the lessons in your browser: open the app (`index.html`) and click
**📚 Start learning**, or go straight to `src/learning/index.html`.

---

## Stage 1 · Beginner

**Goal:** read HTML and Tailwind, and copy + tweak components without breaking them.

**Lessons**
1. [`01-html-basics.html`](src/learning/01-html-basics.html) — tags, attributes, nesting, the full document skeleton.
2. [`02-tailwind-basics.html`](src/learning/02-tailwind-basics.html) — the class attribute, utilities, the spacing/colour scales.
3. [`03-layout-basics.html`](src/learning/03-layout-basics.html) — box model, flex, grid, responsive, states, dark mode.

**Checkpoint — move on when you can:**
- Open any view in the app and explain what most classes do.
- Recreate a card or form from a screenshot without copying, then make it responsive.
- Fix a broken layout by changing flex/grid classes, not by trial and error.

**External resources to pair with this stage**
- [MDN: HTML basics](https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/HTML_basics)
- [Tailwind CSS: core concepts](https://tailwindcss.com/docs/styling-with-utility-classes)

**Projects**
1. A personal "About me" page (lesson 01's exercise).
2. A pricing section with three tiers that stack on mobile.
3. Rebuild the app's **Landing** view header from memory.

---

## Stage 2 · Intermediate

**Goal:** build an interactive page — form, validation, loading and error states — from a mockup, unaided.

**Lessons**
4. [`04-forms-and-validation.html`](src/learning/04-forms-and-validation.html)
5. [`05-animations-and-transitions.html`](src/learning/05-animations-and-transitions.html)
6. [`06-js-and-the-dom.html`](src/learning/06-js-and-the-dom.html)
7. [`07-design-tokens-and-css.html`](src/learning/07-design-tokens-and-css.html)

**Then study the app's harder views** with the lessons fresh:
`table.html` (state + render), `chat.html` (XSS-safe send), `checkout.html`
(real multi-step flow), `components.html` (a11y patterns).

**Checkpoint — move on when you can:**
- Build a form with live validation and accessible error messages.
- Fetch data (or fake it with `setTimeout`) and render loading, success, empty, and error states.
- Explain event delegation and why the app uses one click listener.
- Read `src/style.css` and describe what every line does.

**External resources**
- [MDN: CSS learning area](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics)
- [javascript.info](https://javascript.info/) — the best free JS course; read "JavaScript Fundamentals" and "Promises, async/await".
- [Tailwind CSS docs](https://tailwindcss.com/docs) — variants and `@theme` pages.

**Projects**
1. Rebuild the app's **Data Table** (search, filter, pagination, empty state) from scratch.
2. A three-step form with a disabled-until-valid submit button.
3. A small dashboard that loads fake data and handles all four request states.

---

## Stage 3 · Advanced

**Goal:** scaffold a framework app, route between screens, manage state, and ship UI that is accessible and fast.

**Lessons**
8. [`08-data-and-async.html`](src/learning/08-data-and-async.html)
9. [`09-accessibility.html`](src/learning/09-accessibility.html)
10. [`10-architecture-and-frameworks.html`](src/learning/10-architecture-and-frameworks.html)

**Checkpoint — move on when you can:**
- Scaffold a React or Vue app, add routing, and manage state without copy-pasting from a tutorial.
- Pass a keyboard-only and zoom test on your own UI.
- Read `src/main.js` and see the router, views, and state as separate concerns.
- Write a unit test and one end-to-end test for a critical flow — the repo's
  own `tests/` (Vitest) and `e2e/` (Playwright) are working examples to copy.

**External resources**
- [React](https://react.dev/learn) **or** [Vue](https://vuejs.org/guide/introduction.html) — pick one.
- [TypeScript handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [web.dev: Learn Accessibility](https://web.dev/learn/accessibility) and [Learn Performance](https://web.dev/learn/performance)

**Projects**
1. Port the app's sidebar + one view into React or Vue. Deploy it.
2. Add TypeScript to that project.
3. Take the repo README's five exercises, then ship a small product of your own.

---

## The repo's own exercises

These are in the [README](README.md) and are perfect Stage 2–3 practice.
The first one — hash routing — is now implemented (see `src/lib/router.js`), so
read it as a worked example; the rest are open: rebuild the table search with
`:has()`, refactor the shop cards into a component function, drive the dashboard
chart with custom properties, and make the FAQ a single-open accordion.

## One last honest note

The ceiling here is your reps. Reading every file in this repo teaches you
*recognition*; only building teaches *ability*. When a lesson ends, the
exercise is the real lesson — do it before moving on.
