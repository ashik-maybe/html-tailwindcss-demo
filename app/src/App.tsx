import { useEffect, useState } from 'react'
import { api } from './api'
import type { User } from './types'
import AuthScreen from './components/AuthScreen'
import TaskScreen from './components/TaskScreen'

// Top level = "who am I?" It asks the API once on load (the httpOnly cookie
// travels automatically), then shows either the auth screen or the task board.
export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null)) // 401 just means "not signed in yet"
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main className="grid min-h-full place-items-center bg-gray-50">
        <p className="text-sm text-gray-500" role="status">
          Loading…
        </p>
      </main>
    )
  }

  if (!user) return <AuthScreen onAuth={setUser} />
  return <TaskScreen user={user} onLogout={() => setUser(null)} />
}
