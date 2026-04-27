/**
 * PH-479: Library item 削除 → 同一画面のまま widget item 即時消去 E2E
 * 修正前: cmd_delete_item の Rust cascade (PH-474) で widget config 内 item_id 削除されるが
 *   frontend workspaceStore.widgets が stale → 画面切替まで item 表示残る
 * 修正後 (PH-479 3rd commit): items.svelte.ts deleteItem 内で workspaceStore.loadWidgets 呼ぶ
 *
 * Note: ここでは UI 経由 itemStore 呼び出しが複雑なため、IPC 直接で Rust cascade 動作 + workspace
 * reload で widget zero state になることを assert (frontend reactive は別 spec で検証する設計)。
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

test.describe('PH-479 reactive: library delete cascade', () => {
	test('item 削除 → widget config の dead reference が cascade で消える + 再読込で zero state', async ({
		page,
	}) => {
		const workspace = await createWorkspace(page, 'PH-479 cascade WS');
		const item = await createItem(page, {
			item_type: 'url',
			label: 'PH-479 cascade item',
			target: 'https://example.com/ph479-cascade',
		});
		try {
			const widget = await invoke<Widget>(page, 'cmd_add_widget', {
				workspaceId: workspace.id,
				widgetType: 'item',
			});
			await invoke<Widget>(page, 'cmd_update_widget_config', {
				id: widget.id,
				config: JSON.stringify({ item_id: item.id, item_ids: [] }),
			});

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();

			const widgetGroup = page.getByRole('group').first();
			await expect(widgetGroup).toContainText('PH-479 cascade item', { timeout: 5000 });

			// item 削除 (Rust cascade で widget config から item_id null 化)
			await deleteItem(page, item.id);

			// page.reload() なしで widget 表示が変わるか確認
			// PH-479 fix: items.svelte.ts deleteItem 内で workspaceStore.loadWidgets 呼ぶため即時反映
			// (ただし IPC 直接では itemStore 経由しないので、reload 後に zero state を確認する MVP)
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByRole('group').first()).toContainText('アイテムを選択', {
				timeout: 8000,
			});
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});
});
