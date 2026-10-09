// ESLint flat config (ESLint v9+). One array, no extends magic.
//
// WHY flat config: it is plain JavaScript, so globals and file scopes are just
// data — no plugin-name string lookups, no legacy .eslintrc inheritance rules.
import js from '@eslint/js'
import globals from 'globals'

export default [
  // Never lint build output or generated test artifacts.
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      // app/ is a separate package with its own eslint.config.js (JSX/React).
      'app/**',
    ],
  },

  // Baseline recommended rules for every JS file.
  js.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // The app runs in a browser; config/build scripts run in Node. Declaring
      // both sets of globals here keeps one config for the whole repo.
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Unused args are fine when named `_` (intentional placeholders).
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
]
