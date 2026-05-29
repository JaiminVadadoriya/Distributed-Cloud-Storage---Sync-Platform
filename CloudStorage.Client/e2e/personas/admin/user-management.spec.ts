import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Admin Persona: User Management', () => {

  test('should access admin users management page', async ({ page, adminUserAuth }) => {
    // Navigate to admin users directly
    await page.goto('/admin/users');

    // Verify User Management header
    await expect(page.locator('h1')).toContainText(/user management/i);

    // Verify at least one user exists in the list (the admin themselves or seeded users)
    const userRows = page.locator('table.user-table tbody tr');
    await expect(userRows.first()).toBeVisible({ timeout: 15000 });
    
    // Check if current user is in the list (using the username from users.json)
    await expect(page.locator('body')).toContainText('admin');
  });

  test('should view system health and metrics', async ({ page, adminUserAuth }) => {
    await page.goto('/admin/health');
    await expect(page.locator('h2')).toContainText(/system health/i);
    
    // Check for some health widgets
    await expect(page.locator('body')).toContainText(/database/i);
    await expect(page.locator('body')).toContainText(/healthy/i);
  });
});
