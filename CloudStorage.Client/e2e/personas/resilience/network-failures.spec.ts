import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Resilience: Network Failure Handling', () => {

  test('should show offline warning and handle reconnections', async ({ page, context, regularUserAuth }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    const fileListSnippet = page.locator('div[data-testid^="file-item-"]');
    await fileListSnippet.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    // Go offline
    console.log('🌐 Status: Simulating network disconnection...');
    await context.setOffline(true);

    // Try to perform an action (like refresh or search)
    // The app should show a notification or indicator
    const searchInput = page.locator('[data-testid="contextual-search-input"]').first();
    if (await searchInput.isVisible()) {
        await searchInput.fill('offline-test');
    }
    
    // Check for offline indicator (if implemented) or failure toast
    // Assuming the app has a toast or alert for connection issues
    await expect(page.locator('body')).toContainText(/offline|connection/i, { timeout: 15000 });

    // Go back online
    console.log('🌐 Status: Restoring network connection...');
    await context.setOffline(false);

    // App should recover
    await page.reload();
    await expect(page.locator('div[data-testid^="file-item-"]').first()).toBeVisible({ timeout: 15000 });
  });
});
