import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Run tests with: npx playwright test
 * Run with UI: npx playwright test --ui
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* Run tests in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI for stability */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  /* Shared settings for all projects */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.BASE_URL || 'http://localhost:3001',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    /* Desktop Chromium */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    /* Desktop WebKit (Safari) - Optional, may have dependency issues in CI */
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Mobile viewport - iPhone 12 */
    {
      name: 'mobile-chrome',
      use: { ...devices['iPhone 12'] },
    },

    /* Mobile viewport - iPhone 12 Safari */
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run local dev server before starting the tests (disabled - use docker compose) */
  // webServer: {
  //   command: 'docker compose up -d',
  //   url: 'http://localhost:3001',
  //   reuseExistingServer: !process.env.CI,
  // },
});
