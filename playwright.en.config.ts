import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * PH-PQ-700 T7: EN locale e2e config。
 *
 * base config (playwright.config.ts) を継承し、 testDir を tests/e2e/locale-en に切替える。
 * globalSetup が `ARCAGATE_E2E_LOCALE` を読み、 localStorage 経由で en UI を強制する
 * (tests/fixtures/global-setup.ts 参照)。 CI では ja run の後に sequential 実行する
 * (CDP port 9515 と Tauri instance を共有するため parallel 不可)。
 *
 * 引用元: docs/l3_phases/paid-quality/PH-PQ-700_i18n-and-global.md T7
 */

// config module 評価は globalSetup より前に同一 process で走るため、 ここで en を強制すれば
// `pnpm test:e2e:en` 単体でも (外部 env なしで) en UI 検証になる。
process.env.ARCAGATE_E2E_LOCALE = 'en';

export default defineConfig({
	...baseConfig,
	testDir: './tests/e2e/locale-en',
	// base の testIgnore (locale-en 除外) を打ち消す
	testIgnore: [],
	// ja run と出力先を分離 (sequential 実行で report / test-results を上書きしないため)
	outputDir: 'test-results-en',
	reporter: [
		['html', { open: 'never', outputFolder: 'tmp/playwright-report-en' }],
		process.env.CI ? ['github'] : ['list'],
	],
});
