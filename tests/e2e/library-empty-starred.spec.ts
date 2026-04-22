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

test.describe('Library 空状態・starred バッジ（PH-20260422-023/019 検証）', () => {
	test('検索0件で「一致するアイテムはありません」が表示されること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const item = await createItem(page, {
			item_type: 'url',
			label: 'E2E-検索0件テスト',
			target: 'https://search-empty.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// 存在しない文字列で検索
			const searchInput = page.getByPlaceholder('ライブラリを検索');
			await searchInput.fill('XYZNOTFOUND12345');
			await page.waitForTimeout(300);

			// 「一致するアイテムはありません」メッセージが表示される
			await expect(
				page.getByText('「XYZNOTFOUND12345」に一致するアイテムはありません'),
			).toBeVisible();

			// アイテムカードは非表示
			await expect(page.getByTestId(`library-card-${item.id}`)).not.toBeVisible();
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('アイテムのないタグを選択すると「このタグにアイテムがありません」が表示されること', async ({
		page,
	}) => {
		await resizeWindow(page, 1280, 800);

		const tag = await createTag(page, 'E2E-空タグ');

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// サイドバーの空タグをクリック
			const sidebar = page.getByTestId('library-sidebar');
			await expect(sidebar).toBeVisible();
			await sidebar.getByRole('button', { name: tag.name }).click();
			await page.waitForTimeout(300);

			// 「このタグにアイテムがありません」メッセージが表示される
			await expect(page.getByText('このタグにアイテムがありません')).toBeVisible();
		} finally {
			await deleteTag(page, tag.id);
		}
	});

	test('DetailPanel で ★ ボタンを押すとカードに starred バッジが表示されること', async ({
		page,
	}) => {
		await resizeWindow(page, 1280, 800);

		const item = await createItem(page, {
			item_type: 'url',
			label: 'E2E-starredバッジテスト',
			target: 'https://starred-badge.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			const card = page.getByTestId(`library-card-${item.id}`);
			await expect(card).toBeVisible();

			// 初期状態: starred バッジなし
			await expect(card.getByTestId('starred-badge')).not.toBeVisible();

			// カードをクリックして DetailPanel を開く
			await card.click();

			const detailPanel = page.getByTestId('library-detail-panel');
			await expect(detailPanel).toBeVisible();

			// ★ ボタンをクリック（スターを付ける）
			await detailPanel.getByRole('button', { name: 'スターを付ける' }).click();
			await page.waitForTimeout(300);

			// starred バッジが表示される
			await expect(card.getByTestId('starred-badge')).toBeVisible();

			// もう一度クリックでスターを外す
			await detailPanel.getByRole('button', { name: 'スターを外す' }).click();
			await page.waitForTimeout(300);

			// starred バッジが非表示になる
			await expect(card.getByTestId('starred-badge')).not.toBeVisible();
		} finally {
			// starred タグを外してからアイテム削除
			await deleteItem(page, item.id);
		}
	});
});
