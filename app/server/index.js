import { serveStatic } from 'hono/bun'
import { createApp } from './app.js'

const app = createApp()

// In production the same Bun process serves the built React client, so one
// `bun run start` gives you API + UI on one port. In dev, Vite serves the UI
// and proxies /api here.
if (process.env.NODE_ENV === 'production') {
  app.use('*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

const port = Number(process.env.PORT ?? 5181)
console.log(`API listening on http://localhost:${port}`)

export default { port, fetch: app.fetch }
