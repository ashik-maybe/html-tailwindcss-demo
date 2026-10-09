import { describe, test, expect } from 'bun:test'
import { groupByProject } from '../src/group'
import type { Task } from '../src/types'

const task = (id: number, project: string): Task => ({
  id,
  title: `task ${id}`,
  project,
  due: null,
  done: false,
  createdAt: '2026-01-01 00:00:00',
})

describe('groupByProject', () => {
  test('groups by project, sorted A-Z, with no-project last', () => {
    const groups = groupByProject([
      task(1, 'Work'),
      task(2, ''),
      task(3, 'Home'),
      task(4, 'Work'),
    ])
    expect(groups.map((g) => g.label)).toEqual(['Home', 'Work', 'No project'])
    expect(groups[1].tasks.map((t) => t.id)).toEqual([1, 4])
  })

  test('empty input yields no groups', () => {
    expect(groupByProject([])).toEqual([])
  })
})
