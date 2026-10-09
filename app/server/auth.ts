import type { Context, Hono, MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Store } from './store'
import type { AppEnv, PublicUser } from './types'

// Auth = three ideas: hash the password (never store it), keep a random session
// id in an httpOnly cookie (JS can't read it → XSS can't steal it), and look up
// that id in the DB on every request (revocable, unlike a signed token).
export const SESSION_COOKIE = 'sid'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // one week
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8

const publicUser = (row: { id: number; email: string }): PublicUser => ({
  id: row.id,
  email: row.email,
})

// SQLite compares `expires_at` against datetime('now') as text, so store the
// same 'YYYY-MM-DD HH:MM:SS' (UTC) shape it produces.
const expiryString = () =>
  new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString().slice(0, 19).replace('T', ' ')

// Middleware factory: reads the cookie, resolves the user, or stops with 401.
// Everything after it can trust `c.get('user')` is a real, logged-in user.
export function requireAuth(store: Store): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const sid = getCookie(c, SESSION_COOKIE)
    const session = sid ? store.sessions.find(sid) : null
    const user = session ? store.users.findById(session.user_id) : null
    if (!user) {
      if (sid) store.sessions.remove(sid)
      return c.json({ error: 'Not signed in' }, 401)
    }
    c.set('user', publicUser(user))
    await next()
  }
}

export function registerAuthRoutes(
  app: Hono<AppEnv>,
  store: Store,
  { secureCookies = false }: { secureCookies?: boolean } = {},
) {
  const cookieOpts = {
    httpOnly: true, // invisible to document.cookie → XSS can't exfiltrate it
    sameSite: 'Lax' as const, // not sent on cross-site POSTs → basic CSRF protection
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
    secure: secureCookies, // HTTPS-only when deployed (set COOKIE_SECURE=1)
  }

  function startSession(c: Context<AppEnv>, userId: number) {
    const token = crypto.randomUUID()
    store.sessions.create(token, userId, expiryString())
    setCookie(c, SESSION_COOKIE, token, cookieOpts)
  }

  app.post('/api/auth/register', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    const password = String(body.password ?? '')

    if (!EMAIL_RE.test(email)) return c.json({ error: 'Enter a valid email address' }, 400)
    if (password.length < MIN_PASSWORD) {
      return c.json({ error: `Password must be at least ${MIN_PASSWORD} characters` }, 400)
    }
    if (store.users.findByEmail(email)) {
      return c.json({ error: 'That email is already registered' }, 409)
    }

    const passwordHash = await Bun.password.hash(password) // argon2id by default
    const user = store.users.create(email, passwordHash)
    if (!user) return c.json({ error: 'Could not create account' }, 500)
    startSession(c, user.id)
    return c.json({ user: publicUser(user) }, 201)
  })

  app.post('/api/auth/login', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    const password = String(body.password ?? '')

    const user = store.users.findByEmail(email)
    const valid = user ? await Bun.password.verify(password, user.password_hash) : false
    if (!valid || !user) return c.json({ error: 'Incorrect email or password' }, 401)

    startSession(c, user.id)
    return c.json({ user: publicUser(user) })
  })

  app.post('/api/auth/logout', (c) => {
    const sid = getCookie(c, SESSION_COOKIE)
    if (sid) store.sessions.remove(sid)
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    return c.body(null, 204)
  })

  app.get('/api/auth/me', requireAuth(store), (c) => c.json({ user: c.get('user') }))
}
