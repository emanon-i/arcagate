import { defineConfig } from '@playwright/test';

export default defineConfig({
  // refactor 期間中、tests/ は tests-deferred/ に rename して disable 中。
  // refactor 完了後、test 再構築 phase で tests/ を新設して切替予定。
  testDir: './tests-deferred/e2e',
  snapshotDir: './tests-deferred/e2e/__snapshots__',
  timeout: process.env.CI ? 120_000 : 60_000,
  globalTimeout: process.env.CI ? 1_200_000 : 300_000,
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
  globalSetup: './tests-deferred/fixtures/global-setup.ts',
  globalTeardown: './tests-deferred/fixtures/global-teardown.ts',
  // debug バイナリは devUrl (http://localhost:5173) を使うため Vite が必要
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
