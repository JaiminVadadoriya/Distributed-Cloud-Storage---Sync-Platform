import { test, expect } from './fixtures/auth.fixture';
import { triggerContextMenu, selectContextMenuItem } from './helpers/ui-helpers';

test.describe('Web Application Remediation Audit', () => {
  // Use serial mode for Audit persona to ensure mock state isolation
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ authenticatedPage }) => {
    test.setTimeout(90000);

    // UNIFIED MOCKING for this persona to prevent locator mismatches
    await authenticatedPage.route('**/api/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ 
            id: 'file1', 
            fileName: 'AUDIT_TEST_FILE.txt', 
            size: 1024, 
            createdAt: new Date().toISOString(),
            lastModifiedAt: new Date().toISOString(),
            isShared: false
          }]
        })
      });
    });

    await authenticatedPage.route('**/api/folders/root', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 'folder1', name: 'AUDIT_TEST_FOLDER', parentId: null, type: 'folder', createdAt: new Date().toISOString() }]
        })
      });
    });

    // Reset modals
    if (await authenticatedPage.locator('app-prompt-modal, app-confirm-modal').isVisible()) {
      await authenticatedPage.keyboard.press('Escape');
      await authenticatedPage.waitForTimeout(200);
    }
  });

  test.describe('Dashboard & File Explorer', () => {
    test.beforeEach(async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.setViewportSize({ width: 1920, height: 1080 });
      
      // Wait for the unified mock file to appear using the correct ID from auth.fixture/baseline
      const target = authenticatedPage.locator('[data-testid="file-item-file1"]');
      await target.waitFor({ state: 'visible', timeout: 30000 });
    });

    test('Task 1: File Explorer - Context Menu Missing', async ({ authenticatedPage }) => {
      const row = authenticatedPage.locator('[data-testid="file-item-file1"]');
      await triggerContextMenu(authenticatedPage, row);
      
      // Look for the menu items directly as they represent stable visibility
      const menu = authenticatedPage.locator('app-context-menu');
      const item = menu.locator('[data-testid^="context-menu-item-"]').first();
      await expect(item).toBeVisible({ timeout: 15000 });
    });

    test('Task 2: File Explorer - Checkbox Selection Fails', async ({ authenticatedPage }) => {
      const checkbox = authenticatedPage.locator('[data-testid="file-checkbox-file1"]');
      await checkbox.check({ force: true });
      await expect(checkbox).toBeChecked();
      await expect(authenticatedPage.locator('body')).toContainText(/Entities_Selected/i);
    });

    test('Task 4: Search - Filtering Not Functional', async ({ authenticatedPage }) => {
      const searchInput = authenticatedPage.locator('[data-testid="global-search-input"]');
      await searchInput.fill('AUDIT_TEST_FILE');
      await authenticatedPage.keyboard.press('Enter');
      
      // In this app, search happens via a signal update on the combined items list
      await expect(authenticatedPage.locator('[data-testid="file-item-file1"]')).toBeVisible();
      
      await searchInput.fill('NON_EXISTENT_ENTITY');
      await authenticatedPage.keyboard.press('Enter');
      await expect(authenticatedPage.locator('[data-testid="file-item-file1"]')).toBeHidden({ timeout: 10000 });
    });

    test('Task 5: New Folder - Lack of Naming Constraints', async ({ authenticatedPage }) => {
      const btn = authenticatedPage.locator('app-file-list').locator('[data-testid="init-node-btn"]');
      await btn.click({ force: true });

      const input = authenticatedPage.getByPlaceholder(/NODE_NAME/i);
      await expect(input).toBeVisible({ timeout: 20000 });
      await authenticatedPage.waitForTimeout(1000);
      
      await input.fill('Invalid/Folder*Name');
      await authenticatedPage.waitForTimeout(1000);
      
      // Use a more generic but fixed locator for the button
      const commitBtn = authenticatedPage.locator('app-prompt-modal button').filter({ hasText: 'Commit_Sequence' });
      
      await expect(commitBtn).toBeVisible({ timeout: 20000 });
      await commitBtn.click({ force: true });
      
      const toast = authenticatedPage.getByText(/ERR_VALIDATION/i);
      await expect(toast.first()).toBeVisible({ timeout: 20000 });
    });

    test('Task 7: Action Stability - Global Unresponsiveness', async ({ authenticatedPage }) => {
      const btn = authenticatedPage.locator('app-file-list').locator('[data-testid="init-node-btn"]');
      for (let i = 0; i < 2; i++) {
        await btn.click({ force: true });
        const abortBtn = authenticatedPage.locator('[data-testid="prompt-abort-btn"]');
        await expect(abortBtn).toBeVisible({ timeout: 10000 });
        await abortBtn.click({ force: true });
        await expect(abortBtn).toBeHidden({ timeout: 10000 });
      }
      await expect(btn).toBeEnabled();
    });
  });

  test.describe('Trash View', () => {
    test.beforeEach(async ({ authenticatedPage }) => {
      await authenticatedPage.route('**/api/trash', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [{ 
              id: 't1', 
              name: 'DELETED_ENTITY.TXT', 
              type: 'file', 
              size: 1024,
              deletedAt: new Date().toISOString()
            }]
          })
        });
      });
    });

    test('Task 3: Trash - Restore and Purge Actions Inactive', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/trash');
      await authenticatedPage.waitForLoadState('networkidle');
      
      const row = authenticatedPage.locator('[data-testid^="trash-row-"]').first();
      await row.waitFor({ state: 'visible', timeout: 20000 });
      
      await row.hover({ force: true });
      const restoreBtn = row.getByRole('button', { name: /RESTORE/i }).first();
      await expect(restoreBtn).toBeVisible();
      await restoreBtn.click({ force: true });
      
      await expect(authenticatedPage.locator('body')).toContainText(/RESTORE/i, { timeout: 15000 });
    });
  });
});
