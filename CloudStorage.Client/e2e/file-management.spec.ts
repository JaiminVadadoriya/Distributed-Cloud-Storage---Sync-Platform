import { test, expect } from './fixtures/auth.fixture';
import { DashboardPage } from './pages/dashboard.page';
import { MOCK_FILES } from './mocks/api-mocks';

test.describe('File Management', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ authenticatedPage: page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.mockRoutes();
    await page.setViewportSize({ width: 1920, height: 1080 });
    await dashboard.goto('f1');
  });

  test('should list files correctly', async () => {
    await dashboard.expectFilesCount(2);
    await dashboard.expectFileVisible('document.pdf');
    await dashboard.expectFileVisible('image.png');
  });

  test('should rename a file (mocked)', async ({ page }) => {
    // Override just the rename endpoint and the subsequent file list refresh
    await page.route('**/api/files/f1/rename', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Renamed' }),
      }),
    );
    await page.route('**/api/files', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              { ...MOCK_FILES[0], fileName: 'renamed-doc.pdf' },
              MOCK_FILES[1],
            ],
          }),
        });
      }
      return route.continue();
    });

    await dashboard.rename('f1', 'renamed-doc.pdf');
    await dashboard.expectFileVisible('renamed-doc.pdf');
  });

  test('should delete a file (mocked)', async ({ page }) => {
    await page.route('**/api/files/f2', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Deleted' }),
      }),
    );
    await page.route('**/api/files', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [MOCK_FILES[0]] }),
        });
      }
      return route.continue();
    });

    await dashboard.openContextMenu(dashboard.fileItem('f2'));
    await dashboard.clickContextMenuItem('PURGE_RECORD');

    // Wait for the confirmation dialog and confirm
    const confirmBtn = page.getByRole('button', { name: 'Confirm_Sequence' });
    await expect(confirmBtn).toBeVisible({ timeout: 10_000 });
    await confirmBtn.click();

    // FIX: wait for the file count to change — no waitForTimeout
    await dashboard.expectFilesCount(1);
    await expect(dashboard.fileItem('f2')).toBeHidden();
  });

  test('should filter files via search', async ({ page }) => {
    const searchInput = page.getByTestId('contextual-search-input');

    await searchInput.fill('document');

    // FIX: no waitForTimeout — use web-first assertion which auto-retries
    await dashboard.expectFileVisible('document.pdf');
    await dashboard.expectFileHidden('image.png');
  });
});
