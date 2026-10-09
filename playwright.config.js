// Playwright config — end-to-end tests against a real browser.
//
// The app is a vanilla SPA, so e2e is where the interesting behaviour lives:
// routing, delegation, the table, the palette, dark mode and the live-fetch
// view. Tests run against the Vite dev server, which Playwright starts for us.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // no accidental test.only in CI
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5199',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bunx vite --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
