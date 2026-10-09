import { describe, test, expect } from 'bun:test'
import { formatDue, isOverdue } from '../src/format'

const DAY = 86_400_000
const isoDay = (time: number) => new Date(time).toISOString().slice(0, 10)

describe('format', () => {
  test('isOverdue: past is due, future is not', () => {
    expect(isOverdue(isoDay(Date.now() - 2 * DAY))).toBe(true)
    expect(isOverdue(isoDay(Date.now() + 2 * DAY))).toBe(false)
  })

  test('formatDue renders a short label', () => {
    expect(formatDue('2026-03-05')).toMatch(/Mar/)
    expect(formatDue('2026-03-05')).toMatch(/5/)
  })
})
