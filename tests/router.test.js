import { describe, it, expect } from 'vitest'
import { hashToId, idToHash } from '../src/lib/router.js'

describe('hashToId', () => {
  it('parses the #/<id> convention', () => {
    expect(hashToId('#/table')).toBe('table')
    expect(hashToId('#/components')).toBe('components')
  })

  it('tolerates a missing slash', () => {
    expect(hashToId('#table')).toBe('table')
  })

  it('returns null for empty or bare hashes', () => {
    expect(hashToId('')).toBeNull()
    expect(hashToId('#')).toBeNull()
    expect(hashToId('#/')).toBeNull()
    expect(hashToId(null)).toBeNull()
    expect(hashToId(undefined)).toBeNull()
  })
})

describe('idToHash', () => {
  it('builds the canonical hash', () => {
    expect(idToHash('landing')).toBe('#/landing')
  })

  it('round-trips with hashToId', () => {
    expect(hashToId(idToHash('checkout'))).toBe('checkout')
  })
})
