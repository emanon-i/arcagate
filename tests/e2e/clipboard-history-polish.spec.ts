/**
 * PH-512 batch-109 Phase B: ClipboardHistoryWidget polish
 *
 * 受け入れ条件 (本 spec で検証):
 * - 空 state に data-testid="clipboard-history-empty" が render される
 * - history があるとき role="listbox" + tabindex で keyboard focus 可能
 * - title attribute が button に付与され全文 tooltip 化されている
 *
 * 注: clipboard polling は OS API への副作用があるため、本 e2e は配置 + DOM 構造のみ確認。
 */
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createWorkspace, deleteWorkspace, invoke, type Widget } from '../helpers/ipc.js';

test.describe('PH-512: ClipboardHistoryWidget polish', () => {
	test('空 state empty + clip-container が render される', async ({ page }) => {
		const workspace = await createWorkspace(page, 'PH-512 Clip E2E WS');
		try {
			const widget = await invoke<Widget>(page, 'cmd_add_widget', {
				workspaceId: workspace.id,
				widgetType: 'clipboard_history',
			});
			expect(widget.id).toBeTruthy();

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('PH-512 Clip E2E WS')).toBeVisible();

			// container 表示
			const container = page.locator('.clip-container').first();
			await expect(container).toBeVisible({ timeout: 5000 });

			// history 0 件で空 state 表示
			await expect(page.getByTestId('clipboard-history-empty')).toBeVisible();

			// 履歴がある状態に IPC で直接 inject
			await invoke<Widget>(page, 'cmd_update_widget_config', {
				id: widget.id,
				config: JSON.stringify({
					history: [
						{ id: 'e1', text: 'first sample text', timestamp: Date.now() - 1000 },
						{
							id: 'e2',
							text: 'second sample with multiple lines\n\n\nand whitespace',
							timestamp: Date.now(),
						},
					],
					max_items: 20,
					poll_interval_ms: 1500,
				}),
			});

			// listbox + tabindex
			const list = container.locator('[role="listbox"]');
			await expect(list).toBeVisible({ timeout: 5000 });
			await expect(list).toHaveAttribute('tabindex', '0');
			await expect(list).toHaveAttribute('aria-label', 'クリップボード履歴');

			// 各 row が role="option" + title attribute (full text)
			const firstRow = list.locator('[role="option"]').first();
			await expect(firstRow).toBeVisible();
			const firstButton = firstRow.locator('button').first();
			await expect(firstButton).toHaveAttribute('title', /first sample text/);
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});
});
