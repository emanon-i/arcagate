import { expect, test } from '../fixtures/tauri.js';
import { resizeWindow } from '../helpers/resize.js';

test.describe('レイアウト', () => {
	test('サイドバーが viewport 下端まで伸びること（#23 修正検証）', async ({ page }) => {
		// lg 幅にリサイズしてサイドバーを表示
		await resizeWindow(page, 1280, 800);
		await page.reload();
		await page.waitForLoadState('domcontentloaded');

		const sidebar = page.getByTestId('library-sidebar');
		await expect(sidebar).toBeVisible();

		const sidebarBox = await sidebar.boundingBox();
		expect(sidebarBox).toBeTruthy();
		const { y, height } = sidebarBox as { y: number; height: number };

		const windowHeight = await page.evaluate(() => window.innerHeight);
		// サイドバーの下端が viewport 下端付近（2px 許容）まで伸びていること
		expect(y + height).toBeGreaterThanOrEqual(windowHeight - 2);
	});

	test('3カラムレイアウト（lg: 1280px）', async ({ page }) => {
		await resizeWindow(page, 1280, 800);
		await page.reload();
		await page.waitForLoadState('domcontentloaded');

		await expect(page.getByTestId('library-sidebar-wrapper')).toBeVisible();
		await expect(page.getByTestId('library-main-wrapper')).toBeVisible();
		await expect(page.getByTestId('library-detail-wrapper')).toBeVisible();
	});

	test('2カラムレイアウト（md: 900px）', async ({ page }) => {
		await resizeWindow(page, 900, 800);
		await page.reload();
		await page.waitForLoadState('domcontentloaded');

		await expect(page.getByTestId('library-sidebar-wrapper')).toBeVisible();
		await expect(page.getByTestId('library-main-wrapper')).toBeVisible();
		// detail は lg 未満では非表示
		await expect(page.getByTestId('library-detail-wrapper')).not.toBeVisible();
	});

	test('1カラムレイアウト（sm: 640px）', async ({ page }) => {
		await resizeWindow(page, 640, 480);
		await page.reload();
		await page.waitForLoadState('domcontentloaded');

		// sidebar は md 未満では非表示
		await expect(page.getByTestId('library-sidebar-wrapper')).not.toBeVisible();
		await expect(page.getByTestId('library-main-wrapper')).toBeVisible();
		await expect(page.getByTestId('library-detail-wrapper')).not.toBeVisible();
	});

	test('複数サイズでエラーなし', async ({ page }) => {
		const sizes = [
			[640, 480],
			[1024, 768],
			[1920, 1080],
		] as const;

		for (const [w, h] of sizes) {
			await resizeWindow(page, w, h);
			// コンソールエラーを監視
			const errors: string[] = [];
			page.on('pageerror', (err) => errors.push(err.message));

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			// 安定するのを待つ
			await page.waitForTimeout(500);

			expect(errors, `${w}x${h} でコンソールエラー`).toHaveLength(0);
			page.removeAllListeners('pageerror');
		}
	});

	test('TitleBar のボタンが存在すること（#1, #2 修正検証）', async ({ page }) => {
		await expect(page.getByRole('button', { name: '最小化' })).toBeVisible();
		await expect(page.getByRole('button', { name: /最大化|元に戻す/ })).toBeVisible();
		await expect(page.getByRole('button', { name: '閉じる' })).toBeVisible();
	});

	test('TitleAction がアイコンのみであること（#5 修正検証）', async ({ page }) => {
		const paletteButton = page.getByRole('button', { name: 'Palette' });
		await expect(paletteButton).toBeVisible();

		// ボタン内に表示テキストがないことを確認（aria-label は textContent に含まれない）
		const textContent = await paletteButton.evaluate((el) => {
			// SVG と空白以外のテキストノードがないことを確認
			const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
			let text = '';
			while (walker.nextNode()) {
				text += walker.currentNode.textContent?.trim() ?? '';
			}
			return text;
		});
		expect(textContent).toBe('');
	});

	test('TitleBar が上端 28px 以内にあること（#3 修正検証）', async ({ page }) => {
		const minimizeButton = page.getByRole('button', { name: '最小化' });
		const box = await minimizeButton.boundingBox();
		expect(box).toBeTruthy();
		expect((box as { y: number }).y).toBeLessThan(28);
	});
});
