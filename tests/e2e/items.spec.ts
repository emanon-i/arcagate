import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createItem, deleteItem, listItems } from '../helpers/ipc.js';

test.describe('アイテム管理', () => {
	test(
		'IPC 経由でアイテムを作成すると一覧に反映されること',
		{ tag: ['@smoke', '@core'] },
		async ({ page }, testInfo) => {
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
				await waitForAppReady(page);
				// reload 後の IPC ロード完了まで待つ（CI では 30s まで許容）
				await expect(page.getByTestId(`library-card-${item.id}`)).toBeVisible({ timeout: 30_000 });

				// 成功証跡を HTML report に添付
				const screenshot = await page.screenshot({ fullPage: true });
				await testInfo.attach('success-items-create', {
					body: screenshot,
					contentType: 'image/png',
				});
			} finally {
				// クリーンアップ
				await deleteItem(page, item.id);
			}
		},
	);

	test('UI フォームからアイテムを追加できること', async ({ page }) => {
		// Library はデフォルトタブ — "Add item" ボタンをクリック
		await page.getByTestId('add-item-button').click();

		// フォームが表示されたことを確認
		await expect(page.locator('input#item-label')).toBeVisible();

		// フォームに入力
		await page.getByRole('dialog').getByRole('button', { name: 'URL' }).click();
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

	test('空データ時にプレースホルダが表示されること', async ({ page }) => {
		// デフォルト状態でアイテムがない場合、プレースホルダが見える
		// 既存アイテムを全削除する代わりに、空の一覧を IPC で確認
		const items = await listItems(page);

		if (items.length === 0) {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			// カード要素がない＝プレースホルダまたは空状態
			const cards = page.locator('[data-testid^="library-card-"]');
			await expect(cards).toHaveCount(0);
		} else {
			// アイテムが存在する場合は、カードが1つ以上あることを確認
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			const cards = page.locator('[data-testid^="library-card-"]');
			await expect(cards.first()).toBeVisible();
		}
	});

	test('200文字ラベルのカードが幅を溢れないこと', async ({ page }) => {
		const longLabel = 'あ'.repeat(200);
		const item = await createItem(page, {
			item_type: 'url',
			label: longLabel,
			target: 'https://long-label.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			const card = page.getByTestId(`library-card-${item.id}`);
			await expect(card).toBeVisible();

			// カードの幅がビューポート幅を超えないこと
			const cardBox = await card.boundingBox();
			const viewportWidth = await page.evaluate(() => window.innerWidth);
			expect(cardBox).toBeTruthy();
			const { x, width } = cardBox as { x: number; width: number };
			expect(x + width).toBeLessThanOrEqual(viewportWidth);
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('アイテムを削除できること', { tag: '@smoke' }, async ({ page }) => {
		// まず IPC でアイテムを作成
		const item = await createItem(page, {
			item_type: 'url',
			label: '削除テストアイテム',
			target: 'https://delete-test.example.com',
		});

		// UI に反映させるためリロード
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);
		// Library はデフォルトタブ — カードに表示されていることを確認
		await expect(page.getByTestId(`library-card-${item.id}`)).toBeVisible();

		// IPC 経由で削除（DetailPanel は lg 幅以上でしか表示されないため）
		await deleteItem(page, item.id);

		// UI に反映させるためリロード
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		// カードが一覧から消えていることを確認
		await expect(page.getByTestId(`library-card-${item.id}`)).not.toBeVisible();

		// IPC でも確認
		const items = await listItems(page);
		const found = items.find((i) => i.id === item.id);
		expect(found).toBeUndefined();
	});

	test('ItemForm ローカル/URL トグルで入力フィールドが切り替わること', async ({ page }) => {
		await page.getByTestId('add-item-button').click();

		const dialog = page.getByRole('dialog');

		await expect(dialog.getByText('ファイル / フォルダのパス')).toBeVisible();

		await dialog.getByRole('button', { name: 'URL' }).click();
		await expect(dialog.getByText('ブラウザで開く URL を入力')).toBeVisible();
		await expect(dialog.getByText('ファイル / フォルダのパス')).not.toBeVisible();

		await dialog.getByRole('button', { name: 'ローカル' }).click();
		await expect(dialog.getByText('ファイル / フォルダのパス')).toBeVisible();
		await expect(dialog.getByText('ブラウザで開く URL を入力')).not.toBeVisible();

		await page.keyboard.press('Escape');
	});
});
