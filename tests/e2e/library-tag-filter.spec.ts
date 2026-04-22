import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createItem, deleteItem, invoke } from '../helpers/ipc.js';
import { resizeWindow } from '../helpers/resize.js';

interface Tag {
	id: string;
	name: string;
	is_hidden: boolean;
}

async function createTag(page: import('@playwright/test').Page, name: string): Promise<Tag> {
	return invoke<Tag>(page, 'cmd_create_tag', { input: { name, is_hidden: false } });
}

async function deleteTag(page: import('@playwright/test').Page, id: string): Promise<void> {
	return invoke<void>(page, 'cmd_delete_tag', { id });
}

test.describe('Library タグフィルタ（PH-20260422-005 レース対応検証）', () => {
	test('タグをクリックすると対象アイテムのみ表示されること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const tagA = await createTag(page, 'E2E-タグA');
		const tagB = await createTag(page, 'E2E-タグB');

		const itemA = await createItem(page, {
			item_type: 'url',
			label: 'E2E-アイテムA',
			target: 'https://tag-filter-a.example.com',
			tag_ids: [tagA.id],
		});
		const itemB = await createItem(page, {
			item_type: 'url',
			label: 'E2E-アイテムB',
			target: 'https://tag-filter-b.example.com',
			tag_ids: [tagB.id],
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// Library タブが既に選択されているはず
			const sidebar = page.getByTestId('library-sidebar');
			await expect(sidebar).toBeVisible();

			// タグ A でフィルタ
			await sidebar.getByRole('button', { name: tagA.name }).click();
			await page.waitForTimeout(300);

			const cardA = page.getByTestId(`library-card-${itemA.id}`);
			const cardB = page.getByTestId(`library-card-${itemB.id}`);

			await expect(cardA).toBeVisible();
			await expect(cardB).not.toBeVisible();

			// タグ B に切り替え
			await sidebar.getByRole('button', { name: tagB.name }).click();
			await page.waitForTimeout(300);

			await expect(cardA).not.toBeVisible();
			await expect(cardB).toBeVisible();

			// 「すべて」に戻す
			await sidebar.getByRole('button', { name: 'すべて' }).click();
			await page.waitForTimeout(300);

			await expect(cardA).toBeVisible();
			await expect(cardB).toBeVisible();
		} finally {
			await deleteItem(page, itemA.id);
			await deleteItem(page, itemB.id);
			await deleteTag(page, tagA.id);
			await deleteTag(page, tagB.id);
		}
	});

	test('タグを高速連続クリックしても最後に選択したタグの結果が表示されること（レース対応）', async ({
		page,
	}) => {
		await resizeWindow(page, 1280, 800);

		const tagA = await createTag(page, 'E2E-レースA');
		const tagB = await createTag(page, 'E2E-レースB');

		const itemA = await createItem(page, {
			item_type: 'url',
			label: 'E2E-レースアイテムA',
			target: 'https://race-a.example.com',
			tag_ids: [tagA.id],
		});
		const itemB = await createItem(page, {
			item_type: 'url',
			label: 'E2E-レースアイテムB',
			target: 'https://race-b.example.com',
			tag_ids: [tagB.id],
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			const sidebar = page.getByTestId('library-sidebar');
			await expect(sidebar).toBeVisible();

			// 高速連続クリック（1秒以内に 5 回）
			const btnA = sidebar.getByRole('button', { name: tagA.name });
			const btnB = sidebar.getByRole('button', { name: tagB.name });

			await btnA.click();
			await btnB.click();
			await btnA.click();
			await btnB.click();
			await btnA.click();

			// 最後にクリックしたのはタグ A → アイテム A が表示されること
			await page.waitForTimeout(500);

			const cardA = page.getByTestId(`library-card-${itemA.id}`);
			const cardB = page.getByTestId(`library-card-${itemB.id}`);

			await expect(cardA).toBeVisible();
			await expect(cardB).not.toBeVisible();
		} finally {
			await deleteItem(page, itemA.id);
			await deleteItem(page, itemB.id);
			await deleteTag(page, tagA.id);
			await deleteTag(page, tagB.id);
		}
	});
});
