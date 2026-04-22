import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  snapshotDir: './tests/e2e/__snapshots__',
  timeout: 60_000,
  globalTimeout: 600_000,
  retries: 1,
  workers: 1,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  reporter: [
    ['html', { open: 'never', outputFolder: 'tmp/playwright-report' }],
    ['junit', { outputFile: 'tmp/playwright-results.xml' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  globalSetup: './tests/fixtures/global-setup.ts',
  globalTeardown: './tests/fixtures/global-teardown.ts',
  // debug バイナリは devUrl (http://localhost:5173) を使うため Vite が必要
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
