import { serveStatic } from 'hono/bun'
import { createApp } from './app'
import { openDb } from './db'
import { createStore } from './store'

const store = createStore(openDb())
store.sessions.removeExpired() // drop stale sessions on boot

const app = createApp({ store, secureCookies: process.env.COOKIE_SECURE === '1' })

// In production the same Bun process serves the built React client, so one
// `bun run start` gives you API + UI on one port. In dev, Vite serves the UI
// and proxies /api here.
if (process.env.NODE_ENV === 'production') {
  app.use('*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

const port = Number(process.env.PORT ?? 5181)
console.log(`API listening on http://localhost:${port}`)

export default { port, fetch: app.fetch }
