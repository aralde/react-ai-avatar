import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests for the animation runtime (blink, mouth, gaze, overlays),
 * which unit tests on static markup can't reach. Runs against a fixture app
 * served from the sources: `npm run test:e2e`.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:5179',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite --config e2e/vite.config.ts',
    url: 'http://localhost:5179',
    reuseExistingServer: !process.env.CI,
  },
});
