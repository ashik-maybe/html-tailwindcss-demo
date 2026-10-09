import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

// One schema, applied on every boot with IF NOT EXISTS. For a project this size
// that IS the migration system: idempotent, no framework, easy to read. A real
// product would add a `migrations` table and versioned steps later.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  project    TEXT NOT NULL DEFAULT '',
  due        TEXT,
  done       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, done, id);
`

// A deliberately tiny migration helper: SQLite has no ADD COLUMN IF NOT EXISTS,
// so we ask for the table's columns and only alter when one is missing. `table`
// and `ddl` are internal constants (never request data), so this is safe.
function ensureColumn(db: Database, table: string, column: string, ddl: string) {
  const columns = db.query<{ name: string }, []>(`PRAGMA table_info(${table})`).all()
  if (!columns.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
}

// openDb returns a ready connection with the schema applied. Pass ':memory:' in
// tests for a throwaway database that never touches disk.
export function openDb(path: string = process.env.DB_PATH ?? 'data/app.db'): Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path, { create: true })
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec(SCHEMA)
  ensureColumn(db, 'tasks', 'due', 'due TEXT') // add `due` to pre-existing DBs
  return db
}
