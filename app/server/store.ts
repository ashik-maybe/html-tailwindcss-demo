import type { Database } from 'bun:sqlite'
import type { SessionRow, Task, TaskRow, User, UserRow } from './types'

// The columns every task SELECT returns (list/insert omit user_id).
type TaskFields = {
  id: number
  title: string
  project: string
  done: number
  created_at: string
}

// One place that knows SQL. Routes never write queries; they call these methods.
// Statements are prepared once at startup so repeated calls skip re-parsing.
//
// Every task query is scoped by user_id — that single rule is what stops user A
// from ever reading or mutating user B's rows, even if they guess an id.
export function createStore(db: Database) {
  const insertUser = db.query<User, [string, string]>(
    'INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id, email, created_at',
  )
  const userByEmail = db.query<UserRow, [string]>('SELECT * FROM users WHERE email = ?')
  const userById = db.query<User, [number]>(
    'SELECT id, email, created_at FROM users WHERE id = ?',
  )

  const insertSession = db.query<null, [string, number, string]>(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
  )
  const sessionById = db.query<SessionRow, [string]>(
    "SELECT id, user_id, expires_at FROM sessions WHERE id = ? AND expires_at > datetime('now')",
  )
  const deleteSession = db.query<null, [string]>('DELETE FROM sessions WHERE id = ?')
  const deleteExpired = db.query<null, []>(
    "DELETE FROM sessions WHERE expires_at <= datetime('now')",
  )

  const tasksByUser = db.query<TaskRow, [number]>(
    `SELECT id, title, project, done, created_at
       FROM tasks WHERE user_id = ? ORDER BY done ASC, id DESC`,
  )
  const insertTask = db.query<TaskFields, [number, string, string]>(
    `INSERT INTO tasks (user_id, title, project) VALUES (?, ?, ?)
     RETURNING id, title, project, done, created_at`,
  )
  const taskById = db.query<TaskRow, [number, number]>(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
  )
  const updateTask = db.query<null, [string, string, number, number, number]>(
    'UPDATE tasks SET title = ?, project = ?, done = ? WHERE id = ? AND user_id = ?',
  )
  const deleteTask = db.query<null, [number, number]>(
    'DELETE FROM tasks WHERE id = ? AND user_id = ?',
  )

  const toTask = (row: TaskFields): Task => ({
    id: row.id,
    title: row.title,
    project: row.project,
    done: Boolean(row.done),
    createdAt: row.created_at,
  })

  return {
    users: {
      create: (email: string, passwordHash: string) => insertUser.get(email, passwordHash),
      findByEmail: (email: string) => userByEmail.get(email), // includes password_hash
      findById: (id: number) => userById.get(id),
    },
    sessions: {
      create: (id: string, userId: number, expiresAt: string) =>
        insertSession.run(id, userId, expiresAt),
      find: (id: string) => sessionById.get(id),
      remove: (id: string) => deleteSession.run(id),
      removeExpired: () => deleteExpired.run(),
    },
    tasks: {
      list: (userId: number): Task[] => tasksByUser.all(userId).map(toTask),
      create: (userId: number, input: { title: string; project?: string }): Task => {
        const row = insertTask.get(userId, input.title, input.project ?? '')
        return toTask(row as TaskFields)
      },
      get: (userId: number, id: number): Task | null => {
        const row = taskById.get(id, userId)
        return row ? toTask(row) : null
      },
      update: (
        userId: number,
        id: number,
        patch: { title?: string; project?: string; done?: boolean },
      ): Task | null => {
        const current = taskById.get(id, userId)
        if (!current) return null
        const title = patch.title ?? current.title
        const project = patch.project ?? current.project
        const done = patch.done === undefined ? current.done : patch.done ? 1 : 0
        updateTask.run(title, project, done, id, userId)
        return toTask(taskById.get(id, userId) as TaskFields)
      },
      remove: (userId: number, id: number): boolean => deleteTask.run(id, userId).changes > 0,
    },
  }
}

export type Store = ReturnType<typeof createStore>
