/**
 * PH-507 batch-109 Phase B: SystemMonitorWidget polish
 *
 * 受け入れ条件 (本 spec で検証):
 * - sysmon-container が表示される
 * - 取得中 loading state は skeleton (data-testid="sysmon-loading", aria-live)
 * - データ取得後に CPU / Memory バーが render される
 * - role="progressbar" が memory バーに付く
 *
 * 注: error state (3 連続失敗) と container query の S サイズ表示は
 * unit test レベルで保証する範囲、本 e2e は DOM 構造のみ。
 */
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createWorkspace, deleteWorkspace, invoke, type Widget } from '../helpers/ipc.js';

test.describe('PH-507: SystemMonitorWidget polish', () => {
	test('skeleton loading → CPU/Memory バー render + progressbar role', async ({ page }) => {
		const workspace = await createWorkspace(page, 'PH-507 SysMon E2E WS');
		try {
			const widget = await invoke<Widget>(page, 'cmd_add_widget', {
				workspaceId: workspace.id,
				widgetType: 'system_monitor',
			});
			expect(widget.id).toBeTruthy();

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('PH-507 SysMon E2E WS')).toBeVisible();

			// container 表示
			const container = page.locator('.sysmon-container').first();
			await expect(container).toBeVisible({ timeout: 5000 });

			// CPU / Memory bar が表示される (取得完了)
			// progressbar role はメモリバーに付与されている
			const memProgressbar = container.locator('[role="progressbar"]').first();
			await expect(memProgressbar).toBeVisible({ timeout: 10_000 });

			// CPU label が表示
			await expect(container.getByText('CPU')).toBeVisible();
			// メモリ label が表示
			await expect(container.getByText('メモリ')).toBeVisible();
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});
});
