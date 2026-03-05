import { expect, test } from '../fixtures/tauri.js';
import { createItem, deleteItem } from '../helpers/ipc.js';

test.describe('コマンドパレット', () => {
	test('パレットが開閉できること', async ({ page }) => {
		// "Palette" ボタンでパレットを開く
		await page.getByText('Palette').click();

		// パレットダイアログが表示されることを確認
		const dialog = page.locator('[role="dialog"]');
		await expect(dialog).toBeVisible();

		// パレット内の検索入力にフォーカスして Escape で閉じる
		const paletteInput = dialog.getByRole('textbox').first();
		await paletteInput.focus();
		await page.keyboard.press('Escape');

		// パレットが閉じることを確認
		await expect(dialog).not.toBeVisible();
	});

	test('パレットでアイテムを検索できること', async ({ page }, testInfo) => {
		// テスト用アイテムを IPC で作成
		const item = await createItem(page, {
			item_type: 'url',
			label: 'パレット検索テスト',
			target: 'https://palette-search.example.com',
		});

		try {
			// パレットを開く
			await page.getByText('Palette').click();

			// 検索クエリを入力
			await page.getByRole('textbox').first().fill('パレット検索テスト');

			// 検索結果に表示されることを確認
			await expect(
				page.getByTestId('palette-results').getByText('パレット検索テスト'),
			).toBeVisible();

			// 成功証跡を HTML report に添付
			const screenshot = await page.screenshot({ fullPage: true });
			await testInfo.attach('success-palette-search', {
				body: screenshot,
				contentType: 'image/png',
			});
		} finally {
			// クリーンアップ
			await page.keyboard.press('Escape');
			await deleteItem(page, item.id);
		}
	});

	test('= 1+2*3 で電卓結果が表示されること', async ({ page }) => {
		// パレットを開く
		await page.getByText('Palette').click();

		// 計算式を入力
		await page.getByRole('textbox').first().fill('= 1+2*3');

		// 計算結果が表示されることを確認（1+2*3=7）
		await expect(page.getByTestId('palette-results').getByText('7')).toBeVisible();

		// CALC バッジの代わりに "Calculator" サブタイトルが表示される
		await expect(page.getByTestId('palette-results').getByText('Calculator')).toBeVisible();

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
			await page.getByText('Palette').click();

			// 検索クエリを入力
			await page.getByRole('textbox').first().fill('ナビゲーションテスト');

			// 結果が2件表示されることを確認
			await expect(
				page.getByTestId('palette-results').getByText('ナビゲーションテスト A'),
			).toBeVisible();
			await expect(
				page.getByTestId('palette-results').getByText('ナビゲーションテスト B'),
			).toBeVisible();

			// 初期状態: 0番目が選択されている
			const firstResult = page.getByTestId('palette-result-0');
			await expect(firstResult).toHaveAttribute('aria-selected', 'true');

			// ArrowDown で次の項目に移動
			await page.keyboard.press('ArrowDown');

			// 1番目が選択状態に変わる
			const secondResult = page.getByTestId('palette-result-1');
			await expect(secondResult).toHaveAttribute('aria-selected', 'true');
		} finally {
			// クリーンアップ
			await page.keyboard.press('Escape');
			await deleteItem(page, item1.id);
			await deleteItem(page, item2.id);
		}
	});
});
