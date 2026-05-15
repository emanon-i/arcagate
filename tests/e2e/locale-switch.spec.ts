import { expect } from '@playwright/test';
import { test } from '../fixtures/tauri.js';

/**
 * Phase 5: locale 切替 e2e + en/ja screenshot diff。
 *
 * 引用元 guideline:
 * - docs/l2_foundation/i18n-policy.md §5 Phase 5 e2e
 * - docs/l2_foundation/test_scenarios.md (T2 smoke 拡張)
 *
 * 検証範囲:
 * 1. default ja locale で起動、 ja value で UI 表示確認
 *    (= tests/fixtures/global-setup.ts が `arcagate.test.force_locale='ja'` を pre-inject 済)
 * 2. test override を解除 + `arcagate.locale='en'` set + reload → en value 表示確認
 * 3. test override を `arcagate.test.force_locale='ja'` に戻して ja value 復活確認
 *    (= force key の優先順位を検証、 後続 test の isolation を担保)
 *
 * screenshot は testInfo.attach() で HTML report に証跡添付。
 */

test.describe('locale switch (i18n Phase 5)', () => {
	test('ja default → library search placeholder shows ja value', async ({ page }, testInfo) => {
		// global-setup で test.force_locale='ja' 済 → ja UI で起動。
		await expect(page.getByPlaceholder('ライブラリを検索')).toBeVisible({ timeout: 10_000 });

		const screenshot = await page.screenshot({ fullPage: true });
		await testInfo.attach('locale-ja-library', {
			body: screenshot,
			contentType: 'image/png',
		});
	});

	test('en switch → library search placeholder shows en value', async ({ page }, testInfo) => {
		// test override を解除して saved locale を en に。 reload で +layout の
		// resolveInitialLocale が `arcagate.locale='en'` を読み en active に。
		await page.evaluate(() => {
			localStorage.removeItem('arcagate.test.force_locale');
			localStorage.setItem('arcagate.locale', 'en');
		});
		await page.reload();
		await page.waitForLoadState('domcontentloaded');

		await expect(page.getByPlaceholder('Search library')).toBeVisible({ timeout: 10_000 });

		const screenshot = await page.screenshot({ fullPage: true });
		await testInfo.attach('locale-en-library', {
			body: screenshot,
			contentType: 'image/png',
		});

		// test isolation: 後続 test 用に test.force_locale を 'ja' へ復元 + saved locale を消す。
		await page.evaluate(() => {
			localStorage.removeItem('arcagate.locale');
			localStorage.setItem('arcagate.test.force_locale', 'ja');
		});
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await expect(page.getByPlaceholder('ライブラリを検索')).toBeVisible({ timeout: 10_000 });
	});
});
