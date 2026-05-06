import { defineConfig } from '@playwright/test';

/**
 * Playwright config for T1 smoke phase。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T1 phase)
 *
 * - Tauri v2 + WebView2 (CDP attach) + Vite dev server (devUrl) 構成
 * - globalSetup で Tauri debug binary 起動 + SetupWizard skip
 * - tests/e2e/*.spec.ts を実行 (T1 smoke 5 件で開始、T2/T3 で incremental 追加)
 */
export default defineConfig({
	testDir: './tests/e2e',
	timeout: process.env.CI ? 120_000 : 60_000,
	globalTimeout: process.env.CI ? 1_200_000 : 300_000,
	retries: 1,
	workers: 1, // single worker (Tauri instance 1 つ共有)
	expect: {
		timeout: 10_000,
	},
	reporter: [
		['html', { open: 'never', outputFolder: 'tmp/playwright-report' }],
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
		timeout: 120_000,
	},
});
