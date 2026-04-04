import { test, expect } from '@playwright/test';

test.describe('CloudStorage Remediation Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Setup logged-in state
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-token');
      window.localStorage.setItem('user_data', JSON.stringify({ id: 'u1', username: 'TESTRUNNER' }));
    });

    // Mock Folders
    await page.route('**/api/folders/root', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: 'dir1', name: 'MOCK_FOLDER', createdAt: new Date().toISOString() }] })
      });
    });

    // Mock Files
    await page.route('**/api/files', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'f1', fileName: 'document.pdf', size: 1024, createdAt: new Date().toISOString(), isShared: false },
            { id: 'f2', fileName: 'image.png', size: 2048, createdAt: new Date().toISOString(), isShared: false }
          ]
        })
      });
    });

    // Mock Stats & Other Dashboard APIs
    await page.route('**/api/files/stats', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    });
    await page.route('**/api/files/storage-breakdown', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    });
    await page.route('**/api/activity', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    });

    await page.goto('/dashboard');
    await page.waitForSelector('div[id="item-f1"]');
  });

  test('Phase 1: Context menu and F2 Rename', async ({ page }) => {
    await page.click('div[id="item-f1"]', { button: 'right' });
    await expect(page.locator('app-context-menu')).toBeVisible();
    await expect(page.getByText('RENAME_ENTITY')).toBeVisible();

    await page.click('div[id="item-f2"]');
    await page.keyboard.press('F2');
    await expect(page.locator('app-prompt-modal')).toBeVisible();
    await expect(page.locator('app-prompt-modal h2')).toContainText('Rename_File');
  });

  test('Phase 2: Search filters folders and files', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="SEARCH_VAULT"]');
    await searchInput.fill('document');
    
    // Should show document.pdf
    await expect(page.locator('div[id="item-f1"]')).toBeVisible();
    // Should hide MOCK_FOLDER
    await expect(page.locator('div[id="item-dir1"]')).not.toBeVisible();
    
    await searchInput.fill('MOCK');
    // Should show MOCK_FOLDER
    await expect(page.locator('div[id="item-dir1"]')).toBeVisible();
    // Should hide document.pdf
    await expect(page.locator('div[id="item-f1"]')).not.toBeVisible();
  });

  test('Phase 3: Folder name validation', async ({ page }) => {
    await page.click('button:has-text("CREATE_NODE")'); // New Folder button
    const modal = page.locator('app-prompt-modal');
    await expect(modal).toBeVisible();
    
    const input = modal.locator('input');
    await input.fill('Invalid/Name!');
    await modal.locator('button:has-text("Execute")').click();
    
    // Check for validation error notification
    await expect(page.locator('body')).toContainText('ERR_VALIDATION');
  });

  test('Phase 4: Sync status remains responsive', async ({ page }) => {
    // Verify sync log or status icon if visible
    // For now, just ensure dashboard doesn't crash
    await expect(page.locator('h1')).toContainText('OVERVIEW');
  });
});

test.describe('Trash Management', () => {
  test('Phase 2: Trash actions trigger network calls', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-token');
    });

    await page.route('**/api/trash', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: 't1', name: 'deleted.txt', type: 'file', deletedAt: new Date().toISOString() }] })
      });
    });

    let restoreCalled = false;
    await page.route('**/api/trash/t1/restore', async route => {
      restoreCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.goto('/trash');
    const row = page.locator('div:has-text("deleted.txt")').last();
    await row.hover();
    await page.click('button:has-text("Restore")');
    
    // Check notification and call
    await expect(page.locator('body')).toContainText('RESTORE_SUCCESS');
    expect(restoreCalled).toBe(true);
  });
});
