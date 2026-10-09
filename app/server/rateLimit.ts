import type { Context } from 'hono'
import { getConnInfo } from 'hono/bun'

type RateLimiterOptions = {
  windowMs: number
  max: number
  keyGenerator?: (c: Context) => string
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, max: maxRequests, keyGenerator: keyGen } = options
  const defaultKey = (c: Context) => {
    try {
      const info = getConnInfo(c)
      return info.remote.address ?? 'local'
    } catch {
      return 'local'
    }
  }
  const keyFn = keyGen ?? defaultKey

  const store = new Map<string, number[]>()
  const prune = (key: string, now: number) => {
    const entries = store.get(key) ?? []
    store.set(key, entries.filter((t) => now - t < windowMs))
  }

  return async (c: Context, next: () => Promise<void>) => {
    const key = keyFn(c)
    prune(key, Date.now())
    const entries = store.get(key) ?? []
    if (entries.length >= maxRequests) {
      c.status(429)
      c.header('Retry-After', String(Math.ceil((windowMs - (Date.now() - entries[entries.length - 1])) / 1000)))
      return c.json({ error: 'Too Many Requests' }, 429)
    }
    entries.push(Date.now())
    store.set(key, entries)
    await next()
  }
}