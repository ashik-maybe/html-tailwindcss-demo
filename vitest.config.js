// Vitest config. The extracted helpers in src/lib/ are pure (no DOM), so the
// default Node environment is enough and tests run in milliseconds.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
})
