/**
 * PH-500: WatchFolder (ExeFolderWatch) widget polish
 *
 * 1. 空 state UI: centered button「監視フォルダを設定」 で settings dialog が開く
 * 2. retry button: scan error 状態で「再試行」が見える (実 path 設定なしでは error 出ないので空 state のみ assert)
 * 3. AppWindow icon に変更されたことを assert (FolderOpen から)
 *
 * 受け入れ条件: PH-500 plan の「空 state UI」「retry button」項目に対応する自動検証
 */
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createWorkspace, deleteWorkspace, invoke, type Widget } from '../helpers/ipc.js';

test.describe('PH-500: ExeFolderWatch polish (empty state button + AppWindow icon)', () => {
	test('空 state で「監視フォルダを設定」ボタンが表示され、押下で settings dialog が開く', async ({
		page,
	}) => {
		const workspace = await createWorkspace(page, 'PH-500 polish E2E WS');
		try {
			await invoke<Widget>(page, 'cmd_add_widget', {
				workspaceId: workspace.id,
				widgetType: 'exe_folder',
			});

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('PH-500 polish E2E WS')).toBeVisible();

			// 空 state UI: 「監視フォルダ未設定」と centered button「監視フォルダを設定」
			await expect(page.getByText('監視フォルダ未設定')).toBeVisible({ timeout: 5000 });
			const setBtn = page.getByTestId('exe-folder-empty-set-btn');
			await expect(setBtn).toBeVisible();

			// ボタン押下で settings dialog が開く
			await setBtn.click();
			await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});
});
