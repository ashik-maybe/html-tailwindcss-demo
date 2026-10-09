import { describe, test, expect, beforeEach } from 'bun:test'
import { openDb } from '../server/db'
import { createStore, type Store } from '../server/store'

describe('store', () => {
  let store: Store

  beforeEach(() => {
    store = createStore(openDb(':memory:')) // fresh throwaway DB per test
  })

  test('creates a user and finds it by email', () => {
    const created = store.users.create('a@example.com', 'hash')
    expect(created!.id).toBeNumber()
    expect(store.users.findByEmail('a@example.com')!.password_hash).toBe('hash')
    expect(store.users.findById(created!.id)!.email).toBe('a@example.com')
  })

  test('rejects a duplicate email (UNIQUE constraint)', () => {
    store.users.create('a@example.com', 'hash')
    expect(() => store.users.create('a@example.com', 'hash')).toThrow()
  })

  test('sessions round-trip and can be removed', () => {
    const user = store.users.create('a@example.com', 'hash')!
    store.sessions.create('sid-1', user.id, '2999-01-01 00:00:00')
    expect(store.sessions.find('sid-1')!.user_id).toBe(user.id)
    store.sessions.remove('sid-1')
    expect(store.sessions.find('sid-1')).toBeNull()
  })

  test('task CRUD round-trip', () => {
    const user = store.users.create('a@example.com', 'hash')!
    const task = store.tasks.create(user.id, { title: 'Write tests', project: 'app' })
    expect(task).toMatchObject({ title: 'Write tests', project: 'app', done: false })

    const updated = store.tasks.update(user.id, task.id, { done: true })!
    expect(updated.done).toBe(true)
    expect(store.tasks.get(user.id, task.id)!.done).toBe(true)

    expect(store.tasks.remove(user.id, task.id)).toBe(true)
    expect(store.tasks.get(user.id, task.id)).toBeNull()
  })

  test('tasks are scoped to their owner', () => {
    const alice = store.users.create('a@example.com', 'hash')!
    const bob = store.users.create('b@example.com', 'hash')!
    const task = store.tasks.create(alice.id, { title: 'Secret plans' })

    expect(store.tasks.list(alice.id)).toHaveLength(1)
    expect(store.tasks.list(bob.id)).toHaveLength(0)
    expect(store.tasks.get(bob.id, task.id)).toBeNull()
    // Bob cannot mutate Alice's task — the WHERE user_id guard makes it a no-op.
    expect(store.tasks.update(bob.id, task.id, { title: 'hacked' })).toBeNull()
    expect(store.tasks.get(alice.id, task.id)!.title).toBe('Secret plans')
    expect(store.tasks.remove(bob.id, task.id)).toBe(false)
  })

  test('tasks sort unfinished first, newest first', () => {
    const user = store.users.create('a@example.com', 'hash')!
    const first = store.tasks.create(user.id, { title: 'First' })
    const second = store.tasks.create(user.id, { title: 'Second' })
    store.tasks.update(user.id, first.id, { done: true })

    expect(store.tasks.list(user.id).map((t) => t.id)).toEqual([second.id, first.id])
  })

  test('stores a due date and can clear it', () => {
    const user = store.users.create('a@example.com', 'hash')!
    const task = store.tasks.create(user.id, { title: 'Ship', due: '2026-03-05' })
    expect(task.due).toBe('2026-03-05')
    expect(store.tasks.update(user.id, task.id, { due: null })!.due).toBeNull()
  })
})
