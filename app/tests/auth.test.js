import { describe, test, expect, beforeEach } from 'bun:test'
import { openDb } from '../server/db.js'
import { createStore } from '../server/store.js'
import { createApp } from '../server/app.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const cookieFrom = (res) => (res.headers.get('set-cookie') ?? '').split(';')[0] // "sid=…"

describe('auth API', () => {
  let app

  beforeEach(() => {
    app = createApp({ store: createStore(openDb(':memory:')) })
  })

  const register = (body) =>
    app.request('/api/auth/register', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    })
  const login = (body) =>
    app.request('/api/auth/login', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    })

  test('registers a user, normalizes the email, sets an httpOnly cookie', async () => {
    const res = await register({ email: 'A@Example.com ', password: 'password123' })
    expect(res.status).toBe(201)
    const { user } = await res.json()
    expect(user.email).toBe('a@example.com')
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toContain('sid=')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Lax')
  })

  test('rejects invalid email, short password, then duplicate email', async () => {
    expect((await register({ email: 'nope', password: 'password123' })).status).toBe(400)
    expect((await register({ email: 'a@example.com', password: 'short' })).status).toBe(400)
    await register({ email: 'a@example.com', password: 'password123' })
    expect((await register({ email: 'a@example.com', password: 'password123' })).status).toBe(409)
  })

  test('login checks the password and never leaks which part was wrong', async () => {
    await register({ email: 'a@example.com', password: 'password123' })

    const bad = await login({ email: 'a@example.com', password: 'wrong-password' })
    expect(bad.status).toBe(401)
    expect((await bad.json()).error).toBe('Incorrect email or password')

    const unknown = await login({ email: 'nobody@example.com', password: 'password123' })
    expect(unknown.status).toBe(401)
    expect((await unknown.json()).error).toBe('Incorrect email or password')

    expect((await login({ email: 'a@example.com', password: 'password123' })).status).toBe(200)
  })

  test('me is 401 without a cookie and 200 with one', async () => {
    expect((await app.request('/api/auth/me')).status).toBe(401)

    const cookie = cookieFrom(await register({ email: 'a@example.com', password: 'password123' }))
    const me = await app.request('/api/auth/me', { headers: { cookie } })
    expect(me.status).toBe(200)
    expect((await me.json()).user.email).toBe('a@example.com')
  })

  test('logout invalidates the session', async () => {
    const cookie = cookieFrom(await register({ email: 'a@example.com', password: 'password123' }))
    const out = await app.request('/api/auth/logout', { method: 'POST', headers: { cookie } })
    expect(out.status).toBe(204)
    expect((await app.request('/api/auth/me', { headers: { cookie } })).status).toBe(401)
  })
})
