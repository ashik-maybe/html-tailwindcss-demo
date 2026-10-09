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
  done: boolean
  createdAt: string
}

export type TaskInput = {
  title: string
  project: string
}

export type TaskPatch = Partial<Pick<Task, 'title' | 'project' | 'done'>>

export type Filter = 'all' | 'active' | 'done'
