import process from 'node:process';

/**
 * Global test setup
 * Runs once before all tests
 */
export default async function globalSetup() {
  const testMode = (process.env['TEST_MODE'] || 'mock').toLowerCase();
  const apiBaseUrl = process.env['API_BASE_URL'] || 'http://localhost:5010';

  console.log(`🚀 Starting global test setup... (Mode: ${testMode})`);

  if (testMode === 'mock') {
    console.log('ℹ️ Mock mode enabled: skipping API health check');
    return;
  }

  // Verify API is running
  const maxRetries = 30;
  let retries = 0;
  let apiHealthy = false;
  const healthUrl = `${apiBaseUrl.replace(/\/$/, '')}/health`;

  console.log(`🔍 Verifying API health at: ${healthUrl}`);

  while (retries < maxRetries && !apiHealthy) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal as AbortSignal,
      });
      clearTimeout(id);
      if (response.ok) {
        apiHealthy = true;
        console.log('✅ API is healthy and ready for testing');
      } else {
        throw new Error(`Health check returned status: ${response.status}`);
      }
    } catch (error) {
      retries++;
      if (retries < maxRetries) {
        console.log(`⏳ Waiting for API... (attempt ${retries}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  if (!apiHealthy) {
    throw new Error(
      `❌ API failed to start at ${healthUrl} after 60 seconds.\n` +
      'Ensure the backend is running locally (port 5274) or via Docker (port 5010).\n' +
      'Run: docker-compose -f docker-compose.test.yml up -d'
    );
  }

  // Verify frontend dev server is running (if testing against dev server)
  if (process.env['FRONTEND_MODE'] === 'dev') {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('http://localhost:4200', { 
        method: 'GET',
        signal: controller.signal as AbortSignal
      });
      clearTimeout(id);
      if (response.ok) {
        console.log('✅ Frontend dev server is ready');
      }
    } catch (error) {
      console.warn(
        '⚠️ Frontend dev server not responding. Run: npm start\n' +
        'Or run tests against production build: npm run e2e:prod'
      );
    }
  }

  console.log('✅ Global setup complete\n');
}

/**
 * Global test teardown
 * Runs once after all tests
 */
export async function globalTeardown() {
  console.log('\n🧹 Running global test teardown...');

  // Cleanup can include:
  // - Clearing test database
  // - Closing any persistent connections
  // - Archiving test reports
  // For now, keep it simple - Docker containers handle cleanup

  console.log('✅ Global teardown complete\n');
}
