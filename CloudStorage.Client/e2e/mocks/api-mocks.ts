import { Page } from '@playwright/test';

// ─── Typed mock data ─────────────────────────────────────────────────────────

export interface MockFile {
  id: string;
  fileName: string;
  size: number;
  createdAt: string;
  lastModifiedAt: string;
  isShared: boolean;
}

export interface MockFolder {
  id: string;
  name: string;
  parentId: string | null;
  type: 'folder';
  createdAt: string;
}

export interface MockTrashItem {
  id: string;
  originalId: string;
  name: string;
  size: number;
  type: 'file' | 'folder';
  deletedAt: string;
  expiresAt: string;
  originalPath: string;
}

// ─── Baseline fixture data ────────────────────────────────────────────────────

export const MOCK_FILES: MockFile[] = [
  {
    id: 'f1',
    fileName: 'document.pdf',
    size: 1024,
    createdAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
    isShared: false,
  },
  {
    id: 'f2',
    fileName: 'image.png',
    size: 2048,
    createdAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
    isShared: false,
  },
];

export const MOCK_FOLDERS: MockFolder[] = [
  {
    id: 'dir1',
    name: 'MOCK_FOLDER',
    parentId: null,
    type: 'folder',
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_TRASH: MockTrashItem[] = [
  {
    id: 't1',
    originalId: 'o1',
    name: 'deleted.txt',
    size: 1024,
    type: 'file',
    deletedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    originalPath: '/deleted.txt',
  },
];

// ─── Route registration helpers ───────────────────────────────────────────────

/**
 * Registers all standard API mock routes on the given page.
 * Call this in `beforeEach` instead of duplicating route handlers across specs.
 *
 * Individual tests can override a specific route by registering a more
 * specific handler BEFORE calling this function (Playwright uses last-match-wins
 * ordering when multiple handlers match the same URL).
 */
export async function mockApiRoutes(
  page: Page,
  overrides: {
    files?: MockFile[];
    folders?: MockFolder[];
    trash?: MockTrashItem[];
  } = {},
): Promise<void> {
  const files   = overrides.files   ?? MOCK_FILES;
  const folders = overrides.folders ?? MOCK_FOLDERS;
  const trash   = overrides.trash   ?? MOCK_TRASH;

  // ── Health ────────────────────────────────────────────────────────────────
  await page.route('**/api/health', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'Healthy' }) }),
  );

  // ── Auth / Profile ────────────────────────────────────────────────────────
  await page.route('**/api/auth/profile', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { id: 1, username: 'TESTRUNNER', email: 'test@example.com', role: 'User' } }),
    }),
  );
  await page.route('**/api/users/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { id: 1, username: 'TESTRUNNER', email: 'test@example.com', role: 'User' } }),
    }),
  );

  // ── Files ─────────────────────────────────────────────────────────────────
  await page.route('**/api/files/stats', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalFiles: files.length,
          totalStorageBytes: files.reduce((s, f) => s + f.size, 0),
          maxStorageBytes: 10_737_418_240,
          activeSyncOps: 0,
        },
      }),
    }),
  );
  await page.route('**/api/files/storage-breakdown', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
  );
  await page.route('**/api/files', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: files }),
      });
    } else {
      // POST/PUT/DELETE — let individual tests intercept before this handler
      await route.continue().catch(() => {});
    }
  });

  // ── Folders ───────────────────────────────────────────────────────────────
  await page.route('**/api/folders/root', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: folders }),
    }),
  );

  // ── User Storage ──────────────────────────────────────────────────────────
  await page.route('**/api/user/storage', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { used: files.reduce((s, f) => s + f.size, 0), total: 10_737_418_240 },
      }),
    }),
  );

  // ── Activity ──────────────────────────────────────────────────────────────
  await page.route('**/api/activity**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
  );

  // ── Sync ─────────────────────────────────────────────────────────────────
  await page.route('**/api/sync/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
  );

  // ── Trash ─────────────────────────────────────────────────────────────────
  await page.route('**/api/trash', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: trash }),
    }),
  );
}

/**
 * Registers SignalR hub mock routes.
 * Negotiate succeeds; all other hub requests are aborted gracefully.
 */
export async function mockSignalRRoutes(page: Page): Promise<void> {
  await page.route('**/hubs/**', async (route) => {
    if (route.request().url().includes('negotiate')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          negotiateVersion: 1,
          connectionId: `mock-${Math.random().toString(36).slice(2, 9)}`,
          availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
        }),
      }).catch(() => {});
    } else {
      await route.abort('failed').catch(() => {});
    }
  });
}
