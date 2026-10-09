import { describe, it, expect } from 'vitest'
import { computePosition } from '../src/lib/position.js'

// Rect helper: derive right/bottom so tests read like the DOM would report.
const rect = (top, left, width, height) => ({
  top,
  left,
  width,
  height,
  right: left + width,
  bottom: top + height,
})

const viewport = { width: 1000, height: 800 }
const floating = { width: 200, height: 100 }

describe('computePosition — vertical', () => {
  it('drops below the anchor by default', () => {
    const { top } = computePosition({ anchor: rect(100, 100, 100, 40), floating, viewport })
    expect(top).toBe(148) // 140 (bottom) + 8 (offset)
  })

  it('flips above when there is no room below', () => {
    const { top } = computePosition({
      anchor: rect(200, 100, 100, 40),
      floating,
      viewport: { width: 1000, height: 300 },
    })
    expect(top).toBe(92) // 200 - 100 - 8
  })

  it('honours a top placement when it fits', () => {
    const { top } = computePosition({
      anchor: rect(200, 100, 100, 40),
      floating,
      viewport,
      placement: 'top-start',
    })
    expect(top).toBe(92)
  })

  it('flips to the bottom when a top placement would overflow', () => {
    const { top } = computePosition({
      anchor: rect(20, 100, 100, 40),
      floating,
      viewport,
      placement: 'top-start',
    })
    expect(top).toBe(68) // 60 (bottom) + 8
  })
})

describe('computePosition — horizontal', () => {
  it('aligns start with the anchor left', () => {
    const { left } = computePosition({ anchor: rect(100, 100, 100, 40), floating, viewport })
    expect(left).toBe(100)
  })

  it('aligns end with the anchor right', () => {
    const { left } = computePosition({
      anchor: rect(100, 100, 100, 40),
      floating: { width: 150, height: 100 },
      viewport,
      placement: 'bottom-end',
    })
    expect(left).toBe(50) // right(200) - width(150)
  })

  it('centres when asked', () => {
    const { left } = computePosition({
      anchor: rect(100, 100, 100, 40),
      floating: { width: 60, height: 100 },
      viewport,
      placement: 'bottom-center',
    })
    expect(left).toBe(120) // 100 + (100 - 60) / 2
  })

  it('shifts left off the viewport edge', () => {
    const { left } = computePosition({
      anchor: rect(100, 0, 100, 40),
      floating,
      viewport,
      placement: 'bottom-end',
    })
    expect(left).toBe(8) // clamped to margin
  })

  it('shifts right off the viewport edge', () => {
    const { left } = computePosition({
      anchor: rect(100, 950, 100, 40),
      floating,
      viewport,
    })
    expect(left).toBe(792) // 1000 - 200 - 8
  })
})
