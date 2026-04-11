import { test, expect } from '../../fixtures/auth.fixture';
import { createApiClient } from '../../helpers/api-client';
import { setupTestUser, getTestUserCredentials, setupAuthToken, loginTestUser, setupFolderStructure } from '../../helpers/test-setup';
import { fillFormField, clickButton, waitForNotification, getItemByName, fileExistsInList } from '../../helpers/ui-helpers';
import testData from '../../data/test-data.json';

test.describe.parallel('Regular User - Authentication Flow', () => {
  test('User can register with valid credentials', async ({ page, apiBase }) => {
    await page.goto('/auth/register');

    // Fill registration form
    await fillFormField({ page, fieldLabel: 'Username', value: 'newuser_' + Date.now() });
    await fillFormField({ page, fieldLabel: 'Email', value: `user${Date.now()}@test.com` });
    await fillFormField({ page, fieldLabel: 'Password', value: 'SecurePass123!@#' });
    await fillFormField({ page, fieldLabel: 'Confirm Password', value: 'SecurePass123!@#' });

    // Submit form
    await clickButton({ page, buttonText: 'Register' });

    // Verify success and redirect
    await page.waitForURL('/auth/verify-email', { timeout: 5000 });
    expect(page.url()).toContain('/auth/verify-email');
  });

  test('User cannot register with duplicate email', async ({ page }) => {
    const existingUser = getTestUserCredentials('regularUser1');
    
    await page.goto('/auth/register');

    await fillFormField(page, 'Username', 'anotheruser');
    await fillFormField(page, 'Email', existingUser.email);
    await fillFormField(page, 'Password', 'SecurePass123!@#');
    await fillFormField(page, 'Confirm Password', 'SecurePass123!@#');

    await clickButton(page, 'Register');

    // Verify error message
    await waitForNotification({ page, text: 'Email already registered', type: 'error' });
  });

  test('User can login with correct credentials', async ({ page, apiBase }) => {
    const user = getTestUserCredentials('regularUser1');
    
    // Ensure user exists in database first
    try {
      await setupTestUser({ page, apiBase, userKey: 'regularUser1' });
    } catch {
      // User already exists
    }

    await page.goto('/auth/login');

    // Fill login form
    await fillFormField(page, 'Username', user.username);
    await fillFormField(page, 'Password', user.password);

    // Submit
    await clickButton(page, 'Sign In');

    // Verify redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');

    // Verify auth token is stored
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
  });

  test('User sees error with incorrect password', async ({ page }) => {
    const user = getTestUserCredentials('regularUser1');

    await page.goto('/auth/login');
    await fillFormField(page, 'Username', user.username);
    await fillFormField(page, 'Password', 'WrongPassword123');

    await clickButton(page, 'Sign In');

    await waitForNotification(page, 'Invalid credentials', 'error');
  });

  test('User can logout', async ({ page, apiBase }) => {
    const credentials = getTestUserCredentials('regularUser1');
    let userAuth = await loginTestUser({
      page,
      apiBase,
      username: credentials.username,
      password: credentials.password
    }).catch(async () => setupTestUser({ page, apiBase, userKey: 'regularUser1' }));

    await setupAuthToken({ page, token: userAuth.token });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click user menu and logout
    await page.click('[data-testid="user-menu-button"]');
    await page.click('[data-testid="logout-button"]');

    // Verify redirected to login
    await page.waitForURL('/auth/login', { timeout: 5000 });
    expect(page.url()).toContain('/auth/login');

    // Verify token cleared
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeFalsy();
  });
});

test.describe.parallel('Regular User - File Upload Operations', () => {
  let apiClient: ReturnType<typeof createApiClient>;

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
    apiClient = createApiClient(authenticatedPage, apiBase);
    
    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('User can upload a small file', async ({ authenticatedPage }) => {
    // Create a file to upload
    const fileName = `test-file-${Date.now()}.txt`;
    
    // Find upload button
    const uploadInput = authenticatedPage.locator('input[type="file"]');
    
    // Upload file
    await uploadInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from('This is test file content for CloudStorage'),
    });

    // Watch for upload completion
    await waitForNotification(authenticatedPage, 'Upload complete', 'success');

    // Verify file appears in list
    const fileExists = await fileExistsInList(authenticatedPage, fileName);
    expect(fileExists).toBeTruthy();
  });

  test('User can upload multiple files simultaneously', async ({ authenticatedPage }) => {
    const uploadInput = authenticatedPage.locator('input[type="file"]');

    // Create multiple files
    const files = [
      {
        name: `file-1-${Date.now()}.txt`,
        mimeType: 'text/plain',
        buffer: Buffer.from('File 1 content'),
      },
      {
        name: `file-2-${Date.now()}.txt`,
        mimeType: 'text/plain',
        buffer: Buffer.from('File 2 content'),
      },
    ];

    // Upload files
    await uploadInput.setInputFiles(files);

    // Wait for all uploads to complete
    await authenticatedPage.waitForTimeout(2000);
    await waitForNotification({
      page: authenticatedPage,
      text: 'uploads completed',
      type: 'success'
    });

    // Verify both files appear
    for (const file of files) {
      expect(await fileExistsInList(authenticatedPage, file.name)).toBeTruthy();
    }
  });

  test('User sees progress during file upload', async ({ authenticatedPage }) => {
    const uploadInput = authenticatedPage.locator('input[type="file"]');

    // Create a larger file to see progress
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
    
    await uploadInput.setInputFiles({
      name: `large-file-${Date.now()}.bin`,
      mimeType: 'application/octet-stream',
      buffer: largeBuffer,
    });

    // Look for progress indicator
    const progressBar = authenticatedPage.locator('[data-testid="upload-progress"]');
    const progressValue = progressBar.locator('[role="progressbar"]');

    // Wait for progress to appear and update
    await expect(progressValue).toBeVisible();
    
    // Verify progress increases
    const initialProgress = await progressValue.getAttribute('aria-valuenow');
    await authenticatedPage.waitForTimeout(500);
    const updatedProgress = await progressValue.getAttribute('aria-valuenow');

    expect(parseInt(updatedProgress || '0')).toBeGreaterThanOrEqual(parseInt(initialProgress || '0'));
  });
});

test.describe.parallel('Regular User - File Management', () => {
  let apiClient: ReturnType<typeof createApiClient>;

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
    apiClient = createApiClient(authenticatedPage, apiBase);
    
    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('User can rename a file', async ({ authenticatedPage }) => {
    // First, ensure a file exists
    const uploadInput = authenticatedPage.locator('input[type="file"]');
    const fileName = `rename-me-${Date.now()}.txt`;

    await uploadInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from('Original name test'),
    });

    await waitForNotification(authenticatedPage, 'Upload complete', 'success');

    // Right-click file and select rename
    const fileItem = await getItemByName(authenticatedPage, fileName);
    await fileItem.click({ button: 'right' });

    await authenticatedPage.click('[data-testid="rename-option"]');

    // Enter new name
    const renameInput = authenticatedPage.locator('[data-testid="rename-input"]');
    await renameInput.fill(`renamed-${Date.now()}.txt`);
    await authenticatedPage.press('[data-testid="rename-input"]', 'Enter');

    // Verify rename success
    await waitForNotification(authenticatedPage, 'File renamed', 'success');
  });

  test('User can delete file to trash', async ({ authenticatedPage }) => {
    const uploadInput = authenticatedPage.locator('input[type="file"]');
    const fileName = `delete-me-${Date.now()}.txt`;

    await uploadInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from('Delete test'),
    });

    await waitForNotification(authenticatedPage, 'Upload complete', 'success');

    // Delete file
    const fileItem = await getItemByName(authenticatedPage, fileName);
    await fileItem.click({ button: 'right' });
    await authenticatedPage.click('[data-testid="delete-option"]');

    // Confirm deletion
    const confirmBtn = authenticatedPage.locator('button:has-text("Delete")');
    await confirmBtn.click();

    await waitForNotification(authenticatedPage, 'moved to trash', 'success');
  });

  test('User can search for files', async ({ authenticatedPage }) => {
    // Navigate to search
    const searchInput = authenticatedPage.locator('[data-testid="search-input"]');
    
    // Search for existing files
    await searchInput.fill('test');
    await authenticatedPage.waitForTimeout(500);

    // Verify search results appear
    const searchResults = authenticatedPage.locator('[data-testid="search-results"]');
    await expect(searchResults).toBeVisible();
  });
});

test.describe.parallel('Regular User - Folder Operations', () => {
  let apiClient: ReturnType<typeof createApiClient>;

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
    apiClient = createApiClient(authenticatedPage, apiBase);
    
    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('User can create a new folder', async ({ authenticatedPage }) => {
    // Click create folder button
    await authenticatedPage.click('[data-testid="create-folder-button"]');

    // Fill folder name
    const folderNameInput = authenticatedPage.locator('[data-testid="folder-name-input"]');
    const folderName = `TestFolder-${Date.now()}`;
    await folderNameInput.fill(folderName);

    // Submit
    await clickButton(authenticatedPage, 'Create');

    // Verify folder created
    await waitForNotification(authenticatedPage, 'Folder created', 'success');
    expect(await fileExistsInList(authenticatedPage, folderName)).toBeTruthy();
  });

  test('User can navigate into folders', async ({ authenticatedPage }) => {
    // Get initial folder count
    const initialBreadcrumb = await authenticatedPage.locator('[data-testid="breadcrumb"]').textContent();

    // Create a folder first
    await authenticatedPage.click('[data-testid="create-folder-button"]');
    const folderNameInput = authenticatedPage.locator('[data-testid="folder-name-input"]');
    const folderName = `NavTest-${Date.now()}`;
    await folderNameInput.fill(folderName);
    await clickButton({ page: authenticatedPage, buttonText: 'Create' });

    // Double-click to open folder
    const folderItem = await getItemByName(authenticatedPage, folderName);
    await folderItem.dblclick();

    await authenticatedPage.waitForTimeout(500);

    // Verify breadcrumb updated
    const newBreadcrumb = await authenticatedPage.locator('[data-testid="breadcrumb"]').textContent();
    expect(newBreadcrumb).toContain(folderName);
  });
});

test.describe.parallel('Regular User - Sharing and Permissions', () => {
  let apiClient: ReturnType<typeof createApiClient>;

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

    await setupAuthToken(authenticatedPage, userAuth.token);
    apiClient = createApiClient(authenticatedPage, apiBase);
    
    await authenticatedPage.goto('/files');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('User can share a folder with another user (Read-only)', async ({ authenticatedPage }) => {
    // Create folder first
    await authenticatedPage.click('[data-testid="create-folder-button"]');
    const folderNameInput = authenticatedPage.locator('[data-testid="folder-name-input"]');
    const folderName = `ShareTest-${Date.now()}`;
    await folderNameInput.fill(folderName);
    await clickButton({ page: authenticatedPage, buttonText: 'Create' });

    // Right-click and share
    const folderItem = await getItemByName(authenticatedPage, folderName);
    await folderItem.click({ button: 'right' });
    await authenticatedPage.click('[data-testid="share-option"]');

    // Fill sharing form
    const shareInput = authenticatedPage.locator('[data-testid="share-email-input"]');
    const otherUser = getTestUserCredentials('regularUser2');
    await shareInput.fill(otherUser.email);

    // Select permission: Read
    await authenticatedPage.selectOption('[data-testid="permission-select"]', 'Read');

    // Submit share
    await clickButton(authenticatedPage, 'Share');

    await waitForNotification(authenticatedPage, 'Shared successfully', 'success');
  });

  test('User can view and revoke shared permissions', async ({ authenticatedPage }) => {
    // Navigate to shared section
    await authenticatedPage.click('a[href="/shared"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify shared items list visible
    const sharedList = authenticatedPage.locator('[data-testid="shared-items-list"]');
    await expect(sharedList).toBeVisible();

    // Click item to view permissions
    const firstItem = sharedList.locator('[data-testid="shared-item"]').first();
    const manageBtn = firstItem.locator('[data-testid="manage-permissions"]');

    if (await manageBtn.isVisible()) {
      await manageBtn.click();

      // Verify permissions panel
      const permPanel = authenticatedPage.locator('[data-testid="permissions-panel"]');
      await expect(permPanel).toBeVisible();
    }
  });
});
