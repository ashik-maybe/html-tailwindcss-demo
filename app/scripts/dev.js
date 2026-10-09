// One command for two processes: the API (watch mode) and the Vite dev server.
// Dependency-free — Bun.spawn does the job, no `concurrently` needed.
const server = Bun.spawn(['bun', '--watch', 'server/index.js'], {
  stdio: ['inherit', 'inherit', 'inherit'],
})
const client = Bun.spawn(['bunx', 'vite'], { stdio: ['inherit', 'inherit', 'inherit'] })

const shutdown = () => {
  server.kill()
  client.kill()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

await Promise.all([server.exited, client.exited])
