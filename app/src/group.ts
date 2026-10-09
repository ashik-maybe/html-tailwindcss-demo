import type { Task } from './types'

export type TaskGroup = { key: string; label: string; tasks: Task[] }

// Groups the (already filtered + sorted) tasks by their project. Projects are
// ordered A→Z; tasks with no project go last under "No project".
export function groupByProject(tasks: Task[]): TaskGroup[] {
  const groups = new Map<string, Task[]>()
  for (const task of tasks) {
    const list = groups.get(task.project) ?? []
    list.push(task)
    groups.set(task.project, list)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === '') return 1 // no project last
      if (b === '') return -1
      return a.localeCompare(b)
    })
    .map(([key, list]) => ({ key, label: key || 'No project', tasks: list }))
}
