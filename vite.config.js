// Vite configuration file.
// Vite reads this file once, at startup, for both `vite` (dev server) and `vite build`.
//
// Why Vite at all?
// - In development, Vite serves your files over HTTP with "ES modules" — browsers
//   can import JS files directly, so startup is instant no matter how big the project gets.
// - For production (`vite build`), Vite bundles everything into the `dist/` folder,
//   hashing file names (e.g. main-BcX7a9.js) so browsers can cache files forever.

import { defineConfig } from 'vite'
// Official Tailwind CSS plugin for Vite (v4).
// It hooks into both the dev server and the build, scanning your source files
// for class names and generating only the CSS you actually use.
// No PostCSS config, no tailwind.config.js — v4 is configured in CSS instead.
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { readdirSync } from 'node:fs'

// -----------------------------------------------------------------------------
// Multi-page build
// -----------------------------------------------------------------------------
// The app is a SPA (one entry: index.html). The teaching pages in src/learning/
// are SEPARATE, complete documents, so each becomes its own build entry. Vite
// mirrors the source path, so they land at dist/src/learning/<name>.html.
//
// (import.meta.dirname is the ESM replacement for __dirname — this project is
// "type": "module", so __dirname does not exist here.)
const learningDir = resolve(import.meta.dirname, 'src/learning')
const learningPages = Object.fromEntries(
  readdirSync(learningDir)
    .filter((file) => file.endsWith('.html'))
    .map((file) => [file.replace(/\.html$/, ''), resolve(learningDir, file)]),
)

export default defineConfig({
  // Every HTML entry: the SPA shell + each learning lesson/hub.
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        ...learningPages,
      },
    },
  },
  // `base` is prepended to every asset URL Vite emits (script src, link href, images).
  //
  // Default is "/" — that only works when the site lives at a domain root,
  // e.g. https://example.com/.
  //
  // For GitHub Pages *project* sites the site lives under a sub-path:
  // https://<user>.github.io/<repo-name>/
  // so root-absolute URLs like /assets/main.js would 404.
  //
  // './' makes every URL relative to the HTML file that references it, which
  // works at a domain root AND under any sub-path. Safe default for any host.
  base: './',

  plugins: [tailwindcss()],
})
