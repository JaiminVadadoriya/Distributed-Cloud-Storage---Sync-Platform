import { test, expect } from '../../fixtures/auth.fixture';
import users from '../../data/users.json';

test.describe('Regular User Persona: Authentication Flow', () => {
  const user = users.regularUser;

  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/auth/login');
  });

  test('should successfully log in with real credentials', async ({ page }) => {
    // Fill in credentials
    await page.fill('[data-testid="login-identifier"]', user.username);
    await page.fill('[data-testid="login-password"]', user.password);
    
    // Click submit
    await page.click('[data-testid="login-submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify user data is in storage
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
  });

  test('should fail to log in with incorrect password', async ({ page }) => {
    await page.fill('[data-testid="login-identifier"]', user.username);
    await page.fill('[data-testid="login-password"]', 'WrongPassword123!');
    await page.click('[data-testid="login-submit"]');

    // Should stay on login and show error
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('body')).toContainText(/invalid/i);
  });

  test('should log out and clear session', async ({ page }) => {
    // Log in first
    await page.fill('[data-testid="login-identifier"]', user.username);
    await page.fill('[data-testid="login-password"]', user.password);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // Open profile menu and logout
    await page.click('[data-testid="profile-menu-trigger"]');
    await page.click('[data-testid="logout-btn"]');

    // Should be back at login
    await expect(page).toHaveURL(/.*login/);
    
    // Storage should be cleared
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });
});
