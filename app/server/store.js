// One place that knows SQL. Routes never write queries; they call these methods.
// Statements are prepared once at startup so repeated calls skip re-parsing.
//
// Every task query is scoped by user_id — that single rule is what stops user A
// from ever reading or mutating user B's rows, even if they guess an id.
export function createStore(db) {
  const insertUser = db.query(
    'INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id, email, created_at',
  )
  const userByEmail = db.query('SELECT * FROM users WHERE email = ?')
  const userById = db.query('SELECT id, email, created_at FROM users WHERE id = ?')

  const insertSession = db.query('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
  const sessionById = db.query('SELECT id, user_id, expires_at FROM sessions WHERE id = ?')
  const deleteSession = db.query('DELETE FROM sessions WHERE id = ?')
  const deleteExpired = db.query("DELETE FROM sessions WHERE expires_at <= datetime('now')")

  const tasksByUser = db.query(
    `SELECT id, title, project, done, created_at
       FROM tasks WHERE user_id = ? ORDER BY done ASC, id DESC`,
  )
  const insertTask = db.query(
    `INSERT INTO tasks (user_id, title, project) VALUES (?, ?, ?)
     RETURNING id, title, project, done, created_at`,
  )
  const taskById = db.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
  const updateTask = db.query(
    'UPDATE tasks SET title = ?, project = ?, done = ? WHERE id = ? AND user_id = ?',
  )
  const deleteTask = db.query('DELETE FROM tasks WHERE id = ? AND user_id = ?')

  const toTask = (row) => ({
    id: row.id,
    title: row.title,
    project: row.project,
    done: Boolean(row.done),
    createdAt: row.created_at,
  })

  return {
    users: {
      create: (email, passwordHash) => insertUser.get(email, passwordHash),
      findByEmail: (email) => userByEmail.get(email), // includes password_hash
      findById: (id) => userById.get(id),
    },
    sessions: {
      create: (id, userId, expiresAt) => insertSession.run(id, userId, expiresAt),
      find: (id) => sessionById.get(id),
      remove: (id) => deleteSession.run(id),
      removeExpired: () => deleteExpired.run(),
    },
    tasks: {
      list: (userId) => tasksByUser.all(userId).map(toTask),
      create: (userId, { title, project }) => toTask(insertTask.get(userId, title, project ?? '')),
      get: (userId, id) => {
        const row = taskById.get(id, userId)
        return row ? toTask(row) : null
      },
      update: (userId, id, patch) => {
        const current = taskById.get(id, userId)
        if (!current) return null
        const title = patch.title ?? current.title
        const project = patch.project ?? current.project
        const done = patch.done === undefined ? current.done : patch.done ? 1 : 0
        updateTask.run(title, project, done, id, userId)
        return toTask(taskById.get(id, userId))
      },
      remove: (userId, id) => deleteTask.run(id, userId).changes > 0,
    },
  }
}
