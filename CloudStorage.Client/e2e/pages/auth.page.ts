import { type Page, type Locator, expect } from '@playwright/test';
import { mockSignalRRoutes } from '../mocks/api-mocks';

/**
 * Page Object Model for the Auth flow (Login / Register pages).
 */
export class AuthPage {
  readonly page: Page;

  // ── Locators ───────────────────────────────────────────────────────────────
  readonly identifierInput: Locator;
  readonly passwordInput:   Locator;
  readonly submitBtn:       Locator;
  readonly errorAlert:      Locator;
  readonly profileTrigger:  Locator;
  readonly logoutBtn:       Locator;

  constructor(page: Page) {
    this.page            = page;
    this.identifierInput = page.getByTestId('login-identifier');
    this.passwordInput   = page.getByTestId('login-password');
    this.submitBtn       = page.getByTestId('login-submit');
    // Error messages are scoped to an alert role — avoids asserting against entire body
    this.errorAlert      = page.getByRole('alert');
    this.profileTrigger  = page.getByTestId('profile-menu-trigger');
    this.logoutBtn       = page.getByTestId('logout-btn');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async gotoLogin(): Promise<void> {
    await mockSignalRRoutes(this.page);
    await this.page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async login(identifier: string, password: string): Promise<void> {
    await this.identifierInput.fill(identifier);
    await this.passwordInput.fill(password);

    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/auth/login')
    );
    await this.submitBtn.click();
    await responsePromise;
  }

  /**
   * Inject auth state directly into localStorage before navigating.
   * Use this in tests that need to skip the login UI (e.g., logout test).
   */
  async injectAuthState(token = 'mock-token', userId = 'u1', username = 'TESTRUNNER'): Promise<void> {
    await this.page.addInitScript(
      ({ token, userId, username }) => {
        window.localStorage.setItem('auth_token', token);
        window.localStorage.setItem('user_data', JSON.stringify({ id: userId, username }));
      },
      { token, userId, username },
    );
  }

  async logout(): Promise<void> {
    await expect(this.profileTrigger).toBeVisible({ timeout: 15_000 });
    await this.profileTrigger.click();
    await expect(this.logoutBtn).toBeVisible({ timeout: 10_000 });
    await this.logoutBtn.click();
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  async expectRedirectedToDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  }

  async expectRedirectedToLogin(): Promise<void> {
    await expect(this.page).toHaveURL(/\/auth\/login/, { timeout: 20_000 });
  }

  async expectErrorContaining(text: string): Promise<void> {
    // Scoped to [role="alert"] — avoids brittle `body` text matching
    await expect(this.errorAlert.filter({ hasText: text }).first()).toBeVisible({ timeout: 15_000 });
  }

  async expectAuthToken(value: string | null): Promise<void> {
    const token = await this.page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBe(value);
  }
}
