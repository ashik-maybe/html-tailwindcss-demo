import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev: Vite serves the React client on 5180 and proxies /api to the Bun API on
// 5181, so the browser sees one origin (cookies "just work", no CORS config).
// API_URL lets the e2e run point the proxy at its own throwaway API instead.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:5181',
    },
  },
})
