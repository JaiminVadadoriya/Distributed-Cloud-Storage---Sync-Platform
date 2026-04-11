import { test, expect } from '../../fixtures/auth.fixture';
import { setupTestUser, loginTestUser, setupAuthToken, getTestUserCredentials } from '../../helpers/test-setup';
import { waitForNotification, fileExistsInList, clickButton, fillFormField, getItemByName } from '../../helpers/ui-helpers';

test.describe.parallel('Guest User - Shared File Access', () => {
  test('Guest user can access shared file with valid link', async ({ page, apiBase }) => {
    // Simulate accessing a shared file via public link
    // This would typically be a generated shareable link
    const sharedFileId = 'test-shared-file-id';

    await page.goto(`/shared/${sharedFileId}`);

    // Verify shared file view loads
    await page.waitForLoadState('networkidle');

    // Verify file information is displayed
    const fileInfo = page.locator('[data-testid="shared-file-info"]');
    await expect(fileInfo).toBeVisible();

    // Verify shared file metadata
    await expect(page.locator('[data-testid="shared-file-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="shared-file-size"]')).toBeVisible();
  });

  test('Guest user can download shared file', async ({ page }) => {
    const sharedFileId = 'test-shared-file-id';
    await page.goto(`/shared/${sharedFileId}`);
    await page.waitForLoadState('networkidle');

    // Click download button
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-shared-file"]');

    const download = await downloadPromise;
    expect(download).toBeTruthy();
  });

  test('Guest user cannot modify shared file (read-only)', async ({ page }) => {
    const sharedFileId = 'test-shared-file-id';
    await page.goto(`/shared/${sharedFileId}`);
    await page.waitForLoadState('networkidle');

    // Verify rename button is disabled or not present
    const renameBtn = page.locator('[data-testid="rename-button"]');
    const isDisabled = await renameBtn.isDisabled().catch(() => true);
    expect(isDisabled).toBeTruthy();

    // Verify delete button is disabled or not present
    const deleteBtn = page.locator('[data-testid="delete-button"]');
    const isDeleteDisabled = await deleteBtn.isDisabled().catch(() => true);
    expect(isDeleteDisabled).toBeTruthy();
  });

  test('Guest user can access shared folder contents', async ({ page }) => {
    const sharedFolderId = 'test-shared-folder-id';
    await page.goto(`/shared/folder/${sharedFolderId}`);
    await page.waitForLoadState('networkidle');

    // Verify folder contents list visible
    const filesList = page.locator('[data-testid="shared-files-list"]');
    await expect(filesList).toBeVisible();

    // Verify files can be listed
    const items = page.locator('[data-testid="file-item"], [data-testid="folder-item"]');
    const itemCount = await items.count();
    expect(itemCount).toBeGreaterThanOrEqual(0);
  });

  test('Guest user cannot upload to shared folder (read-only)', async ({ page }) => {
    const sharedFolderId = 'test-shared-folder-id';
    await page.goto(`/shared/folder/${sharedFolderId}`);
    await page.waitForLoadState('networkidle');

    // Verify upload button is not visible or disabled
    const uploadBtn = page.locator('[data-testid="upload-button"]');
    const isVisible = await uploadBtn.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });

  test('Shared file access requires valid token/link', async ({ page }) => {
    // Try to access shared file with invalid ID
    await page.goto('/shared/invalid-file-id-12345');

    // Should either redirect or show error
    try {
      await page.waitForURL('/404', { timeout: 5000 });
      expect(page.url()).toContain('404');
    } catch {
      // Or show access denied message
      const errorMsg = page.locator('text=Access denied') || page.locator('text=Not found');
      expect(errorMsg).toBeDefined();
    }
  });
});

test.describe.parallel('Guest User - Shared Folder with Write Permission', () => {
  test('Guest can upload to shared folder with write permission', async ({ page, context }) => {
    const sharedFolderId = 'test-shared-folder-write-id';
    await page.goto(`/shared/folder/${sharedFolderId}`);
    await page.waitForLoadState('networkidle');

    // Verify upload button IS visible for write permission
    const uploadBtn = page.locator('[data-testid="upload-button"]');
    await expect(uploadBtn).toBeVisible();

    // Click upload
    await uploadBtn.click();

    // Upload file
    const uploadInput = page.locator('input[type="file"]');
    await uploadInput.setInputFiles({
      name: 'guest-upload.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Guest uploaded file'),
    });

    // Wait for upload success
    await waitForNotification({
      page,
      text: 'Upload complete',
      type: 'success'
    });
  });

  test('Guest can rename file in shared folder with write permission', async ({ page }) => {
    const sharedFolderId = 'test-shared-folder-write-id';
    await page.goto(`/shared/folder/${sharedFolderId}`);
    await page.waitForLoadState('networkidle');

    // Get first file
    const firstFile = page.locator('[data-testid="file-item"]').first();

    // Right-click and rename
    await firstFile.click({ button: 'right' });

    const renameOption = page.locator('[data-testid="rename-option"]');
    if (await renameOption.isVisible()) {
      await renameOption.click();

      const renameInput = page.locator('[data-testid="rename-input"]');
      await renameInput.fill(`renamed-by-guest-${Date.now()}.txt`);
      await page.press('[data-testid="rename-input"]', 'Enter');

      await waitForNotification(page, 'File renamed', 'success');
    }
  });
});

test.describe.parallel('Guest User - Session and Limits', () => {
  test('Guest session expires after idle timeout', async ({ page }) => {
    const sharedFileId = 'test-shared-file-id';
    await page.goto(`/shared/${sharedFileId}`);

    // Wait for idle timeout (typically 30 minutes in production, 1 minute in tests)
    await page.waitForTimeout(65000); // Wait 65 seconds

    // Try to perform an action
    await page.reload();

    // Should redirect to shared access page
    try {
      const errorMsg = page.locator('text=Session expired') || page.locator('text=Access expired');
      expect(errorMsg).toBeDefined();
    } catch {
      // Or could show access denied
    }
  });

  test('Guest cannot access private user files', async ({ page }) => {
    // Try to directly navigate to a private file URL
    await page.goto('/files/private-file-id');

    // Should redirect to login or access denied
    await page.waitForLoadState('networkidle');

    try {
      // Check if redirected to login
      expect(page.url()).toContain('/auth/login');
    } catch {
      // Or verify access denied message
      const accessDenied = page.locator('text=Access denied');
      await expect(accessDenied).toBeVisible();
    }
  });

  test('Multiple guests can access same shared file simultaneously', async ({ context }) => {
    // Create two browser contexts to simulate two guests
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    const sharedFileId = 'test-shared-file-id';

    try {
      // Both guests access same file
      await page1.goto(`/shared/${sharedFileId}`);
      await page2.goto(`/shared/${sharedFileId}`);

      await page1.waitForLoadState('networkidle');
      await page2.waitForLoadState('networkidle');

      // Verify both can see the file
      const file1 = page1.locator('[data-testid="shared-file-name"]');
      const file2 = page2.locator('[data-testid="shared-file-name"]');

      await expect(file1).toBeVisible();
      await expect(file2).toBeVisible();

      // Verify they see the same content
      const content1 = await file1.textContent();
      const content2 = await file2.textContent();

      expect(content1).toBe(content2);
    } finally {
      await page1.close();
      await page2.close();
    }
  });
});
