import { useEffect, useState } from 'react'

// Scaffold: proves the client and API are wired. Replaced by the real task UI.
export default function App() {
  const [health, setHealth] = useState('checking…')

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setHealth(d.ok ? 'API connected' : 'API error'))
      .catch(() => setHealth('API unreachable'))
  }, [])

  return (
    <main className="grid min-h-full place-items-center bg-gray-50 p-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Task Manager</h1>
        <p className="mt-2 text-sm text-gray-500">{health}</p>
      </div>
    </main>
  )
}
