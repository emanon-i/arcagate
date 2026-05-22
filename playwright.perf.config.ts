import { defineConfig } from '@playwright/test';

/**
 * PH-PQ-400 T1: 性能予算 (vision.md D1-D9) 計測専用の Playwright config。
 *
 * `pnpm test:e2e` (playwright.config.ts) とは別 testDir (tests/perf)。 perf spec は
 * 重く時間がかかるため timeout を大きく取り retry なし (retry すると再計測になる)。
 *
 * - debug binary (devUrl): Vite dev server が必要 → webServer 起動。
 * - release binary (ARCAGATE_TEST_EXE 指定 / frontendDist 埋込): Vite 不要 → webServer 無し。
 *
 * CI 統合は .github/workflows/perf.yml (nightly + main push)。
 */
const releaseExe = process.env.ARCAGATE_TEST_EXE;

export default defineConfig({
	testDir: './tests/perf',
	testMatch: '**/*.spec.ts',
	timeout: 900_000,
	globalTimeout: 3_600_000,
	retries: 0,
	workers: 1,
	expect: {
		timeout: 30_000,
	},
	reporter: [
		['html', { open: 'never', outputFolder: 'tmp/perf-report' }],
		['json', { outputFile: 'tmp/perf/playwright-results.json' }],
		process.env.CI ? ['github'] : ['list'],
	],
	use: {
		trace: 'retain-on-failure',
	},
	globalSetup: './tests/fixtures/global-setup.ts',
	globalTeardown: './tests/fixtures/global-teardown.ts',
	webServer: releaseExe
		? undefined
		: {
				command: 'pnpm dev',
				url: 'http://localhost:5173',
				reuseExistingServer: !process.env.CI,
				timeout: 120_000,
			},
});
