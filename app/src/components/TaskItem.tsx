import { useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Task, TaskPatch } from '../types'

const inputClass =
  'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none'

// A single row. It owns only the *draft* while you're editing; the task list
// itself lives in the parent, so there is still one source of truth.
export default function TaskItem({
  task,
  onToggle,
  onUpdate,
  onDelete,
}: {
  task: Task
  onToggle: (task: Task) => void
  onUpdate: (task: Task, patch: TaskPatch) => Promise<boolean>
  onDelete: (task: Task) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(task.title)
  const [draftProject, setDraftProject] = useState(task.project)

  function startEdit() {
    setDraftTitle(task.title) // seed the draft from the current values
    setDraftProject(task.project)
    setEditing(true)
  }

  // Only leave edit mode if the save succeeded; onUpdate reports that as a
  // boolean (and the parent surfaces the error message).
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = draftTitle.trim()
    if (!title) return
    const ok = await onUpdate(task, { title, project: draftProject.trim() })
    if (ok) setEditing(false)
  }

  const onEscape = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') setEditing(false)
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-indigo-300 bg-white px-4 py-3">
        <form onSubmit={save} onKeyDown={onEscape} className="flex flex-col gap-2 sm:flex-row">
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            aria-label="Edit task title"
            className={`${inputClass} flex-1`}
          />
          <input
            value={draftProject}
            onChange={(e) => setDraftProject(e.target.value)}
            aria-label="Edit task project"
            placeholder="Project"
            className={`${inputClass} sm:w-36`}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => onToggle(task)}
        aria-label={`Mark "${task.title}" as ${task.done ? 'not done' : 'done'}`}
        className="h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${task.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}
        >
          {task.title}
        </p>
        {task.project && (
          <span className="mt-0.5 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {task.project}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={startEdit}
        aria-label={`Edit "${task.title}"`}
        className="shrink-0 rounded-lg px-2 py-1 text-sm text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => onDelete(task)}
        aria-label={`Delete "${task.title}"`}
        className="shrink-0 rounded-lg px-2 py-1 text-sm text-gray-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
      >
        Delete
      </button>
    </li>
  )
}
