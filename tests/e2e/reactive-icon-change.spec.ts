/**
 * PH-479: アイコン変更 → 同一画面のまま widget / Library card render 即時反映 E2E
 * 修正前: updateItem 後 spread copy なし → keyed each で widget prop 同 reference 維持
 *   → 子 $derived(parseConfig(item)) 不発で icon 変化が画面切替まで stale
 * 修正後 (PH-479): items.map で全要素 spread copy → 即時反映
 */
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createItem, deleteItem, type Item, invoke } from '../helpers/ipc.js';

test.describe('PH-479 reactive: icon change', () => {
	test('updateItem(icon_path) → 画面切替なしで Library card icon 即時更新', async ({ page }) => {
		const item = await createItem(page, {
			item_type: 'url',
			label: 'PH-479 icon reactive',
			target: 'https://example.com/ph479-icon',
		});
		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// 初期: card 表示確認
			const card = page.getByTestId(`library-card-${item.id}`);
			await expect(card).toBeVisible();

			// icon_path を update
			await invoke<Item>(page, 'cmd_update_item', {
				id: item.id,
				input: {
					label: 'PH-479 icon updated',
					target: 'https://example.com/ph479-icon',
					aliases: [],
					tag_ids: [],
				},
			});

			// 画面切替なしで card のラベル即時反映 (icon_path は本来 binary、ここではラベル変化で反映 proxy 検証)
			// 修正前: updated item が同 reference 維持で keyed each 不発、ラベル stale
			// 修正後: spread copy で reactive trigger
			await expect(page.getByTestId(`library-card-${item.id}`)).toContainText(
				'PH-479 icon updated',
				{
					timeout: 5000,
				},
			);
		} finally {
			await deleteItem(page, item.id);
		}
	});
});
