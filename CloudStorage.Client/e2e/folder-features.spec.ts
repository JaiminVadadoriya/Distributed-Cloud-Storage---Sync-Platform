import { test, expect } from './fixtures/auth.fixture';
import { DashboardPage } from './pages/dashboard.page';

test.describe('Folder Features', () => {
  // Use a larger viewport to ensure context menus are fully visible
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Setup logged-in state in storage for Angular Guard (mock mode only)
    if ((process.env['TEST_MODE'] || 'mock').toLowerCase() !== 'real') {
      await page.addInitScript(() => {
        window.localStorage.clear();
        window.localStorage.setItem('auth_token', 'mock-jwt-token');
        window.localStorage.setItem('refresh_token', 'mock-refresh-token');
        window.localStorage.setItem('user_data', JSON.stringify({ id: 1, username: 'testuser' }));
      });
    }

    // 1. Mock root folders - override the one in fixture to use folder-1 ID
    await page.route('**/api/folders/root', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 'folder-1', name: 'TARGET_FOLDER', parentId: null, createdAt: new Date().toISOString() }]
        })
      });
    });

    await page.goto('/dashboard');
    // Ensure the specific folder element is present and stable
    const folder = page.locator('[data-testid="file-item-folder-1"]');
    await expect(folder).toBeVisible({ timeout: 20000 });
    await folder.scrollIntoViewIfNeeded();
  });

  test('should open share prompt for folder and call share API', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // Mock Share API
    let shareCalled = false;
    await page.route('**/api/folders/folder-1/share', async route => {
      shareCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'SHARE_SUCCESS' })
      });
    });

    const folderItem = page.locator('[data-testid="file-item-folder-1"]');
    
    // Scroll the folder item to the top of the viewport to ensure the context menu renders fully within it
    await folderItem.evaluate(el => el.scrollIntoView({ block: 'start' }));
    
    const dashboard = new DashboardPage(page);
    await dashboard.openContextMenu(folderItem);
    await dashboard.clickContextMenuItem('SHARE_DIRECTORY');

    // Enter User ID 99 and commit in the prompt modal
    const modal = page.locator('app-prompt-modal, .modal-container');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await modal.locator('input').fill('99');
    await modal.locator('button').filter({ hasText: /Commit|Confirm|OK/i }).click();

    // Verify success notification
    await expect(page.locator('body')).toContainText('SHARE_SUCCESS', { timeout: 10000 });
    expect(shareCalled).toBe(true);
  });

  test('should allow dragging external file onto folder item', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const folderItem = page.locator('[data-testid="file-item-folder-1"]');
    
    // We simulate a drop event using a more comprehensive event structure
    await page.evaluate((id) => {
      const el = document.querySelector(`[data-testid="file-item-${id}"]`);
      if (el) {
        const dt = new DataTransfer();
        const file = new File(['test content'], 'external-file.txt', { type: 'text/plain' });
        dt.items.add(file);
        
        // Explicitly override 'types' to include 'Files' for browsers like WebKit/Safari
        Object.defineProperty(dt, 'types', {
          value: ['Files'],
          writable: false,
          configurable: true
        });
        
        // Trigger dragover first to satisfy some listeners
        el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
        
        // Then drop
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt
        });
        el.dispatchEvent(dropEvent);
      }
    }, 'folder-1');

    // Verify that notification info 'UPLOADING_TO_FOLDER' appears
    // The notification service in the app maps this to success/info toasts
    await expect(page.locator('body')).toContainText(/UPLOADING_TO_FOLDER/i, { timeout: 15000 });
  });
});
