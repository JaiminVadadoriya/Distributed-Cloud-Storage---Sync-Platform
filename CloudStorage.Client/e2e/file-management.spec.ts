import { test, expect } from '@playwright/test';

test.describe('File Management', () => {
  test.beforeEach(async ({ page }) => {
    // Setup logged-in state
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-token');
      window.localStorage.setItem('user_data', JSON.stringify({ id: 'u1', username: 'TESTRUNNER' }));
    });

    // Mock initial file list
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

    await page.goto('/dashboard');
  });

  test('should list files correctly', async ({ page }) => {
    const fileItems = page.locator('div[id^="item-"]');
    await expect(fileItems).toHaveCount(2);
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
            { id: 'f1', fileName: 'renamed-doc.pdf', size: 1024, createdAt: new Date().toISOString(), isShared: false },
            { id: 'f2', fileName: 'image.png', size: 2048, createdAt: new Date().toISOString(), isShared: false }
          ]
        })
      });
    });

    // Right-click the file to open context menu
    await page.click('div[id="item-f1"]', { button: 'right' });
    
    // Click Rename
    await page.click('text=RENAME_ENTITY');

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
            { id: 'f1', fileName: 'document.pdf', size: 1024, createdAt: new Date().toISOString(), isShared: false }
          ]
        })
      });
    });

    // Right-click the file
    await page.click('div[id="item-f2"]', { button: 'right' });
    
    // Click Purge/Delete
    await page.click('text=PURGE_RECORD');

    // Confirm deletion
    await page.click('button:has-text("Confirm_Sequence")');

    // Verify item is removed
    const fileItems = page.locator('div[id^="item-"]');
    await expect(fileItems).toHaveCount(1);
    await expect(page.getByText('image.png')).not.toBeVisible();
  });

  test('should filter files via search', async ({ page }) => {
    // Type in search bar
    await page.fill('input[placeholder="SEARCH_FILES..."]', 'document');
    
    // Verify only matching file is shown
    const fileItems = page.locator('div[id^="item-"]');
    // Note: Filtering happens in FileListComponent based on searchService.query() signal
    await expect(page.getByText('document.pdf')).toBeVisible();
    await expect(page.getByText('image.png')).not.toBeVisible();
  });
});
