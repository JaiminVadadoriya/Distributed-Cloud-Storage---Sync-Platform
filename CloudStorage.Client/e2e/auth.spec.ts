import { test, expect } from './fixtures/auth.fixture';

test.describe('Authentication Flow', () => {
  test.setTimeout(60000); // Increase overall timeout
  test.beforeEach(async ({ page }) => {
    // Basic setup
    await page.setViewportSize({ width: 1440, height: 900 });

    // Ensure SignalR hubs don't hang the app - using the same robust mock as auth.fixture
    await page.route('**/hubs/**', async (route) => {
      const url = route.request().url();
      if (url.includes('negotiate')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            negotiateVersion: 1,
            connectionId: 'mock-connection',
            availableTransports: []
          })
        });
      } else {
        await route.abort();
      }
    });
    
    // Background noise and core API mocks
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('/api/auth/login')) {
        return route.continue(); // Let individual tests handle login specifically
      }
      
      // Default success for other API calls to reduce flakiness
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} })
      }).catch(() => {});
    });
  });

  test('should show validation errors when fields are empty', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');
    await page.click('[data-testid="login-submit"]', { force: true });

    // Check for native validation or custom error messages
    const identifier = page.locator('#identifier');
    const isInvalid = await identifier.evaluate((el: HTMLInputElement) => el.validity.valueMissing);
    expect(isInvalid).toBe(true);
  });

  test('should successfully log in with valid credentials (mocked)', async ({ page }) => {
    // Mock the login API response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            accessToken: 'mock-jwt-token',
            refreshToken: 'mock-refresh-token',
            user: { id: 'u1', username: 'TESTRUNNER', email: 'test@example.com', role: 'User' }
          }
        })
      });
    });

    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');
    
    await page.fill('[data-testid="login-identifier"]', 'TESTRUNNER');
    await page.fill('[data-testid="login-password"]', 'password123');
    
    // Use test-id and force click
    await page.click('[data-testid="login-submit"]', { force: true });

    // Should redirect to dashboard - significantly increased timeout
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
    
    // Check if token exists in local storage
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBe('mock-jwt-token');
  });

  test('should show error message on failed login (mocked)', async ({ page }) => {
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Invalid_Credentials_Node_Rejected'
        })
      });
    });

    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');
    
    await page.fill('[data-testid="login-identifier"]', 'wronguser');
    await page.fill('[data-testid="login-password"]', 'wrongpass');
    await page.click('[data-testid="login-submit"]', { force: true });

    // Check for error message in UI
    await expect(page.locator('body')).toContainText('Invalid_Credentials_Node_Rejected', { timeout: 15000 });
  });

  test('should log out successfully', async ({ page }) => {
    // Setup authenticated state
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-token');
      window.localStorage.setItem('user_data', JSON.stringify({ id: 'u1', username: 'TESTRUNNER' }));
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('[data-testid="profile-menu-trigger"]', { timeout: 15000 });

    // Open profile menu
    const profileTrigger = page.getByTestId('profile-menu-trigger');
    await profileTrigger.click({ force: true });
    
    // Explicit wait for animation
    await page.waitForTimeout(1000);
    
    const logoutBtn = page.getByTestId('logout-btn');
    await expect(logoutBtn).toBeVisible({ timeout: 10000 });
    await logoutBtn.click({ force: true });

    // Verify redirected back to login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 20000 });
    
    // Local storage should be cleared
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });
});
