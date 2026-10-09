import { describe, test, expect, beforeEach } from 'bun:test'
import { openDb } from '../server/db.js'
import { createStore } from '../server/store.js'
import { createApp } from '../server/app.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

describe('tasks API', () => {
  let app
  let cookie

  beforeEach(async () => {
    app = createApp({ store: createStore(openDb(':memory:')) })
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: 'a@example.com', password: 'password123' }),
    })
    cookie = (res.headers.get('set-cookie') ?? '').split(';')[0]
  })

  const authed = (path, init = {}) =>
    app.request(path, { ...init, headers: { ...init.headers, cookie } })
  const createTask = (body) =>
    authed('/api/tasks', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) })

  test('rejects unauthenticated requests', async () => {
    expect((await app.request('/api/tasks')).status).toBe(401)
    const post = await app.request('/api/tasks', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ title: 'x' }),
    })
    expect(post.status).toBe(401)
  })

  test('creates and lists tasks', async () => {
    const created = await createTask({ title: 'Buy milk', project: 'home' })
    expect(created.status).toBe(201)
    const { task } = await created.json()
    expect(task).toMatchObject({ title: 'Buy milk', project: 'home', done: false })

    const { tasks } = await (await authed('/api/tasks')).json()
    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toBe(task.id)
  })

  test('requires a non-empty title', async () => {
    expect((await createTask({ title: '   ' })).status).toBe(400)
  })

  test('updates done and title', async () => {
    const { task } = await (await createTask({ title: 'Task' })).json()
    const patched = await authed(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({ done: true, title: 'Task done' }),
    })
    expect(patched.status).toBe(200)
    expect((await patched.json()).task).toMatchObject({ title: 'Task done', done: true })
  })

  test('delete returns 204, then 404 for the same id', async () => {
    const { task } = await (await createTask({ title: 'Task' })).json()
    expect((await authed(`/api/tasks/${task.id}`, { method: 'DELETE' })).status).toBe(204)
    expect((await authed(`/api/tasks/${task.id}`, { method: 'DELETE' })).status).toBe(404)
  })

  test('one user cannot touch another user’s task', async () => {
    const { task } = await (await createTask({ title: 'Mine' })).json()

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: 'b@example.com', password: 'password123' }),
    })
    const cookieB = (res.headers.get('set-cookie') ?? '').split(';')[0]
    const asB = (path, init = {}) =>
      app.request(path, { ...init, headers: { ...init.headers, cookie: cookieB } })

    const patch = await asB(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({ done: true }),
    })
    expect(patch.status).toBe(404) // not 403 — don't reveal the row exists
    expect((await asB(`/api/tasks/${task.id}`, { method: 'DELETE' })).status).toBe(404)
    expect((await (await asB('/api/tasks')).json()).tasks).toHaveLength(0)
  })
})
