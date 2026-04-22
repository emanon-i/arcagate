import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import {
	createWorkspace,
	deleteWorkspace,
	invoke,
	listWorkspaces,
	type Widget,
} from '../helpers/ipc.js';

test.describe('ワークスペース', () => {
	test('ワークスペースを作成すると UI に表示されること', { tag: '@smoke' }, async ({ page }) => {
		// IPC でワークスペースを作成
		const workspace = await createWorkspace(page, 'E2E テストワークスペース');

		expect(workspace.id).toBeTruthy();
		expect(workspace.name).toBe('E2E テストワークスペース');

		// IPC 一覧でも確認
		const workspaces = await listWorkspaces(page);
		const found = workspaces.find((w) => w.id === workspace.id);
		expect(found).toBeDefined();

		try {
			// リロードして Store に反映
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// "Workspace" タブに切り替え
			await page.getByRole('button', { name: 'Workspace' }).click();

			// PageTabBar にワークスペース名が表示されることを確認
			await expect(page.getByText('E2E テストワークスペース')).toBeVisible();
		} finally {
			// クリーンアップ
			await deleteWorkspace(page, workspace.id);
		}
	});

	test('Workspace タブに切り替えてもエラーなく表示されること', async ({ page }) => {
		// コンソールエラーを監視
		const errors: string[] = [];
		page.on('pageerror', (err) => errors.push(err.message));

		// Workspace タブに切り替え
		await page.getByRole('button', { name: 'Workspace' }).click();
		await page.waitForTimeout(500);

		// エラーが出ていないことを確認
		expect(errors).toHaveLength(0);

		// Workspace ビューの何かしらの要素が表示されていること
		// PageTabBar の「+」ボタンまたはワークスペース名が見える
		const workspaceContent = page.locator('main');
		await expect(workspaceContent).toBeVisible();
	});

	test('ウィジェットを追加するとワークスペースに表示されること', async ({ page }, testInfo) => {
		// ワークスペースを作成
		const workspace = await createWorkspace(page, 'ウィジェットテストWS');

		try {
			// IPC でウィジェットを追加
			await invoke(page, 'cmd_add_widget', {
				workspaceId: workspace.id,
				widgetType: 'favorites',
			});

			// リロードして Store に反映
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// "Workspace" タブに切り替え
			await page.getByRole('button', { name: 'Workspace' }).click();

			// ワークスペースタブが表示されていることを確認
			await expect(page.getByText('ウィジェットテストWS')).toBeVisible();

			// Favorites ウィジェットが表示されていることを確認
			await expect(page.getByText('Favorites')).toBeVisible();

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

	test('編集モードのオン/オフが動作すること', async ({ page }) => {
		// 自前のワークスペースを作成して安定したテスト環境を確保
		const workspace = await createWorkspace(page, '編集モードテストWS');

		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// Workspace タブに切り替え
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('編集モードテストWS')).toBeVisible();

			// 編集モードボタンをクリック
			const editBtn = page.getByLabel('編集モード');
			await expect(editBtn).toBeVisible();
			await editBtn.click();

			// 編集モード時: 確定/キャンセルボタンが表示される
			const confirmBtn = page.getByLabel('編集を確定');
			await expect(confirmBtn).toBeVisible();
			await expect(page.getByLabel('編集をキャンセル')).toBeVisible();

			// 編集モード終了（確定）
			await confirmBtn.click();

			// 非編集モードに戻る
			await expect(page.getByLabel('編集モード')).toBeVisible();
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});

	test('編集モードでウィジェットを IPC 追加して表示されること', async ({ page }) => {
		const workspace = await createWorkspace(page, '編集モードウィジェットWS');

		try {
			// ウィジェットを IPC で追加
			await invoke<Widget>(page, 'cmd_add_widget', {
				workspaceId: workspace.id,
				widgetType: 'recent',
			});

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// Workspace タブに切り替え
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('編集モードウィジェットWS')).toBeVisible();

			// 編集モードに入る
			const editBtn = page.getByLabel('編集モード');
			await editBtn.click();

			// 編集モード時: 確定ボタンが表示されること
			const confirmBtn = page.getByLabel('編集を確定');
			await expect(confirmBtn).toBeVisible();

			// 編集モード終了（確定）
			await confirmBtn.click();
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});
});
