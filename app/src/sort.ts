import type { SortKey, Task } from './types'

// Pure so it's easy to unit test. Rules:
//  - completed tasks always sink to the bottom, whatever the key
//  - 'created' = newest first, 'due' = soonest first (undated last), 'title' = A→Z
export function sortTasks(tasks: Task[], key: SortKey): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (key === 'title') return a.title.localeCompare(b.title)
    if (key === 'due') {
      if (!a.due && !b.due) return b.id - a.id
      if (!a.due) return 1
      if (!b.due) return -1
      return a.due.localeCompare(b.due)
    }
    return b.id - a.id // created
  })
}
