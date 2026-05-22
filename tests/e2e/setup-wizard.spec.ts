import { expect, test } from '../fixtures/tauri.js';
import { markOnboardingComplete, markSetupComplete, resetFirstRun } from '../helpers/ipc.js';

/**
 * PH-PQ-200 T5: SetupWizard の完走経路を skip せず実際に駆動する e2e。
 *
 * 他 spec は globalSetup / fixture が setup を complete 済にして skip するが、 本 spec は
 * `cmd_reset_first_run` で未完了状態に戻し、 reload 後に出る本物の SetupWizard を
 * Welcome → Hotkey → Autostart と順に完走させる。 完走 wall time が 30 秒以内である
 * ことを CI gate で保証する (初回フロー全体 30 秒以内 = PH-PQ-200 確定スコープ)。
 *
 * afterEach で setup / onboarding を再度 complete に戻し、 後続 spec が SetupWizard /
 * OnboardingTour overlay に pointer event を奪われない状態を保証する。
 */

test.afterEach(async ({ page }) => {
	await markSetupComplete(page).catch(() => {});
	await markOnboardingComplete(page).catch(() => {});
});

test('setup wizard: 完走経路 (Welcome → Hotkey → Autostart) が 30 秒以内', async ({ page }) => {
	// fixture が setup を complete 済にするため、 実 setup path 検証のため reset + reload。
	await resetFirstRun(page);
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });

	const wizard = page.getByTestId('setup-wizard');
	await expect(wizard).toBeVisible({ timeout: 15_000 });

	const start = Date.now();

	// Step 1: ようこそ + 価値伝達
	await page.getByTestId('setup-welcome-next').click();
	// Step 2: ホットキー (default を維持)
	await page.getByTestId('setup-hotkey-next').click();
	// Step 3: 自動起動 (default を維持) → 完走
	await page.getByTestId('setup-finish').click();

	await expect(wizard).toBeHidden({ timeout: 10_000 });

	const elapsedMs = Date.now() - start;
	expect(elapsedMs, `SetupWizard 完走 wall time: ${elapsedMs}ms`).toBeLessThan(30_000);

	// 完走直後に OnboardingTour が自動発火する
	const tour = page.getByTestId('onboarding-tour');
	await expect(tour).toBeVisible({ timeout: 10_000 });

	// ツアーは data-tour で実 UI をアンカーする — 3 spot の対象要素が存在する
	for (const target of ['palette', 'library', 'workspace']) {
		await expect(page.locator(`[data-tour="${target}"]`)).toBeVisible();
	}

	// 3 spot (Palette / Library / Workspace) を順次完走
	await page.getByTestId('onboarding-next').click();
	await page.getByTestId('onboarding-next').click();
	await page.getByTestId('onboarding-next').click();

	await expect(tour).toBeHidden({ timeout: 10_000 });
});

test('setup wizard: ツアーは途中スキップできる', async ({ page }) => {
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

	// ツアー 1 spot 目でスキップ → 即 dismiss できる (always skippable)
	const tour = page.getByTestId('onboarding-tour');
	await expect(tour).toBeVisible({ timeout: 10_000 });
	await page.getByTestId('onboarding-skip').click();
	await expect(tour).toBeHidden({ timeout: 10_000 });
});
