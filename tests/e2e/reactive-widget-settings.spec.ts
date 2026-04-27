/**
 * PH-479: Workspace widget 設定変更 → 同一画面のまま render 即時反映 E2E
 * 修正前: workspaceStore.updateWidgetConfig 後 widgets.map で同 reference 維持
 *   → ItemWidget の $derived(parseConfig(widget?.config)) 不発で表示 stale
 * 修正後 (PH-479 PR #183): widgets.map で全要素 spread copy → 即時反映
 */
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import {
	createItem,
	createWorkspace,
	deleteItem,
	deleteWorkspace,
	invoke,
	type Widget,
} from '../helpers/ipc.js';

test.describe('PH-479 reactive: widget settings change', () => {
	test('updateWidgetConfig (item_id 設定) → 画面切替なしで widget が item label 即時表示', async ({
		page,
	}) => {
		const workspace = await createWorkspace(page, 'PH-479 widget-settings WS');
		const item = await createItem(page, {
			item_type: 'url',
			label: 'PH-479 settings reactive',
			target: 'https://example.com/ph479-settings',
		});
		try {
			const widget = await invoke<Widget>(page, 'cmd_add_widget', {
				workspaceId: workspace.id,
				widgetType: 'item',
			});
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('PH-479 widget-settings WS')).toBeVisible();

			// 初期 widget は item 未選択 → 「アイテムを選択」zero state
			const widgetGroup = page.getByRole('group').first();
			await expect(widgetGroup).toBeVisible();

			// IPC で widget config に item_id 設定 (settings dialog 経由は時間かかるので IPC で直接)
			await invoke<Widget>(page, 'cmd_update_widget_config', {
				id: widget.id,
				config: JSON.stringify({ item_id: item.id, item_ids: [] }),
			});

			// 画面切替なしで widget render が item label に即時更新
			// 修正前: spread copy なし → widget prop 同 reference で $derived 不発
			// 修正後: spread copy で reactive trigger
			await expect(widgetGroup).toContainText('PH-479 settings reactive', { timeout: 5000 });
		} finally {
			await deleteItem(page, item.id);
			await deleteWorkspace(page, workspace.id);
		}
	});
});
