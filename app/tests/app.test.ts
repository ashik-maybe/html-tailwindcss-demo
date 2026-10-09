import { describe, test, expect, beforeEach } from 'bun:test'
import { openDb } from '../server/db'
import { createStore } from '../server/store'
import { createApp } from '../server/app'

describe('app shell', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp({ store: createStore(openDb(':memory:')) })
  })

  test('sets baseline security headers on responses', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('referrer-policy')).toBe('no-referrer')
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'")
  })

  test('unknown API routes answer with a JSON 404', async () => {
    const res = await app.request('/api/nope')
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toEqual({ error: 'Not found' })
  })
})
