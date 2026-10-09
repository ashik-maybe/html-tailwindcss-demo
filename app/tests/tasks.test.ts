import { describe, test, expect, beforeEach } from 'bun:test'
import { openDb } from '../server/db'
import { createStore } from '../server/store'
import { createApp } from '../server/app'
import type { Task } from '../server/types'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const cookieFrom = (res: Response) => (res.headers.get('set-cookie') ?? '').split(';')[0]

describe('tasks API', () => {
  let app: ReturnType<typeof createApp>
  let aliceCookie: string
  let bobCookie: string

  beforeEach(async () => {
    app = createApp({ store: createStore(openDb(':memory:')) })
    const signUp = async (email: string) => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ email, password: 'password123' }),
      })
      return cookieFrom(res)
    }
    aliceCookie = await signUp('alice@example.com')
    bobCookie = await signUp('bob@example.com')
  })

  const authed = (cookie: string, init: RequestInit = {}) => ({
    ...init,
    headers: { ...JSON_HEADERS, cookie, ...(init.headers ?? {}) },
  })

  const createTask = async (
    cookie: string,
    body: Record<string, unknown>,
  ): Promise<Response> => app.request('/api/tasks', authed(cookie, { method: 'POST', body: JSON.stringify(body) }))

  const listTasks = async (cookie: string): Promise<Task[]> => {
    const res = await app.request('/api/tasks', authed(cookie))
    return ((await res.json()) as { tasks: Task[] }).tasks
  }

  test('all task routes require auth', async () => {
    expect((await app.request('/api/tasks')).status).toBe(401)
    expect((await app.request('/api/tasks', { method: 'POST' })).status).toBe(401)
  })

  test('creates a task and lists it', async () => {
    const res = await createTask(aliceCookie, { title: 'Buy milk', project: 'errands' })
    expect(res.status).toBe(201)
    const { task } = (await res.json()) as { task: Task }
    expect(task).toMatchObject({ title: 'Buy milk', project: 'errands', done: false })

    const tasks = await listTasks(aliceCookie)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toBe(task.id)
  })

  test('rejects a blank title', async () => {
    expect((await createTask(aliceCookie, { title: '   ' })).status).toBe(400)
  })

  test('patches title, project and done', async () => {
    const { task } = (await (await createTask(aliceCookie, { title: 'Old' })).json()) as {
      task: Task
    }
    const res = await app.request(
      `/api/tasks/${task.id}`,
      authed(aliceCookie, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'New', done: true, project: 'home' }),
      }),
    )
    expect(res.status).toBe(200)
    const { task: updated } = (await res.json()) as { task: Task }
    expect(updated).toMatchObject({ title: 'New', project: 'home', done: true })
  })

  test('another user cannot see, patch or delete your task (404)', async () => {
    const { task } = (await (await createTask(aliceCookie, { title: 'Private' })).json()) as {
      task: Task
    }
    expect(await listTasks(bobCookie)).toHaveLength(0)
    expect(
      (await app.request(`/api/tasks/${task.id}`, authed(bobCookie, { method: 'DELETE' }))).status,
    ).toBe(404)
    expect(
      (
        await app.request(
          `/api/tasks/${task.id}`,
          authed(bobCookie, { method: 'PATCH', body: JSON.stringify({ done: true }) }),
        )
      ).status,
    ).toBe(404)
    expect((await listTasks(aliceCookie))[0].done).toBe(false)
  })

  test('deletes your own task', async () => {
    const { task } = (await (await createTask(aliceCookie, { title: 'Temp' })).json()) as {
      task: Task
    }
    const res = await app.request(`/api/tasks/${task.id}`, authed(aliceCookie, { method: 'DELETE' }))
    expect(res.status).toBe(204)
    expect(await listTasks(aliceCookie)).toHaveLength(0)
  })

  test('clears only your own completed tasks', async () => {
    const done = (await (await createTask(aliceCookie, { title: 'Done' })).json()) as {
      task: Task
    }
    await createTask(aliceCookie, { title: 'Open' })
    await app.request(
      `/api/tasks/${done.task.id}`,
      authed(aliceCookie, { method: 'PATCH', body: JSON.stringify({ done: true }) }),
    )

    const res = await app.request(
      '/api/tasks/completed',
      authed(aliceCookie, { method: 'DELETE' }),
    )
    expect(res.status).toBe(200)
    expect(((await res.json()) as { removed: number }).removed).toBe(1)
    const remaining = await listTasks(aliceCookie)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].title).toBe('Open')
  })
})
