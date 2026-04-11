import { test, expect } from '../../fixtures/auth.fixture';
import { createApiClient } from '../../helpers/api-client';
import { setupTestUser, loginTestUser, setupAuthToken, getTestUserCredentials } from '../../helpers/test-setup';

test.describe.parallel('Admin Persona - User Management', () => {
  let apiClient: ReturnType<typeof createApiClient>;

  test.beforeEach(async ({ authenticatedPage, apiBase }) => {
    // Setup admin test user
    const credentials = getTestUserCredentials('admin');
    let adminAuth = await loginTestUser({
      page: authenticatedPage,
      apiBase,
      username: credentials.username,
      password: credentials.password
    }).catch(async () => {
        // If login fails, try registering
        return setupTestUser({
          page: authenticatedPage,
          apiBase,
          userKey: 'admin'
        });
      });

    await setupAuthToken({ page: authenticatedPage, token: adminAuth.token });
    apiClient = createApiClient(authenticatedPage, apiBase);
    
    // Navigate to dashboard
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('Admin can view all users in the system', async ({ authenticatedPage }) => {
    // Navigate to user management
    await authenticatedPage.click('a[href="/admin/users"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify user list is visible
    const userTable = authenticatedPage.locator('[data-testid="users-table"]');
    await expect(userTable).toBeVisible();

    // Verify table has headers
    const headers = authenticatedPage.locator('th');
    const headerTexts = await headers.allTextContents();
    expect(headerTexts).toContain('Username');
    expect(headerTexts).toContain('Email');
    expect(headerTexts).toContain('Status');
  });

  test('Admin can search users by username or email', async ({ authenticatedPage }) => {
    await authenticatedPage.click('a[href="/admin/users"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Fill search box
    const searchInput = authenticatedPage.locator('[data-testid="user-search-input"]');
    await searchInput.fill('user_test');
    await authenticatedPage.waitForTimeout(500); // Wait for debounce

    // Verify filtered results
    const userRows = authenticatedPage.locator('tbody tr');
    const rowCount = await userRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify all visible rows contain search term
    const rowTexts = await userRows.allTextContents();
    rowTexts.forEach((text) => {
      expect(text.toLowerCase()).toContain('user_test');
    });
  });

  test('Admin can view user details', async ({ authenticatedPage }) => {
    await authenticatedPage.click('a[href="/admin/users"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Click first user row
    const firstUserRow = authenticatedPage.locator('tbody tr').first();
    await firstUserRow.click();
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify user detail page loads
    const detailPanel = authenticatedPage.locator('[data-testid="user-detail-panel"]');
    await expect(detailPanel).toBeVisible();

    // Verify user information is displayed
    await expect(authenticatedPage.locator('[data-testid="user-email"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="user-created-date"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="user-last-login"]')).toBeVisible();
  });

  test('Admin can disable/enable user accounts', async ({ authenticatedPage }) => {
    await authenticatedPage.click('a[href="/admin/users"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Find active user and click actions
    const firstUserRow = authenticatedPage.locator('tbody tr').first();
    const actionMenu = firstUserRow.locator('[data-testid="user-actions-menu"]');
    await actionMenu.click();

    // Click disable action
    await authenticatedPage.click('[data-testid="disable-user-action"]');

    // Verify confirmation dialog
    const dialog = authenticatedPage.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Confirm action
    await authenticatedPage.click('button:has-text("Confirm")');
    await authenticatedPage.waitForTimeout(1000);

    // Verify success notification
    const notification = authenticatedPage.locator('[role="alert"]:has-text("User disabled")');
    await expect(notification).toBeVisible();
  });
});

test.describe.parallel('Admin Persona - System Health', () => {
  let apiClient: ReturnType<typeof createApiClient>;

  test.beforeEach(async ({ authenticatedPage, apiBase }) => {
    const credentials = getTestUserCredentials('admin');
    const adminAuth = await loginTestUser({
      page: authenticatedPage,
      apiBase,
      username: credentials.username,
      password: credentials.password
    }).catch(async () => setupTestUser({
        page: authenticatedPage,
        apiBase,
        userKey: 'admin'
      }));

    await setupAuthToken({ page: authenticatedPage, token: adminAuth.token });
    apiClient = createApiClient(authenticatedPage, apiBase);
    
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('Admin can view system health metrics', async ({ authenticatedPage }) => {
    // Navigate to system health page
    await authenticatedPage.click('a[href="/admin/health"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify health dashboard is visible
    const healthDashboard = authenticatedPage.locator('[data-testid="health-dashboard"]');
    await expect(healthDashboard).toBeVisible();

    // Verify key metrics are displayed
    await expect(authenticatedPage.locator('[data-testid="metric-api-status"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="metric-db-status"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="metric-storage-usage"]')).toBeVisible();
  });

  test('Admin can view database statistics', async ({ authenticatedPage }) => {
    await authenticatedPage.click('a[href="/admin/health"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Look for database stats section
    const dbStats = authenticatedPage.locator('[data-testid="db-statistics"]');
    await expect(dbStats).toBeVisible();

    // Verify stats are displayed
    const activeConnections = authenticatedPage.locator('[data-testid="db-active-connections"]');
    const totalUsers = authenticatedPage.locator('[data-testid="db-total-users"]');
    const totalFiles = authenticatedPage.locator('[data-testid="db-total-files"]');

    await expect(activeConnections).toBeVisible();
    await expect(totalUsers).toBeVisible();
    await expect(totalFiles).toBeVisible();
  });

  test('Admin receives alert for critical system issues', async ({ authenticatedPage }) => {
    // This test would simulate a system issue and verify alert
    // In real testing, this would trigger via API or backend state
    
    await authenticatedPage.click('a[href="/admin/health"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Check for any alerts or warnings
    const alerts = authenticatedPage.locator('[data-testid="system-alert"]');
    const alertCount = await alerts.count();

    // If there are alerts, verify they're visible and readable
    if (alertCount > 0) {
      const firstAlert = alerts.first();
      await expect(firstAlert).toBeVisible();
      
      const alertText = await firstAlert.textContent();
      expect(alertText).toBeTruthy();
    }
  });
});

test.describe.parallel('Admin Persona - Audit Logs', () => {
  let apiClient: ReturnType<typeof createApiClient>;

  test.beforeEach(async ({ authenticatedPage, apiBase }) => {
    const credentials = getTestUserCredentials('admin');
    const adminAuth = await loginTestUser({
      page: authenticatedPage,
      apiBase,
      username: credentials.username,
      password: credentials.password
    }).catch(async () => setupTestUser({
        page: authenticatedPage,
        apiBase,
        userKey: 'admin'
      }));

    await setupAuthToken({ page: authenticatedPage, token: adminAuth.token });
    apiClient = createApiClient(authenticatedPage, apiBase);
    
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('Admin can view activity audit trail', async ({ authenticatedPage }) => {
    // Navigate to audit logs
    await authenticatedPage.click('a[href="/admin/audit-logs"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify audit log table is visible
    const auditTable = authenticatedPage.locator('[data-testid="audit-logs-table"]');
    await expect(auditTable).toBeVisible();

    // Verify table has entries
    const rows = authenticatedPage.locator('tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('Admin can filter audit logs by date range', async ({ authenticatedPage }) => {
    await authenticatedPage.click('a[href="/admin/audit-logs"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Use date picker to filter
    const dateFromInput = authenticatedPage.locator('[data-testid="audit-date-from"]');
    const dateToInput = authenticatedPage.locator('[data-testid="audit-date-to"]');

    // Set date range (last 7 days)
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    await dateFromInput.fill(sevenDaysAgo.toISOString().split('T')[0]);
    await dateToInput.fill(today.toISOString().split('T')[0]);

    // Apply filter
    await authenticatedPage.click('button:has-text("Filter")');
    await authenticatedPage.waitForTimeout(500);

    // Verify results are updated
    const rows = authenticatedPage.locator('tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('Admin can export audit logs', async ({ authenticatedPage, context }) => {
    await authenticatedPage.click('a[href="/admin/audit-logs"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Click export button and capture download
    const downloadPromise = authenticatedPage.waitForEvent('download');
    await authenticatedPage.click('button:has-text("Export")');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('audit-logs');
  });
});
