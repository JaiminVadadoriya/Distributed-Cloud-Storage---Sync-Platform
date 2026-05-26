import { type Page, type Locator, expect } from '@playwright/test';
import { mockApiRoutes, mockSignalRRoutes } from '../mocks/api-mocks';

/**
 * Page Object Model for the Trash / Recycle Bin view.
 */
export class TrashPage {
  readonly page: Page;

  // ── Locators ───────────────────────────────────────────────────────────────
  readonly trashRows: Locator;

  constructor(page: Page) {
    this.page      = page;
    this.trashRows = page.locator('[data-testid^="trash-row-"]');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('/trash', { waitUntil: 'domcontentloaded' });
    await this.trashRows.first().waitFor({ state: 'visible', timeout: 20_000 });
  }

  // ── Mocking ────────────────────────────────────────────────────────────────

  async mockRoutes(overrides: Parameters<typeof mockApiRoutes>[1] = {}): Promise<void> {
    await mockSignalRRoutes(this.page);
    await mockApiRoutes(this.page, overrides);
  }

  // ── Item accessors ─────────────────────────────────────────────────────────

  trashRow(id: string): Locator {
    return this.page.getByTestId(`trash-row-${id}`);
  }

  restoreBtn(id: string): Locator {
    // Try specific testid first, fall back to accessible role
    const byTestId = this.page.getByTestId(`restore-btn-${id}`);
    const byRole   = this.trashRow(id).getByRole('button', { name: /restore/i });
    return byTestId.or(byRole);
  }

  purgeBtn(id: string): Locator {
    const byTestId = this.page.getByTestId(`purge-btn-${id}`);
    const byRole   = this.trashRow(id).getByRole('button', { name: /delete|purge/i });
    return byTestId.or(byRole);
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async restore(id: string): Promise<void> {
    const row = this.trashRow(id);
    await row.waitFor({ state: 'visible' });
    await row.hover();
    const btn = this.restoreBtn(id);
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();
  }

  async purge(id: string): Promise<void> {
    const row = this.trashRow(id);
    await row.waitFor({ state: 'visible' });
    await row.hover();
    const btn = this.purgeBtn(id);
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  async expectRowCount(count: number): Promise<void> {
    await expect(this.trashRows).toHaveCount(count, { timeout: 10_000 });
  }

  async expectSuccessMessage(text: string | RegExp): Promise<void> {
    await expect(this.page.locator('[role="alert"]').filter({ hasText: text })).toBeVisible({ timeout: 15_000 });
  }
}
