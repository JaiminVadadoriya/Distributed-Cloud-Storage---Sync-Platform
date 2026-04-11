import { Page, expect } from '@playwright/test';

/**
 * Common UI helper functions for E2E tests
 */

/**
 * Waits for loading spinner to disappear
 */
export async function waitForLoadingComplete(page: Page): Promise<void> {
  const spinner = page.locator('[data-testid="loading-spinner"]');
  if (await spinner.isVisible()) {
    await spinner.waitFor({ state: 'hidden' });
  }
}

/**
 * Fills a form field by label and waits for stability
 */
export async function fillFormField(params: {
  page: Page;
  fieldLabel: string;
  value: string;
}): Promise<void> {
  const { page, fieldLabel, value } = params;
  const field = page.locator(`label:has-text("${fieldLabel}") ~ input, label:has-text("${fieldLabel}") ~ textarea, label:has-text("${fieldLabel}") ~ [role="combobox"]`).first();
  await field.fill(value);
  await page.waitForTimeout(200); // Wait for validation
}

/**
 * Clicks a button by text and waits for navigation if applicable
 */
export async function clickButton(params: { page: Page; buttonText: string }): Promise<void> {
  const { page, buttonText } = params;
  await page.click(`button:has-text("${buttonText}")`);
  await page.waitForTimeout(300); // Wait for potential navigation
}

/**
 * Waits for a notification/toast message to appear and validates text
 */
export async function waitForNotification(params: {
  page: Page;
  text: string;
  type?: 'success' | 'error' | 'info';
}): Promise<void> {
  const { page, text, type = 'success' } = params;
  const notification = page.locator(`[role="alert"]:has-text("${text}")`);
  await notification.waitFor({ state: 'visible', timeout: 5000 });
  
  if (type === 'error') {
    await expect(notification).toHaveClass(/error|danger/);
  } else if (type === 'success') {
    await expect(notification).toHaveClass(/success|positive/);
  }
}

/**
 * Gets file/folder item by name and returns element
 */
export async function getItemByName(page: Page, itemName: string) {
  return page.locator(`[data-testid="file-item"], [data-testid="folder-item"]`).filter({
    hasText: itemName,
  }).first();
}

/**
 * Robustly triggers the context menu using physical right-click with event fallback
 */
export async function triggerContextMenu(page: Page, locator: string | any): Promise<void> {
  const element = typeof locator === 'string' ? page.locator(locator) : locator;
  await element.waitFor({ state: 'visible' });
  
  // Try physical right-click
  await element.click({ button: 'right', force: true });
  
  // Fallback to event dispatch if menu doesn't appear (Brutalist UI can be sensitive)
  const menu = page.locator('app-context-menu, [role="menu"]');
  const isVisible = await menu.isVisible().catch(() => false);
  if (!isVisible) {
    // Get element center for deterministic coordinates
    const box = await element.boundingBox();
    const x = box ? box.x + box.width / 2 : 100;
    const y = box ? box.y + box.height / 2 : 100;
    
    await element.dispatchEvent('contextmenu', {
      clientX: x,
      clientY: y,
      bubbles: true,
      button: 2 // Right click
    });
  }
}

/**
 * Robustly selects a context menu item using data-testid
 */
export async function selectContextMenuItem(params: {
  page: Page;
  testIdPrefix?: string;
  itemText?: string;
  actionId: string;
}): Promise<void> {
  const { page, actionId } = params;
  
  // Use data-testid which is more deterministic than text in this app
  const menuItem = page.locator(`[data-testid="context-menu-item-${actionId}"]`).first();
  await menuItem.waitFor({ state: 'visible' });
  await menuItem.click({ force: true });
}

/**
 * Verifies file appears in file list
 */
export async function fileExistsInList(page: Page, fileName: string): Promise<boolean> {
  const item = await getItemByName(page, fileName);
  return await item.isVisible().catch(() => false);
}

/**
 * Enables real API mocking within a test
 * Intercepts and logs all API calls without blocking them
 */
export async function enableApiMocking(page: Page, apiBase: string): Promise<void> {
  await page.route(`${apiBase}/api/**`, async (route) => {
    const request = route.request();
    console.log(`[API] ${request.method()} ${request.url()}`);
    
    try {
      const response = await route.fetch();
      console.log(`[API] Response: ${response.status()}`);
      await route.fulfill({ response });
    } catch (error) {
      console.error(`[API] Request failed: ${error}`);
      await route.abort();
    }
  });
}

/**
 * Simulates network delay
 */
export async function simulateNetworkDelay(params: { page: Page; ms: number }): Promise<void> {
  const { page, ms } = params;
  await page.route('**/*', async (route) => {
    await page.waitForTimeout(ms);
    await route.continue();
  });
}

/**
 * Simulates network failure
 */
export async function simulateNetworkFailure(params: { page: Page; endpoint?: string }): Promise<void> {
  const { page, endpoint } = params;
  const pattern = endpoint ? `**${endpoint}**` : '**/*';
  await page.route(pattern, (route) => route.abort());
}

/**
 * Waits for specific network request to complete
 */
export async function waitForApiRequest(
  page: Page,
  method: string,
  urlPattern: string
): Promise<void> {
  const requestPromise = page.waitForResponse(
    (response) =>
      response.request().method() === method && response.url().includes(urlPattern)
  );
  
  await requestPromise;
}
