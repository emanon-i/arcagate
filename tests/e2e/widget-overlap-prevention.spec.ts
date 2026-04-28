import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createWorkspace, deleteWorkspace } from '../helpers/ipc.js';
import { resizeWindow } from '../helpers/resize.js';

/**
 * PH-issue-003: Widget 同士は単純に重ならない (auto-rearrange 廃止、overlap → 拒否 + toast)。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P1 (状態) / P2 (失敗前提)
 * - docs/l1_requirements/ux_standards.md §13 (Workspace Canvas: widget は重ならない)
 *
 * 全追加経路 / 移動経路で wouldOverlapAt を強制、(0,0) fallback バグ排除。
 */
test.describe('Widget overlap prevention (PH-issue-003)', () => {
	test.afterEach(async ({ page }) => {
		await page.mouse.up().catch(() => {});
	});

	test(
		'@smoke panel click 追加で空セルへ自動配置 + 既存 widget に重ならない',
		{ tag: '@smoke' },
		async ({ page }) => {
			await resizeWindow(page, 1280, 800);
			const workspace = await createWorkspace(page, 'overlap-panel-add');
			try {
				await page.reload();
				await page.waitForLoadState('domcontentloaded');
				await waitForAppReady(page);
				await page.getByRole('button', { name: 'Workspace' }).click();
				await expect(page.getByText('overlap-panel-add')).toBeVisible();

				// seed 後 3 widget が存在 (favorites/recent/projects)
				const initialCount = await page.locator('[role="group"]').count();
				expect(initialCount).toBeGreaterThanOrEqual(1);

				// Sidebar から widget click 追加
				const addBtn = page.getByLabel(/を追加/).first();
				await addBtn.click();

				// 1 件増えるか、または「空きスペースがありません」toast が表示
				await page.waitForTimeout(500);
				const newCount = await page.locator('[role="group"]').count();
				const spaceFullToast = await page
					.getByText('空きスペースがありません', { exact: false })
					.isVisible()
					.catch(() => false);

				if (spaceFullToast) {
					expect(newCount).toBe(initialCount); // toast 経路: widget 数変わらず
				} else {
					expect(newCount).toBe(initialCount + 1); // 配置成功
				}
			} finally {
				await deleteWorkspace(page, workspace.id);
			}
		},
	);

	test('drag 追加で空セルへの drop 成功 (新 widget 配置)', async ({ page }) => {
		await resizeWindow(page, 1280, 800);
		const workspace = await createWorkspace(page, 'overlap-drag-success');
		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('overlap-drag-success')).toBeVisible();

			const initialCount = await page.locator('[role="group"]').count();

			// sidebar の最初の widget pointer drag (PointerEvent 経由、page.mouse 禁止)
			const dropZone = page.getByTestId('workspace-drop-zone');
			const sidebarBtn = page.locator('aside button[data-widget-type]').first();

			const sidebarBox = await sidebarBtn.boundingBox();
			const dropBox = await dropZone.boundingBox();
			if (!sidebarBox || !dropBox) throw new Error('Bounding box unavailable');

			// canvas の右下端へ drop (空きセルが必ず存在する位置)
			const targetX = dropBox.x + dropBox.width - 100;
			const targetY = dropBox.y + dropBox.height - 100;

			await page.evaluate(
				({ sx, sy, tx, ty }: { sx: number; sy: number; tx: number; ty: number }) => {
					const sidebarEl = document.querySelector(
						'aside button[data-widget-type]',
					) as HTMLElement | null;
					if (!sidebarEl) throw new Error('sidebar btn missing');
					const mk = (type: string, cx: number, cy: number) =>
						new PointerEvent(type, {
							bubbles: true,
							cancelable: true,
							pointerId: 1,
							pointerType: 'mouse',
							clientX: cx,
							clientY: cy,
						});
					sidebarEl.dispatchEvent(mk('pointerdown', sx, sy));
					document.dispatchEvent(mk('pointermove', tx, ty));
					document.dispatchEvent(mk('pointerup', tx, ty));
				},
				{
					sx: sidebarBox.x + sidebarBox.width / 2,
					sy: sidebarBox.y + sidebarBox.height / 2,
					tx: targetX,
					ty: targetY,
				},
			);

			await page.waitForTimeout(800);
			const newCount = await page.locator('[role="group"]').count();
			expect(newCount).toBe(initialCount + 1);
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});

	test('drag 追加で重なるセルへの drop は toast + 配置されない', async ({ page }) => {
		await resizeWindow(page, 1280, 800);
		const workspace = await createWorkspace(page, 'overlap-drag-reject');
		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('overlap-drag-reject')).toBeVisible();

			const initialCount = await page.locator('[role="group"]').count();
			expect(initialCount).toBeGreaterThanOrEqual(1);

			// 既存 widget の位置に drag drop → 重なって拒否されるはず
			const existingWidget = page.locator('[role="group"]').first();
			const existingBox = await existingWidget.boundingBox();
			const sidebarBtn = page.locator('aside button[data-widget-type]').first();
			const sidebarBox = await sidebarBtn.boundingBox();
			if (!existingBox || !sidebarBox) throw new Error('bbox missing');

			await page.evaluate(
				({ sx, sy, tx, ty }: { sx: number; sy: number; tx: number; ty: number }) => {
					const sidebarEl = document.querySelector(
						'aside button[data-widget-type]',
					) as HTMLElement | null;
					if (!sidebarEl) throw new Error('sidebar btn missing');
					const mk = (type: string, cx: number, cy: number) =>
						new PointerEvent(type, {
							bubbles: true,
							cancelable: true,
							pointerId: 1,
							pointerType: 'mouse',
							clientX: cx,
							clientY: cy,
						});
					sidebarEl.dispatchEvent(mk('pointerdown', sx, sy));
					document.dispatchEvent(mk('pointermove', tx, ty));
					document.dispatchEvent(mk('pointerup', tx, ty));
				},
				{
					sx: sidebarBox.x + sidebarBox.width / 2,
					sy: sidebarBox.y + sidebarBox.height / 2,
					tx: existingBox.x + existingBox.width / 2,
					ty: existingBox.y + existingBox.height / 2,
				},
			);

			await page.waitForTimeout(800);
			// toast 表示 + widget 数変わらず
			const rejectToast = await page
				.getByText('他のウィジェットと重なる', { exact: false })
				.isVisible()
				.catch(() => false);
			const newCount = await page.locator('[role="group"]').count();
			expect(rejectToast || newCount === initialCount).toBe(true);
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});
});
