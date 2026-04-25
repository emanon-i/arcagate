import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import {
	addWidget,
	createItem,
	createWorkspace,
	deleteItem,
	deleteWorkspace,
	toggleStar,
} from '../helpers/ipc.js';

test.describe('Favorites ウィジェット', () => {
	test(
		'スター付きアイテムが Favorites ウィジェットに表示されること',
		{ tag: '@smoke' },
		async ({ page }) => {
			const item = await createItem(page, {
				item_type: 'url',
				label: 'E2E Favorites テストアイテム',
				target: 'https://example.com',
				args: null,
				working_dir: null,
				icon_path: null,
				is_tracked: false,
			});
			await toggleStar(page, item.id, true);
			const ws = await createWorkspace(page, 'Favorites テスト WS');
			await addWidget(page, ws.id, 'favorites');

			try {
				await page.reload();
				await page.waitForLoadState('domcontentloaded');
				await waitForAppReady(page);

				await page.getByRole('button', { name: 'Workspace' }).click();
				await expect(page.getByText('Favorites テスト WS')).toBeVisible();

				// Favorites ウィジェットのタイトルが表示されること
				await expect(page.getByText('Favorites')).toBeVisible();

				// スター付きアイテムが表示されること
				await expect(page.getByText('E2E Favorites テストアイテム')).toBeVisible();
			} finally {
				await toggleStar(page, item.id, false);
				await deleteWorkspace(page, ws.id);
				await deleteItem(page, item.id);
			}
		},
	);

	test('スターなしの状態では Favorites ウィジェットが空メッセージを表示すること', async ({
		page,
	}) => {
		const ws = await createWorkspace(page, 'Favorites 空 WS');
		await addWidget(page, ws.id, 'favorites');

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('Favorites 空 WS')).toBeVisible();

			// 空メッセージが表示されること
			await expect(page.getByText('★ のついたアイテムがここに表示されます')).toBeVisible();
		} finally {
			await deleteWorkspace(page, ws.id);
		}
	});
});
