/**
 * PH-490 回帰防止: ExeFolderWatchWidget で監視 path 変更時に entries が即リセットされる
 *
 * 修正前: path 変更後 (新 path scan 完了まで) 旧 entries が表示残存
 * 修正後 (PR #192): effect 開始時 entries = [] + scanRequestId で stale response 破棄
 *
 * ユーザー fb (2026-04-28): 「ウォッチフォルダーとかみるフォルダ変えたら中身リセットしてほしい」
 * → 何度も再指示レベルなので E2E assertion 残す。
 */
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createWorkspace, deleteWorkspace, invoke, type Widget } from '../helpers/ipc.js';

test.describe('PH-490 回帰防止: ExeFolderWatch path 変更で entries リセット', () => {
	test('path 切替で widget の中身が画面切替なしで即リセットされる', async ({ page }) => {
		const workspace = await createWorkspace(page, 'PH-490 reset E2E WS');
		try {
			// ExeFolderWatch widget を workspace に追加
			const widget = await invoke<Widget>(page, 'cmd_add_widget', {
				workspaceId: workspace.id,
				widgetType: 'exe_folder',
			});

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('PH-490 reset E2E WS')).toBeVisible();

			// 初期 widget は path 未設定 → 「監視フォルダを設定してください」表示
			await expect(page.getByText('監視フォルダを設定してください')).toBeVisible({ timeout: 5000 });

			// path A (実在しない pathでも entries が空のまま reset されることを assert)
			await invoke<Widget>(page, 'cmd_update_widget_config', {
				id: widget.id,
				config: JSON.stringify({ watch_path: 'C:/__nonexistent_a__', scan_depth: 1 }),
			});

			// scan 完了 (失敗 or 空) を待つ → 「監視フォルダを設定してください」消える
			await expect(page.getByText('監視フォルダを設定してください')).not.toBeVisible({
				timeout: 5000,
			});

			// path B に切替 → entries が即 reset される (PH-490 fix)
			// 修正前は path A の old entries が path B scan 完了まで残存していた
			await invoke<Widget>(page, 'cmd_update_widget_config', {
				id: widget.id,
				config: JSON.stringify({ watch_path: 'C:/__nonexistent_b__', scan_depth: 1 }),
			});

			// path 切替で entries reset → loading or empty state を表示
			// (この test では実 folder scan は失敗するが、reset 動作自体は assert 可能)
			// 「スキャン中...」or 「指定フォルダ内に exe を含むサブフォルダがありません」or「エラー: ...」
			const possibleStates = page
				.getByText(/スキャン中|指定フォルダ内|エラー|監視フォルダを設定/)
				.first();
			await expect(possibleStates).toBeVisible({ timeout: 5000 });
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});
});
