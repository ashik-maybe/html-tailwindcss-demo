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

  // Baseline security headers on every response. Cheap, and they close whole
  // classes of bug: MIME sniffing, clickjacking, referrer leakage, and inline
  // script injection (CSP). Set *before* the route runs so they merge into the
  // final response (including static files from `serveStatic`).
  app.use('*', async (c, next) => {
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('Referrer-Policy', 'no-referrer')
    c.header('Cross-Origin-Opener-Policy', 'same-origin')
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    )
    await next()
  })

  app.get('/api/health', (c) => c.json({ ok: true }))
  registerAuthRoutes(app, store, { secureCookies })
  registerTaskRoutes(app, store)

  // Unknown API routes answer in JSON (not the SPA's HTML) even in production,
  // where a catch-all file route serves index.html for everything else.
  app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404))

  // A thrown error becomes a generic 500 — never a stack trace sent to a client.
  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'Server error' }, 500)
  })

  return app
}
