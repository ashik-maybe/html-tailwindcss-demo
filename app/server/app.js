import { Hono } from 'hono'
import { registerAuthRoutes } from './auth.js'
import { registerTaskRoutes } from './tasks.js'

// The Hono app is built here (not in index.js) so tests can import it and use
// `app.request(...)` without ever opening a port. index.js only wires it to
// Bun.serve and static file serving.
export function createApp({ store, secureCookies = false }) {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ ok: true }))
  registerAuthRoutes(app, store, { secureCookies })
  registerTaskRoutes(app, store)

  return app
}
