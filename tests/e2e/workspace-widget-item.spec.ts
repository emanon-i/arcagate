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
		'Item Widget をワークスペースに追加すると選択プレースホルダが表示されること',
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

				// プレースホルダが表示されること
				await expect(page.getByText('アイテムを選択')).toBeVisible();
			} finally {
				await deleteWorkspace(page, ws.id);
			}
		},
	);

	test('LibraryItemPicker でアイテムを選択するとウィジェットに固定されること', async ({ page }) => {
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

			// 選択プレースホルダをクリック
			await page.getByText('アイテムを選択').click();

			// LibraryItemPicker ダイアログが開くこと
			const dialog = page.getByRole('dialog', { name: 'アイテム選択' });
			await expect(dialog).toBeVisible();

			// アイテムを選択
			await dialog.getByText('E2E テスト URL アイテム').click();

			// ダイアログが閉じてアイテムラベルが表示されること
			await expect(dialog).not.toBeVisible();
			await expect(page.getByText('E2E テスト URL アイテム')).toBeVisible();
		} finally {
			await deleteWorkspace(page, ws.id);
			await deleteItem(page, item.id);
		}
	});
});
