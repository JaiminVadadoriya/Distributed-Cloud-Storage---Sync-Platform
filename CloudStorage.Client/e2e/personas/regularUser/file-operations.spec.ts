import { test, expect } from '../../fixtures/auth.fixture';
import path from 'path';
import fs from 'fs';

test.describe('Regular User Persona: File Operations', () => {
  const testFileName = `test-upload-${Date.now()}.txt`;
  let filePath: string;

  test.beforeEach(async ({}) => {
    // Create a temporary file for testing
    filePath = path.join(__dirname, testFileName);
    fs.writeFileSync(filePath, 'Hello CloudStorage E2E!');
  });

  test.afterEach(async () => {
    // Cleanup local test file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  test('should upload, rename, and delete a file', async ({ page, regularUserAuth }) => {
    // We navigate to dashboard as the logged-in regular user
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);

    // --- UPLOAD ---
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="init-node-btn"]'); // Dropdown trigger
    await page.click('button:has-text("Upload_Files")'); // Select "Upload Files" from dropdown
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    // Wait for upload to complete (check for toast or file in list)
    await expect(page.locator('app-notification-toast').last()).toContainText(/complete/i, { timeout: 30000 });
    await expect(page.locator('body')).toContainText(testFileName);

    // --- RENAME ---
    const fileItem = page.locator(`div[data-testid^="file-item-"]`).filter({ hasText: testFileName });
    await fileItem.click({ button: 'right' });
    
    const renameBtn = page.locator('[data-testid^="context-menu-item-RENAME_"]');
    await renameBtn.click();

    const newFileName = `renamed-${testFileName}`;
    const modal = page.locator('app-prompt-modal');
    await modal.locator('input').fill(newFileName);
    await modal.locator('button:has-text("Commit_Sequence")').click();

    await expect(page.locator('body')).toContainText(newFileName);
    await expect(page.locator('body')).not.toContainText(testFileName);

    // --- DELETE (To Trash) ---
    const renamedItem = page.locator(`div[data-testid^="file-item-"]`).filter({ hasText: newFileName });
    await renamedItem.click({ button: 'right' });
    
    const deleteBtn = page.locator('[data-testid^="context-menu-item-DELETE_"]');
    await deleteBtn.click();

    // Confirm deletion in modal
    const confirmModal = page.locator('app-confirm-modal');
    await confirmModal.locator('button:has-text("Confirm")').click();

    // Verify it's gone from dashboard
    await expect(page.locator(`div[data-testid^="file-item-"]`).filter({ hasText: newFileName })).toBeHidden();
  });
});
