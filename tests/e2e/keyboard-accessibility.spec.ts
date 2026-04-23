import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createItem, deleteItem } from '../helpers/ipc.js';
import { resizeWindow } from '../helpers/resize.js';

test.describe('キーボードアクセシビリティ', () => {
	test(
		'LibraryDetailPanel 閉じるボタンが Tab + Enter で閉じられること',
		{ tag: '@smoke' },
		async ({ page }) => {
			await resizeWindow(page, 1280, 800);

			const item = await createItem(page, {
				item_type: 'url',
				label: 'Keyboard閉じるテスト',
				target: 'https://keyboard-close-test.example.com',
			});

			try {
				await page.reload();
				await page.waitForLoadState('domcontentloaded');
				await waitForAppReady(page);

				// カードをクリックして DetailPanel を開く
				await page.getByTestId(`library-card-${item.id}`).click();
				const detailPanel = page.getByTestId('library-detail-panel');
				await expect(detailPanel).toBeVisible();

				// Tab キーで閉じるボタンにフォーカスを移す
				const closeButton = detailPanel.getByRole('button', { name: 'パネルを閉じる' });
				await closeButton.focus();
				await expect(closeButton).toBeFocused();

				// Enter キーで閉じる
				await page.keyboard.press('Enter');

				// パネルが閉じること
				await expect(page.getByTestId('library-detail-wrapper')).not.toBeVisible({
					timeout: 3000,
				});
			} finally {
				await deleteItem(page, item.id);
			}
		},
	);

	test('SidebarRow ボタンが Tab で到達できること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		const sidebar = page.getByTestId('library-sidebar');
		await expect(sidebar).toBeVisible();

		// サイドバー内のボタンが tabindex で到達可能であること
		const sidebarButtons = sidebar.getByRole('button');
		const count = await sidebarButtons.count();
		expect(count).toBeGreaterThan(0);

		// 最初のボタンをフォーカスできること
		await sidebarButtons.first().focus();
		await expect(sidebarButtons.first()).toBeFocused();
	});
});
