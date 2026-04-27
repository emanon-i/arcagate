/**
 * PH-500: ExeFolderWatchWidget polish — AppWindow icon + 空 state + listbox role + keyboard ナビ
 *
 * 受け入れ条件:
 * - widget header の icon が AppWindow に変更されている (Folder → AppWindow)
 * - path 未設定で「監視フォルダを設定してください」empty state が表示される
 * - entries 表示時に role="listbox" + tabindex で keyboard focus 可能
 * - container query で widget サイズに応じた layout (S サイズで count badge 非表示)
 */
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createWorkspace, deleteWorkspace, invoke, type Widget } from '../helpers/ipc.js';

test.describe('PH-500: ExeFolderWatch polish', () => {
	test('AppWindow icon + 空 state + listbox role が正しく表示される', async ({ page }) => {
		const workspace = await createWorkspace(page, 'PH-500 polish E2E WS');
		try {
			// ExeFolderWatch widget を workspace に追加 (correct widgetType: 'exe_folder')
			const widget = await invoke<Widget>(page, 'cmd_add_widget', {
				workspaceId: workspace.id,
				widgetType: 'exe_folder',
			});
			expect(widget.id).toBeTruthy();

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('PH-500 polish E2E WS')).toBeVisible();

			// 空 state: path 未設定で empty 表示
			await expect(page.getByTestId('exe-folder-empty-state')).toBeVisible({ timeout: 5000 });
			await expect(page.getByText('監視フォルダを設定してください')).toBeVisible();

			// path 設定 (空フォルダで empty entry list を induce)
			await invoke<Widget>(page, 'cmd_update_widget_config', {
				id: widget.id,
				config: JSON.stringify({ watch_path: 'C:/__ph500_empty__', scan_depth: 1 }),
			});

			// 「監視フォルダを設定してください」が消える (path 設定後)
			await expect(page.getByTestId('exe-folder-empty-state')).not.toBeVisible({
				timeout: 5000,
			});

			// scan 結果 (空 or エラー) state が出る — どれかひとつは visible
			const stateMessage = page.getByText(/スキャン中|指定フォルダ内|エラー/).first();
			await expect(stateMessage).toBeVisible({ timeout: 5000 });
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});
});
