import { Page } from '@playwright/test';
import testData from '../data/test-data.json';

/**
 * Sets up test user in the database via API
 * Must be called before logging in
 */
export async function setupTestUser(params: {
  page: Page;
  apiBase: string;
  userKey: keyof typeof testData.testUsers;
}): Promise<{ userId: number; token: string }> {
  const { page, apiBase, userKey } = params;
  const user = testData.testUsers[userKey];

  // Register user via API
  const registerResponse = await page.evaluate(
    async ({ apiBase, user }) => {
      const resp = await fetch(`${apiBase}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      return resp.json();
    },
    { apiBase, user }
  );

  if (!registerResponse.userId) {
    throw new Error(`Failed to register test user: ${JSON.stringify(registerResponse)}`);
  }

  // Login user
  const loginResponse = await page.evaluate(
    async ({ apiBase, username, password }) => {
      const resp = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: username, password }),
      });
      return resp.json();
    },
    { apiBase, username: user.username, password: user.password }
  );

  if (!loginResponse.data?.accessToken) {
    throw new Error(`Failed to login test user: ${JSON.stringify(loginResponse)}`);
  }

  return {
    userId: registerResponse.data?.userId || 0,
    token: loginResponse.data.accessToken,
  };
}

/**
 * Logs in an existing test user
 */
export async function loginTestUser(params: {
  page: Page;
  apiBase: string;
  username: string;
  password: string;
}): Promise<{ userId: number; token: string }> {
  const { page, apiBase, username, password } = params;
  const loginResponse = await page.evaluate(
    async ({ apiBase, username, password }) => {
      const resp = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: username, password }),
      });
      return resp.json();
    },
    { apiBase, username, password }
  );

  if (!loginResponse.data?.accessToken) {
    throw new Error(`Failed to login: ${JSON.stringify(loginResponse)}`);
  }

  return {
    userId: loginResponse.data.userId || 0,
    token: loginResponse.data.accessToken,
  };
}

/**
 * Stores token in localStorage for authenticated requests
 */
export async function setupAuthToken(params: { page: Page; token: string }): Promise<void> {
  const { page, token } = params;
  await page.evaluate(({ token }) => {
    localStorage.setItem('auth_token', token);
  }, { token });
}

/**
 * Clears all authentication data
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.clear();
  });
}

/**
 * Creates test folder structure via API
 */
export async function setupFolderStructure(params: {
  page: Page;
  apiBase: string;
  token: string;
}): Promise<Record<string, string>> {
  const { page, apiBase, token } = params;
  const folderIds: Record<string, string> = {};

  const createFolder = async (name: string, parentId?: string): Promise<string> => {
    const response = await page.evaluate(
      async ({ apiBase, token, name, parentId }) => {
        const res = await fetch(`${apiBase}/api/folders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name, parentFolderId: parentId }),
        });
        return res.json();
      },
      { apiBase, token, name, parentId }
    );

    return response.id;
  };

  // Create folders from test data structure
  for (const folder of testData.folderStructure.root.children as any[]) {
    const folderId = await createFolder(folder.name);
    folderIds[folder.name] = folderId;

    if (folder.children) {
      for (const subFolder of folder.children) {
        const subFolderId = await createFolder(subFolder.name, folderId);
        folderIds[`${folder.name}/${subFolder.name}`] = subFolderId;
      }
    }
  }

  return folderIds;
}

/**
 * Cleanup: Deletes test data (called in test teardown)
 */
export async function cleanupTestData(params: { page: Page; apiBase: string; token: string }): Promise<void> {
  const { page, apiBase, token } = params;
  // In a real scenario, this would delete all created files/folders
  // For now, app-level cleanup is sufficient (test db is isolated)
  
  // This could be implemented as:
  // 1. Delete all folders (cascades to files)
  // 2. Clear any uploaded files from storage
  // 3. Log cleanup activities
}

/**
 * Gets test user credentials
 */
export function getTestUserCredentials(userKey: keyof typeof testData.testUsers) {
  return testData.testUsers[userKey];
}

/**
 * Gets test file data
 */
export function getTestFileData(fileKey: keyof typeof testData.testData) {
  return testData.testData[fileKey];
}
