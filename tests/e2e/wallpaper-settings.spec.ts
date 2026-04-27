/**
 * PH-499 batch-109: Library 共通 背景壁紙 設定の reactive 反映確認
 *
 * 受け入れ条件:
 * - Settings > 外観 に 「背景壁紙」 section が表示される
 * - 未設定時は empty state、設定後は path → wallpaper layer 即時反映
 * - opacity / blur slider の操作で wallpaper layer の inline style が更新される
 * - 「壁紙なし」で path = '' に戻る + wallpaper layer 消える
 *
 * 注: 実ファイル選択ダイアログを e2e で開けないため、cmd_set_config 経由で path を直接 inject する。
 * ファイル本体は不要 (img の src が assertion 対象でなく、layer の存在 + style だけ確認)。
 */
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { invoke } from '../helpers/ipc.js';

async function setLibraryWallpaperConfig(
	page: import('@playwright/test').Page,
	path: string,
	opacity: number,
	blur: number,
) {
	await invoke<void>(page, 'cmd_set_config', {
		key: 'library_wallpaper_path',
		value: path,
	});
	await invoke<void>(page, 'cmd_set_config', {
		key: 'library_wallpaper_opacity',
		value: String(opacity),
	});
	await invoke<void>(page, 'cmd_set_config', {
		key: 'library_wallpaper_blur',
		value: String(blur),
	});
}

test.describe('PH-499: 背景壁紙 設定', () => {
	test.afterEach(async ({ page }) => {
		// 後始末: 壁紙設定をクリア (他テストへの影響を防ぐ)
		await setLibraryWallpaperConfig(page, '', 0.7, 12).catch(() => {});
		const closeBtn = page.getByRole('button', { name: '設定を閉じる' });
		if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
			await closeBtn.click();
		}
	});

	test('Settings > 外観 に 背景壁紙 section + 未設定の empty state が表示される', async ({
		page,
	}) => {
		await setLibraryWallpaperConfig(page, '', 0.7, 12);
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		// Settings ダイアログを開く
		await page.getByRole('button', { name: '設定' }).first().click();

		// 「外観」タブを開く
		await page.getByRole('tab', { name: '外観' }).click();

		// 壁紙 section が表示される
		const settings = page.getByTestId('wallpaper-settings');
		await expect(settings).toBeVisible({ timeout: 5000 });

		// 未設定 → empty state 表示
		await expect(page.getByTestId('wallpaper-empty')).toBeVisible();
		await expect(page.getByTestId('wallpaper-preview')).not.toBeVisible();

		// pick / opacity / blur control が render されている
		await expect(page.getByTestId('wallpaper-pick')).toBeVisible();
		await expect(page.getByTestId('wallpaper-opacity')).toBeVisible();
		await expect(page.getByTestId('wallpaper-blur')).toBeVisible();
	});

	test('壁紙 path 設定 → wallpaper layer が opacity/blur 込みで描画される', async ({ page }) => {
		// path に存在しない疑似パスを設定 (img.src は asset 解決失敗するが、layer 自体は表示される)
		await setLibraryWallpaperConfig(page, 'C:/__ph499_fake_wallpaper__.png', 0.5, 8);
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		// wallpaper layer が表示される
		const layer = page.getByTestId('app-wallpaper-layer');
		await expect(layer).toBeVisible({ timeout: 5000 });

		// inline style に opacity / blur が反映されている
		const style = await layer.getAttribute('style');
		expect(style ?? '').toMatch(/opacity:\s*0\.5/);
		expect(style ?? '').toMatch(/filter:\s*blur\(8px\)/);
	});

	test('path 解除で wallpaper layer が DOM から消える', async ({ page }) => {
		// 一旦設定
		await setLibraryWallpaperConfig(page, 'C:/__ph499_fake_wallpaper__.png', 0.7, 12);
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);
		await expect(page.getByTestId('app-wallpaper-layer')).toBeVisible({ timeout: 5000 });

		// 解除
		await setLibraryWallpaperConfig(page, '', 0.7, 12);
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);
		await expect(page.getByTestId('app-wallpaper-layer')).not.toBeVisible();
	});
});
