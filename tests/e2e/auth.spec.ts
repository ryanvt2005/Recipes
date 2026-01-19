import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Smoke Tests
 *
 * Tests login flow and authentication state management
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
  });

  test('should display login page for unauthenticated users', async ({ page }) => {
    await page.goto('/login');

    // Verify login form is displayed
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /log in|sign in/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Enter invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit form
    await page.getByRole('button', { name: /log in|sign in/i }).click();

    // Verify error message appears
    await expect(page.getByText(/incorrect|invalid|error/i)).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Try to access protected recipes page
    await page.goto('/recipes');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing protected shopping lists without auth', async ({ page }) => {
    // Try to access protected shopping lists page
    await page.goto('/shopping-lists');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page should have proper form validation', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    await page.getByRole('button', { name: /log in|sign in/i }).click();

    // Verify validation - either HTML5 validation or custom error
    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());

    // Email should be required
    expect(isInvalid).toBe(true);
  });

  test('should have accessible form inputs with proper labels', async ({ page }) => {
    await page.goto('/login');

    // Check for accessible labels (either label elements or aria-label)
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    // Inputs should be accessible
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Inputs should have accessible names
    const emailAccessibleName = await emailInput.getAttribute('aria-label') ||
      await emailInput.evaluate((el) => (el as HTMLInputElement).labels?.[0]?.textContent);
    const passwordAccessibleName = await passwordInput.getAttribute('aria-label') ||
      await passwordInput.evaluate((el) => (el as HTMLInputElement).labels?.[0]?.textContent);

    expect(emailAccessibleName || await emailInput.getAttribute('placeholder')).toBeTruthy();
    expect(passwordAccessibleName || await passwordInput.getAttribute('placeholder')).toBeTruthy();
  });
});

test.describe('Registration', () => {
  test('should display registration page', async ({ page }) => {
    await page.goto('/register');

    // Verify registration form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /register|sign up|create/i })).toBeVisible();
  });

  test('should have link to login page', async ({ page }) => {
    await page.goto('/register');

    // Should have a link to login
    const loginLink = page.getByRole('link', { name: /log in|sign in|already have/i });
    await expect(loginLink).toBeVisible();
  });
});
