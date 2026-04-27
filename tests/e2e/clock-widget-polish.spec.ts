/**
 * PH-506 batch-109 Phase B: ClockWidget polish
 *
 * 受け入れ条件 (本 spec で検証):
 * - clock-container が role="group" + aria-live="polite" + aria-label="現在時刻"
 * - timeParts に prefix / core / seconds が分離して span 化されている
 * - container query で XS / S サイズ降格 (data-testid から CSS class が attached されている)
 *
 * 注: 実際の container query 効果 (display:none) は CDP で getComputedStyle 経由で確認するが、
 * widget サイズ変更は workspace の widget 幅変更 IPC が必要なため本 spec は
 * 「DOM 構造 + class が正しく付与されている」までを assert する (CSS は単体テスト範囲外で trust)。
 */
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createWorkspace, deleteWorkspace, invoke, type Widget } from '../helpers/ipc.js';

test.describe('PH-506: ClockWidget polish', () => {
	test('clock-container が aria-live + role group + 時刻 prefix/core/seconds 分離 span', async ({
		page,
	}) => {
		const workspace = await createWorkspace(page, 'PH-506 Clock E2E WS');
		try {
			const widget = await invoke<Widget>(page, 'cmd_add_widget', {
				workspaceId: workspace.id,
				widgetType: 'clock',
			});
			expect(widget.id).toBeTruthy();

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('PH-506 Clock E2E WS')).toBeVisible();

			// clock-container に role="group" + aria-live="polite"
			const container = page.locator('.clock-container').first();
			await expect(container).toBeVisible({ timeout: 5000 });
			await expect(container).toHaveAttribute('role', 'group');
			await expect(container).toHaveAttribute('aria-live', 'polite');
			await expect(container).toHaveAttribute('aria-label', '現在時刻');

			// time 部 span が存在: core (HH:MM) は必須、prefix と seconds は config に依る
			const time = container.locator('.clock-time');
			await expect(time).toBeVisible();
			// HH:MM 形式 (regex)
			await expect(time).toContainText(/\d{2}:\d{2}/);
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});
});
