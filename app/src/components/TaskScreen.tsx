import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '../api'
import type { Filter, Task, TaskPatch, User } from '../types'
import TaskItem from './TaskItem'

const inputClass =
  'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'done', label: 'Done' },
]

export default function TaskScreen({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [title, setTitle] = useState('')
  const [project, setProject] = useState('')
  const [due, setDue] = useState('')

  // Load once on mount. The list is the single source of truth from here on;
  // mutations update it from the server's response rather than guessing.
  useEffect(() => {
    api
      .listTasks()
      .then(({ tasks }) => setTasks(tasks))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clean = title.trim()
    if (!clean) return
    try {
      const { task } = await api.createTask({
        title: clean,
        project: project.trim(),
        due: due || null,
      })
      setTasks((prev) => [task, ...prev])
      setTitle('')
      setProject('')
      setDue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  // Optimistic: flip the checkbox immediately, then reconcile with the server.
  // If the request fails we roll back and surface the error — the UI never
  // silently disagrees with the database.
  async function toggleTask(task: Task) {
    const optimistic = { ...task, done: !task.done }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? optimistic : t)))
    try {
      const { task: updated } = await api.updateTask(task.id, { done: optimistic.done })
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  // Returns whether the save succeeded, so TaskItem knows to leave edit mode.
  // On failure we keep the draft open and let the parent show the error.
  async function updateTask(task: Task, patch: TaskPatch): Promise<boolean> {
    try {
      const { task: updated } = await api.updateTask(task.id, patch)
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }

  async function deleteTask(task: Task) {
    try {
      await api.deleteTask(task.id)
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const counts = useMemo<Record<Filter, number>>(
    () => ({
      all: tasks.length,
      active: tasks.filter((t) => !t.done).length,
      done: tasks.filter((t) => t.done).length,
    }),
    [tasks],
  )

  const needle = query.trim().toLowerCase()

  const visible = tasks.filter((t) => {
    const matchesFilter = filter === 'all' || (filter === 'active' ? !t.done : t.done)
    const matchesQuery =
      !needle ||
      t.title.toLowerCase().includes(needle) ||
      t.project.toLowerCase().includes(needle)
    return matchesFilter && matchesQuery
  })

  return (
    <div className="min-h-full bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Tasks</h1>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await api.logout().catch(() => {})
              onLogout()
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <form onSubmit={addTask} className="flex flex-col gap-2 sm:flex-row">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
            aria-label="New task title"
            className={`${inputClass} flex-1`}
          />
          <input
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="Project (optional)"
            aria-label="New task project"
            className={`${inputClass} sm:w-40`}
          />
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            aria-label="New task due date"
            className={`${inputClass} sm:w-40`}
          />
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Add
          </button>
        </form>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5" role="group" aria-label="Filter tasks">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                  filter === f.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f.label} ({counts[f.id]})
              </button>
            ))}
          </div>

          <div className="relative w-full sm:ml-auto sm:w-64">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              aria-label="Search tasks"
              className={`${inputClass} pr-9`}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg px-2 py-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500" role="status">
            Loading tasks…
          </p>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-gray-900">
              {tasks.length === 0 ? 'No tasks yet' : 'Nothing here'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {tasks.length === 0
                ? 'Add your first task above to get started.'
                : needle
                  ? 'No tasks match your search.'
                  : 'Try a different filter.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onUpdate={updateTask}
                onDelete={deleteTask}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
