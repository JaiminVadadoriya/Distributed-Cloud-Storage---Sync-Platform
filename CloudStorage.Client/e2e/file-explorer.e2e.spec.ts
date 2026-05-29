// FIX: import from auth fixture (not @playwright/test directly) so that
//      SignalR + API interceptors from the fixture are always active.
import { test, expect } from './fixtures/auth.fixture';
import { DashboardPage } from './pages/dashboard.page';
import { TrashPage } from './pages/trash.page';
import { MOCK_FILES, MOCK_FOLDERS, MOCK_TRASH } from './mocks/api-mocks';

test.describe('CloudStorage E2E Suite', () => {
  test.describe.configure({ mode: 'serial' });

  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.injectAuth();
    await dashboard.mockRoutes();
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  // ───────────────────────────────────────────────────────────────────────────
  test.describe('CloudStorage Remediation Audit', () => {
    test.beforeEach(async ({ page }) => {
      // Add rename endpoint mock *before* navigating
      await page.route('**/api/files/f1/rename', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { id: 'f1', name: 'f1_modernized.json' } }),
        }),
      );

      await dashboard.goto('f1');
    });

    test('Phase 1: Context menu and F2 Rename', async ({ page }) => {
      const fileItem = dashboard.fileItem('f1');
      await fileItem.scrollIntoViewIfNeeded();

      await dashboard.openContextMenu(fileItem);

      // Verify context menu item is visible
      const renameBtn = dashboard.contextMenu.locator('[data-testid^="context-menu-item-RENAME_"]');
      await expect(renameBtn).toBeVisible({ timeout: 15_000 });

      // Test F2 shortcut
      await page.keyboard.press('Escape'); // Dismiss context menu backdrop to prevent intercepting clicks
      await fileItem.click();
      await page.keyboard.press('F2');

      const modalDialog = dashboard.promptModal.locator('div.fixed').first();
      await expect(modalDialog).toBeVisible({ timeout: 15_000 });

      // Override file list to return the renamed file
      await page.route('**/api/files', (route) => {
        if (route.request().method() === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: [
                { ...MOCK_FILES[0], fileName: 'f1_modernized.json' },
                MOCK_FILES[1],
              ],
            }),
          });
        }
        return route.continue();
      });

      await dashboard.promptInput.fill('f1_modernized.json');
      await dashboard.promptCommitBtn.click();

      // FIX: no waitForTimeout — web-first assertion auto-retries
      await dashboard.expectFileVisible('f1_modernized.json');
    });

    test('Phase 2: Search filters folders and files', async () => {
      await dashboard.search('MOCK');

      // FIX: no waitForTimeout — use web-first assertions
      await expect(dashboard.fileItem('f1')).toBeHidden();
      await expect(dashboard.page.getByTestId('file-item-dir1')).toBeVisible();
    });

    test('Phase 3: Folder name validation', async ({ page }) => {
      await page.route('**/api/folders', async (route) => {
        if (route.request().method() === 'POST') {
          const payload = JSON.parse(route.request().postData() ?? '{}');
          if (payload.name === 'Invalid/Name!') {
            return route.fulfill({
              status: 400,
              contentType: 'application/json',
              body: JSON.stringify({ success: false, error: 'ERR_VALIDATION', message: 'Contains invalid characters' }),
            });
          }
        }
        return route.continue();
      });

      const initBtn = page.getByTestId('init-node-btn').first();
      await initBtn.scrollIntoViewIfNeeded();
      await initBtn.click();

      const modalContent = dashboard.promptModal.locator('div.fixed').first();
      await expect(modalContent).toBeVisible({ timeout: 15_000 });

      await dashboard.promptInput.fill('Invalid/Name!');
      await dashboard.promptCommitBtn.click();

      const toast = page.locator('app-notification-toast').last();
      await expect(toast).toContainText('ERR_VALIDATION', { timeout: 15_000 });
    });

    test('Phase 4: Sync status remains responsive', async () => {
      await dashboard.expectHeading('OVERVIEW');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  test.describe('Trash Management', () => {
    let trash: TrashPage;

    test.beforeEach(async ({ page }) => {
      trash = new TrashPage(page);

      // FIX: register trash-specific routes *before* navigating
      await trash.mockRoutes({ trash: MOCK_TRASH });

      await page.route('**/api/trash/t1/restore', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'RESTORE_SUCCESS' }),
        }),
      );

      await trash.goto();
    });

    test('Phase 2: Trash actions trigger network calls', async ({ page }) => {
      // FIX: use waitForResponse instead of the (page as any)._restoreCalled hack
      const restoreRequest = page.waitForResponse(
        (res) => res.url().includes('/api/trash/t1/restore') && res.status() === 200,
      );

      await trash.restore('t1');

      // Confirm the HTTP request actually fired
      await restoreRequest;

      // FIX: scoped to [role="alert"] instead of body
      await expect(page.getByRole('alert').filter({ hasText: /RESTORE/ }).first()).toBeVisible({ timeout: 10_000 });
    });
  });
});
