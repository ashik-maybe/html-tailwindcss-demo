import { requireAuth } from './auth.js'

// REST surface for tasks. Every route sits behind requireAuth, and every store
// call is scoped by the logged-in user's id — so "not found" and "not yours"
// are the same 404, and one user can never touch another's rows.
export function registerTaskRoutes(app, store) {
  app.get('/api/tasks', requireAuth(store), (c) => {
    return c.json({ tasks: store.tasks.list(c.get('user').id) })
  })

  app.post('/api/tasks', requireAuth(store), async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const title = String(body.title ?? '').trim()
    if (!title) return c.json({ error: 'Title is required' }, 400)

    const project = String(body.project ?? '').trim()
    const task = store.tasks.create(c.get('user').id, { title, project })
    return c.json({ task }, 201)
  })

  app.patch('/api/tasks/:id', requireAuth(store), async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const patch = {}
    if (body.title !== undefined) {
      const title = String(body.title).trim()
      if (!title) return c.json({ error: 'Title cannot be empty' }, 400)
      patch.title = title
    }
    if (body.project !== undefined) patch.project = String(body.project).trim()
    if (body.done !== undefined) patch.done = Boolean(body.done)

    const task = store.tasks.update(c.get('user').id, Number(c.req.param('id')), patch)
    if (!task) return c.json({ error: 'Task not found' }, 404)
    return c.json({ task })
  })

  app.delete('/api/tasks/:id', requireAuth(store), (c) => {
    const removed = store.tasks.remove(c.get('user').id, Number(c.req.param('id')))
    if (!removed) return c.json({ error: 'Task not found' }, 404)
    return c.body(null, 204)
  })
}
