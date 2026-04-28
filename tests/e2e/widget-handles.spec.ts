import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createWorkspace, deleteWorkspace, invoke, type Widget } from '../helpers/ipc.js';
import { resizeWindow } from '../helpers/resize.js';

/**
 * PH-issue-001: Widget handles 普通化 — 選択時のみ ring + handles
 *
 * 引用元 guideline:
 * - docs/l1_requirements/ux_standards.md §6-1 / §13
 * - docs/desktop_ui_ux_agent_rules.md P11 (装飾は対象を邪魔しない)
 *
 * 旧 PH-472 が rollback で revert されたため再実装、新運用 §11 (1 issue depth-first) で着手。
 */
test.describe('Widget handles 選択時のみ可視化 (PH-issue-001)', () => {
	test.afterEach(async ({ page }) => {
		await page.mouse.up().catch(() => {});
	});

	test('編集モード ON 直後は handle が出ない (非選択状態)', { tag: '@smoke' }, async ({ page }) => {
		await resizeWindow(page, 1280, 800);
		const workspace = await createWorkspace(page, 'handle-select-test-1');

		try {
			const widget = await invoke<Widget>(page, 'cmd_add_widget', {
				workspaceId: workspace.id,
				widgetType: 'recent',
			});
			await invoke<Widget>(page, 'cmd_update_widget_position', {
				id: widget.id,
				positionX: 0,
				positionY: 0,
				width: 1,
				height: 1,
			});

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('handle-select-test-1')).toBeVisible();

			// 編集モードに入る
			await page.getByLabel('編集モード').click();
			await expect(page.getByLabel('編集を確定')).toBeVisible();

			// 非選択状態: drag handle / × button / resize handle すべて出ない
			await expect(page.getByLabel('ウィジェットを移動')).toHaveCount(0);
			await expect(page.getByRole('button', { name: 'ウィジェットを削除' })).toHaveCount(0);
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});

	test('widget click → 選択 → handle 群が出現', async ({ page }) => {
		await resizeWindow(page, 1280, 800);
		const workspace = await createWorkspace(page, 'handle-select-test-2');

		try {
			const widget = await invoke<Widget>(page, 'cmd_add_widget', {
				workspaceId: workspace.id,
				widgetType: 'recent',
			});
			await invoke<Widget>(page, 'cmd_update_widget_position', {
				id: widget.id,
				positionX: 0,
				positionY: 0,
				width: 1,
				height: 1,
			});

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();

			await page.getByLabel('編集モード').click();
			await expect(page.getByLabel('編集を確定')).toBeVisible();

			// widget をクリックして選択
			await page.getByRole('group').first().click();

			// 選択後: drag handle + × button が出現
			await expect(page.getByLabel('ウィジェットを移動')).toHaveCount(1);
			await expect(page.getByRole('button', { name: 'ウィジェットを削除' })).toHaveCount(1);

			// canvas 空白 click で選択解除
			await page.locator('[data-testid="workspace-drop-zone"]').click({ position: { x: 5, y: 5 } });
			await expect(page.getByLabel('ウィジェットを移動')).toHaveCount(0);
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});

	test('Delete キーで削除確認 dialog', async ({ page }) => {
		await resizeWindow(page, 1280, 800);
		const workspace = await createWorkspace(page, 'handle-select-test-3');

		try {
			const widget = await invoke<Widget>(page, 'cmd_add_widget', {
				workspaceId: workspace.id,
				widgetType: 'recent',
			});
			await invoke<Widget>(page, 'cmd_update_widget_position', {
				id: widget.id,
				positionX: 0,
				positionY: 0,
				width: 1,
				height: 1,
			});

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();

			await page.getByLabel('編集モード').click();
			await expect(page.getByLabel('編集を確定')).toBeVisible();

			// widget 選択
			await page.getByRole('group').first().click();

			// Delete キー → 削除確認 dialog
			await page.keyboard.press('Delete');
			await expect(page.getByRole('dialog')).toBeVisible();
			await expect(page.getByText('ウィジェットを削除しますか？')).toBeVisible();

			// Esc でキャンセル
			await page.keyboard.press('Escape');
			await expect(page.getByRole('dialog')).not.toBeVisible();
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});
});
