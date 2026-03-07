import { expect, test } from '../fixtures/tauri.js';
import { createItem, deleteItem } from '../helpers/ipc.js';
import { resizeWindow } from '../helpers/resize.js';

test.describe('ライブラリ詳細パネル', () => {
	test('閉じるボタンでパネルが閉じること（#17 修正検証）', async ({ page }) => {
		// lg 幅にして DetailPanel を表示
		await resizeWindow(page, 1280, 800);

		const item = await createItem(page, {
			item_type: 'url',
			label: 'パネル閉じテスト',
			target: 'https://panel-close-test.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');

			// カードをクリックして DetailPanel に表示
			await page.getByTestId(`library-card-${item.id}`).click();

			// DetailPanel にアイテム名が表示される
			const detailPanel = page.getByTestId('library-detail-panel');
			await expect(detailPanel.getByText('パネル閉じテスト')).toBeVisible();

			// 閉じるボタンをクリック
			await detailPanel.getByRole('button', { name: 'パネルを閉じる' }).click();

			// プレースホルダーが表示される
			await expect(detailPanel.getByText('アイテムを選択してください')).toBeVisible();
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('無効アイテムがグレーアウトされること（#16 修正検証）', async ({ page }) => {
		const item = await createItem(page, {
			item_type: 'url',
			label: 'グレーアウトテスト',
			target: 'https://grayout-test.example.com',
		});

		try {
			// IPC でアイテムを無効化
			await page.evaluate(
				async ([id]) => {
					await (
						window as unknown as {
							__TAURI_INTERNALS__: { invoke: (cmd: string, args?: unknown) => Promise<unknown> };
						}
					).__TAURI_INTERNALS__.invoke('cmd_update_item', {
						id,
						input: { is_enabled: false },
					});
				},
				[item.id] as [string],
			);

			await page.reload();
			await page.waitForLoadState('domcontentloaded');

			const card = page.getByTestId(`library-card-${item.id}`);
			await expect(card).toBeVisible();

			// opacity-40 と grayscale クラスが付いていること
			const hasGrayout = await card.evaluate((el) => {
				return el.classList.contains('opacity-40') && el.classList.contains('grayscale');
			});
			expect(hasGrayout).toBe(true);
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('カードのダブルクリックで dblclick イベントが発火すること（#22 修正検証）', async ({
		page,
	}) => {
		const item = await createItem(page, {
			item_type: 'url',
			label: 'ダブルクリックテスト',
			target: 'https://dblclick-test.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');

			const card = page.getByTestId(`library-card-${item.id}`);
			await expect(card).toBeVisible();

			// カードに dblclick イベントリスナーを追加して発火を検証
			await card.evaluate((el) => {
				(el as HTMLElement & { __dblclick_count__: number }).__dblclick_count__ = 0;
				el.addEventListener('dblclick', () => {
					(el as HTMLElement & { __dblclick_count__: number }).__dblclick_count__++;
				});
			});

			await card.dblclick();

			const count = await card.evaluate(
				(el) => (el as HTMLElement & { __dblclick_count__: number }).__dblclick_count__,
			);
			expect(count).toBe(1);
		} finally {
			await deleteItem(page, item.id);
		}
	});
});
