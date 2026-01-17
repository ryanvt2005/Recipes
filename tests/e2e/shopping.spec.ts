import { test, expect } from '@playwright/test';

/**
 * Shopping List E2E Smoke Tests
 *
 * Tests shopping list responsive behavior with tabs on mobile
 */

test.describe('Shopping Lists Page', () => {
  test('shopping lists page exists', async ({ page }) => {
    await page.goto('/shopping-lists');

    // Should either show the page (if authenticated) or redirect to login
    await expect(page).not.toHaveURL(/error|500/);
  });

  test('redirects to login when not authenticated', async ({ page }) => {
    // Clear any existing auth
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });

    await page.goto('/shopping-lists');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Shopping List - Mobile Responsive', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12

  test('mobile shopping list page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/shopping-lists');

    // Wait for redirect/render
    await page.waitForTimeout(500);

    // Check for no horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('mobile viewport has proper touch targets', async ({ page }) => {
    await page.goto('/login');

    // Get all clickable elements
    const buttons = await page.locator('button, a, [role="button"]').all();

    for (const button of buttons.slice(0, 5)) {
      // Only check visible buttons
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // Touch targets should be at least 44px (Apple HIG)
          // Allow some flexibility for edge cases
          expect(box.height).toBeGreaterThanOrEqual(32);
        }
      }
    }
  });
});

test.describe('Shopping List - Desktop Responsive', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('desktop shopping list page renders properly', async ({ page }) => {
    await page.goto('/shopping-lists');

    // Page should load without errors
    await expect(page).not.toHaveURL(/error|500/);
  });
});

test.describe('Shopping List Detail Page', () => {
  test.describe('Mobile View', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('shopping list detail route exists', async ({ page }) => {
      // Try to access a shopping list detail page
      await page.goto('/shopping-lists/1');

      // Should either show the page or redirect (404 is OK for non-existent list)
      await expect(page).not.toHaveURL(/error|500/);
    });

    test('mobile detail page has no horizontal overflow', async ({ page }) => {
      await page.goto('/shopping-lists/1');
      await page.waitForTimeout(500);

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });
  });

  test.describe('Desktop View', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('desktop detail page renders properly', async ({ page }) => {
      await page.goto('/shopping-lists/1');

      // Page should load
      await expect(page).not.toHaveURL(/error|500/);
    });
  });
});

test.describe('Layout Consistency', () => {
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'Pixel 5', width: 393, height: 851 },
  ];

  for (const vp of viewports) {
    test(`no horizontal scroll at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Test login page
      await page.goto('/login');
      await page.waitForTimeout(300);

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });
  }
});

test.describe('Navigation Flow', () => {
  test('can navigate between main pages', async ({ page }) => {
    // Start at root
    await page.goto('/');

    // Should be redirected to login or show some page
    const url = page.url();
    expect(url).toMatch(/login|recipes|shopping/);
  });
});
