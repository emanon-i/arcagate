import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createWorkspace, deleteWorkspace, invoke, type Widget } from '../helpers/ipc.js';
import { resizeWindow } from '../helpers/resize.js';

test.describe('Workspace 編集操作（PH-20260422-014〜016 リグレッション防衛）', () => {
	test.afterEach(async ({ page }) => {
		await page.mouse.up().catch(() => {});
	});

	test(
		'編集モードでサイドバーから Recent ウィジェットを D&D 追加できること',
		{ tag: '@smoke' },
		async ({ page }) => {
			await resizeWindow(page, 1280, 800);
			const workspace = await createWorkspace(page, 'D&D追加テストWS');

			try {
				await page.reload();
				await page.waitForLoadState('domcontentloaded');
				await waitForAppReady(page);
				await page.getByRole('button', { name: 'Workspace' }).click();
				// 新規 WS タブを明示的に選択（loadWorkspaces は workspaces[0] をアクティブにするため）
				await page.getByTestId(`workspace-tab-${workspace.id}`).click();
				await expect(page.getByText('D&D追加テストWS')).toBeVisible();

				await page.getByLabel('編集モード').click();
				await expect(page.getByLabel('編集を確定')).toBeVisible();
				// サイドバーアニメーション（--ag-duration-fast=120ms）完了を待つ
				await page.waitForTimeout(200);

				const beforeCount = await page.getByLabel('ウィジェットを移動').count();

				// PointerEvent ベース D&D（evaluate 内で getBoundingClientRect で座標取得）
				// サイドバーアニメーション完了後に坐標を計算することで isOverDropZone と一致させる
				await page.evaluate(async () => {
					const src = document.querySelector('[data-widget-type="recent"]') as HTMLElement | null;
					const dropZone = document.querySelector(
						'[data-testid="workspace-drop-zone"]',
					) as HTMLElement | null;
					if (!src || !dropZone) throw new Error('required elements not found');

					const srcRect = src.getBoundingClientRect();
					const dzRect = dropZone.getBoundingClientRect();
					const sx = srcRect.left + srcRect.width / 2;
					const sy = srcRect.top + srcRect.height / 2;
					const tx = dzRect.left + 60;
					const ty = dzRect.top + 60;

					const mkPtr = (type: string, x: number, y: number) =>
						new PointerEvent(type, {
							bubbles: true,
							cancelable: true,
							pointerId: 1,
							pointerType: 'mouse',
							clientX: x,
							clientY: y,
						});
					src.dispatchEvent(mkPtr('pointerdown', sx, sy));
					// $effect がドキュメントリスナーを登録するまでマイクロタスクを yield
					await new Promise((r) => setTimeout(r, 100));
					document.dispatchEvent(mkPtr('pointermove', tx, ty));
					document.dispatchEvent(mkPtr('pointerup', tx, ty));
				});

				await expect(page.getByLabel('ウィジェットを移動')).toHaveCount(beforeCount + 1, {
					timeout: 5000,
				});
			} finally {
				await deleteWorkspace(page, workspace.id);
			}
		},
	);

	test('ドラッグハンドルでウィジェットを移動し永続化されること', async ({ page }) => {
		const workspace = await createWorkspace(page, '移動テストWS');

		try {
			// IPC でウィジェットを追加して (0,0) に配置
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
			await expect(page.getByText('移動テストWS')).toBeVisible();

			// 編集モードに入る
			await page.getByLabel('編集モード').click();
			await expect(page.getByLabel('編集を確定')).toBeVisible();

			// ドラッグハンドルがあることを確認
			await expect(page.getByLabel('ウィジェットを移動').first()).toBeVisible();

			// ドラッグハンドルをドロップゾーンの別セル（右端）へ移動（PointerEvent ベース）
			const handleBox = await page
				.locator('[aria-label="ウィジェットを移動"]')
				.first()
				.boundingBox();
			const dropZoneBox = await page.locator('[data-testid="workspace-drop-zone"]').boundingBox();
			if (!handleBox || !dropZoneBox) throw new Error('bounding boxes not found');
			const hx = handleBox.x + handleBox.width / 2;
			const hy = handleBox.y + handleBox.height / 2;
			const tx = dropZoneBox.x + 400;
			const ty = dropZoneBox.y + 60;
			await page.mouse.move(hx, hy);
			await page.mouse.down();
			await page.mouse.move(tx, ty, { steps: 10 });
			await page.mouse.up();

			// 確定して編集モード終了
			await page.getByLabel('編集を確定').click();

			// リロードしてもウィジェットが表示されること（永続化確認）
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('移動テストWS')).toBeVisible();
			// 編集モードで role=group を確認（通常モードには role=group がない）
			await page.getByLabel('編集モード').click();
			await expect(page.locator('[role="group"]').first()).toBeVisible();
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});

	test('リサイズハンドルでウィジェットをリサイズしコンテンツが表示されること', async ({ page }) => {
		await resizeWindow(page, 1280, 800);

		const workspace = await createWorkspace(page, 'リサイズテストWS');

		try {
			// IPC でウィジェットを (0,0) size (1,1) に追加
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
			await expect(page.getByText('リサイズテストWS')).toBeVisible();

			// 編集モードに入る
			await page.getByLabel('編集モード').click();
			await expect(page.getByLabel('編集を確定')).toBeVisible();

			// リサイズハンドルの位置を取得
			const resizeHandle = page.getByLabel('リサイズ').first();
			await expect(resizeHandle).toBeVisible();
			const box = await resizeHandle.boundingBox();
			if (!box) throw new Error('resize handle bounding box not found');

			const cx = box.x + box.width / 2;
			const cy = box.y + box.height / 2;

			// page.evaluate で pointer events を直接ディスパッチ（setPointerCapture 依存を回避）
			await page.evaluate(
				({ x, y, dx }: { x: number; y: number; dx: number }) => {
					const handle = document.querySelector('[aria-label="リサイズ"]') as HTMLElement | null;
					if (!handle) throw new Error('resize handle not found');
					const mkPtr = (type: string, clientX: number) =>
						new PointerEvent(type, {
							bubbles: true,
							cancelable: true,
							pointerId: 1,
							pointerType: 'mouse',
							clientX,
							clientY: y,
						});
					handle.dispatchEvent(mkPtr('pointerdown', x));
					handle.dispatchEvent(mkPtr('pointermove', x + dx));
					handle.dispatchEvent(mkPtr('pointerup', x + dx));
				},
				{ x: cx, y: cy, dx: 400 },
			);

			// ウィジェットコンテナの style に span 2 が含まれること（pointer events 処理完了を待つ）
			const widgetContainer = page.locator('[role="group"]').first();
			await expect(widgetContainer).toHaveAttribute('style', /span 2/);

			// WidgetShell 内の overflow コンテナが表示されていること（PH-20260422-016 修正確認）
			await expect(widgetContainer.locator('.min-h-0.flex-1').first()).toBeVisible();
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});

	test('編集モードでゴミ箱ボタンをクリックすると確認ダイアログが表示されること', async ({
		page,
	}) => {
		const workspace = await createWorkspace(page, '削除確認ダイアログテストWS');

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
			await expect(page.getByText('削除確認ダイアログテストWS')).toBeVisible();

			await page.getByLabel('編集モード').click();
			await expect(page.getByLabel('編集を確定')).toBeVisible();

			const beforeCount = await page.getByLabel('ウィジェットを移動').count();
			expect(beforeCount).toBeGreaterThan(0);

			// ゴミ箱ボタンクリック → 確認ダイアログが表示される（即削除しない）
			await page.getByRole('button', { name: 'ウィジェットを削除' }).first().click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await expect(page.getByText('ウィジェットを削除しますか？')).toBeVisible();

			// まだ削除されていないことを確認
			await expect(page.getByLabel('ウィジェットを移動')).toHaveCount(beforeCount);

			// 「削除」ボタンで確定 → ウィジェットが消える
			await page.getByRole('dialog').getByRole('button', { name: '削除' }).click();
			await expect(page.getByLabel('ウィジェットを移動')).toHaveCount(beforeCount - 1, {
				timeout: 3000,
			});
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});

	test('編集モード中に Esc を押すと編集モードが終了すること', async ({ page }) => {
		const workspace = await createWorkspace(page, 'Esc キャンセルテストWS');

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
			await expect(page.getByText('Esc キャンセルテストWS')).toBeVisible();

			// 編集モードに入る
			await page.getByLabel('編集モード').click();
			await expect(page.getByLabel('編集を確定')).toBeVisible();
			await expect(page.locator('[role="group"]').first()).toBeVisible();

			// Esc を押す → 編集モードが終了する
			await page.keyboard.press('Escape');
			await expect(page.getByLabel('編集を確定')).not.toBeVisible();
			await expect(page.locator('[role="group"]')).not.toBeVisible();
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});

	test('編集モード中に Enter を押すと編集が確定されること', async ({ page }) => {
		const workspace = await createWorkspace(page, 'Enter 確定テストWS');

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
			await expect(page.getByText('Enter 確定テストWS')).toBeVisible();

			// 編集モードに入る
			await page.getByLabel('編集モード').click();
			await expect(page.getByLabel('編集を確定')).toBeVisible();
			await expect(page.locator('[role="group"]').first()).toBeVisible();

			// Enter を押す → 編集モードが終了する
			await page.keyboard.press('Enter');
			await expect(page.getByLabel('編集を確定')).not.toBeVisible();
			await expect(page.locator('[role="group"]')).not.toBeVisible();
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});

	test('削除確認ダイアログでキャンセルするとウィジェットが残ること', async ({ page }) => {
		const workspace = await createWorkspace(page, '削除キャンセルテストWS');

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
			await expect(page.getByText('削除キャンセルテストWS')).toBeVisible();

			await page.getByLabel('編集モード').click();
			await expect(page.getByLabel('編集を確定')).toBeVisible();

			const beforeCount = await page.getByLabel('ウィジェットを移動').count();
			expect(beforeCount).toBeGreaterThan(0);

			// ゴミ箱ボタンクリック → 確認ダイアログ表示
			await page.getByRole('button', { name: 'ウィジェットを削除' }).first().click();
			await expect(page.getByRole('dialog')).toBeVisible();

			// 「キャンセル」クリック → ダイアログが閉じ、ウィジェットは残る
			await page.getByRole('dialog').getByRole('button', { name: 'キャンセル' }).click();
			await expect(page.getByRole('dialog')).not.toBeVisible();
			await expect(page.getByLabel('ウィジェットを移動')).toHaveCount(beforeCount);
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});

	test('Delete キーでウィジェット削除ダイアログが開くこと', async ({ page }) => {
		const workspace = await createWorkspace(page, 'Deleteキーテス テストWS');

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
			await expect(page.getByText('Deleteキーテス テストWS')).toBeVisible();

			// 編集モードに入る
			await page.getByLabel('編集モード').click();
			await expect(page.getByLabel('編集を確定')).toBeVisible();

			// ウィジェットをクリックして選択
			await page.getByRole('group', { name: 'recent' }).click();

			// Delete キーを押すと削除確認ダイアログが開く
			await page.keyboard.press('Delete');
			await expect(page.getByRole('dialog')).toBeVisible();
			await expect(page.getByText('ウィジェットを削除しますか？')).toBeVisible();

			// Escape でキャンセルできる
			await page.keyboard.press('Escape');
			await expect(page.getByRole('dialog')).not.toBeVisible();
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});

	test(
		'削除確認ダイアログのキャンセルボタンでダイアログが閉じること（PH-178 退行防衛）',
		{ tag: '@smoke' },
		async ({ page }) => {
			const workspace = await createWorkspace(page, 'Cancel Dialog Smoke WS');

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

				// 削除ボタン → ダイアログ表示
				await page.getByRole('button', { name: 'ウィジェットを削除' }).first().click();
				await expect(page.getByRole('dialog')).toBeVisible();

				// キャンセルボタンクリックでダイアログが閉じる
				await page.getByRole('dialog').getByRole('button', { name: 'キャンセル' }).click();
				await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
			} finally {
				await deleteWorkspace(page, workspace.id);
			}
		},
	);

	test(
		'ワークスペースタブをダブルクリックするとリネームダイアログが開くこと（PH-185 退行防衛）',
		{ tag: '@smoke' },
		async ({ page }) => {
			const workspace = await createWorkspace(page, 'Rename Trigger Smoke WS');
			try {
				await page.reload();
				await page.waitForLoadState('domcontentloaded');
				await waitForAppReady(page);
				await page.getByRole('button', { name: 'Workspace' }).click();

				const tab = page.getByTestId(`workspace-tab-${workspace.id}`);
				await expect(tab).toBeVisible();
				await tab.dblclick();

				await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
				await page.getByRole('dialog').getByRole('button', { name: 'キャンセル' }).click();
				await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
			} finally {
				await deleteWorkspace(page, workspace.id);
			}
		},
	);
});
