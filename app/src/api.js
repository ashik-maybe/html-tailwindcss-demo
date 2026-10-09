// Thin fetch wrapper. `credentials: 'include'` sends the session cookie, and
// non-2xx responses throw an Error carrying the server's message so callers can
// show it. Every API call in the app goes through here. (stub — real UI next)
const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: body ? JSON_HEADERS : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(data.error ?? `Request failed (${res.status})`)
    error.status = res.status
    throw error
  }
  return data
}

export const api = {
  me: () => request('GET', '/api/auth/me'),
  register: (email, password) => request('POST', '/api/auth/register', { email, password }),
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  logout: () => request('POST', '/api/auth/logout'),
  listTasks: () => request('GET', '/api/tasks'),
  createTask: (input) => request('POST', '/api/tasks', input),
  updateTask: (id, patch) => request('PATCH', `/api/tasks/${id}`, patch),
  deleteTask: (id) => request('DELETE', `/api/tasks/${id}`),
}
