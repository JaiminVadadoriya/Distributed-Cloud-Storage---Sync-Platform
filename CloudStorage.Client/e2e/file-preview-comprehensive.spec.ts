import { test, expect } from './fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Comprehensive File Preview', () => {
  const testFilesDir = path.join(__dirname, 'data', 'test-files');

  const testCases = [
    { id: 'txt1', name: 'sample.txt', type: 'text', contentType: 'text/plain', selector: 'pre' },
    { id: 'csv1', name: 'sample.csv', type: 'text', contentType: 'text/csv', selector: 'table' },
    { id: 'json1', name: 'sample.json', type: 'text', contentType: 'application/json', selector: 'pre' },
    { id: 'ts1', name: 'sample.ts', type: 'text', contentType: 'text/typescript', selector: 'pre' },
    { id: 'md1', name: 'sample.md', type: 'text', contentType: 'text/markdown', selector: 'pre' },
  ];

  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Basic setup for all tests
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  for (const tc of testCases) {
    test(`should correctly preview ${tc.name}`, async ({ authenticatedPage: page }) => {
      // 1. Mock file metadata
      await page.route(`**/api/files/${tc.id}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: tc.id,
              fileName: tc.name,
              size: 1024,
              createdAt: new Date().toISOString(),
              lastModifiedAt: new Date().toISOString(),
              isShared: false,
              owner: 'TESTRUNNER'
            }
          })
        });
      });

      // 2. Mock file content
      const filePath = path.join(testFilesDir, tc.name);
      const fileContent = fs.readFileSync(filePath);

      await page.route(`**/api/files/${tc.id}/download`, async route => {
        await route.fulfill({
          status: 200,
          contentType: tc.contentType,
          body: fileContent
        });
      });

      // 3. Navigate to preview
      await page.goto(`/preview/${tc.id}`);

      // 4. Verify preview content
      await expect(page.locator('h1')).toContainText(tc.name);
      
      const previewArea = page.locator('.min-h-\\[60vh\\]');
      await expect(previewArea).toBeVisible();

      // Check for specific renderer
      if (tc.selector) {
        await expect(previewArea.locator(tc.selector)).toBeVisible();
      }

      // Special check for CSV table
      if (tc.name === 'sample.csv') {
        await expect(previewArea.locator('table tr')).toHaveCount(4); // Header + 3 rows
      }

      // Check Preview_Mode label
      await expect(page.locator('p')).toContainText(`Preview_Mode: ${tc.type}`);
    });
  }

  // Add a special case for PDF (mocked with a dummy blob)
  test('should correctly preview PDF', async ({ authenticatedPage: page }) => {
    const pdfId = 'pdf1';
    const pdfName = 'test.pdf';

    await page.route(`**/api/files/${pdfId}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { 
            id: pdfId, 
            fileName: pdfName, 
            size: 5000, 
            createdAt: new Date().toISOString(),
            lastModifiedAt: new Date().toISOString(), 
            isShared: false,
            owner: 'TESTRUNNER' 
          }
        })
      });
    });

    await page.route(`**/api/files/${pdfId}/download`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }) // Dummy
      });
    });

    await page.goto(`/preview/${pdfId}`);
    await expect(page.locator('iframe')).toBeVisible();
    await expect(page.locator('p')).toContainText('Preview_Mode: pdf');
  });

  // Add a special case for unsupported files
  test('should show fallback for unsupported document types', async ({ authenticatedPage: page }) => {
    const docId = 'doc1';
    const docName = 'test.docx';

    await page.route(`**/api/files/${docId}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { 
            id: docId, 
            fileName: docName, 
            size: 10000, 
            createdAt: new Date().toISOString(),
            lastModifiedAt: new Date().toISOString(), 
            isShared: false,
            owner: 'TESTRUNNER' 
          }
        })
      });
    });

    await page.goto(`/preview/${docId}`);
    await expect(page.getByText('Document_Preview')).toBeVisible();
    await expect(page.getByText('Rich preview for docx files is best viewed in dedicated software.')).toBeVisible();
  });
});
