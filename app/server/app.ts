import { Hono } from 'hono'
import { registerAuthRoutes } from './auth'
import { registerTaskRoutes } from './tasks'
import type { Store } from './store'
import type { AppEnv } from './types'

// The Hono app is built here (not in index.ts) so tests can import it and use
// `app.request(...)` without ever opening a port. index.ts only wires it to
// Bun.serve and static file serving.
export function createApp({
  store,
  secureCookies = false,
}: {
  store: Store
  secureCookies?: boolean
}): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get('/api/health', (c) => c.json({ ok: true }))
  registerAuthRoutes(app, store, { secureCookies })
  registerTaskRoutes(app, store)

  return app
}
