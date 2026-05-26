import { defineConfig, devices } from '@playwright/test';
import process from 'node:process';

/**
 * CloudStorage E2E Test Configuration
 * Supports multiple test modes: mocked API, real backend integration, performance, mobile, accessibility
 *
 * Environment Variables:
 * - TEST_MODE: 'mock' (default) | 'real' | 'performance' | 'mobile' | 'a11y'
 * - API_BASE_URL: Backend API URL (default: http://localhost:5010 for real mode)
 * - FRONTEND_URL: Frontend URL (default: http://localhost:4200)
 * - CI: Set by CI/CD (enables retries, single worker, test.only checks)
 *
 * Usage:
 * - npm run e2e                          # Run all tests with default mock mode
 * - npm run e2e:real                     # Run tests against real backend
 * - npm run e2e:perf                     # Run performance tests
 * - npm run e2e:mobile                   # Run mobile viewport tests
 * - npm run e2e:a11y                     # Run accessibility tests
 * - npm run e2e:debug                    # Run with headed browser and debugging
 */

const testMode = (process.env['TEST_MODE'] || 'mock').toLowerCase();
const apiBaseUrl = process.env['API_BASE_URL'] || 'http://localhost:5010';
const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:4200';
const isCI = !!process.env['CI'];
const isDebug = !!process.env['DEBUG'];

// ─── Centralized timeout constants ──────────────────────────────────────────
const TIMEOUTS = {
  mock:        { test: 30_000, expect:  8_000, action:  8_000, nav: 20_000 },
  real:        { test: 90_000, expect: 10_000, action: 30_000, nav: 60_000 },
  performance: { test: 180_000, expect: 10_000, action: 30_000, nav: 60_000 },
  mobile:      { test: 60_000, expect: 10_000, action: 15_000, nav: 30_000 },
  a11y:        { test: 90_000, expect: 10_000, action: 15_000, nav: 30_000 },
} as const;

type TestMode = keyof typeof TIMEOUTS;
const t = TIMEOUTS[(testMode as TestMode) in TIMEOUTS ? (testMode as TestMode) : 'mock'];

// ─── Test projects per mode ──────────────────────────────────────────────────
const getProjects = () => {
  switch (testMode) {
    case 'real':
      return [
        { name: 'chromium-real', use: { ...devices['Desktop Chrome'] }, timeout: t.test },
      ];

    case 'performance':
      return [
        { name: 'chromium-perf', use: { ...devices['Desktop Chrome'] }, timeout: t.test },
      ];

    case 'mobile':
      // FIX: was incorrectly pointing to accessibility glob previously
      return [
        { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
        { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
      ];

    case 'a11y':
      return [
        { name: 'chromium-a11y', use: { ...devices['Desktop Chrome'] }, timeout: t.test },
      ];

    case 'mock':
    default:
      return [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
      ];
  }
};

// ─── testMatch per mode ──────────────────────────────────────────────────────
const getTestMatch = (): string | string[] => {
  switch (testMode) {
    case 'performance': return '**/personas/performance/**/*.spec.ts';
    case 'mobile':      return '**/personas/mobile/**/*.spec.ts';       // FIX: was 'accessibility'
    case 'a11y':        return '**/personas/accessibility/**/*.spec.ts';
    default:            return [
                          'audit-remediation.spec.ts',
                          'auth.spec.ts',
                          'example.spec.ts',
                          'file-explorer.e2e.spec.ts',
                          'file-management.spec.ts',
                          'file-preview-comprehensive.spec.ts',
                          'file-upload-and-preview.spec.ts',
                          'folder-features.spec.ts',
                          'personas/regularUser/core-flows.spec.ts'
                        ];
  }
};

export default defineConfig({
  testDir: './e2e',
  testMatch: getTestMatch(),

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: isCI,

  /* Retry strategy: 2 in CI, 0 in debug, 1 locally for flakiness awareness */
  retries: isCI ? 2 : isDebug ? 0 : 1,

  /* Parallel workers — single in CI to avoid resource contention */
  workers: isCI ? 1 : undefined,

  /* Global timeout per test */
  timeout: t.test,

  /* Assertion timeout (auto-retrying assertions) */
  expect: { timeout: t.expect },

  /* Reporter */
  reporter: isCI
    ? [
        ['github'],
        ['html',  { outputFolder: 'playwright-report', open: 'never' }],
        ['json',  { outputFile:   'test-results.json' }],
        ['junit', { outputFile:   'test-results.xml'  }],
      ]
    : [
        ['html',  { outputFolder: 'playwright-report' }],
        ['json',  { outputFile:   'test-results.json' }],
        ['dot'],
      ],

  /* Shared settings for all projects */
  // FIX: CI-specific overrides are MERGED here (not a separate spread that
  //      would silently replace the entire `use` block and lose baseURL).
  use: {
    baseURL: frontendUrl,

    actionTimeout:     t.action,
    navigationTimeout: t.nav,

    screenshot: 'only-on-failure',
    video:      testMode === 'real' ? 'retain-on-failure' : 'off',

    /* 'on' in CI for richer debugging; 'on-first-retry' locally */
    trace: isCI ? 'on' : isDebug ? 'on' : 'on-first-retry',

    viewport: { width: 1920, height: 1080 },

    launchOptions: {
      slowMo: isDebug ? 100 : 0,
    },
  },

  /* Global setup & teardown (string paths — compatible with ESM + CJS) */
  globalSetup:    './e2e/utils/global-setup.ts',
  globalTeardown: './e2e/utils/global-setup.ts',  // FIX: was never wired; teardown exported from same file

  /* Configure projects for major browsers and test scenarios */
  projects: getProjects(),

  /* Run local dev server before starting tests (mock mode only) */
  webServer: testMode === 'mock' ? {
    command:             'npm run start',
    url:                 frontendUrl,
    reuseExistingServer: !isCI,
    timeout:             300_000,
  } : undefined,

  /* Output folder for test artifacts */
  outputDir: 'test-results',
});
