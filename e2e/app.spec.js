import { test, expect } from '@playwright/test'

// -----------------------------------------------------------------------------
// Routing — hash URLs, nav clicks, deep links and Back/Forward
// -----------------------------------------------------------------------------
test('boots on the landing view', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#view h1')).toContainText('Ship beautiful UIs')
})

test('nav click updates the hash and the view', async ({ page }) => {
  await page.goto('/')
  await page.locator('nav [data-view="table"]').click()

  await expect(page).toHaveURL(/#\/table$/)
  await expect(page.locator('#view h1')).toContainText('Team members')
})

test('Back returns to the previous view', async ({ page }) => {
  await page.goto('/')
  await page.locator('nav [data-view="table"]').click()
  await expect(page).toHaveURL(/#\/table$/)

  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('#view h1')).toContainText('Ship beautiful UIs')
})

test('deep link renders the requested view', async ({ page }) => {
  await page.goto('/#/components')
  await expect(page.locator('#view h1')).toContainText('Overlays')
})

test('unknown deep link falls back to landing', async ({ page }) => {
  await page.goto('/#/not-a-real-view')
  await expect(page.locator('#view h1')).toContainText('Ship beautiful UIs')
})

// -----------------------------------------------------------------------------
// Data table — search + clear round-trip
// -----------------------------------------------------------------------------
test('table search filters rows, and the empty state clears them', async ({ page }) => {
  await page.goto('/#/table')

  const rows = page.locator('[data-table-rows] tr')
  const count = page.locator('[data-table-count]')
  const search = page.locator('[data-table-search]')

  await expect(rows).toHaveCount(8) // 8 per page of 42
  await expect(count).toContainText('Showing 1–8 of 42 members')

  await search.fill('ada')
  await expect(rows).toHaveCount(1)
  await expect(count).toContainText('filtered from 42')

  await search.fill('zzzzz') // no match → empty state + Clear filters button
  await expect(page.locator('#table-empty')).toBeVisible()
  await expect(page.locator('#table-empty')).toContainText('No members match')

  await page.locator('[data-table-clear]').click()
  await expect(search).toHaveValue('')
  await expect(rows).toHaveCount(8)
  await expect(count).toContainText('Showing 1–8 of 42 members')
})

// -----------------------------------------------------------------------------
// Command palette — ⌘/Ctrl+K, type, Enter navigates (and updates the URL)
// -----------------------------------------------------------------------------
test('command palette navigates to the chosen view', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+k')

  const palette = page.locator('#palette')
  await expect(palette).toBeVisible()

  await page.keyboard.type('table')
  await page.keyboard.press('Enter')

  await expect(palette).toBeHidden()
  await expect(page).toHaveURL(/#\/table$/)
  await expect(page.locator('#view h1')).toContainText('Team members')
})

// -----------------------------------------------------------------------------
// Dark mode — toggles the class on <html> and persists across reloads
// -----------------------------------------------------------------------------
test('theme toggle flips dark mode and persists', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')

  await expect(html).not.toHaveClass(/dark/)
  await page.locator('#theme-toggle').click()
  await expect(html).toHaveClass(/dark/)

  await page.reload()
  await expect(html).toHaveClass(/dark/)
})

// -----------------------------------------------------------------------------
// Learning track — the sidebar link leaves the SPA for the standalone hub
// -----------------------------------------------------------------------------
test('learning link opens the standalone lessons hub', async ({ page }) => {
  await page.goto('/')
  await page.locator('#sidebar a[href="./src/learning/index.html"]').click()

  await expect(page).toHaveURL(/\/src\/learning\/index\.html$/)
  await expect(page.locator('h1')).toContainText('Learn HTML')
})

// -----------------------------------------------------------------------------
// Live Data — all four request states, with the API mocked for determinism
// -----------------------------------------------------------------------------
const USERS = ['Ada', 'Alan', 'Grace', 'Edsger', 'Barbara'].map((firstName, i) => ({
  id: i + 1,
  firstName,
  lastName: 'Tester',
  email: `${firstName.toLowerCase()}@example.com`,
  age: 30 + i,
}))

async function mockApi(page) {
  await page.route('**://dummyjson.com/**', (route) => {
    const url = route.request().url()
    if (url.includes('does-not-exist')) {
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
    }
    const users = url.includes('limit=0') ? [] : USERS
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ users }),
    })
  })
}

test('live data shows a success state', async ({ page }) => {
  await mockApi(page)
  await page.goto('/#/api')
  await page.locator('[data-live-load]').click()

  await expect(page.locator('[data-live-out]')).toContainText('Loaded 5 users from the API.')
  await expect(page.locator('[data-live-out] li')).toHaveCount(5)
})

test('live data shows an empty state', async ({ page }) => {
  await mockApi(page)
  await page.goto('/#/api')
  await page.locator('[data-live-mode]').selectOption('empty')
  await page.locator('[data-live-load]').click()

  await expect(page.locator('[data-live-out]')).toContainText('No users returned')
})

test('live data shows an error state with retry', async ({ page }) => {
  await mockApi(page)
  await page.goto('/#/api')
  await page.locator('[data-live-mode]').selectOption('error')
  await page.locator('[data-live-load]').click()

  await expect(page.locator('[data-live-out]')).toContainText("Couldn't load users")
  await expect(page.locator('[data-live-out] button', { hasText: 'Retry' })).toBeVisible()
})
