import { describe, test, expect } from 'bun:test'
import { sortTasks } from '../src/sort'
import type { Task } from '../src/types'

const task = (id: number, title: string, extra: Partial<Task> = {}): Task => ({
  id,
  title,
  project: '',
  due: null,
  done: false,
  createdAt: '2026-01-01 00:00:00',
  ...extra,
})

describe('sortTasks', () => {
  test('created: newest first', () => {
    const out = sortTasks([task(1, 'a'), task(3, 'c'), task(2, 'b')], 'created')
    expect(out.map((t) => t.id)).toEqual([3, 2, 1])
  })

  test('title: A to Z', () => {
    const out = sortTasks([task(1, 'Zed'), task(2, 'ann'), task(3, 'Bob')], 'title')
    expect(out.map((t) => t.title)).toEqual(['ann', 'Bob', 'Zed'])
  })

  test('due: soonest first, undated last', () => {
    const out = sortTasks(
      [task(1, 'x'), task(2, 'y', { due: '2026-02-01' }), task(3, 'z', { due: '2026-01-01' })],
      'due',
    )
    expect(out.map((t) => t.id)).toEqual([3, 2, 1])
  })

  test('completed sink below unfinished for every key', () => {
    const out = sortTasks([task(1, 'a', { done: true }), task(2, 'b'), task(3, 'c')], 'title')
    expect(out.map((t) => t.id)).toEqual([2, 3, 1])
  })
})
