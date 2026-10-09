import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev: Vite serves the React client on 5180 and proxies /api to the Bun API on
// 5181, so the browser sees one origin (cookies "just work", no CORS config).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    proxy: {
      '/api': 'http://localhost:5181',
    },
  },
})
