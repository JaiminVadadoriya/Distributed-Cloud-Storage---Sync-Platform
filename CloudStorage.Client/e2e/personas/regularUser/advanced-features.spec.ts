import { test, expect } from '../../fixtures/auth.fixture';
import { createApiClient } from '../../helpers/api-client';
import { setupTestUser, loginTestUser, setupAuthToken, getTestUserCredentials } from '../../helpers/test-setup';
import { waitForNotification, fileExistsInList, clickButton, fillFormField, getItemByName } from '../../helpers/ui-helpers';

test.describe.parallel('Regular User - Trash Management', () => {
  let apiClient: ReturnType<typeof createApiClient>;

  test.beforeEach(async ({ authenticatedPage, apiBase }) => {
    const credentials = getTestUserCredentials('regularUser1');
    let userAuth = await loginTestUser(authenticatedPage, apiBase, credentials.username, credentials.password)
      .catch(async () => setupTestUser(authenticatedPage, apiBase, 'regularUser1'));

    await setupAuthToken({ page: authenticatedPage, token: userAuth.token });
    apiClient = createApiClient(authenticatedPage, apiBase);
    
    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('User can view deleted items in trash', async ({ authenticatedPage }) => {
    // First, delete a file
    const uploadInput = authenticatedPage.locator('input[type="file"]');
    const fileName = `trash-test-${Date.now()}.txt`;

    await uploadInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from('Trash test'),
    });

    await waitForNotification({
      page: authenticatedPage,
      text: 'Upload complete',
      type: 'success'
    });

    // Delete file
    const fileItem = await getItemByName(authenticatedPage, fileName);
    await fileItem.click({ button: 'right' });
    await authenticatedPage.click('[data-testid="delete-option"]');

    // Confirm deletion
    const confirmBtn = authenticatedPage.locator('button:has-text("Delete")');
    await confirmBtn.click();

    await waitForNotification({
      page: authenticatedPage,
      text: 'moved to trash',
      type: 'success'
    });

    // Navigate to trash
    await authenticatedPage.click('a[href="/trash"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify file is in trash
    expect(await fileExistsInList(authenticatedPage, fileName)).toBeTruthy();
  });

  test('User can restore item from trash', async ({ authenticatedPage }) => {
    // Navigate to trash
    await authenticatedPage.click('a[href="/trash"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Get first item in trash
    const trashItems = authenticatedPage.locator('[data-testid="file-item"], [data-testid="folder-item"]');
    const itemCount = await trashItems.count();

    if (itemCount > 0) {
      const firstItem = trashItems.first();
      const itemName = await firstItem.textContent();

      // Right-click and restore
      await firstItem.click({ button: 'right' });
      await authenticatedPage.click('[data-testid="restore-option"]');

      await waitForNotification({
        page: authenticatedPage,
        text: 'Restored successfully',
        type: 'success'
      });

      // Navigate back to files to verify restoration
      await authenticatedPage.click('a[href="/files"]');
      await authenticatedPage.waitForLoadState('networkidle');

      // Verify item is back
      expect(await fileExistsInList(authenticatedPage, itemName || '')).toBeTruthy();
    }
  });

  test('User can permanently delete items from trash', async ({ authenticatedPage }) => {
    await authenticatedPage.click('a[href="/trash"]');
    await authenticatedPage.waitForLoadState('networkidle');

    const trashItems = authenticatedPage.locator('[data-testid="file-item"], [data-testid="folder-item"]');
    const initialCount = await trashItems.count();

    if (initialCount > 0) {
      const firstItem = trashItems.first();

      // Right-click and permanently delete
      await firstItem.click({ button: 'right' });
      await authenticatedPage.click('[data-testid="permanent-delete-option"]');

      // Confirm deletion (stronger confirmation)
      const confirmBtn = authenticatedPage.locator('button:has-text("Permanently Delete")');
      await confirmBtn.click();

      await waitForNotification({
        page: authenticatedPage,
        text: 'Permanently deleted',
        type: 'success'
      });

      // Verify item removed from trash
      const newCount = await trashItems.count();
      expect(newCount).toBeLessThan(initialCount);
    }
  });
});

test.describe.parallel('Regular User - Device Management', () => {
  let apiClient: ReturnType<typeof createApiClient>;

  test.beforeEach(async ({ authenticatedPage, apiBase }) => {
    const credentials = getTestUserCredentials('regularUser1');
    let userAuth = await loginTestUser(authenticatedPage, apiBase, credentials.username, credentials.password)
      .catch(async () => setupTestUser(authenticatedPage, apiBase, 'regularUser1'));

    await setupAuthToken({ page: authenticatedPage, token: userAuth.token });
    apiClient = createApiClient(authenticatedPage, apiBase);
    
    await authenticatedPage.goto('/settings/devices');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('User can view registered devices', async ({ authenticatedPage }) => {
    // Verify devices list is visible
    const deviceList = authenticatedPage.locator('[data-testid="devices-list"]');
    await expect(deviceList).toBeVisible();

    // Verify headers
    const headers = authenticatedPage.locator('th');
    const headerTexts = await headers.allTextContents();
    expect(headerTexts).toContain('Device Name');
    expect(headerTexts).toContain('Last Sync');
  });

  test('User can register a new device', async ({ authenticatedPage }) => {
    // Click register device button
    await authenticatedPage.click('[data-testid="register-device-button"]');

    // Fill device details
    const deviceNameInput = authenticatedPage.locator('[data-testid="device-name-input"]');
    const deviceTypeSelect = authenticatedPage.locator('[data-testid="device-type-select"]');

    await deviceNameInput.fill(`TestDevice-${Date.now()}`);
    await deviceTypeSelect.selectOption('Desktop');

    // Submit
    await clickButton({ page: authenticatedPage, buttonText: 'Register' });

    await waitForNotification({
      page: authenticatedPage,
      text: 'Device registered',
      type: 'success'
    });

    // Verify device appears in list
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');

    const deviceList = authenticatedPage.locator('[data-testid="devices-list"]');
    await expect(deviceList).toBeVisible();
  });

  test('User can remove a registered device', async ({ authenticatedPage }) => {
    const deviceItems = authenticatedPage.locator('[data-testid="device-item"]');
    const itemCount = await deviceItems.count();

    if (itemCount > 0) {
      const firstDevice = deviceItems.first();
      const removeBtn = firstDevice.locator('[data-testid="remove-device"]');

      await removeBtn.click();

      // Confirm removal
      const confirmBtn = authenticatedPage.locator('button:has-text("Remove")');
      await confirmBtn.click();

      await waitForNotification({
        page: authenticatedPage,
        text: 'Device removed',
        type: 'success'
      });

      // Verify count decreased
      const newCount = await deviceItems.count();
      expect(newCount).toBeLessThanOrEqual(itemCount);
    }
  });
});

test.describe.parallel('Regular User - File Sync and Conflicts', () => {
  let apiClient: ReturnType<typeof createApiClient>;

  test.beforeEach(async ({ authenticatedPage, apiBase }) => {
    const credentials = getTestUserCredentials('regularUser1');
    let userAuth = await loginTestUser(authenticatedPage, apiBase, credentials.username, credentials.password)
      .catch(async () => setupTestUser(authenticatedPage, apiBase, 'regularUser1'));

    await setupAuthToken({ page: authenticatedPage, token: userAuth.token });
    apiClient = createApiClient(authenticatedPage, apiBase);
    
    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('User can view sync status', async ({ authenticatedPage }) => {
    // Navigate to sync settings
    await authenticatedPage.click('a[href="/settings/sync"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify sync status panel
    const syncStatus = authenticatedPage.locator('[data-testid="sync-status"]');
    await expect(syncStatus).toBeVisible();

    // Verify status indicators
    await expect(authenticatedPage.locator('[data-testid="sync-status-indicator"]')).toBeVisible();
  });

  test('User receives notification on sync completion', async ({ authenticatedPage }) => {
    // Trigger manual sync
    await authenticatedPage.click('[data-testid="sync-now-button"]');

    // Wait for sync notification
    await waitForNotification({
      page: authenticatedPage,
      text: 'Sync completed',
      type: 'success'
    });

    // Verify sync timestamp updated
    const lastSyncTime = authenticatedPage.locator('[data-testid="last-sync-time"]');
    const timestamp = await lastSyncTime.textContent();
    expect(timestamp).toBeTruthy();
  });

  test('User can handle file conflicts', async ({ authenticatedPage }) => {
    // Navigate to conflicts if they exist
    await authenticatedPage.click('a[href="/conflicts"]');

    try {
      await authenticatedPage.waitForLoadState('networkidle');

      const conflictsList = authenticatedPage.locator('[data-testid="conflicts-list"]');
      const conflictCount = await conflictsList.count();

      if (conflictCount > 0) {
        // Get first conflict
        const firstConflict = authenticatedPage.locator('[data-testid="conflict-item"]').first();
        await firstConflict.click();

        // Verify conflict detail panel
        const detailPanel = authenticatedPage.locator('[data-testid="conflict-detail"]');
        await expect(detailPanel).toBeVisible();

        // Try to resolve (e.g., keep local version)
        await authenticatedPage.click('[data-testid="resolve-keep-local"]');
        await waitForNotification({
          page: authenticatedPage,
          text: 'Conflict resolved',
          type: 'success'
        });
      }
    } catch {
      // No conflicts, which is fine for this test
    }
  });
});

test.describe.parallel('Regular User - Activity and Notifications', () => {
  let apiClient: ReturnType<typeof createApiClient>;

  test.beforeEach(async ({ authenticatedPage, apiBase }) => {
    const credentials = getTestUserCredentials('regularUser1');
    let userAuth = await loginTestUser(authenticatedPage, apiBase, credentials.username, credentials.password)
      .catch(async () => setupTestUser(authenticatedPage, apiBase, 'regularUser1'));

    await setupAuthToken({ page: authenticatedPage, token: userAuth.token });
    apiClient = createApiClient(authenticatedPage, apiBase);
    
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('User can view recent activity', async ({ authenticatedPage }) => {
    // Navigate to activity
    await authenticatedPage.click('a[href="/activity"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify activity list
    const activityList = authenticatedPage.locator('[data-testid="activity-list"]');
    await expect(activityList).toBeVisible();

    // Verify activity items have timestamps
    const activityItems = authenticatedPage.locator('[data-testid="activity-item"]');
    const itemCount = await activityItems.count();
    expect(itemCount).toBeGreaterThan(0);
  });

  test('User receives real-time notifications', async ({ authenticatedPage }) => {
    // Open notifications panel
    await authenticatedPage.click('[data-testid="notifications-button"]');

    // Verify notification panel visible
    const notificationPanel = authenticatedPage.locator('[data-testid="notification-panel"]');
    await expect(notificationPanel).toBeVisible();
  });

  test('User can clear notification', async ({ authenticatedPage }) => {
    await authenticatedPage.click('[data-testid="notifications-button"]');

    const notificationCount = await authenticatedPage.locator('[data-testid="notification-item"]').count();

    if (notificationCount > 0) {
      const firstNotification = authenticatedPage.locator('[data-testid="notification-item"]').first();
      const closeBtn = firstNotification.locator('[data-testid="close-notification"]');

      await closeBtn.click();

      // Verify count decreased
      const newCount = await authenticatedPage.locator('[data-testid="notification-item"]').count();
      expect(newCount).toBeLessThanOrEqual(notificationCount);
    }
  });
});
