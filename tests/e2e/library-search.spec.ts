import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createItem, deleteItem } from '../helpers/ipc.js';
import { resizeWindow } from '../helpers/resize.js';

test.describe('Library 検索バー（PH-20260422-034/036 回帰防衛）', () => {
	test('/ キーで検索バーにフォーカスが移ること', { tag: '@smoke' }, async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		// 検索バーが存在することを確認してから body にフォーカスを確保
		const searchInput = page.locator('input[placeholder="ライブラリを検索"]');
		await expect(searchInput).toBeVisible();
		await page.locator('body').click();

		// / キーで検索バーにフォーカスが移ること
		await page.locator('body').press('/');
		await expect(searchInput).toBeFocused();
	});

	test('/ キーで入力フィールド内にいるときはフォーカス移動しないこと', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		const searchInput = page.locator('input[placeholder="ライブラリを検索"]');
		await searchInput.click();
		await page.keyboard.type('既存テキスト');

		// 検索バーにいる状態で / を押しても「/」が入力されること（フォーカス移動しない）
		await page.keyboard.press('/');
		await expect(searchInput).toHaveValue('既存テキスト/');

		// クリーンアップ
		await searchInput.fill('');
	});

	test('検索入力でアイテムが絞り込まれること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const itemA = await createItem(page, {
			item_type: 'url',
			label: 'ライブラリ検索テスト固有A',
			target: 'https://lib-search-a.example.com',
		});
		const itemB = await createItem(page, {
			item_type: 'url',
			label: 'ライブラリ検索テスト固有B',
			target: 'https://lib-search-b.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			const searchInput = page.locator('input[placeholder="ライブラリを検索"]');
			await searchInput.fill('固有A');

			// A だけ表示され、B は非表示
			await expect(page.getByTestId(`library-card-${itemA.id}`)).toBeVisible();
			await expect(page.getByTestId(`library-card-${itemB.id}`)).not.toBeVisible();
		} finally {
			await deleteItem(page, itemA.id);
			await deleteItem(page, itemB.id);
		}
	});

	test('クリアボタンで検索をリセットできること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const item = await createItem(page, {
			item_type: 'url',
			label: 'クリアボタンテストアイテム',
			target: 'https://clear-btn.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			const searchInput = page.locator('input[placeholder="ライブラリを検索"]');
			await searchInput.fill('存在しないキーワードXYZ');

			// クリアボタンが表示されること
			const clearBtn = page.getByRole('button', { name: '検索をクリア' });
			await expect(clearBtn).toBeVisible();

			// クリアボタンクリック → 入力がリセットされること
			await clearBtn.click();
			await expect(searchInput).toHaveValue('');

			// クリアボタンが非表示になること
			await expect(clearBtn).not.toBeVisible();

			// アイテムが再表示されること
			await expect(page.getByTestId(`library-card-${item.id}`)).toBeVisible();
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('検索クリア後に検索バーにフォーカスが戻ること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		const searchInput = page.locator('input[placeholder="ライブラリを検索"]');
		await searchInput.fill('テスト');

		const clearBtn = page.getByRole('button', { name: '検索をクリア' });
		await expect(clearBtn).toBeVisible();
		await clearBtn.click();

		// クリア後にフォーカスが検索バーに戻ること
		await expect(searchInput).toBeFocused();
	});
});
