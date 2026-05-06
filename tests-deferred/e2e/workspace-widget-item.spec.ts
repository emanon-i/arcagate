import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import {
	addWidget,
	createItem,
	createWorkspace,
	deleteItem,
	deleteWorkspace,
} from '../helpers/ipc.js';

test.describe('Item ウィジェット', () => {
	test(
		'Item Widget をワークスペースに追加すると紐付け CTA が表示されること',
		{ tag: '@smoke' },
		async ({ page }) => {
			const ws = await createWorkspace(page, 'Item Widget テスト WS');
			await addWidget(page, ws.id, 'item');

			try {
				await page.reload();
				await page.waitForLoadState('domcontentloaded');
				await waitForAppReady(page);

				await page.getByRole('button', { name: 'Workspace' }).click();
				await expect(page.getByText('Item Widget テスト WS')).toBeVisible();

				// 空状態 CTA「アイテムを紐付け」 button が表示
				await expect(
					page.getByRole('button', { name: 'このウィジェットにアイテムを紐付け' }),
				).toBeVisible();
			} finally {
				await deleteWorkspace(page, ws.id);
			}
		},
	);

	test('空状態 click で LibraryItemPicker が直接開いてアイテムを紐付けられること', async ({
		page,
	}) => {
		const item = await createItem(page, {
			item_type: 'url',
			label: 'E2E テスト URL アイテム',
			target: 'https://example.com',
			args: undefined,
			working_dir: undefined,
			icon_path: undefined,
			is_tracked: false,
		});
		const ws = await createWorkspace(page, 'Item Widget 選択テスト WS');
		await addWidget(page, ws.id, 'item');

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('Item Widget 選択テスト WS')).toBeVisible();

			// I2 fix: 空状態 click で picker が直接開く (旧 2 step → 1 step)
			await page.getByRole('button', { name: 'このウィジェットにアイテムを紐付け' }).click();

			// LibraryItemPicker ダイアログが開く
			const dialog = page.getByRole('dialog', { name: 'アイテム選択' });
			await expect(dialog).toBeVisible();

			// multi-select モードで item を click → toggle → 「追加」 で確定
			await dialog.getByText('E2E テスト URL アイテム').click();
			await dialog.getByTestId('picker-confirm').click();

			// dialog が閉じて item が widget に表示
			await expect(dialog).not.toBeVisible();
			await expect(page.getByText('E2E テスト URL アイテム')).toBeVisible();
		} finally {
			await deleteWorkspace(page, ws.id);
			await deleteItem(page, item.id);
		}
	});
});
