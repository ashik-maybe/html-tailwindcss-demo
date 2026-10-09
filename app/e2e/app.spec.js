import { test, expect } from '@playwright/test'

// Each test registers a brand-new user, so the shared e2e DB never causes
// collisions and tests can run in parallel.
const uniqueEmail = () =>
  `user-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`

async function signUp(page, email, password = 'password123') {
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
