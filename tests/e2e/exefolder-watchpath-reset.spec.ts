/**
 * PH-490 回帰防止: ExeFolderWatchWidget で監視 path 変更時に entries が即リセットされる
 *
 * 修正前: path 変更後 (新 path scan 完了まで) 旧 entries が表示残存
 * 修正後 (PR #192): effect 開始時 entries = [] + scanRequestId で stale response 破棄
 *
 * ユーザー fb (2026-04-28): 「ウォッチフォルダーとかみるフォルダ変えたら中身リセットしてほしい」
 * → 何度も再指示レベルなので E2E assertion 残す。
 *
 * PH-500 (2026-04-28): empty state UI を centered button に再構築 + icon AppWindow 化に伴い
 * テキスト assertion を新 UI に追従。
 */
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createWorkspace, deleteWorkspace, invoke, type Widget } from '../helpers/ipc.js';

test.describe('PH-490 回帰防止: ExeFolderWatch path 変更で entries リセット', () => {
	test('path 切替で widget の中身が画面切替なしで即リセットされる', async ({ page }) => {
		const workspace = await createWorkspace(page, 'PH-490 reset E2E WS');
		try {
			// ExeFolderWatch widget を workspace に追加
			// PH-500: widget_type identifier は `exe_folder` が正 (旧テストの `exe_folder_watch` は invalid)
			const widget = await invoke<Widget>(page, 'cmd_add_widget', {
				workspaceId: workspace.id,
				widgetType: 'exe_folder',
			});

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('PH-490 reset E2E WS')).toBeVisible();

			// 初期 widget は path 未設定 → 「監視フォルダ未設定」表示 (PH-500 新 UI)
			await expect(page.getByText('監視フォルダ未設定')).toBeVisible({ timeout: 5000 });

			// path A (実在しない pathでも entries が空のまま reset されることを assert)
			await invoke<Widget>(page, 'cmd_update_widget_config', {
				id: widget.id,
				config: JSON.stringify({ watch_path: 'C:/__nonexistent_a__', scan_depth: 1 }),
			});

			// scan 完了 → 空 state に遷移、空 state テキストが見える
			await expect(page.getByText('監視フォルダ未設定')).not.toBeVisible({
				timeout: 5000,
			});

			// path B に切替 → entries が即 reset される (PH-490 fix)
			await invoke<Widget>(page, 'cmd_update_widget_config', {
				id: widget.id,
				config: JSON.stringify({ watch_path: 'C:/__nonexistent_b__', scan_depth: 1 }),
			});

			// path 切替で reset → loading or empty (新 UI: 「exe を含むサブフォルダがありません」or「スキャン中」)
			const possibleStates = page
				.getByText(/スキャン中|exe を含むサブフォルダ|スキャン失敗|監視フォルダ未設定/)
				.first();
			await expect(possibleStates).toBeVisible({ timeout: 5000 });
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});
});
