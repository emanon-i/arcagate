import { expect, test } from '../fixtures/tauri.js';
import { createItem, deleteItem, listItems } from '../helpers/ipc.js';

test.describe('アイテム管理', () => {
	test('IPC 経由でアイテムを作成すると一覧に反映されること', async ({ page }, testInfo) => {
		// IPC で直接アイテム作成
		const item = await createItem(page, {
			item_type: 'url',
			label: 'E2E テスト URL',
			target: 'https://example.com',
		});

		expect(item.id).toBeTruthy();
		expect(item.label).toBe('E2E テスト URL');

		// アイテム一覧 IPC でも確認
		const items = await listItems(page);
		const found = items.find((i) => i.id === item.id);
		expect(found).toBeDefined();
		expect(found?.label).toBe('E2E テスト URL');

		try {
			// UI に反映させるためリロード（IPC 変更は Svelte ストアに通知されないため）
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			// UI に反映されていることを確認（「アイテム」タブが表示中）
			await expect(page.getByText('E2E テスト URL')).toBeVisible();

			// 成功証跡を HTML report に添付
			const screenshot = await page.screenshot({ fullPage: true });
			await testInfo.attach('success-items-create', { body: screenshot, contentType: 'image/png' });
		} finally {
			// クリーンアップ
			await deleteItem(page, item.id);
		}
	});

	test('UI フォームからアイテムを追加できること', async ({ page }) => {
		// 「アイテム」タブが表示中であることを確認
		await expect(page.getByRole('button', { name: 'アイテム' })).toBeVisible();

		// フォームを開く（「追加」ボタンをクリック）
		await page.getByRole('button', { name: '追加' }).click();

		// フォームが表示されたことを確認
		await expect(page.locator('input#item-label')).toBeVisible();

		// フォームに入力
		await page.locator('select#item-type').selectOption('url');
		await page.locator('input#item-label').fill('UI フォームテスト');
		await page.locator('input#item-target').fill('https://form-test.example.com');

		// 作成ボタンをクリック
		// フォームが長いためビューポート外になる場合があり evaluate 経由でクリック
		await page
			.getByRole('button', { name: '作成' })
			.evaluate((el) => (el as HTMLButtonElement).click());

		// 一覧に表示されることを確認
		await expect(page.getByText('UI フォームテスト')).toBeVisible();

		// クリーンアップ
		const items = await listItems(page);
		const created = items.find((i) => i.label === 'UI フォームテスト');
		if (created) {
			await deleteItem(page, created.id);
		}
	});

	test('アイテムを削除できること', async ({ page }) => {
		// まず IPC でアイテムを作成
		const item = await createItem(page, {
			item_type: 'url',
			label: '削除テストアイテム',
			target: 'https://delete-test.example.com',
		});

		// UI に反映させるためリロード（IPC 変更は Svelte ストアに通知されないため）
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		// UI に表示されていることを確認
		await expect(page.getByText('削除テストアイテム')).toBeVisible();

		// 削除ボタンをクリック（該当行の削除ボタン）
		const row = page.getByText('削除テストアイテム').locator('../..');
		await row.getByRole('button', { name: '削除' }).click();

		// 一覧から消えていることを確認
		await expect(page.getByText('削除テストアイテム')).not.toBeVisible();

		// IPC でも確認
		const items = await listItems(page);
		const found = items.find((i) => i.id === item.id);
		expect(found).toBeUndefined();
	});
});
