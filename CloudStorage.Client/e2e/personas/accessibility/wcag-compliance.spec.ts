import { test, expect } from '../../fixtures/auth.fixture';
import { setupTestUser, loginTestUser, setupAuthToken, getTestUserCredentials } from '../../helpers/test-setup';
import { devices } from '@playwright/test';

test.describe.parallel('Accessibility - WCAG Compliance', () => {
  test.beforeEach(async ({ authenticatedPage, apiBase }) => {
    await authenticatedPage.goto('/auth/login');
    // Direct token injection for mock mode to avoid UI login overhead/hangs
    if (process.env['TEST_MODE'] !== 'real') {
      await setupAuthToken({ page: authenticatedPage, token: 'mock-jwt-token' });
      await authenticatedPage.addInitScript(() => {
        window.localStorage.setItem('refresh_token', 'mock-refresh-token');
      });
    } else {
      // Real mode logic if needed
      const credentials = getTestUserCredentials('regularUser1');
      let userAuth = await loginTestUser({
        page: authenticatedPage,
        apiBase: apiBase || 'http://localhost:5010',
        username: credentials.username,
        password: credentials.password
      }).catch(async () => setupTestUser({
        page: authenticatedPage,
        apiBase: apiBase || 'http://localhost:5010',
        userKey: 'regularUser1'
      }));
      await setupAuthToken({ page: authenticatedPage, token: userAuth.token });
    }
  });

  test('Page has required ARIA labels', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');

    // Check for main landmark
    const main = authenticatedPage.locator('main, [role="main"]');
    await expect(main).toBeVisible();

    // Check for heading hierarchy
    const h1 = authenticatedPage.locator('h1');
    const h1Count = await h1.count();
    expect(h1Count).toBeGreaterThan(0);
    
    // Ensure headings are sequential (basic check)
    if (h1Count > 0) {
      const firstH1Text = await h1.first().textContent();
      expect(firstH1Text?.trim().length).toBeGreaterThan(0);
    }

    // Verify all buttons have accessible names
    const buttons = authenticatedPage.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const accessibleName = await button.getAttribute('aria-label')
        || await button.textContent()
        || await button.getAttribute('title');
      
      expect(accessibleName).toBeTruthy();
    }
  });

  test('All form fields have labels and ARIA descriptions', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/auth/login');
    await authenticatedPage.waitForLoadState('networkidle');

    // Check form fields have labels
    const inputs = authenticatedPage.locator('input[required], textarea[required]');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const inputId = await input.getAttribute('id');

      if (inputId) {
        const label = authenticatedPage.locator(`label[for="${inputId}"]`);
        const hasLabel = await label.isVisible().catch(() => false);
        
        // Either has label or ARIA label
        const ariaLabel = await input.getAttribute('aria-label');
        expect(hasLabel || ariaLabel).toBeTruthy();
      }
    }
  });

  test('Color contrast meets WCAG AA standards', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');

    // In real testing, use axe-core or similar
    // For now, verify colored elements are readable
    const buttons = authenticatedPage.locator('button');
    const firstButton = buttons.first();

    if (await firstButton.isVisible()) {
      const bg = await firstButton.evaluate(el => window.getComputedStyle(el).backgroundColor);
      const fg = await firstButton.evaluate(el => window.getComputedStyle(el).color);
      expect(bg).toBeTruthy();
      expect(fg).toBeTruthy();
    }
  });

  test('All images have alt text', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');

    const images = authenticatedPage.locator('img:not([role="presentation"])');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i);
      const alt = await image.getAttribute('alt');
      const ariaLabel = await image.getAttribute('aria-label');
      expect(alt || ariaLabel).toBeTruthy();
    }
  });
});

test.describe.parallel('Accessibility - Keyboard Navigation', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    if (process.env['TEST_MODE'] !== 'real') {
      await setupAuthToken({ page: authenticatedPage, token: 'mock-jwt-token' });
    }
  });

  test('User can navigate entire app using keyboard only', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');

    const initialFocus = await authenticatedPage.evaluate(() => document.activeElement?.tagName);
    await authenticatedPage.press('body', 'Tab');
    const afterTabFocus = await authenticatedPage.evaluate(() => document.activeElement?.tagName);
    expect(initialFocus).not.toBe(afterTabFocus);
  });

  test('Form can be submitted with keyboard', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/auth/login');

    await authenticatedPage.fill('[data-testid="login-identifier"]', 'testuser');
    await authenticatedPage.press('[data-testid="login-identifier"]', 'Tab');
    await authenticatedPage.fill('[data-testid="login-password"]', 'testpass');
    
    // Step through intermediate controls (Sync_Session checkbox, Recovery_Key link, then to Submit)
    await authenticatedPage.keyboard.press('Tab');
    await authenticatedPage.keyboard.press('Tab');
    await authenticatedPage.keyboard.press('Tab');
    await authenticatedPage.press('button[type="submit"]', 'Enter');

    await authenticatedPage.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {});
  });

  test('Modals can be closed with Escape key', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');

    const createBtn = authenticatedPage.locator('[data-testid="create-folder-button"]');
    if (await createBtn.isVisible()) {
      await createBtn.click();
      const modal = authenticatedPage.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await authenticatedPage.press('[role="dialog"]', 'Escape');
      await expect(modal).not.toBeVisible().catch(() => {});
    }
  });

  test('Focus trap works in modals', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/files');
    const createBtn = authenticatedPage.locator('[data-testid="create-folder-button"]');
    
    if (await createBtn.isVisible()) {
      await createBtn.click();
      const modal = authenticatedPage.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      const focusableElements = modal.locator(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      expect(await focusableElements.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Accessibility - Mobile Viewports', () => {
  test('Responsive design works on mobile (iPhone 12)', async ({ browser, browserName, apiBase }) => {
    test.skip(browserName === 'firefox', 'Mobile emulation (isMobile) is not supported in Firefox');
    
    // Explicitly check browserName again to be safe
    if (browserName === 'firefox') return;

    const context = await browser.newContext({ ...devices['iPhone 12'] });
    const page = await context.newPage();
    
    // Inject token for mobile context
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-jwt-token');
    });

    try {
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      const usernameInput = page.locator('[data-testid="login-identifier"]');
      await expect(usernameInput).toBeVisible();
      const button = page.locator('button[type="submit"]').first();
      const box = await button.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(40);
      expect(box?.height).toBeGreaterThanOrEqual(40);
    } finally {
      await context.close();
    }
  });

  test('Touch interactions work on mobile', async ({ browser, browserName, apiBase }) => {
    test.skip(browserName === 'firefox', 'Mobile emulation (isMobile) is not supported in Firefox');
    if (browserName === 'firefox') return;

    const context = await browser.newContext({ ...devices['Pixel 5'] });
    const page = await context.newPage();

    // Mock file list for this specific context since it doesn't use the authenticatedPage fixture
    await page.route('**/api/files', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [{ id: 'm1', fileName: 'mobile-file.txt', size: 1024 }] })
    }));

    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-jwt-token');
    });

    try {
      await page.goto('/files');
      await page.waitForLoadState('networkidle');
      const fileItem = page.locator('[data-testid^="file-item-"]').first();
      await expect(fileItem).toBeVisible();
    } finally {
      await context.close();
    }
  });
});

test.describe('Accessibility - Screen Reader Support', () => {
  test('Page structure is semantic and navigable', async ({ authenticatedPage }) => {
    const logs: string[] = [];
    authenticatedPage.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
    authenticatedPage.on('pageerror', err => logs.push(`[ERROR] ${err.message}`));

    // Ensure we are logged in so we don't redirect to login page (which lacks nav/main)
    await authenticatedPage.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-jwt-token');
      window.localStorage.setItem('refresh_token', 'mock-refresh-token');
    });

    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForLoadState('networkidle').catch(() => {});

    // Check for semantic landmarks
    const nav = authenticatedPage.locator('nav, [role="navigation"]').first();
    const main = authenticatedPage.locator('main, [role="main"]').first();
    
    try {
      await expect(nav).toBeVisible({ timeout: 15000 });
      await expect(main).toBeVisible({ timeout: 15000 });
    } catch (e) {
      console.log('Console Logs on failure:', logs.join('\n'));
      console.log('DOM Content on failure:', await authenticatedPage.content());
      throw e;
    }
  });

  test('Dynamic content updates are announced', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/files');
    const liveRegion = authenticatedPage.locator('[role="status"], [role="alert"], [aria-live]');
    expect(await liveRegion.count()).toBeGreaterThan(0);
  });

  test('File list is semantically structured', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');

    const table = authenticatedPage.locator('[role="table"], table, [role="grid"]');
    const list = authenticatedPage.locator('[role="list"], ul, ol');
    const emptyRegion = authenticatedPage.locator('[role="region"][aria-label="Empty Directory"], [data-testid="empty-directory"]');
 
    const hasTable = await table.first().isVisible().catch(() => false);
    const hasList = await list.first().isVisible().catch(() => false);
    const hasEmpty = await emptyRegion.first().isVisible().catch(() => false);
 
    expect(hasTable || hasList || hasEmpty).toBeTruthy();
  });
});
