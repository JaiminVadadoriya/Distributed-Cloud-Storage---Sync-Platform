import { test, expect } from './fixtures/auth.fixture';
import { DashboardPage } from './pages/dashboard.page';
import { TrashPage } from './pages/trash.page';
import { MOCK_TRASH } from './mocks/api-mocks';

const AUDIT_FILE = {
  id: 'file1',
  fileName: 'AUDIT_TEST_FILE.txt',
  size: 1024,
  createdAt: new Date().toISOString(),
  lastModifiedAt: new Date().toISOString(),
  isShared: false,
};

const AUDIT_FOLDER = {
  id: 'folder1',
  name: 'AUDIT_TEST_FOLDER',
  parentId: null,
  type: 'folder' as const,
  createdAt: new Date().toISOString(),
};

test.describe('Web Application Remediation Audit', () => {
  test.describe.configure({ mode: 'serial' });

  let dashboard: DashboardPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    test.setTimeout(90_000);
    dashboard = new DashboardPage(authenticatedPage);

    // Use shared mock routes with audit-specific data overrides
    await dashboard.mockRoutes({
      files:   [AUDIT_FILE],
      folders: [AUDIT_FOLDER],
    });

    // FIX: dismiss any stray modals without waitForTimeout
    const modalLocator = authenticatedPage.locator('app-prompt-modal, app-confirm-modal');
    if (await modalLocator.isVisible()) {
      await authenticatedPage.keyboard.press('Escape');
      await expect(modalLocator).toBeHidden({ timeout: 5_000 });
    }
  });

  // ── Dashboard & File Explorer ───────────────────────────────────────────────
  test.describe('Dashboard & File Explorer', () => {
    test.beforeEach(async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 1920, height: 1080 });
      await dashboard.goto('file1');
    });

    test('Task 1: File Explorer - Context Menu', async ({ authenticatedPage }) => {
      const row = dashboard.fileItem('file1');
      await dashboard.openContextMenu(row);

      const item = dashboard.contextMenu.locator('[data-testid^="context-menu-item-"]').first();
      await expect(item).toBeVisible({ timeout: 15_000 });
    });

    test('Task 2: File Explorer - Checkbox Selection', async ({ authenticatedPage }) => {
      const checkbox = dashboard.fileCheckbox('file1');
      await checkbox.check({ force: true }); // force acceptable: checkbox may be visually hidden but interactable
      await expect(checkbox).toBeChecked();
      await expect(authenticatedPage.getByText(/Entities_Selected/i)).toBeVisible();
    });

    test('Task 4: Search - Filtering', async ({ authenticatedPage }) => {
      const searchInput = dashboard.page.getByTestId('global-search-input');
      await searchInput.fill('AUDIT_TEST_FILE');
      await authenticatedPage.keyboard.press('Enter');

      await expect(dashboard.fileItem('file1')).toBeVisible();

      await searchInput.fill('NON_EXISTENT_ENTITY');
      await authenticatedPage.keyboard.press('Enter');

      // FIX: no waitForTimeout — web-first assertion auto-retries
      await expect(dashboard.fileItem('file1')).toBeHidden({ timeout: 10_000 });
    });

    test('Task 5: New Folder - Naming Constraints', async ({ authenticatedPage }) => {
      await authenticatedPage.route('**/api/folders', async (route) => {
        if (route.request().method() === 'POST') {
          return route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'ERR_VALIDATION', message: 'Contains invalid characters' }),
          });
        }
        return route.continue();
      });

      await dashboard.openNewFolderDialog();

      // FIX: no waitForTimeout — wait for input to be visible (already in openNewFolderDialog)
      await dashboard.promptInput.fill('Invalid/Folder*Name');

      await expect(dashboard.promptCommitBtn).toBeVisible({ timeout: 20_000 });
      await dashboard.promptCommitBtn.click();

      await expect(authenticatedPage.getByText(/ERR_VALIDATION/i).first()).toBeVisible({ timeout: 20_000 });
    });

    test('Task 7: Action Stability - Global Unresponsiveness', async () => {
      // Open and cancel the new-folder dialog twice — verifies no zombie state
      for (let i = 0; i < 2; i++) {
        await dashboard.openNewFolderDialog();
        await dashboard.dismissModal();
      }
      await expect(dashboard.initFolderBtn).toBeEnabled();
    });
  });

  // ── Trash View ──────────────────────────────────────────────────────────────
  test.describe('Trash View', () => {
    let trash: TrashPage;

    test.beforeEach(async ({ authenticatedPage }) => {
      trash = new TrashPage(authenticatedPage);
      await trash.mockRoutes({ trash: MOCK_TRASH });
      await trash.goto();
    });

    test('Task 3: Trash - Restore Action', async ({ authenticatedPage }) => {
      await authenticatedPage.route('**/api/trash/t1/restore', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'RESTORE_SUCCESS' }),
        }),
      );

      await trash.restore('t1');

      // FIX: scoped assertion via [role="alert"] instead of body
      await expect(authenticatedPage.getByRole('alert').filter({ hasText: /RESTORE/i })).toBeVisible({ timeout: 15_000 });
    });
  });
});
