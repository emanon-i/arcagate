import { expect, test } from '../fixtures/tauri.js';
import { createItem, deleteItem } from '../helpers/ipc.js';

test.describe('コマンドパレット', () => {
	// batch-46 でパレットが常時フローティングウィンドウ化された
	// メインウィンドウの E2E では別ウィンドウのパレットを直接操作できないため
	// TitleBar のボタン存在確認に変更
	test('パレットボタンが TitleBar に存在すること', { tag: '@smoke' }, async ({ page }) => {
		const paletteButton = page.getByRole('button', { name: 'Palette' });
		await expect(paletteButton).toBeVisible();
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
			await page.getByRole('button', { name: 'Palette' }).click();

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
		await page.getByRole('button', { name: 'Palette' }).click();

		// 計算式を入力
		await page.getByRole('textbox').first().fill('= 1+2*3');

		// 計算結果が表示されることを確認（1+2*3=7）
		await expect(page.getByTestId('palette-results').getByText('7')).toBeVisible();

		// CALC バッジの代わりに "Calculator" サブタイトルが表示される
		await expect(page.getByTestId('palette-results').getByText('Calculator')).toBeVisible();

		// パレットを閉じる
		await page.keyboard.press('Escape');
	});

	test('検索クリア後に空の結果状態または最近の履歴が表示されること（debounce 回帰防衛）', async ({
		page,
	}) => {
		// パレットを開く
		await page.getByRole('button', { name: 'Palette' }).click();

		const input = page.getByRole('textbox').first();
		await input.fill('テスト検索キーワード');

		// 入力クリア後も debounce が完了すれば結果エリアが表示されること
		await input.fill('');

		// 入力が空の状態で結果エリアが表示されること（空状態メッセージ or 結果）
		const results = page.getByTestId('palette-results');
		await expect(results).toBeVisible();

		// パレットを閉じる
		await page.keyboard.press('Escape');
	});

	test('クエリ入力後に X ボタンが表示され、クリックするとクリアされること', async ({ page }) => {
		await page.getByRole('button', { name: 'Palette' }).click();
		const dialog = page.locator('[role="dialog"]');
		await expect(dialog).toBeVisible();

		const input = dialog.getByRole('textbox').first();
		await input.fill('テストクエリ');

		// X ボタンが表示されること
		const clearButton = dialog.getByLabel('検索をクリア');
		await expect(clearButton).toBeVisible();

		// X ボタンをクリックするとクエリがクリアされること
		await clearButton.click();
		await expect(input).toHaveValue('');

		// クリア後は X ボタンが非表示になること
		await expect(clearButton).not.toBeVisible();

		await page.keyboard.press('Escape');
	});

	test('Tab キーで補完が適用されること', async ({ page }) => {
		const item = await createItem(page, {
			item_type: 'url',
			label: 'Tab補完テスト',
			target: 'https://tab-complete-test.example.com',
		});

		try {
			await page.getByRole('button', { name: 'Palette' }).click();

			const input = page.getByRole('textbox').first();
			await input.fill('Tab補完');

			// 検索結果に "Tab補完テスト" が表示されること
			await expect(page.getByTestId('palette-results').getByText('Tab補完テスト')).toBeVisible();

			// Tab キーで補完 → 入力欄がアイテムラベルで埋まること
			await page.keyboard.press('Tab');
			await expect(input).toHaveValue('Tab補完テスト');
		} finally {
			await page.keyboard.press('Escape');
			await deleteItem(page, item.id);
		}
	});

	test('cb: プレフィックスでクリップボード履歴モードが起動すること', async ({ page }) => {
		await page.getByRole('button', { name: 'Palette' }).click();

		const input = page.getByRole('textbox').first();
		await input.fill('cb:');

		// 結果エリアが表示されること（空の場合は「一致する結果がありません」）
		const results = page.getByTestId('palette-results');
		await expect(results).toBeVisible();

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
			await page.getByRole('button', { name: 'Palette' }).click();

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
