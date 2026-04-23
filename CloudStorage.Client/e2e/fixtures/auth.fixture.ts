import { test as base, expect, Page } from '@playwright/test';
import { ApiClient } from '../helpers/api-client';
import * as users from '../data/users.json';

/**
 * Global API Mocking & Authentication Bundle
 */

export interface TestFixtures {
  authenticatedPage: Page;
  regularUserAuth: Page;
  adminUserAuth: Page;
  guestUserAuth: Page;
  apiBase: string;
}

/**
 * Reusable helper to authenticate a page context for a specific persona
 */
async function authenticatePersona(persona: string, page: Page, apiBase: string) {
  const testMode = (process.env['TEST_MODE'] || 'mock').toLowerCase();
  const userCreds = (users as any)[persona];

  if (!userCreds) {
    throw new Error(`Unknown persona: ${persona}. Check users.json.`);
  }

  if (testMode === 'real') {
    const apiRequest = page.context().request;
    const loginResponse = await apiRequest.post(`${apiBase}/api/auth/login`, {
      data: { 
        email: userCreds.email, 
        password: userCreds.password 
      }
    });

    if (!loginResponse.ok()) {
      const error = await loginResponse.text();
      throw new Error(`Real login failed for ${persona}: ${loginResponse.status()} - ${error}`);
    }

    const { accessToken, refreshToken, user } = await loginResponse.json();

    await page.addInitScript(({ token, refresh, userData }) => {
      window.localStorage.setItem('auth_token', token);
      window.localStorage.setItem('refresh_token', refresh);
      window.localStorage.setItem('user_data', JSON.stringify(userData));
      Object.defineProperty(navigator, 'onLine', { get: () => true });
    }, { token: accessToken, refresh: refreshToken, userData: user });
  } else {
    // Mock mode injection
    await page.addInitScript(({ userData }) => {
      window.localStorage.setItem('auth_token', 'mock-jwt-token');
      window.localStorage.setItem('refresh_token', 'mock-refresh-token');
      window.localStorage.setItem('user_data', JSON.stringify({ 
        id: Math.floor(Math.random() * 1000), 
        username: userData.username, 
        email: userData.email, 
        role: userData.role 
      }));
      Object.defineProperty(navigator, 'onLine', { get: () => true });
    }, { userData: userCreds });
  }

  // Setup Global Interceptors (Hubs/API)
  await setupInterceptors(page, testMode, apiBase);
  
  return page;
}

/**
 * Shared routing interceptors for SignalR and API mocking
 */
async function setupInterceptors(page: Page, testMode: string, apiBase: string) {
  // SignalR Mocking
  await page.route('**/hubs/**', async (route) => {
    if (testMode !== 'real') {
      const url = route.request().url();
      if (url.includes('negotiate')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            negotiateVersion: 1,
            connectionId: 'mock-connection-' + Math.random().toString(36).substring(7),
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }]
          })
        }).catch(() => {});
      } else {
        await route.abort('failed').catch(() => {});
      }
      return;
    }
    await route.continue().catch(() => {});
  });

  // Global API Interceptor
  await page.route('**/api/**', async (route) => {
    if (testMode === 'real') {
      return route.continue().catch(() => {});
    }
    
    const request = route.request();
    const url = request.url();
    const method = request.method();
    const headers = { ...request.headers() };

    // Pass through auth for real login pages if needed
    if (url.includes('/api/auth/login') || url.includes('/api/auth/register')) {
      if (page.url().includes('/auth/login') || page.url().includes('/auth/register')) {
         return route.continue().catch(() => {});
      }
    }

    let responseBody: any = { success: true, data: {} };
    
    // Generic mock data
    if (url.includes('/api/auth/profile') || url.includes('/api/users/me')) {
      responseBody.data = { id: 1, username: 'TESTRUNNER', email: 'test@example.com', role: 'User' };
    } else if (url.includes('/api/files/stats')) {
      responseBody.data = { totalFiles: 5, totalStorageBytes: 5120, maxStorageBytes: 10737418240 };
    } else if (url.includes('/api/folders/root')) {
      responseBody.data = [{ id: 'f1', name: 'MOCK_FOLDER', parentId: null, type: 'folder', createdAt: new Date().toISOString() }];
    } else if (url.includes('/api/files')) {
      if (method === 'GET') {
        responseBody.data = [{ 
          id: 'file1', fileName: 'mock-document.pdf', size: 1024, 
          createdAt: new Date().toISOString(), lastModifiedAt: new Date().toISOString(), ownerId: 1
        }];
      }
    } else {
        responseBody.data = url.includes('stats') ? {} : [];
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responseBody),
      headers
    }).catch(() => {});
  });
}

export const test = base.extend<TestFixtures>({
  apiBase: process.env['API_BASE_URL'] || 'http://localhost:5010',

  regularUserAuth: async ({ page, apiBase }, use) => {
    await authenticatePersona('regularUser', page, apiBase);
    await use(page);
  },

  adminUserAuth: async ({ page, apiBase }, use) => {
    await authenticatePersona('admin', page, apiBase);
    await use(page);
  },

  guestUserAuth: async ({ page, apiBase }, use) => {
    await authenticatePersona('guest', page, apiBase);
    await use(page);
  },

  // Convenience alias for backward compatibility or general tests
  authenticatedPage: async ({ regularUserAuth }, use) => {
    await use(regularUserAuth);
  },
});

export { expect };
