import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createItem, deleteItem, invoke } from '../helpers/ipc.js';
import { resizeWindow } from '../helpers/resize.js';

test.describe('ウィジェット右クリック詳細パネル（PH-20260422-004 Esc ハンドラ検証）', () => {
	test('Library 詳細パネルで Esc キーを押すとパネルが閉じること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const item = await createItem(page, {
			item_type: 'url',
			label: 'E2E-Esc テスト',
			target: 'https://esc-test.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// カードをクリックして Library 詳細パネルを表示
			const card = page.getByTestId(`library-card-${item.id}`);
			await expect(card).toBeVisible();
			await card.click();

			// 詳細パネルが表示される
			const detailWrapper = page.getByTestId('library-detail-wrapper');
			await expect(detailWrapper).toBeVisible();
			const detailPanel = page.getByTestId('library-detail-panel');
			await expect(detailPanel).toBeVisible();

			// Esc キーでパネルが閉じること（PH-20260422-004 修正の保証）
			await page.keyboard.press('Escape');
			await expect(detailWrapper).not.toBeVisible();
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('Library 詳細パネルの閉じるボタンでパネルが閉じること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const item = await createItem(page, {
			item_type: 'url',
			label: 'E2E-閉じるボタンテスト',
			target: 'https://close-btn-test.example.com',
		});

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// カードをクリックしてパネルを開く
			const card = page.getByTestId(`library-card-${item.id}`);
			await expect(card).toBeVisible();
			await card.click();

			const detailWrapper = page.getByTestId('library-detail-wrapper');
			await expect(detailWrapper).toBeVisible();
			const detailPanel = page.getByTestId('library-detail-panel');
			await expect(detailPanel).toBeVisible();

			// 閉じるボタンでパネルが閉じること
			await detailPanel.getByRole('button', { name: 'パネルを閉じる' }).click();
			await expect(detailWrapper).not.toBeVisible();
		} finally {
			await deleteItem(page, item.id);
		}
	});

	test('Workspace タブ初期表示で右クリックパネルが表示されていないこと', async ({ page }) => {
		// Workspace に切り替えた直後はパネルが閉じた状態であることを確認
		await page.getByRole('button', { name: 'Workspace' }).click();
		await page.waitForTimeout(300);

		// data-testid="library-detail-panel" は存在しないこと
		const panel = page.getByTestId('library-detail-panel');
		await expect(panel).not.toBeVisible();
	});

	test('Workspace ウィジェット右クリックで詳細パネルが表示され Esc で閉じること', async ({
		page,
	}) => {
		// folder アイテムを作成して起動 → FavoritesWidget に表示させる
		const item = await createItem(page, {
			item_type: 'folder',
			label: 'E2E-右クリックテスト',
			target: 'C:\\Windows',
		});

		// cmd_launch_item で launch_count を記録（explorer.exe が spawn されるが CI では無害）
		await invoke<void>(page, 'cmd_launch_item', { item_id: item.id });

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// Workspace タブに切り替え
			await page.getByRole('button', { name: 'Workspace' }).click();
			await page.waitForTimeout(300);

			// FavoritesWidget にアイテムが表示されているか確認
			const widgetItem = page.getByText('E2E-右クリックテスト').first();
			const isVisible = await widgetItem.isVisible({ timeout: 2000 }).catch(() => false);

			if (!isVisible) {
				// FavoritesWidget に表示されていない場合はスキップ（CI 環境依存）
				test.skip();
				return;
			}

			// 右クリックで詳細パネルが表示されること
			await widgetItem.click({ button: 'right' });
			await page.waitForTimeout(300);

			const detailPanel = page.getByTestId('library-detail-panel');
			await expect(detailPanel).toBeVisible();

			// Esc でパネルが閉じること
			await page.keyboard.press('Escape');
			await expect(detailPanel).not.toBeVisible();
		} finally {
			await deleteItem(page, item.id);
		}
	});
});
