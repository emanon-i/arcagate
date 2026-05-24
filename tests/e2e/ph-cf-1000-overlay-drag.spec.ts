import { expect, test } from '../fixtures/tauri.js';
import { markOnboardingComplete, markSetupComplete, resetFirstRun } from '../helpers/ipc.js';

/**
 * PH-CF-1000 B1 e2e: フルスクリーンオーバーレイ表示中も window をドラッグ移動できる
 * (`data-tauri-drag-region` 帯が overlay 内に存在する) ことを verify する。
 *
 * 引用元 guideline:
 *  - `docs/l3_phases/clean-feedback/PH-CF-1000_overlay-drag-region.md` §受け入れ条件
 *  - `docs/l2_foundation/features/cross-cutting/window-drag.md` §オーバーレイ window 操作契約
 *
 * 実際の window 移動は OS native の hit-test 経路に依存するため Playwright で再現困難。
 * 代わりに「overlay 表示中に `[data-testid="overlay-drag-region"]` 要素が存在し、
 * `data-tauri-drag-region` 属性を持ち、 thin header (≤ 40px) サイズで window 上端に
 * 配置されている」 を DOM で verify する (= Tauri runtime が drag を hook できる条件)。
 *
 * audit script (`scripts/audit-overlay-drag-region.sh`) で全 component の grep 検出が
 * カバーされているため、 e2e は user 視点の overlay 3 種 (SetupWizard / HelpPanel /
 * Settings) を実機で confirm する役割。
 */

test.afterEach(async ({ page }) => {
	// 後続 spec が overlay 残留で影響を受けないよう、 setup / onboarding を complete に戻す。
	await markSetupComplete(page).catch(() => {});
	await markOnboardingComplete(page).catch(() => {});
});

async function assertDragRegion(
	page: import('@playwright/test').Page,
	scope: import('@playwright/test').Locator,
): Promise<void> {
	// overlay 内の drag region は thin header 帯 (h-8 = 32px 程度) で window 上端に貼られる。
	const drag = scope.getByTestId('overlay-drag-region');
	await expect(drag).toBeVisible({ timeout: 5_000 });
	await expect(drag).toHaveAttribute('data-tauri-drag-region', '');
	const box = await drag.boundingBox();
	expect(box).not.toBeNull();
	expect(box?.y).toBeLessThanOrEqual(2); // window 上端 (small jitter 許容)
	expect(box?.height).toBeLessThanOrEqual(40); // thin header (TitleBar h-10 以下)
	// インタラクティブ要素には付いていない (= drag region 要素自体が button ではない)。
	const tag = await drag.evaluate((el) => el.tagName.toLowerCase());
	expect(['div', 'span', 'header']).toContain(tag);
}

test('PH-CF-1000 B1: SetupWizard 表示中に overlay-drag-region が window 上端に存在する', async ({
	page,
}) => {
	// SetupWizard が出るよう reset + reload。
	await resetFirstRun(page);
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });

	const wizard = page.getByTestId('setup-wizard');
	await expect(wizard).toBeVisible({ timeout: 15_000 });
	await assertDragRegion(page, wizard);
});

test('PH-CF-1000 B1: HelpPanel 表示中に overlay-drag-region が window 上端に存在する', async ({
	page,
}) => {
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'library'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });

	// HelpPanel は TitleBar の help button から開く。 selector は label 経由 (i18n に追従)。
	await page
		.getByRole('button', { name: /^(Help|ヘルプ)$/, exact: true })
		.first()
		.click();
	const panel = page.getByTestId('help-panel');
	await expect(panel).toBeVisible({ timeout: 10_000 });
	await assertDragRegion(page, panel);
});

test('PH-CF-1000 B1: Settings dialog 表示中に overlay-drag-region が window 上端に存在する', async ({
	page,
}) => {
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'library'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });

	// Settings は TitleBar の Settings button (i18n) で開く。
	await page
		.getByRole('button', { name: /^(Settings|設定)$/, exact: true })
		.first()
		.click();
	// Settings overlay は `<div role="dialog" aria-modal="true">` に内包される。 overlay 内に
	// overlay-drag-region が 1 個存在する (= dialog の上に overlay div があり、 その中の
	// drag region 要素を取得)。
	const settingsDialog = page
		.getByRole('dialog')
		.filter({ has: page.getByTestId('overlay-drag-region') });
	await expect(settingsDialog).toBeVisible({ timeout: 10_000 });
	await assertDragRegion(page, settingsDialog);
});
