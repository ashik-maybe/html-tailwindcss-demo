import { test, expect, type Page } from '@playwright/test'

// Each test registers a brand-new user, so the shared e2e DB never causes
// collisions and tests can run in parallel.
const uniqueEmail = () =>
  `user-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`

async function signUp(page: Page, email: string, password = 'password123') {
  await page.goto('/')
  await page.getByRole('button', { name: /Need an account/ }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()
}

test('register, add, complete, filter, delete, sign out', async ({ page }) => {
  await signUp(page, uniqueEmail())
  await expect(page.getByText('No tasks yet')).toBeVisible()

  await page.getByLabel('New task title').fill('Ship Phase C')
  await page.getByLabel('New task project').fill('app')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText('Ship Phase C')).toBeVisible()

  // Complete it → it moves to the Done filter.
  await page.getByRole('checkbox').click()
  await expect(page.getByRole('checkbox', { name: /as not done/ })).toBeVisible()
  await page.getByRole('button', { name: /^Done \(1\)/ }).click()
  await expect(page.getByText('Ship Phase C')).toBeVisible()
  await page.getByRole('button', { name: /^Active \(0\)/ }).click()
  await expect(page.getByText('Nothing here')).toBeVisible()

  // Delete it → back to the empty state.
  await page.getByRole('button', { name: /^All \(1\)/ }).click()
  await page.getByRole('button', { name: /Delete "Ship Phase C"/ }).click()
  await expect(page.getByText('No tasks yet')).toBeVisible()

  // Sign out → back to the auth screen.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})

test('session and tasks survive a reload', async ({ page }) => {
  await signUp(page, uniqueEmail())
  await page.getByLabel('New task title').fill('Persisted task')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText('Persisted task')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()
  await expect(page.getByText('Persisted task')).toBeVisible()
})

test('users only ever see their own tasks', async ({ page }) => {
  await signUp(page, uniqueEmail())
  await page.getByLabel('New task title').fill('Private task')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText('Private task')).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()

  await signUp(page, uniqueEmail())
  await expect(page.getByText('No tasks yet')).toBeVisible()
  await expect(page.getByText('Private task')).toHaveCount(0)
})

test('a wrong password shows an error', async ({ page }) => {
  const email = uniqueEmail()
  await signUp(page, email)
  await page.getByRole('button', { name: 'Sign out' }).click()

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('definitely-wrong')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('Incorrect email or password')
})

test('edits a task inline, and Escape cancels', async ({ page }) => {
  await signUp(page, uniqueEmail())
  await page.getByLabel('New task title').fill('Old title')
  await page.getByLabel('New task project').fill('old-project')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText('Old title')).toBeVisible()

  await page.getByRole('button', { name: 'Edit "Old title"' }).click()
  await page.getByLabel('Edit task title').fill('New title')
  await page.getByLabel('Edit task project').fill('new-project')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('New title')).toBeVisible()
  await expect(page.getByText('new-project')).toBeVisible()
  await expect(page.getByText('Old title')).toHaveCount(0)

  // Escape closes edit mode without saving.
  await page.getByRole('button', { name: 'Edit "New title"' }).click()
  await page.getByLabel('Edit task title').fill('Discarded')
  await page.getByLabel('Edit task title').press('Escape')
  await expect(page.getByText('New title')).toBeVisible()
  await expect(page.getByText('Discarded')).toHaveCount(0)
})

test('a task shows its due date', async ({ page }) => {
  await signUp(page, uniqueEmail())
  await page.getByLabel('New task title').fill('Pay rent')
  await page.getByLabel('New task due date').fill('2030-01-15')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText(/Due\b.*15/)).toBeVisible()
})

test('search narrows the list by title or project', async ({ page }) => {
  await signUp(page, uniqueEmail())
  const add = async (title: string, project: string) => {
    await page.getByLabel('New task title').fill(title)
    await page.getByLabel('New task project').fill(project)
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText(title)).toBeVisible()
  }
  await add('Alpha report', 'work')
  await add('Beta chores', 'home')

  const search = page.getByLabel('Search tasks')
  await search.fill('alpha') // matches a title
  await expect(page.getByText('Alpha report')).toBeVisible()
  await expect(page.getByText('Beta chores')).toHaveCount(0)

  await search.fill('home') // matches a project
  await expect(page.getByText('Beta chores')).toBeVisible()
  await expect(page.getByText('Alpha report')).toHaveCount(0)

  await page.getByRole('button', { name: 'Clear search' }).click()
  await expect(page.getByText('Alpha report')).toBeVisible()
  await expect(page.getByText('Beta chores')).toBeVisible()
})

test('clears completed tasks in one action', async ({ page }) => {
  await signUp(page, uniqueEmail())
  const add = async (title: string) => {
    await page.getByLabel('New task title').fill(title)
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText(title)).toBeVisible()
  }
  await add('Keep this')
  await add('Finish this')

  await page.getByRole('checkbox', { name: /Finish this/ }).click()
  await page.getByRole('button', { name: /Clear completed/ }).click()

  await expect(page.getByText('Finish this')).toHaveCount(0)
  await expect(page.getByText('Keep this')).toBeVisible()
  await expect(page.getByRole('button', { name: /Clear completed/ })).toHaveCount(0)
})

test('sorts by title and by due date', async ({ page }) => {
  await signUp(page, uniqueEmail())
  const add = async (title: string, due: string) => {
    await page.getByLabel('New task title').fill(title)
    await page.getByLabel('New task due date').fill(due)
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText(title)).toBeVisible()
  }
  await add('Alpha', '2030-02-01') // alphabetically first, due later
  await add('Bravo', '2030-01-01') // alphabetically second, due sooner

  await page.getByLabel('Sort tasks').selectOption('title')
  await expect(page.locator('li p').nth(0)).toHaveText('Alpha')
  await expect(page.locator('li p').nth(1)).toHaveText('Bravo')

  await page.getByLabel('Sort tasks').selectOption('due')
  await expect(page.locator('li p').nth(0)).toHaveText('Bravo')
  await expect(page.locator('li p').nth(1)).toHaveText('Alpha')

  // Completed tasks sink to the bottom whatever the sort key.
  await page.getByRole('checkbox', { name: /Alpha/ }).click()
  await expect(page.locator('li p').nth(0)).toHaveText('Bravo')
  await expect(page.locator('li p').nth(1)).toHaveText('Alpha')
})
