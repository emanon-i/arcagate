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
	// PH-PQ-700 T7: locale-en/ は EN 専用 config (playwright.en.config.ts) で実行する。
	// 既定 (ja) run では除外しないと ja UI 強制下で EN selector spec が実行され fail する。
	testIgnore: ['**/locale-en/**'],
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
	// debug バイナリは devUrl (http://localhost:5173) を使うため Vite が必要。
	// `VITE_E2E=1` で `src/lib/ipc/icon-picker.ts` の test seam を有効化する (production build
	// では `import.meta.env.VITE_E2E` が undefined になり seam ブロックが tree-shake で除去される)。
	webServer: {
		command: 'pnpm dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: { VITE_E2E: '1' },
	},
});
