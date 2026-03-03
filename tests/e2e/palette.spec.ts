import { expect, test } from '../fixtures/tauri.js';
import { createItem, deleteItem } from '../helpers/ipc.js';

test.describe('コマンドパレット', () => {
	test('パレットが開閉できること', async ({ page }) => {
		// 「検索」ボタンでパレットを開く
		await page.getByRole('button', { name: '検索' }).click();

		// パレットが表示されることを確認（入力フィールドが可視）
		const input = page.getByRole('textbox').first();
		await expect(input).toBeVisible();

		// Escape キーで閉じる（input にフォーカスがないと keydown が届かないため先にフォーカス）
		await input.focus();
		await page.keyboard.press('Escape');

		// パレットが閉じることを確認
		await expect(input).not.toBeVisible();
	});

	test('パレットでアイテムを検索できること', async ({ page }) => {
		// テスト用アイテムを IPC で作成
		const item = await createItem(page, {
			item_type: 'url',
			label: 'パレット検索テスト',
			target: 'https://palette-search.example.com',
		});

		try {
			// パレットを開く
			await page.getByRole('button', { name: '検索' }).click();

			// 検索クエリを入力
			await page.getByRole('textbox').first().fill('パレット検索テスト');

			// 検索結果に表示されることを確認
			// getByText は input.value にもマッチするため、ResultList の .max-h-80 コンテナに限定
			await expect(page.locator('.max-h-80').getByText('パレット検索テスト')).toBeVisible();
		} finally {
			// クリーンアップ
			await page.keyboard.press('Escape');
			await deleteItem(page, item.id);
		}
	});

	test('= 1+2*3 で電卓結果が表示されること', async ({ page }) => {
		// パレットを開く
		await page.getByRole('button', { name: '検索' }).click();

		// 計算式を入力
		await page.getByRole('textbox').first().fill('= 1+2*3');

		// 計算結果が表示されることを確認（1+2*3=7）
		await expect(page.getByText('7')).toBeVisible();

		// CALC バッジが表示されることを確認
		await expect(page.getByText('CALC')).toBeVisible();

		// パレットを閉じる
		await page.keyboard.press('Escape');
	});

	test('ArrowDown でキーボードナビゲーションできること', async ({ page }) => {
		// テスト用アイテムを複数作成
		const item1 = await createItem(page, {
			item_type: 'url',
			label: 'ナビゲーションテスト A',
			target: 'https://nav-a.example.com',
		});
		const item2 = await createItem(page, {
			item_type: 'url',
			label: 'ナビゲーションテスト B',
			target: 'https://nav-b.example.com',
		});

		try {
			// パレットを開く
			await page.getByRole('button', { name: '検索' }).click();

			// 検索クエリを入力
			await page.getByRole('textbox').first().fill('ナビゲーションテスト');

			// 結果が2件表示されることを確認
			await expect(page.getByText('ナビゲーションテスト A')).toBeVisible();
			await expect(page.getByText('ナビゲーションテスト B')).toBeVisible();

			// ArrowDown で次の項目に移動
			await page.keyboard.press('ArrowDown');

			// 選択状態が変わることを確認（bg-accent クラスが付く）
			const selectedItem = page.locator('.bg-accent, [class*="bg-accent"]').first();
			await expect(selectedItem).toBeVisible();
		} finally {
			// クリーンアップ
			await page.keyboard.press('Escape');
			await deleteItem(page, item1.id);
			await deleteItem(page, item2.id);
		}
	});
});
