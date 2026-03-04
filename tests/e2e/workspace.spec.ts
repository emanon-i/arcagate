import { expect, test } from '../fixtures/tauri.js';
import { createWorkspace, deleteWorkspace, listWorkspaces } from '../helpers/ipc.js';

test.describe('ワークスペース', () => {
	test('ワークスペースを作成できること', async ({ page }) => {
		// IPC でワークスペースを作成
		const workspace = await createWorkspace(page, 'E2E テストワークスペース');

		expect(workspace.id).toBeTruthy();
		expect(workspace.name).toBe('E2E テストワークスペース');

		// IPC 一覧でも確認
		const workspaces = await listWorkspaces(page);
		const found = workspaces.find((w) => w.id === workspace.id);
		expect(found).toBeDefined();

		try {
			// 「ワークスペース」タブに切り替えて UI でも確認
			await page.getByRole('button', { name: 'ワークスペース', exact: true }).click();

			// タブ表示を確認
			await expect(page.getByText('E2E テストワークスペース')).toBeVisible();
		} finally {
			// クリーンアップ
			await deleteWorkspace(page, workspace.id);
		}
	});

	test('ウィジェットを追加できること', async ({ page }, testInfo) => {
		// ワークスペースを作成
		const workspace = await createWorkspace(page, 'ウィジェットテストワークスペース');

		try {
			// IPC 変更は Svelte ストアに通知されないためリロードしてから切り替え
			// リロードにより WorkspaceView が再 mount → onMount で loadWorkspaces が呼ばれる
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			// 「ワークスペース」タブに切り替え
			await page.getByRole('button', { name: 'ワークスペース', exact: true }).click();

			// ワークスペースタブが表示されていることを確認
			await expect(page.getByText('ウィジェットテストワークスペース')).toBeVisible();

			// ウィジェット追加ボタンをクリック
			await page.getByRole('button', { name: 'ウィジェット追加' }).click();

			// ダイアログが表示されることを確認
			// AddWidgetDialog は role="dialog" を持たないため、内部ボタンで代替確認
			await expect(page.getByRole('button', { name: 'よく使うもの' })).toBeVisible();

			// 「よく使うもの」ウィジェットを追加
			await page.getByRole('button', { name: 'よく使うもの' }).click();

			// ウィジェットが追加されたことを確認（WidgetCard に表示される）
			await expect(page.getByText('よく使うもの')).toBeVisible();

			// 成功証跡を HTML report に添付
			const screenshot = await page.screenshot({ fullPage: true });
			await testInfo.attach('success-workspace-widget', {
				body: screenshot,
				contentType: 'image/png',
			});
		} finally {
			// クリーンアップ
			await deleteWorkspace(page, workspace.id);
		}
	});
});
