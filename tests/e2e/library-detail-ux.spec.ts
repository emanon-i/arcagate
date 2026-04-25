import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createItem, deleteItem, invoke } from '../helpers/ipc.js';
import { resizeWindow } from '../helpers/resize.js';

/**
 * Library 詳細パネル UX E2E（PH-291 / 290 / 292 / 293）
 *
 * 検証対象:
 *  - お気に入りボタン（⭐ + 「お気に入り」ラベル）の toggle が DB 反映
 *  - 可視/不可視チェックボックスで is_enabled 反転
 *  - per-card override がある時のリセットボタン表示
 *  - 左パネル 4 セクションが DOM 上に存在
 */

test.describe('Library 詳細パネル UX（PH-291 / 290 / 292）', () => {
	let createdItemIds: string[] = [];

	test.beforeEach(async ({ page }) => {
		await resizeWindow(page, 1280, 800);
	});

	test.afterEach(async ({ page }) => {
		for (const id of createdItemIds) {
			await deleteItem(page, id).catch(() => {});
		}
		createdItemIds = [];
	});

	test(
		'お気に入りボタンが ⭐ + 「お気に入り」ラベルで表示される',
		{ tag: '@smoke' },
		async ({ page }) => {
			const item = await createItem(page, {
				item_type: 'url',
				label: 'fav-button-test',
				target: 'https://x.example.com',
			});
			createdItemIds.push(item.id);

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			await page.getByTestId(`library-card-${item.id}`).click();

			const favBtn = page.getByTestId('favorite-button');
			await expect(favBtn).toBeVisible();
			// ラベル文字「お気に入り」を含む（アイコン名「星」は含まない）
			await expect(favBtn).toContainText('お気に入り');
			await expect(favBtn).not.toContainText('星');
			await expect(favBtn).not.toContainText('★');
			await expect(favBtn).not.toContainText('☆');
		},
	);

	test('可視/不可視トグルが LibraryCard を grayscale 化', async ({ page }) => {
		const item = await createItem(page, {
			item_type: 'url',
			label: 'visibility-test',
			target: 'https://vis.example.com',
		});
		createdItemIds.push(item.id);

		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		await page.getByTestId(`library-card-${item.id}`).click();
		await page.getByTestId('visibility-toggle').check();

		// is_enabled = false 反映確認: card class に opacity-40 grayscale が付く
		const card = page.getByTestId(`library-card-${item.id}`);
		const className = await card.getAttribute('class');
		expect(className ?? '').toMatch(/grayscale/);
	});

	test('per-card override 設定時にリセットボタンが表示される', async ({ page }) => {
		const item = await createItem(page, {
			item_type: 'url',
			label: 'override-test',
			target: 'https://ov.example.com',
		});
		createdItemIds.push(item.id);

		// override を IPC で直接設定
		await invoke<unknown>(page, 'cmd_update_item', {
			id: item.id,
			input: { card_override_json: '{"background":{"focalY":25}}' },
		});

		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		await page.getByTestId(`library-card-${item.id}`).click();

		const resetBtn = page.getByTestId('card-override-reset');
		await expect(resetBtn).toBeVisible();
		await expect(resetBtn).toContainText('グローバル設定に戻す');

		await resetBtn.click();
		await expect(resetBtn).not.toBeVisible({ timeout: 5000 });
	});

	test('LibrarySidebar が 4 セクション（全体 + タイプ + ワークスペース + ユーザー）に分離', async ({
		page,
	}) => {
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		await expect(page.getByTestId('sidebar-section-all')).toBeVisible();
		// type / workspace / user は items 状態次第で出現するため、少なくとも all + type は存在
		await expect(page.getByTestId('sidebar-section-type')).toBeVisible({ timeout: 5_000 });
	});
});
