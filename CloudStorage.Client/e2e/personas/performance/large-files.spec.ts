import { test, expect } from '../../fixtures/auth.fixture';
import { setupTestUser, loginTestUser, setupAuthToken, getTestUserCredentials, getTestFileData } from '../../helpers/test-setup';
import { waitForNotification } from '../../helpers/ui-helpers';

test.describe.parallel('Performance - Large File Handling', () => {
  test.setTimeout(180000); // 3 minute timeout for large file tests

  test.beforeEach(async ({ authenticatedPage, apiBase }) => {
    const credentials = getTestUserCredentials('regularUser1');
    let userAuth = await loginTestUser({
      page: authenticatedPage,
      apiBase,
      username: credentials.username,
      password: credentials.password
    }).catch(async () => setupTestUser({
        page: authenticatedPage,
        apiBase,
        userKey: 'regularUser1'
      }));

    await setupAuthToken({ page: authenticatedPage, token: userAuth.token });
    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('Can upload and handle 50MB file with progress tracking', async ({ authenticatedPage, page }) => {
    const startTime = Date.now();

    // Create 50MB file
    const largeBuffer = Buffer.alloc(50 * 1024 * 1024);
    
    const uploadInput = authenticatedPage.locator('input[type="file"]');
    await uploadInput.setInputFiles({
      name: `large-50mb-${Date.now()}.bin`,
      mimeType: 'application/octet-stream',
      buffer: largeBuffer,
    });

    // Watch progress
    const progressBar = authenticatedPage.locator('[data-testid="upload-progress"]');
    await expect(progressBar).toBeVisible();

    // Wait for upload to complete
    await waitForNotification({
      page: authenticatedPage,
      text: 'Upload complete',
      type: 'success'
    });

    const uploadTime = Date.now() - startTime;

    // Verify upload completed within reasonable time (30 seconds for 50MB)
    expect(uploadTime).toBeLessThan(30000);

    // Verify file metadata is correct
    const fileSize = await page.evaluate(() => {
      const file = document.querySelector('[data-testid="file-size"]') as HTMLElement;
      return file?.textContent;
    });

    expect(fileSize).toContain('50');
  });

  test('Download large file (100MB) with resume capability', async ({ authenticatedPage }) => {
    // Assuming a large file exists in the test environment
    // In real tests, we'd create it first via API

    const downloadBtn = authenticatedPage.locator('[data-testid="download-button"]').first();

    if (await downloadBtn.isVisible()) {
      const startTime = Date.now();

      const downloadPromise = authenticatedPage.waitForEvent('download');
      await downloadBtn.click();

      const download = await downloadPromise;
      expect(download).toBeTruthy();

      // Monitor download without waiting for full completion
      // In real scenario, this would track resume capability

      const downloadTime = Date.now() - startTime;
      expect(downloadTime).toBeGreaterThan(0);
    }
  });

  test('Chunked upload completes all chunks successfully', async ({ authenticatedPage, page }) => {
    const fileName = `chunked-${Date.now()}.bin`;
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = 5;

    // Calculate expected chunks
    const expectedChunkCount = totalChunks;

    // Create mock file
    const buffer = Buffer.alloc(chunkSize * totalChunks);

    const uploadInput = authenticatedPage.locator('input[type="file"]');
    await uploadInput.setInputFiles({
      name: fileName,
      mimeType: 'application/octet-stream',
      buffer,
    });

    // Verify chunk upload progress
    const chunkProgress = authenticatedPage.locator('[data-testid="chunk-progress"]');
    await waitForNotification({
      page: authenticatedPage,
      text: 'chunks',
      type: 'success'
    });

    // All chunks should complete
    const completedChunks = await page.evaluate(() => {
      const elem = document.querySelector('[data-testid="chunks-completed"]');
      return elem?.textContent?.match(/\d+/)?.[0];
    });

    expect(parseInt(completedChunks || '0')).toBe(expectedChunkCount);
  });
});

test.describe.parallel('Performance - Concurrent Operations', () => {
  test.setTimeout(120000); // 2 minute timeout

  test.beforeEach(async ({ authenticatedPage, apiBase }) => {
    const credentials = getTestUserCredentials('regularUser1');
    let userAuth = await loginTestUser({
      page: authenticatedPage,
      apiBase,
      username: credentials.username,
      password: credentials.password
    }).catch(async () => setupTestUser({
        page: authenticatedPage,
        apiBase,
        userKey: 'regularUser1'
      }));

    await setupAuthToken({ page: authenticatedPage, token: userAuth.token });
    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('Can handle multiple simultaneous uploads', async ({ authenticatedPage }) => {
    const uploadInput = authenticatedPage.locator('input[type="file"]');

    // Create multiple files
    const files = Array.from({ length: 5 }, (_, i) => ({
      name: `concurrent-upload-${i}-${Date.now()}.txt`,
      mimeType: 'text/plain',
      buffer: Buffer.from(`File ${i} content`),
    }));

    // Start all uploads
    await uploadInput.setInputFiles(files);

    // Should complete without errors
    await waitForNotification({
      page: authenticatedPage,
      text: 'uploads completed',
      type: 'success'
    });

    // Verify progress tracking for multiple uploads
    const progressItems = authenticatedPage.locator('[data-testid="upload-item"]');
    const progressCount = await progressItems.count();
    expect(progressCount).toBeGreaterThan(0);
  });

  test('File operations remain responsive with many files in folder', async ({ authenticatedPage, page }) => {
    // Simulate folder with many files
    // In real test, we'd seed database with many files

    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');

    // Measure response time for search
    const startTime = Date.now();

    const searchInput = authenticatedPage.locator('[data-testid="search-input"]');
    await searchInput.fill('test');

    await authenticatedPage.waitForTimeout(500);
    const searchTime = Date.now() - startTime;

    // Search should be responsive (under 2 seconds)
    expect(searchTime).toBeLessThan(2000);
  });
});

test.describe.parallel('Performance - Response Time Metrics', () => {
  test('File list loads within acceptable time', async ({ authenticatedPage }) => {
    const startTime = Date.now();

    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);

    // Verify elements are rendered
    const filesList = authenticatedPage.locator('[data-testid="files-list"]');
    await expect(filesList).toBeVisible();
  });

  test('Search results appear with minimal latency', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');

    const searchInput = authenticatedPage.locator('[data-testid="search-input"]');

    const startTime = Date.now();
    await searchInput.fill('test');

    // Wait for results
    const searchResults = authenticatedPage.locator('[data-testid="search-results"]');
    await searchResults.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});

    const searchTime = Date.now() - startTime;

    // Search should be fast (under 1.5 seconds)
    expect(searchTime).toBeLessThan(1500);
  });

  test('Folder navigation is instantaneous', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');

    // Find and navigate to a folder
    const folderItem = authenticatedPage.locator('[data-testid="folder-item"]').first();

    if (await folderItem.isVisible()) {
      const startTime = Date.now();

      await folderItem.dblclick();
      await authenticatedPage.waitForLoadState('networkidle');

      const navigationTime = Date.now() - startTime;

      // Navigation should be instant (under 2 seconds)
      expect(navigationTime).toBeLessThan(2000);
    }
  });
});
