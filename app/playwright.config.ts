import { defineConfig, devices } from '@playwright/test'

// Two servers: the Bun API (4181) and the Vite client (4180, which proxies
// /api). Playwright starts both. Tests use a throwaway SQLite file so the
// suite never touches your dev data.
export default defineConfig({
  testDir: './e2e',
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4180',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'bun server/index.ts',
      env: { DB_PATH: 'data/e2e.db', PORT: '4181' },
      url: 'http://localhost:4181/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'bunx vite --port 4180 --strictPort',
      env: { API_URL: 'http://localhost:4181' },
      url: 'http://localhost:4180',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})
