import { test as base, expect, Page } from '@playwright/test';

/**
 * Global API Mocking Bundle
 * Neutralizes all background noise and provides consistent behavior in mock mode
 */
export const test = base.extend<{
  authenticatedPage: Page;
  apiBase: string;
}>({
  apiBase: process.env['API_BASE_URL'] || 'http://localhost:5010',

  authenticatedPage: async ({ page, apiBase }, use) => {
    // 1. Automatic Authentication State Injection
    // Ensures the user is logged in with mock credentials before any interaction
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-jwt-token');
      window.localStorage.setItem('refresh_token', 'mock-refresh-token');
      window.localStorage.setItem('user_data', JSON.stringify({ 
        id: 1, username: 'TESTRUNNER', email: 'test@cinephone.pro', role: 'User'
      }));
      // Standardize the online status for deterministic sync behavior
      Object.defineProperty(navigator, 'onLine', { get: () => true });
    });

    // 2. SignalR Mocking (The primary source of test hangs)
    await page.route('**/hubs/**', async (route) => {
      const url = route.request().url();
      if (process.env['TEST_MODE'] !== 'real') {
        if (url.includes('negotiate')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              negotiateVersion: 1,
              connectionId: 'mock-connection-' + Math.random().toString(36).substring(7),
              availableTransports: [
                { transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }
              ]
            })
          }).catch(() => {});
        } else {
          await route.abort('failed').catch(() => {});
        }
        return;
      }
      await route.continue().catch(() => {});
    });

    // 3. Global API Interceptor
    await page.route('**/api/**', async (route) => {
      if (process.env['TEST_MODE'] === 'real') {
        return route.continue().catch(() => {});
      }

      const request = route.request();
      const url = request.url();
      const method = request.method();
      const headers = { ...request.headers() };

      if (url.includes('/api/auth/login') || url.includes('/api/auth/register')) {
        if (page.url().includes('/auth/login') || page.url().includes('/auth/register')) {
           return route.continue().catch(() => {});
        }
      }

      let responseBody: any = { success: true, data: {} };
      let status = 200;

      if (url.includes('/api/auth/profile') || url.includes('/api/users/me')) {
        responseBody.data = { id: 1, username: 'TESTRUNNER', email: 'test@cinephone.pro', role: 'User' };
      } else if (url.includes('/api/files/stats')) {
        responseBody.data = { totalFiles: 5, totalStorageBytes: 5120, maxStorageBytes: 10737418240 };
      } else if (url.includes('/api/files/storage-breakdown') || url.includes('/api/activity') || url.includes('/api/sync')) {
        responseBody.data = [];
      } else if (url.includes('/api/folders/root')) {
        responseBody.data = [{ id: 'f1', name: 'MOCK_FOLDER', parentId: null, type: 'folder', createdAt: new Date().toISOString() }];
      } else if (url.includes('/api/files')) {
        if (method === 'GET') {
          responseBody.data = [{ 
            id: 'file1', fileName: 'mock-document.pdf', size: 1024, 
            createdAt: new Date().toISOString(), lastModifiedAt: new Date().toISOString(),
            ownerId: 1
          }];
        }
      } else if (url.includes('/api/health')) {
        responseBody.data = { status: 'Healthy' };
      } else if (url.includes('/api/user/storage')) {
        responseBody.data = { used: 5120, total: 10737418240 };
      } else if (url.includes('/api/auth/refresh')) {
        responseBody.data = { accessToken: 'mock-jwt-token', refreshToken: 'mock-refresh-token' };
      }

      await route.fulfill({
        status: status,
        contentType: 'application/json',
        body: JSON.stringify(responseBody),
        headers
      }).catch(() => {});
    });

    await use(page);
  },
});

export { expect };

export interface TestContext {
  authenticatedPage: Page;
  apiBase: string;
}
