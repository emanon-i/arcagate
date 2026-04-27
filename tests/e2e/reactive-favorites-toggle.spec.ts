/**
 * PH-479: お気に入り toggle → 同一画面のまま左 sidebar Favorites row 即時反映 E2E
 *
 * 修正前: itemStore.toggleStar 後 loadTagWithCounts() 呼ばれず
 *   → tagWithCounts stale → starredTags derived 更新されず
 *   → sidebar の「お気に入り」row が画面 reload まで非表示
 * 修正後 (PH-479 PR #183): toggleStar 内で loadTagWithCounts() を呼ぶ → 即時表示
 */
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createItem, deleteItem } from '../helpers/ipc.js';
import { resizeWindow } from '../helpers/resize.js';

test.describe('PH-479 reactive: favorites toggle', () => {
	test('item 作成 → UI で favorite click → 同 page で sidebar 「お気に入り」row 即時表示', async ({
		page,
	}) => {
		await resizeWindow(page, 1280, 800);
		const item = await createItem(page, {
			item_type: 'url',
			label: 'PH-479 fav reactive',
			target: 'https://example.com/ph479-fav',
		});
		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// 初期 sidebar に「お気に入り」row なし (item は未 star)
			const sidebar = page.getByTestId('library-sidebar');
			await expect(sidebar.getByText('お気に入り')).toHaveCount(0);

			// item card click → DetailPanel 開く
			await page.getByTestId(`library-card-${item.id}`).click();
			const detailPanel = page.getByTestId('library-detail-panel');
			await expect(detailPanel).toBeVisible();

			// favorite-button click → toggleStar fire
			await detailPanel.getByTestId('favorite-button').click();

			// 画面切替なしで sidebar に「お気に入り」row が即時表示
			// (PH-479 fix: toggleStar 内で loadTagWithCounts → tagWithCounts → starredTags 更新)
			await expect(sidebar.getByText('お気に入り')).toBeVisible({ timeout: 5000 });
		} finally {
			await deleteItem(page, item.id);
		}
	});
});
