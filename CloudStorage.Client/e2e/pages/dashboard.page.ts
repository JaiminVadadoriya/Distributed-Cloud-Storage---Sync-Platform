import { type Page, type Locator, expect } from '@playwright/test';
import { mockApiRoutes, mockSignalRRoutes, type MockFile } from '../mocks/api-mocks';

/**
 * Page Object Model for the Dashboard / File Explorer view.
 *
 * Encapsulates all locator definitions and common interactions so that
 * individual spec files stay declarative and resilient to markup changes.
 */
export class DashboardPage {
  readonly page: Page;

  // ── Selectors ──────────────────────────────────────────────────────────────
  readonly searchInput:     Locator;
  readonly initFolderBtn:   Locator;
  readonly fileList:        Locator;
  readonly contextMenu:     Locator;
  readonly promptModal:     Locator;
  readonly promptInput:     Locator;
  readonly promptCommitBtn: Locator;
  readonly promptAbortBtn:  Locator;

  constructor(page: Page) {
    this.page            = page;
    this.searchInput     = page.getByTestId('contextual-search-input');
    this.initFolderBtn   = page.locator('app-file-list').getByTestId('init-node-btn');
    this.fileList        = page.locator('app-file-list');
    this.contextMenu     = page.locator('app-context-menu');
    this.promptModal     = page.locator('app-prompt-modal');
    this.promptInput     = page.locator('app-prompt-modal input');
    this.promptCommitBtn = page.locator('app-prompt-modal button').filter({ hasText: 'Commit_Sequence' });
    this.promptAbortBtn  = page.getByTestId('prompt-abort-btn');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  /** Navigate to dashboard and wait for at least one file item to be visible. */
  async goto(fileId = 'f1'): Promise<void> {
    await this.page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await this.page.getByTestId(`file-item-${fileId}`).waitFor({ state: 'visible', timeout: 30_000 });
  }

  // ── State injection ────────────────────────────────────────────────────────

  /** Inject auth tokens before page load (call before goto). */
  async injectAuth(userId = 'u1', username = 'TESTRUNNER'): Promise<void> {
    await this.page.addInitScript(
      ({ userId, username }) => {
        window.localStorage.setItem('auth_token',  'mock-jwt-token');
        window.localStorage.setItem('refresh_token', 'mock-refresh-token');
        window.localStorage.setItem('user_data',   JSON.stringify({ id: userId, username, email: 'test@example.com', role: 'User' }));
        Object.defineProperty(navigator, 'onLine', { get: () => true });
      },
      { userId, username },
    );
  }

  /** Register all standard API + SignalR mocks. */
  async mockRoutes(overrides: Parameters<typeof mockApiRoutes>[1] = {}): Promise<void> {
    await mockSignalRRoutes(this.page);
    await mockApiRoutes(this.page, overrides);
  }

  // ── File interactions ──────────────────────────────────────────────────────

  fileItem(id: string): Locator {
    return this.page.getByTestId(`file-item-${id}`);
  }

  folderItem(id: string): Locator {
    return this.page.getByTestId(`file-item-${id}`);
  }

  fileCheckbox(id: string): Locator {
    return this.page.getByTestId(`file-checkbox-${id}`);
  }

  contextMenuItem(actionId: string): Locator {
    return this.contextMenu.locator(`[data-testid="context-menu-item-${actionId}"]`).first();
  }

  /**
   * Robustly opens the context menu for a given locator.
   * Falls back to `dispatchEvent` if the right-click does not show the menu.
   */
  async openContextMenu(target: Locator): Promise<void> {
    await target.waitFor({ state: 'visible' });
    await target.click({ button: 'right' });

    const isVisible = await this.contextMenu.locator('button').first().isVisible().catch(() => false);
    if (!isVisible) {
      const box = await target.boundingBox();
      await target.dispatchEvent('contextmenu', {
        clientX: box ? box.x + box.width  / 2 : 100,
        clientY: box ? box.y + box.height / 2 : 100,
        bubbles: true,
        button: 2,
      });
      await expect(this.contextMenu.locator('button').first()).toBeVisible({ timeout: 10_000 });
    }
  }

  /** Click a context menu item by its action ID. */
  async clickContextMenuItem(actionId: string): Promise<void> {
    const item = this.contextMenuItem(actionId);
    await expect(item).toBeVisible({ timeout: 10_000 });
    await item.click();
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  /** Type into the search box and wait for the results to update. */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
  }

  // ── Rename flow ────────────────────────────────────────────────────────────

  async rename(fileId: string, newName: string): Promise<void> {
    await this.openContextMenu(this.fileItem(fileId));
    await this.clickContextMenuItem('RENAME_ENTITY');
    await expect(this.promptInput).toBeVisible({ timeout: 10_000 });
    await this.promptInput.fill(newName);
    await this.promptCommitBtn.click();
  }

  // ── Folder creation ────────────────────────────────────────────────────────

  async openNewFolderDialog(): Promise<void> {
    await this.initFolderBtn.click();
    await expect(this.promptInput).toBeVisible({ timeout: 15_000 });
  }

  async createFolder(name: string): Promise<void> {
    await this.openNewFolderDialog();
    await this.promptInput.fill(name);
    await this.promptCommitBtn.click();
  }

  async dismissModal(): Promise<void> {
    await this.promptAbortBtn.click();
    await expect(this.promptAbortBtn).toBeHidden({ timeout: 5_000 });
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  async expectFilesCount(count: number): Promise<void> {
    await expect(this.page.locator('[data-testid^="file-item-"]:not([data-folder-id])')).toHaveCount(count, { timeout: 20_000 });
  }

  async expectFileVisible(fileName: string): Promise<void> {
    await expect(this.page.getByText(fileName)).toBeVisible();
  }

  async expectFileHidden(fileName: string): Promise<void> {
    await expect(this.page.getByText(fileName)).toBeHidden();
  }

  async expectHeading(text: string): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1 })).toContainText(text);
  }
}
