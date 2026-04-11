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

// Test profiles based on mode
const getProjects = () => {
  switch (testMode) {
    case 'real':
      // Real backend integration tests (slower, more thorough)
      return [
        {
          name: 'chromium-real',
          use: { ...devices['Desktop Chrome'] },
          timeout: 90000, // Longer timeout for real backend
        },
      ];

    case 'performance':
      // Performance and load tests
      return [
        {
          name: 'chromium-perf',
          use: { ...devices['Desktop Chrome'] },
          timeout: 180000, // Much longer for performance tests
        },
      ];

    case 'mobile':
      // Mobile viewport tests
      return [
        {
          name: 'Mobile Chrome',
          use: { ...devices['Pixel 5'] },
        },
        {
          name: 'Mobile Safari',
          use: { ...devices['iPhone 12'] },
        },
      ];

    case 'a11y':
      // Accessibility tests
      return [
        {
          name: 'chromium-a11y',
          use: { ...devices['Desktop Chrome'] },
          timeout: 90000,
        },
      ];

    case 'mock':
    default:
      // Mock API tests (fast, isolated)
      return [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
      ];
  }
};

export default defineConfig({
  testDir: './e2e',
  testMatch: testMode === 'real' 
    ? '**/*.spec.ts' 
    : testMode === 'performance'
    ? '**/personas/performance/**/*.spec.ts'
    : testMode === 'mobile'
    ? '**/personas/accessibility/**/*.spec.ts'
    : testMode === 'a11y'
    ? '**/personas/accessibility/**/*.spec.ts'
    : '**/*.spec.ts',
  
  /* Run tests in files in parallel */
  fullyParallel: false,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!isCI,
  
  /* Retry strategy */
  retries: isCI ? 2 : isDebug ? 0 : 1,
  
  /* Parallel workers */
  workers: 1,
  
  /* Global timeout for each test in milliseconds */
  timeout: testMode === 'real' ? 90000 : testMode === 'performance' ? 180000 : 60000,
  
  /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
  actionTimeout: 30000,
  navigationTimeout: 60000,
  
  /* Expect timeout */
  expect: {
    timeout: 10000,
  },
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }],
    ['list'],
  ],
  
  /* Shared settings for all the projects */
  use: {
    /* Base URL for frontend app */
    baseURL: frontendUrl,
    
    /* Screenshots and videos */
    screenshot: isDebug ? 'off' : 'only-on-failure',
    video: isDebug ? 'off' : testMode === 'real' ? 'retain-on-failure' : 'off',
    
    /* Tracing for debugging failures */
    trace: isDebug ? 'on' : 'on-first-retry',
    
    /* Viewport size */
    viewport: { width: 1920, height: 1080 },
    
    /* Slow down actions (helpful for debugging) */
    launchOptions: {
      slowMo: isDebug ? 100 : 0,
    },
  },

  /* Global setup/teardown for test environment validation */
  globalSetup: require.resolve('./e2e/utils/global-setup.ts'),

  /* Configure projects for major browsers and test scenarios */
  projects: getProjects(),

  /* Run your local dev server before starting the tests (mock mode only) */
  webServer: testMode === 'mock' ? {
    command: 'npm run start',
    url: frontendUrl,
    reuseExistingServer: !isCI,
    timeout: 300000, // 5 minutes for compilation of high-fidelity UI
  } : undefined,

  /* Output folder for test artifacts */
  outputDir: 'test-results',
  
  /* GitHub Actions specific configuration */
  ...(isCI && {
    use: {
      trace: 'on',
      screenshot: 'on',
    },
  }),
});
