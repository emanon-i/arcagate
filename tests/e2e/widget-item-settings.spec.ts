/**
 * PH-504: Per-item settings persistence (案 C: 論理削除なし、別テーブル)
 *
 * 検証シナリオ:
 *   1. upsert で fav / custom_label を保存できる
 *   2. clear (delete_all_for_widget) で全消去できる
 *   3. ファイルシステム unset (path 切替) で settings は残る (別テーブル管理)
 */
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createWorkspace, deleteWorkspace, invoke, type Widget } from '../helpers/ipc.js';

interface WidgetItemSettings {
	widget_id: string;
	item_key: string;
	opener: string | null;
	custom_label: string | null;
	custom_icon: string | null;
	favorite: boolean;
	last_seen_at: number | null;
	created_at: number;
	updated_at: number;
}

test.describe('PH-504 widget_item_settings IPC', () => {
	test('upsert / list / clear が round-trip し、unset で settings が残る', async ({ page }) => {
		const ws = await createWorkspace(page, 'PH-504 settings E2E WS');
		try {
			const widget = await invoke<Widget>(page, 'cmd_add_widget', {
				workspaceId: ws.id,
				widgetType: 'exe_folder',
			});
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// 1. 初期は list 空
			const initial = await invoke<WidgetItemSettings[]>(page, 'cmd_list_widget_item_settings', {
				widgetId: widget.id,
			});
			expect(initial).toEqual([]);

			// 2. upsert: custom_label + favorite を保存
			const upserted = await invoke<WidgetItemSettings>(page, 'cmd_upsert_widget_item_settings', {
				input: {
					widget_id: widget.id,
					item_key: 'C:/some/path/A',
					custom_label: 'My Game A',
					favorite: true,
				},
			});
			expect(upserted.item_key).toBe('C:/some/path/A');
			expect(upserted.custom_label).toBe('My Game A');
			expect(upserted.favorite).toBe(true);

			// 3. partial update: favorite だけ false に (custom_label は維持)
			const updated = await invoke<WidgetItemSettings>(page, 'cmd_upsert_widget_item_settings', {
				input: {
					widget_id: widget.id,
					item_key: 'C:/some/path/A',
					favorite: false,
				},
			});
			expect(updated.favorite).toBe(false);
			expect(updated.custom_label).toBe('My Game A');

			// 4. ファイル path を unset しても settings は残る (別テーブル)
			await invoke<Widget>(page, 'cmd_update_widget_config', {
				id: widget.id,
				config: JSON.stringify({}),
			});
			const afterUnset = await invoke<WidgetItemSettings | null>(
				page,
				'cmd_get_widget_item_settings',
				{ widgetId: widget.id, itemKey: 'C:/some/path/A' },
			);
			expect(afterUnset).not.toBeNull();
			expect(afterUnset?.custom_label).toBe('My Game A');

			// 5. clear で全消去
			const removed = await invoke<number>(page, 'cmd_clear_widget_item_settings', {
				widgetId: widget.id,
			});
			expect(removed).toBe(1);
			const final = await invoke<WidgetItemSettings[]>(page, 'cmd_list_widget_item_settings', {
				widgetId: widget.id,
			});
			expect(final).toEqual([]);
		} finally {
			await deleteWorkspace(page, ws.id);
		}
	});
});
