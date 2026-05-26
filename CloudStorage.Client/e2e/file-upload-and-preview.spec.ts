import { test, expect } from './fixtures/auth.fixture';
import path from 'path';

test.describe('File Upload & Preview Flow', () => {
  const testFile = {
    name: 'upload-test.json',
    path: path.join(__dirname, 'data', 'test-files', 'sample.json'),
    id: 'UL_MOCK_123',
    content: '{"status": "uploaded"}'
  };

  test('should complete full upload lifecycle and preview the file', async ({ authenticatedPage: page }) => {
    const uploadedFiles: any[] = [];


    // 1. Mock Upload Initiation
    await page.route('**/api/files/initiate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            sessionId: 'SESSION_MOCK_999',
            fileName: testFile.name,
            totalChunks: 1
          }
        })
      });
    });

    // 2. Mock Chunk Upload
    await page.route('**/api/files/chunks', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { chunkIndex: 0, sessionId: 'SESSION_MOCK_999' }
        })
      });
    });

    // 3. Mock Upload Completion
    await page.route('**/api/files/complete', async route => {
      uploadedFiles.push({
        id: testFile.id,
        fileName: testFile.name,
        size: 1024,
        createdAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
        isShared: false,
        versionVector: null
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { fileId: testFile.id, fileName: testFile.name }
        })
      });
    });

    // 4. Mock File List to include the new file AFTER upload completes
    await page.route('**/api/files', async route => {
      if (route.request().method() === 'GET') {
        const files = [
          {
            id: 'existing-1',
            fileName: 'existing-file.txt',
            size: 1024,
            createdAt: new Date().toISOString(),
            lastModifiedAt: new Date().toISOString(),
            isShared: false,
            versionVector: null
          }
        ];

        files.push(...uploadedFiles);


        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: files })
        });
      } else {
        await route.continue();
      }
    });

    // 5. Mock Preview and Download for the new file
    await page.route(`**/api/files/${testFile.id}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: testFile.id,
            fileName: testFile.name,
            size: 1024,
            createdAt: new Date().toISOString(),
            lastModifiedAt: new Date().toISOString(),
            isShared: false
          }
        })
      });
    });

    await page.route(`**/api/files/${testFile.id}/download`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: testFile.content
      });
    });

    // --- Action ---
    await page.goto('/dashboard');
    
    // Ensure we are in list view
    await page.getByRole('button', { name: /view/i }).first().click().catch(() => {});

    // 6. Upload JSON File
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTestId('upload-data-btn').click(),
    ]);

    const completeResponse = page.waitForResponse('**/api/files/complete');
    await fileChooser.setFiles(testFile.path);
    await completeResponse;

    // Small delay to allow Angular's reactive cycle & refresh to finish
    await page.waitForTimeout(1000);

    // Dismiss the upload modal so it doesn't block the file explorer
    await page.getByTestId('close-upload-modal-btn').click();

    // NO RELOAD: Verification that reactive refresh works
    const fileLocator = page.getByText(testFile.name).first();
    await expect(fileLocator).toBeVisible({ timeout: 15000 });

    // Open for preview
    await page.getByText(testFile.name).dblclick();
    
    // Check URL & content
    await expect(page).toHaveURL(new RegExp(`/preview/${testFile.id}`));
    await expect(page.locator('h1')).toContainText(testFile.name);
    await expect(page.locator('pre')).toContainText('status');
    await expect(page.locator('pre')).toContainText('uploaded');

    // Go back to dashboard for next upload
    await page.getByRole('link', { name: /dashboard/i }).click();

    // 7. Mock CSV Upload
    const csvFile = {
      name: 'upload-test.csv',
      path: path.join(__dirname, 'data', 'test-files', 'sample.csv'),
      id: 'UL_MOCK_CSV'
    };

    await page.route(`**/api/files/${csvFile.id}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: csvFile.id,
            fileName: csvFile.name,
            size: 512,
            createdAt: new Date().toISOString(),
            lastModifiedAt: new Date().toISOString(),
            isShared: false
          }
        })
      });
    });

    await page.route(`**/api/files/${csvFile.id}/download`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        body: 'id,val\n1,Alpha\n2,Beta'
      });
    });

    const [csvChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTestId('upload-data-btn').click(),
    ]);
    
    const csvComplete = page.waitForResponse('**/api/files/complete');
    // Update the mock state for the CSV file before completion
    await page.route('**/api/files/complete', async route => {
      uploadedFiles.push({
        id: csvFile.id,
        fileName: csvFile.name,
        size: 512,
        createdAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
        isShared: false,
        versionVector: null
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { fileId: csvFile.id, fileName: csvFile.name }
        })
      });
    });

    await csvChooser.setFiles(csvFile.path);

    await csvComplete;

     // Dismiss the upload modal so it doesn't block the file explorer
    await page.getByTestId('close-upload-modal-btn').click();

    // NO RELOAD: Verification that reactive refresh works
    await expect(page.getByText(csvFile.name)).toBeVisible();
    await page.getByText(csvFile.name).dblclick();

    // Verify CSV table
    await expect(page.locator('table tr')).toHaveCount(3); // Header + 2 rows
    await expect(page.locator('table')).toContainText('Alpha');
  });
});
