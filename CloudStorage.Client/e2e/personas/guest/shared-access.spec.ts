import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Guest Persona: Shared Content Access', () => {
  
  test('should access shared files view as guest', async ({ page, guestUserAuth }) => {
    // Navigate to the /shared route
    await page.goto('/shared');
    await expect(page.locator('h1')).toContainText(/shared/i);
    
    // Check for "No shared items" message (assuming guest-seeded-user has none) 
    // or just that the page loaded correctly.
    await expect(page.locator('body')).not.toContainText(/access denied/i);
    await expect(page.locator('body')).not.toContainText(/403/);
  });
});
