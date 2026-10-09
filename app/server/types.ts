// Shared shapes. SQLite stores `done` as 0/1 and snake_case columns; the API
// speaks booleans and camelCase. These types make that boundary explicit.

/** A row exactly as it comes back from the `users` table (password included). */
export type UserRow = {
  id: number
  email: string
  password_hash: string
  created_at: string
}

/** A user without the password hash. */
export type User = {
  id: number
  email: string
  created_at: string
}

/** What we ever send to a client about a user — never the hash. */
export type PublicUser = {
  id: number
  email: string
}

export type SessionRow = {
  id: string
  user_id: number
  expires_at: string
}

export type TaskRow = {
  id: number
  user_id: number
  title: string
  project: string
  done: number
  created_at: string
}

/** A task as the API represents it (boolean `done`, camelCase `createdAt`). */
export type Task = {
  id: number
  title: string
  project: string
  done: boolean
  createdAt: string
}

/** Hono context: routes that run behind requireAuth can read `c.get('user')`. */
export type AppEnv = {
  Variables: {
    user: PublicUser
  }
}
