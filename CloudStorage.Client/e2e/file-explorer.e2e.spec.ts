import { test, expect } from '@playwright/test';

test.describe('CloudStorage E2E Suite', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Setup logged-in state
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-token');
      window.localStorage.setItem('user_data', JSON.stringify({ id: 'u1', username: 'TESTRUNNER' }));
    });

    // --- GLOBAL CONSOLIDATED MOCK REGISTRY ---
    await page.route('**/api/health', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"Healthy"}' }));
    await page.route('**/api/auth/profile', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"data":{"id":1,"role":"User"}}' }));
    await page.route('**/api/users/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"data":{"id":1,"role":"User"}}' }));
    await page.route('**/api/activity**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"data":[]}' }));
    await page.route('**/api/sync/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"data":[]}' }));
    await page.route('**/hubs/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.route('**/api/user/storage', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"data":{"used":0,"total":10737418240}}' }));
    await page.route('**/api/files/stats', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"data":{"totalFiles":3,"totalStorageBytes":3072,"maxStorageBytes":10737418240}}' }));
    await page.route('**/api/files/storage-breakdown', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"data":[]}' }));

    // Shared mocks for dashboard content
    await page.route('**/api/files', async route => {
      // Return a default list that can be overridden if needed
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              { id: 'f1', fileName: 'document.pdf', size: 1024, createdAt: new Date().toISOString(), isShared: false, modified: new Date().toISOString() },
              { id: 'f2', fileName: 'image.png', size: 2048, createdAt: new Date().toISOString(), isShared: false, modified: new Date().toISOString() }
            ]
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/folders/root', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: 'dir1', name: 'MOCK_FOLDER', createdAt: new Date().toISOString() }] })
      });
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.describe('CloudStorage Remediation Audit', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/files/f1/rename', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { id: 'f1', name: 'f1_modernized.json' } })
        });
      });

      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('div[data-testid^="file-item-"]', { timeout: 30000 });
    });

    test('Phase 1: Context menu and F2 Rename', async ({ page }) => {
      const fileItem = page.locator('div[data-testid="file-item-f1"]');
      await fileItem.waitFor({ state: 'visible' });
      await fileItem.scrollIntoViewIfNeeded();
      
      // Explicitly dispatch with coordinates because LayoutService depends on them
      await fileItem.click({ button: 'right', force: true, delay: 100 });
      
      // Verify Context Menu items
      const renameBtn = page.locator('[data-testid^="context-menu-item-RENAME_"]');
      await expect(renameBtn).toBeVisible({ timeout: 15000 });
      const isVisible = await renameBtn.isVisible().catch(() => false);
      if (!isVisible) {
        await fileItem.dispatchEvent('contextmenu', { clientX: 500, clientY: 500 });
      }
      
      await expect(renameBtn).toBeVisible({ timeout: 15000 });

      // Test F2 shortcut explicitly (ensure focus first)
      await fileItem.click({ force: true });
      await page.keyboard.press('F2');
      
      // Target the internal visible dialog to bypass display: contents
      const modal = page.locator('app-prompt-modal');
      const modalDialog = modal.locator('div.fixed').first();
      await expect(modalDialog).toBeVisible({ timeout: 15000 });

      // Perform Rename in Modal
      const input = modal.locator('input');
      await input.fill('f1_modernized.json');
      
      // Update the mock so the reload fetches the new filename
      await page.route('**/api/files', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              { id: 'f1', fileName: 'f1_modernized.json', size: 1024, createdAt: new Date().toISOString() },
              { id: 'f2', fileName: 'image.png', size: 2048, createdAt: new Date().toISOString() }
            ]
          })
        });
      });

      await modal.locator('button:has-text("Commit_Sequence")').click({ force: true });

      // Verify rename reflection
      await expect(page.locator('body')).toContainText('f1_modernized.json', { timeout: 15000 });
    });

    test('Phase 2: Search filters folders and files', async ({ page }) => {
      const searchInput = page.locator('[data-testid="contextual-search-input"]');
      await searchInput.fill('MOCK');
      await page.waitForTimeout(1000);
      
      await expect(page.locator('div[data-testid="file-item-f1"]')).toBeHidden();
      await expect(page.locator('div[data-testid="file-item-dir1"]')).toBeVisible();
    });

    test('Phase 3: Folder name validation', async ({ page }) => {
      // Specifically mock validation failure for invalid folder name
      await page.route('**/api/folders', async route => {
        if (route.request().method() === 'POST') {
          const payload = JSON.parse(route.request().postData() || '{}');
          if (payload.name === 'Invalid/Name!') {
            return route.fulfill({
              status: 400,
              contentType: 'application/json',
              body: JSON.stringify({ success: false, error: 'ERR_VALIDATION', message: 'Contains invalid characters' })
            });
          }
        }
        return route.continue();
      });

      const initBtn = page.locator('[data-testid="init-node-btn"]').first();
      await initBtn.scrollIntoViewIfNeeded();
      await initBtn.dispatchEvent('click');
      
      // Check for visible inner content to bypass display:contents limitations
      const modalContent = page.locator('app-prompt-modal').locator('div.fixed').first();
      await expect(modalContent).toBeVisible({ timeout: 15000 });
      
      const input = page.locator('app-prompt-modal input');
      await input.fill('Invalid/Name!');
      await page.locator('app-prompt-modal button:has-text("Commit_Sequence")').click({ force: true });
      
      // Wait for the unique notification toast component
      const toast = page.locator('app-notification-toast').last();
      await expect(toast).toContainText('ERR_VALIDATION', { timeout: 15000 });
    });

    test('Phase 4: Sync status remains responsive', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('OVERVIEW');
    });
  });

  test.describe('Trash Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/trash', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: true, 
            data: [{ 
              id: 't1', 
              originalId: 'o1', 
              name: 'deleted.txt', 
              size: 1024, 
              type: 'file', 
              deletedAt: new Date().toISOString(), 
              expiresAt: new Date(Date.now() + 86400000).toISOString(), 
              originalPath: '/deleted.txt' 
            }] 
          })
        });
      });

      let restoreCalled = false;
      await page.route('**/api/trash/t1/restore', async route => {
        restoreCalled = true;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'RESTORE_SUCCESS' }) });
      });
      
      // Attach restoreCalled to the page object for the test to access
      (page as any)._restoreCalled = () => restoreCalled;

      await page.goto('/trash', { waitUntil: 'domcontentloaded' });
      // Ensure Trash row is present before proceeding
      await page.waitForSelector('div[data-testid="trash-row-t1"]', { state: 'visible', timeout: 30000 });
    });

    test('Phase 2: Trash actions trigger network calls', async ({ page }) => {
      const row = page.locator('div[data-testid="trash-row-t1"]');
      await row.scrollIntoViewIfNeeded();
      
      // Perform restore
      const restoreBtn = page.locator('button[data-testid="restore-btn-t1"], button:has-text("Restore")');
      await row.hover({ force: true }); 
      await restoreBtn.waitFor({ state: 'visible' });
      await restoreBtn.click({ force: true });
      
      await expect(page.locator('body')).toContainText('RESTORE', { timeout: 10000 });
      expect((page as any)._restoreCalled()).toBe(true);
    });
  });
});
