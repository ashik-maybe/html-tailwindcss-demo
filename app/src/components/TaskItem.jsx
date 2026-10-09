// A single row. Stateless: it only reports intent upward; the parent owns the
// list, so there is one source of truth.
export default function TaskItem({ task, onToggle, onDelete }) {
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
        onClick={() => onDelete(task)}
        aria-label={`Delete "${task.title}"`}
        className="shrink-0 rounded-lg px-2 py-1 text-sm text-gray-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
      >
        Delete
      </button>
    </li>
  )
}
