import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page before each test
    await page.goto('/auth/login');
  });

  test('should show validation errors when fields are empty', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();
    
    await page.locator('#identifier').focus();
    await page.locator('#password').focus();
    await page.locator('#identifier').focus(); // Trigger blur on password
    
    await expect(page.getByText('Required')).toHaveCount(2);
  });

  test('should successfully log in with valid credentials (mocked)', async ({ page }) => {
    // Mock the login API response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Login successful',
          data: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            user: {
              id: 'u1',
              username: 'testuser',
              email: 'test@example.com'
            }
          }
        })
      });
    });

    // Fill the form
    await page.fill('#identifier', 'testuser');
    await page.fill('#password', 'password123');
    
    // Click login
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Check if user data is in localStorage
    const userData = await page.evaluate(() => localStorage.getItem('user_data'));
    expect(userData).toContain('testuser');
  });

  test('should show error message on failed login (mocked)', async ({ page }) => {
    // Mock a failed login response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Invalid credentials provided.'
        })
      });
    });

    await page.fill('#identifier', 'wronguser');
    await page.fill('#password', 'wrongpass');
    await page.click('button[type="submit"]');

    // Should show error message
    const errorMsg = page.locator('.text-rose-500');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText('Invalid credentials');
  });

  test('should log out successfully', async ({ page }) => {
    // First, set up a logged-in state (mocking localStorage)
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-token');
      window.localStorage.setItem('user_data', JSON.stringify({ id: 'u1', username: 'TESTRUNNER' }));
    });

    await page.goto('/dashboard');
    
    // Check if we are actually on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Open profile menu
    await page.click('button:has-text("TESTRUNNER")');
    
    // Click logout (Terminate_Session)
    await page.click('button:has-text("Terminate_Session")');

    // Should redirect back to login
    await expect(page).toHaveURL(/\/auth\/login/);
    
    // Local storage should be cleared
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });
});
