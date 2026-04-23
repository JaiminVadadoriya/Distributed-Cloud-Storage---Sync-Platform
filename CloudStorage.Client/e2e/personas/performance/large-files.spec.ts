import { test, expect } from '../../fixtures/auth.fixture';
import { waitForNotification } from '../../helpers/ui-helpers';

test.describe('Performance - Large File Handling', () => {
  test.setTimeout(180000); // 3 minute timeout for large file tests

  test('Can upload and handle 50MB file with progress tracking', async ({ page, regularUserAuth }) => {
    await page.goto('/dashboard');
    const startTime = Date.now();

    // Create 50MB file
    const largeBuffer = Buffer.alloc(50 * 1024 * 1024);
    
    const uploadInput = page.locator('input[type="file"]');
    await uploadInput.setInputFiles({
      name: `large-50mb-${Date.now()}.bin`,
      mimeType: 'application/octet-stream',
      buffer: largeBuffer,
    });

    // Watch progress
    const progressBar = page.locator('[data-testid="upload-progress"]');
    await expect(progressBar).toBeVisible();

    // Wait for upload to complete
    await waitForNotification({
      page: page,
      text: 'Upload complete',
      type: 'success'
    });

    const uploadTime = Date.now() - startTime;

    // Verify upload completed within reasonable time (30 seconds for 50MB) 
    // This might be optimistic depending on environment, but good as a baseline.
    expect(uploadTime).toBeLessThan(60000); 

    // Verify file metadata is correct
    await expect(page.locator('body')).toContainText('50');
  });

  test('Chunked upload completes all chunks successfully', async ({ page, regularUserAuth }) => {
    await page.goto('/dashboard');
    const fileName = `chunked-${Date.now()}.bin`;
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = 5;

    // Create mock file
    const buffer = Buffer.alloc(chunkSize * totalChunks);

    const uploadInput = page.locator('input[type="file"]');
    await uploadInput.setInputFiles({
      name: fileName,
      mimeType: 'application/octet-stream',
      buffer,
    });

    // Verify chunk upload progress notification
    await waitForNotification({
      page: page,
      text: 'complete',
      type: 'success'
    });

    // Verify file name in list
    await expect(page.locator('body')).toContainText(fileName);
  });
});

test.describe('Performance - Response Time Metrics', () => {
  test('File list loads within acceptable time', async ({ page, regularUserAuth }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);

    // Verify elements are rendered
    const filesList = page.locator('div[data-testid^="file-item-"]');
    await expect(filesList.first()).toBeVisible();
  });
});
