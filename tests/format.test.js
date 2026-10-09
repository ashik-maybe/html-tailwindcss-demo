import { describe, it, expect } from 'vitest'
import { escapeHtml, emailOf, initialsOf } from '../src/lib/format.js'

describe('escapeHtml', () => {
  it('escapes the four dangerous characters', () => {
    expect(escapeHtml('<script> & "x"')).toBe('&lt;script&gt; &amp; &quot;x&quot;')
  })

  it('leaves plain text untouched', () => {
    expect(escapeHtml('Ada Lovelace')).toBe('Ada Lovelace')
  })

  it('escapes & first, so entity-like input stays literal', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })
})

describe('emailOf', () => {
  it('lowercases and joins name parts with dots', () => {
    expect(emailOf({ name: 'Ada Lovelace' })).toBe('ada.lovelace@nimbus.io')
  })

  it('collapses runs of non-alphanumerics to a single dot', () => {
    expect(emailOf({ name: "O'Brien  Smith" })).toBe('o.brien.smith@nimbus.io')
  })
})

describe('initialsOf', () => {
  it('takes the first letter of up to two words', () => {
    expect(initialsOf('Ada Lovelace')).toBe('AL')
    expect(initialsOf('Grace Brewster Hopper')).toBe('GB')
  })

  it('handles a single name', () => {
    expect(initialsOf('Ada')).toBe('A')
  })
})
