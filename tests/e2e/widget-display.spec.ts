import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import {
	addWidget,
	createItem,
	createWorkspace,
	deleteItem,
	deleteWorkspace,
} from '../helpers/ipc.js';

async function setupWorkspaceWithWidget(page: Page, workspaceName: string, widgetType: string) {
	const workspace = await createWorkspace(page, workspaceName);
	await addWidget(page, workspace.id, widgetType);
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await waitForAppReady(page);
	await page.getByRole('button', { name: 'Workspace' }).click();
	await expect(page.getByText(workspaceName)).toBeVisible();
	return workspace;
}

test.describe('Workspace ウィジェット表示', () => {
	test(
		'FavoritesWidget: ★アイテムが0件の場合に空状態メッセージを表示すること',
		{ tag: '@smoke' },
		async ({ page }) => {
			const workspace = await setupWorkspaceWithWidget(page, 'FavEmpty テストWS', 'favorites');
			try {
				await expect(page.getByText('Favorites')).toBeVisible();
				await expect(page.getByText('★ のついたアイテムがここに表示されます')).toBeVisible();
			} finally {
				await deleteWorkspace(page, workspace.id);
			}
		},
	);

	test('FavoritesWidget: starred アイテムがウィジェットに表示されること', async ({ page }) => {
		const workspace = await setupWorkspaceWithWidget(page, 'FavItem テストWS', 'favorites');
		const item = await createItem(page, {
			item_type: 'url',
			label: 'お気に入りテストアイテム',
			target: 'https://fav-test.example.com',
			tag_ids: ['sys-starred'],
		});
		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();
			await page.waitForSelector('text=お気に入りテストアイテム', { timeout: 10000 });
			await expect(page.getByText('お気に入りテストアイテム')).toBeVisible();
		} finally {
			await deleteItem(page, item.id);
			await deleteWorkspace(page, workspace.id);
		}
	});

	test('RecentLaunchesWidget: 起動履歴が0件の場合に空状態メッセージを表示すること', async ({
		page,
	}) => {
		const workspace = await setupWorkspaceWithWidget(page, 'RecentEmpty テストWS', 'recent');
		try {
			await expect(page.getByText('Recent launches')).toBeVisible();
			await expect(page.getByText('最近の起動履歴がここに表示されます')).toBeVisible();
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});
});
