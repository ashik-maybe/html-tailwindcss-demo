// API shapes as the client sees them. These mirror the server's `types.ts`
// (same JSON), kept separate so the browser bundle never imports server code.
export type User = {
  id: number
  email: string
}

export type Task = {
  id: number
  title: string
  project: string
  due: string | null
  done: boolean
  createdAt: string
}

export type TaskInput = {
  title: string
  project: string
  due: string | null
}

export type TaskPatch = Partial<Pick<Task, 'title' | 'project' | 'due' | 'done'>>

export type Filter = 'all' | 'active' | 'done'

export type SortKey = 'created' | 'due' | 'title'
