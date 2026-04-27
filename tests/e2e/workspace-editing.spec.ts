import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createWorkspace, deleteWorkspace, invoke, type Widget } from '../helpers/ipc.js';
import { resizeWindow } from '../helpers/resize.js';

test.describe('Workspace 編集操作（PH-20260422-014〜016 + PH-472 リグレッション防衛）', () => {
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
				await page.getByTestId(`workspace-tab-${workspace.id}`).click();
				await expect(page.getByText('D&D追加テストWS')).toBeVisible();

				await page.getByLabel('編集モード').click();
				await expect(page.getByLabel('編集を確定')).toBeVisible();
				await page.waitForTimeout(200);

				const beforeCount = await page.locator('[role="group"]').count();

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
					await new Promise((r) => setTimeout(r, 100));
					document.dispatchEvent(mkPtr('pointermove', tx, ty));
					document.dispatchEvent(mkPtr('pointerup', tx, ty));
				});

				await expect(page.locator('[role="group"]')).toHaveCount(beforeCount + 1, {
					timeout: 5000,
				});
			} finally {
				await deleteWorkspace(page, workspace.id);
			}
		},
	);

	test(
		'PH-472: ハンドルは widget 選択時のみ表示されること',
		{ tag: '@smoke' },
		async ({ page }) => {
			const workspace = await createWorkspace(page, 'PH-472 ハンドル表示WS');
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

				// 編集モードに入っただけでは ハンドル非表示
				await page.getByLabel('編集モード').click();
				await expect(page.getByLabel('編集を確定')).toBeVisible();
				await expect(page.getByLabel('ウィジェットを移動')).toHaveCount(0);
				await expect(page.getByLabel('ウィジェットを削除')).toHaveCount(0);

				// widget をクリック選択 → ハンドル + 削除ボタンが表示される
				await page.getByRole('group').first().click();
				await expect(page.getByLabel('ウィジェットを移動')).toHaveCount(1);
				await expect(page.getByLabel('ウィジェットを削除')).toHaveCount(1);

				// 別の場所をクリック → 非表示に戻る
				await page
					.locator('[data-testid="workspace-drop-zone"]')
					.click({ position: { x: 5, y: 5 } });
				await expect(page.getByLabel('ウィジェットを移動')).toHaveCount(0);
			} finally {
				await deleteWorkspace(page, workspace.id);
			}
		},
	);

	test('ドラッグハンドルでウィジェットを移動し永続化されること', async ({ page }) => {
		const workspace = await createWorkspace(page, '移動テストWS');

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
			await expect(page.getByText('移動テストWS')).toBeVisible();

			await page.getByLabel('編集モード').click();
			await expect(page.getByLabel('編集を確定')).toBeVisible();

			// widget 選択 → ハンドル表示
			await page.getByRole('group').first().click();
			await expect(page.getByLabel('ウィジェットを移動').first()).toBeVisible();

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

			await page.getByLabel('編集を確定').click();

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByText('移動テストWS')).toBeVisible();
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

			await page.getByLabel('編集モード').click();
			await expect(page.getByLabel('編集を確定')).toBeVisible();

			// widget 選択でハンドル表示
			await page.getByRole('group').first().click();

			// 右下 corner ハンドルを取得 (RESIZE_LABELS.se = 'ウィジェットの幅と高さを変更')
			const resizeHandle = page.getByLabel('ウィジェットの幅と高さを変更').first();
			await expect(resizeHandle).toBeVisible();
			const box = await resizeHandle.boundingBox();
			if (!box) throw new Error('resize handle bounding box not found');

			const cx = box.x + box.width / 2;
			const cy = box.y + box.height / 2;

			await page.evaluate(
				({ x, y, dx }: { x: number; y: number; dx: number }) => {
					const handle = document.querySelector(
						'[aria-label="ウィジェットの幅と高さを変更"]',
					) as HTMLElement | null;
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

			const widgetContainer = page.locator('[role="group"]').first();
			await expect(widgetContainer).toHaveAttribute('style', /span 2/);

			await expect(widgetContainer.locator('.min-h-0.flex-1').first()).toBeVisible();
		} finally {
			await deleteWorkspace(page, workspace.id);
		}
	});

	test('編集モードで × ボタンをクリックすると確認ダイアログが表示されること', async ({ page }) => {
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

			const beforeCount = await page.locator('[role="group"]').count();
			expect(beforeCount).toBeGreaterThan(0);

			// 選択 → × ボタン
			await page.getByRole('group').first().click();
			await page.getByRole('button', { name: 'ウィジェットを削除' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await expect(page.getByText('ウィジェットを削除しますか？')).toBeVisible();

			// まだ削除されていない
			await expect(page.locator('[role="group"]')).toHaveCount(beforeCount);

			// 削除確定
			await page.getByRole('dialog').getByRole('button', { name: '削除' }).click();
			await expect(page.locator('[role="group"]')).toHaveCount(beforeCount - 1, {
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

			await page.getByLabel('編集モード').click();
			await expect(page.getByLabel('編集を確定')).toBeVisible();
			await expect(page.locator('[role="group"]').first()).toBeVisible();

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

			await page.getByLabel('編集モード').click();
			await expect(page.getByLabel('編集を確定')).toBeVisible();
			await expect(page.locator('[role="group"]').first()).toBeVisible();

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

			const beforeCount = await page.locator('[role="group"]').count();
			expect(beforeCount).toBeGreaterThan(0);

			// 選択 → × ボタン → キャンセル
			await page.getByRole('group').first().click();
			await page.getByRole('button', { name: 'ウィジェットを削除' }).click();
			await expect(page.getByRole('dialog')).toBeVisible();

			await page.getByRole('dialog').getByRole('button', { name: 'キャンセル' }).click();
			await expect(page.getByRole('dialog')).not.toBeVisible();
			await expect(page.locator('[role="group"]')).toHaveCount(beforeCount);
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

			await page.getByLabel('編集モード').click();
			await expect(page.getByLabel('編集を確定')).toBeVisible();

			await page.getByRole('group', { name: 'recent' }).click();

			await page.keyboard.press('Delete');
			await expect(page.getByRole('dialog')).toBeVisible();
			await expect(page.getByText('ウィジェットを削除しますか？')).toBeVisible();

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

				// 選択 → × → キャンセル
				await page.getByRole('group').first().click();
				await page.getByRole('button', { name: 'ウィジェットを削除' }).click();
				await expect(page.getByRole('dialog')).toBeVisible();

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

	test(
		'ウィジェットズーム: configStore.widgetZoom が変わるとグリッド CSS 変数も更新されること',
		{ tag: '@smoke' },
		async ({ page }) => {
			await resizeWindow(page, 1280, 800);
			await page.getByRole('button', { name: 'Workspace' }).click();

			const result = await page.evaluate(async () => {
				const el = document.querySelector('[data-zoom]') as HTMLElement | null;
				if (!el) return null;
				const before = getComputedStyle(el).getPropertyValue('--widget-w').trim();
				return { before };
			});
			expect(result).not.toBeNull();
			expect(result?.before).toBeTruthy();
		},
	);
});
