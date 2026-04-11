import { test, expect } from './fixtures/auth.fixture';

test.describe('File Management', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Setup logged-in state
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-token');
      window.localStorage.setItem('user_data', JSON.stringify({ id: 'u1', username: 'TESTRUNNER' }));
    });

    // --- COMPREHENSIVE MOCK BUNDLE ---
    
    // 1. Files
    await page.route('**/api/files', async route => {
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
    });

    // 2. Folders
    await page.route('**/api/folders/root', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    // 3. Stats
    await page.route('**/api/files/stats', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { totalFiles: 2, totalStorageBytes: 3072, maxStorageBytes: 10737418240, activeSyncOps: 0 }
        })
      });
    });

    // 4. Storage Breakdown
    await page.route('**/api/files/storage-breakdown', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    // 5. Activity
    await page.route('**/api/activity', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    // 6. User Storage
    await page.route('**/api/user/storage', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { used: 3072, total: 10737418240 } })
      });
    });

    // 7. Health Check
    await page.route('**/api/health', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'Healthy' }) });
    });

    // SignalR and background mocks are now handled globally in auth.fixture.ts

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    
    // Wait for the specific data-testid instead of global networkidle to be more resilient
    await page.waitForSelector('div[data-testid="file-item-f1"]', { timeout: 30000 });
  });

  test('should list files correctly', async ({ page }) => {
    const fileItems = page.locator('div[data-testid^="file-item-"]');
    await expect(fileItems).toHaveCount(2, { timeout: 20000 });
    await expect(page.getByText('document.pdf')).toBeVisible();
    await expect(page.getByText('image.png')).toBeVisible();
  });

  test('should rename a file (mocked)', async ({ page }) => {
    // Mock rename API
    await page.route('**/api/files/f1/rename', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Renamed' })
      });
    });

    // Mock refreshed file list after rename
    await page.route('**/api/files', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'f1', fileName: 'renamed-doc.pdf', size: 1024, createdAt: new Date().toISOString(), isShared: false, modified: new Date().toISOString() },
            { id: 'f2', fileName: 'image.png', size: 2048, createdAt: new Date().toISOString(), isShared: false, modified: new Date().toISOString() }
          ]
        })
      });
    });

    // Right-click the file to open context menu - use robust trigger
    const target = page.locator('div[data-testid="file-item-f1"]');
    await target.waitFor({ state: 'visible' });
    
    // Attempt physical right-click with fallback
    await target.click({ button: 'right', force: true });
    
    const renameAction = page.locator('[data-testid="context-menu-item-RENAME_ENTITY"]');
    if (!await renameAction.isVisible()) {
      await target.dispatchEvent('contextmenu');
    }
    
    await renameAction.click({ force: true });

    // Enter new name and commit
    await page.fill('app-prompt-modal input', 'renamed-doc.pdf');
    await page.click('button:has-text("Commit_Sequence")');

    // Verify change
    await expect(page.getByText('renamed-doc.pdf')).toBeVisible();
  });

  test('should delete a file (mocked)', async ({ page }) => {
    // Mock delete API
    await page.route('**/api/files/f2', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Deleted' })
      });
    });

    // Mock refreshed file list after delete
    await page.route('**/api/files', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'f1', fileName: 'document.pdf', size: 1024, createdAt: new Date().toISOString(), isShared: false, modified: new Date().toISOString() }
          ]
        })
      });
    });

    // Right-click the file
    const target2 = page.locator('div[data-testid="file-item-f2"]');
    await target2.waitFor({ state: 'visible' });
    await target2.click({ button: 'right', force: true });
    
    const deleteAction = page.locator('[data-testid="context-menu-item-PURGE_RECORD"]');
    if (!await deleteAction.isVisible()) {
      await target2.dispatchEvent('contextmenu');
    }
    
    await deleteAction.click({ force: true });

    // Confirm deletion - use robust locator
    const confirmBtn = page.getByRole('button', { name: 'Confirm_Sequence' });
    await confirmBtn.waitFor({ state: 'visible' });
    await confirmBtn.click({ force: true });

    // Verify success notification to ensure state change
    await expect(page.locator('body')).toContainText('PURGE_SUCCESS');

    // Verify item is removed from view
    const fileItems = page.locator('div[data-testid^="file-item-"]');
    await expect(fileItems).toHaveCount(1, { timeout: 15000 });
    await expect(page.locator('div[data-testid="file-item-f2"]')).toBeHidden();
  });

  test('should filter files via search', async ({ page }) => {
    // Type in search bar
    await page.fill('input[placeholder="SEARCH_LOGS..."]', 'document');
    
    // Wait for signal-based filtering to reflect
    await page.waitForTimeout(500);

    // Verify only matching file is shown
    const fileItems = page.locator('div[id^="item-"]');
    // Note: Filtering happens in FileListComponent based on searchService.query() signal
    await expect(page.getByText('document.pdf')).toBeVisible();
    await expect(page.getByText('image.png')).not.toBeVisible();
  });
});
