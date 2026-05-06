import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { resizeWindow } from '../helpers/resize.js';

test.describe
	.skip('ビジュアルリグレッション', () => {
		test('Library ビュー 1280x800', async ({ page }) => {
			await resizeWindow(page, 1280, 800);
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.waitForLoadState('networkidle');

			await expect(page).toHaveScreenshot('library-1280x800.png', { scale: 'css' });
		});

		test('Workspace ビュー 1280x800', async ({ page }) => {
			await resizeWindow(page, 1280, 800);
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// Workspace タブに切り替え
			await page.getByRole('button', { name: 'Workspace' }).click();
			await page.waitForLoadState('networkidle');

			await expect(page).toHaveScreenshot('workspace-1280x800.png', { scale: 'css' });
		});

		test('パレットオーバーレイ', async ({ page }) => {
			await resizeWindow(page, 1280, 800);
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// パレットを開く
			await page.getByRole('button', { name: 'Palette' }).click();
			const dialog = page.locator('[role="dialog"]');
			await expect(dialog).toBeVisible();
			await page.waitForLoadState('networkidle');

			await expect(page).toHaveScreenshot('palette-overlay.png', { scale: 'css' });

			// パレットを閉じる
			const paletteInput = dialog.getByRole('textbox').first();
			await paletteInput.focus();
			await page.keyboard.press('Escape');
		});
	});
