import type { Task, TaskInput, TaskPatch, User } from './types'

// Thin fetch wrapper. `credentials: 'include'` sends the session cookie, and
// non-2xx responses throw an ApiError carrying the server's message so callers
// can show it. Every API call in the app goes through here.
const JSON_HEADERS = { 'Content-Type': 'application/json' }

/** An error the API returned; `status` is the HTTP status code. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: body ? JSON_HEADERS : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null as T
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status)
  return data as T
}

export const api = {
  me: () => request<{ user: User }>('GET', '/api/auth/me'),
  register: (email: string, password: string) =>
    request<{ user: User }>('POST', '/api/auth/register', { email, password }),
  login: (email: string, password: string) =>
    request<{ user: User }>('POST', '/api/auth/login', { email, password }),
  logout: () => request<null>('POST', '/api/auth/logout'),
  listTasks: () => request<{ tasks: Task[] }>('GET', '/api/tasks'),
  createTask: (input: TaskInput) => request<{ task: Task }>('POST', '/api/tasks', input),
  updateTask: (id: number, patch: TaskPatch) =>
    request<{ task: Task }>('PATCH', `/api/tasks/${id}`, patch),
  deleteTask: (id: number) => request<null>('DELETE', `/api/tasks/${id}`),
}
