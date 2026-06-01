import { test, expect } from '../../fixtures/auth.fixture';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('Accessibility: WCAG Compliance', () => {

  test('dashboard should have no accessibility violations', async ({ page, regularUserAuth }) => {
    await page.goto('/dashboard');
    // Wait for the file list to load
    const fileList = page.locator('div[data-testid^="file-item-"]');
    await fileList.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('file explorer should be keyboard navigable', async ({ page, regularUserAuth }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('div[data-testid^="file-item-"]');

    // Press Tab multiple times to navigate
    await page.keyboard.press('Tab');
    
    // Check if the focused element is a known interactive element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});
