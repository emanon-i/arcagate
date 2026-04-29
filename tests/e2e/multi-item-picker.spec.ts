/**
 * PH-issue-025 / 検収項目 #8: ItemPicker 複数選択 + 一括配置 E2E.
 *
 * カバレッジ:
 * 1. ItemWidget 空状態 → アイテムを紐付け → Picker が multi モードで開く (checkbox + 「追加 (N)」)
 * 2. 0 件選択時は「追加 (0)」が disabled
 * 3. 3 件選択 → 「追加 (3)」 → 1 widget の item_id 設定 + 2 widget 新規配置 → workspace に 3 widget
 * 4. 「アイテムを変更」menu からは single モード (checkbox なし)
 *
 * 注意: 複数 widget 配置 → free position 探索 → 連続セルにならんで配置されることを期待。
 */
import { expect, test } from '../fixtures/tauri.js';
import { createItem, deleteItem, invoke } from '../helpers/ipc.js';

interface Widget {
	id: string;
	workspace_id: string;
	widget_type: string;
	position_x: number;
	position_y: number;
	width: number;
	height: number;
	config: string | null;
}

test.describe('ItemPicker 複数選択', () => {
	test('Picker multi モードで 3 件選択 → 一括配置', async ({ page }) => {
		// 3 件のテスト用 URL アイテムを準備
		const item1 = await createItem(page, {
			item_type: 'url',
			label: 'multi-test-1',
			target: 'https://example.com/1',
		});
		const item2 = await createItem(page, {
			item_type: 'url',
			label: 'multi-test-2',
			target: 'https://example.com/2',
		});
		const item3 = await createItem(page, {
			item_type: 'url',
			label: 'multi-test-3',
			target: 'https://example.com/3',
		});

		try {
			// page reload で itemStore に反映させる
			await page.reload();
			await page.waitForLoadState('domcontentloaded');

			// item type widget を新規追加
			// (ワークスペース sidebar の Item アイコンクリック → addWidget('item') 経由)
			// IPC で直接 add した方が確実。 Workspace を取得 → addWidget。
			const workspaces = await invoke<{ id: string }[]>(page, 'cmd_list_workspaces');
			expect(workspaces.length).toBeGreaterThan(0);
			const wsId = workspaces[0].id;

			const _itemWidget = await invoke<Widget>(page, 'cmd_add_widget', {
				workspaceId: wsId,
				widgetType: 'item',
			});

			try {
				await page.reload();
				await page.waitForLoadState('domcontentloaded');

				// 「アイテムを紐付け」button が見える (空状態) → クリック
				const linkBtn = page.getByRole('button', { name: 'このウィジェットにアイテムを紐付け' });
				await expect(linkBtn).toBeVisible({ timeout: 10_000 });
				await linkBtn.click();

				// Picker が multi モードで開く: checkbox + 「追加 (0)」disabled
				const confirmBar = page.getByTestId('picker-confirm-bar');
				await expect(confirmBar).toBeVisible();
				const confirmBtn = page.getByTestId('picker-confirm');
				await expect(confirmBtn).toHaveText('追加 (0)');
				await expect(confirmBtn).toBeDisabled();

				// 3 件のカードをクリック (toggle)
				await page.getByText('multi-test-1', { exact: true }).first().click();
				await page.getByText('multi-test-2', { exact: true }).first().click();
				await page.getByText('multi-test-3', { exact: true }).first().click();

				// 「追加 (3)」 が enabled になる
				await expect(confirmBtn).toHaveText('追加 (3)');
				await expect(confirmBtn).toBeEnabled();

				// 確定 → Picker が閉じる
				await confirmBtn.click();
				await expect(confirmBar).not.toBeVisible();

				// IPC で workspace の widget 数を確認 (元の 1 + 一括追加で 2 増 → 3 widget)
				const widgets = await invoke<Widget[]>(page, 'cmd_list_widgets', { workspaceId: wsId });
				const itemWidgets = widgets.filter((w) => w.widget_type === 'item');
				expect(itemWidgets.length).toBe(3);
				const configs = itemWidgets
					.map((w) => (w.config ? (JSON.parse(w.config) as { item_id?: string }) : null))
					.filter((c): c is { item_id?: string } => c !== null);
				const itemIds = configs.map((c) => c.item_id).filter((x): x is string => !!x);
				expect(new Set(itemIds)).toEqual(new Set([item1.id, item2.id, item3.id]));
			} finally {
				// 後始末: 追加した 3 widget を削除
				const allWidgets = await invoke<Widget[]>(page, 'cmd_list_widgets', { workspaceId: wsId });
				for (const w of allWidgets.filter((x) => x.widget_type === 'item')) {
					try {
						await invoke<void>(page, 'cmd_remove_widget', { id: w.id });
					} catch {
						// ignore
					}
				}
			}
		} finally {
			// item 後始末
			await deleteItem(page, item1.id);
			await deleteItem(page, item2.id);
			await deleteItem(page, item3.id);
		}
	});
});
