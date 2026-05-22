import { expect, test } from '../../fixtures/tauri.js';
import { markOnboardingComplete, markSetupComplete, resetFirstRun } from '../../helpers/ipc.js';

/**
 * PH-PQ-700 T7: EN locale で SetupWizard 完走経路を検証。
 *
 * setup-wizard.spec.ts (ja) と同じ data-testid 駆動だが、 EN UI 強制下で
 * Welcome / 完走ボタン等が英語 value で描画されることも併せて assert する。
 *
 * 引用元: docs/l3_phases/paid-quality/PH-PQ-700_i18n-and-global.md T7
 */

test.afterEach(async ({ page }) => {
	await markSetupComplete(page).catch(() => {});
	await markOnboardingComplete(page).catch(() => {});
});

test('EN setup wizard: 完走経路 (Welcome → Hotkey → Autostart) が英語表記で成立', async ({
	page,
}) => {
	await resetFirstRun(page);
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });

	const wizard = page.getByTestId('setup-wizard');
	await expect(wizard).toBeVisible({ timeout: 15_000 });

	// Welcome step が EN value で描画されている (翻訳経路の実機検証)
	await expect(wizard.getByText('Welcome to Arcagate')).toBeVisible({ timeout: 10_000 });

	await page.getByTestId('setup-welcome-next').click();
	await page.getByTestId('setup-hotkey-next').click();
	await page.getByTestId('setup-finish').click();
	await expect(wizard).toBeHidden({ timeout: 10_000 });

	// 完走後に OnboardingTour が発火、 data-tour アンカーが存在する
	const tour = page.getByTestId('onboarding-tour');
	await expect(tour).toBeVisible({ timeout: 10_000 });
	for (const target of ['palette', 'library', 'workspace']) {
		await expect(page.locator(`[data-tour="${target}"]`)).toBeVisible();
	}
	await page.getByTestId('onboarding-next').click();
	await page.getByTestId('onboarding-next').click();
	await page.getByTestId('onboarding-next').click();
	await expect(tour).toBeHidden({ timeout: 10_000 });
});

test('EN setup wizard: ツアーは途中スキップできる', async ({ page }) => {
	await resetFirstRun(page);
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });

	const wizard = page.getByTestId('setup-wizard');
	await expect(wizard).toBeVisible({ timeout: 15_000 });
	await page.getByTestId('setup-welcome-next').click();
	await page.getByTestId('setup-hotkey-next').click();
	await page.getByTestId('setup-finish').click();
	await expect(wizard).toBeHidden({ timeout: 10_000 });

	const tour = page.getByTestId('onboarding-tour');
	await expect(tour).toBeVisible({ timeout: 10_000 });
	await page.getByTestId('onboarding-skip').click();
	await expect(tour).toBeHidden({ timeout: 10_000 });
});
