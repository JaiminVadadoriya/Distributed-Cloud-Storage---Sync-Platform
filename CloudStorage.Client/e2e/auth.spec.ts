import { test, expect } from './fixtures/auth.fixture';
import { AuthPage } from './pages/auth.page';

test.describe('Authentication Flow', () => {
  let auth: AuthPage;

  test.beforeEach(async ({ page }) => {
    auth = new AuthPage(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('should show validation errors when fields are empty', async ({ page }) => {
    await auth.gotoLogin();
    await auth.submitBtn.click();

    // Use native HTML5 validity API — resilient to label/text changes
    const isInvalid = await page
      .locator('#identifier')
      .evaluate((el: HTMLInputElement) => el.validity.valueMissing);
    expect(isInvalid).toBe(true);
  });

  test('should successfully log in with valid credentials (mocked)', async ({ page }) => {
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            accessToken:  'mock-jwt-token',
            refreshToken: 'mock-refresh-token',
            user: { id: 'u1', username: 'TESTRUNNER', email: 'test@example.com', role: 'User' },
          },
        }),
      }),
    );

    await auth.gotoLogin();
    await auth.login('TESTRUNNER', 'password123');

    await auth.expectRedirectedToDashboard();
    await auth.expectAuthToken('mock-jwt-token');
  });

  test('should show error message on failed login (mocked)', async ({ page }) => {
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Invalid_Credentials_Node_Rejected' }),
      }),
    );

    await auth.gotoLogin();
    await auth.login('wronguser', 'wrongpass');

    // FIX: scoped to [role="alert"] instead of entire body — avoids false positives
    await auth.expectErrorContaining('Invalid_Credentials_Node_Rejected');
  });

  test('should log out successfully', async ({ authenticatedPage }) => {
    const authPage = new AuthPage(authenticatedPage);
    await authenticatedPage.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await authPage.logout();

    await authPage.expectRedirectedToLogin();
    await authPage.expectAuthToken(null);
  });
});
