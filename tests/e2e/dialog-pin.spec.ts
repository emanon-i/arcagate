import { expect, test } from '../fixtures/tauri.js';
import {
	addWidget,
	createItem,
	createWorkspace,
	deleteItem,
	deleteWorkspace,
	listItems,
	listWidgets,
	listWorkspaces,
} from '../helpers/ipc.js';

/**
 * Dialog pin tests (refactor 前 lock 用)。
 *
 * 引用元: `E:/tmp/arcagate-refactor-guidelines.md` §進め方ベストプラクティス
 *   - 「test 先行 (既存挙動を test で固定 → refactor → test green)」
 *
 * 対象 6 dialog の **共通挙動** (Escape close + backdrop click close + open visible) を lock。
 * BaseDialog refactor 前に main へ landed し、refactor 後 同 test が green であることを CI で確認する。
 *
 * - ItemFormDialog (Library 「アイテムを追加」)
 * - CardOverrideDialog (Library detail panel カード個別調整 ON → 個別設定を開く)
 * - WidgetSettingsDialog (Workspace widget 設定)
 * - WorkspaceRenameDialog (Workspace tab rename)
 * - WorkspaceWallpaperDialog (Workspace 壁紙)
 * - ConfirmDialog (Library item 削除確認 等、複数 caller あり)
 *
 * セットアップ: 各 test で必要 widget / item を IPC で seed、テスト後に cleanup。
 */

test.describe('Dialog pin: 共通挙動 (open / Escape close / backdrop close)', () => {
	test('ItemFormDialog: 「+ アイテムを追加」 button click で開く + Escape で閉じる', async ({
		page,
	}) => {
		// Library tab is default
		await page
			.getByRole('button', { name: /\+\s*アイテムを追加/ })
			.first()
			.click();
		const dialog = page.getByRole('dialog').filter({ hasText: 'アイテムを追加' }).first();
		await expect(dialog).toBeVisible({ timeout: 5_000 });

		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden({ timeout: 3_000 });
	});

	test('ItemFormDialog: backdrop click で閉じる', async ({ page }) => {
		await page
			.getByRole('button', { name: /\+\s*アイテムを追加/ })
			.first()
			.click();
		const dialog = page.getByRole('dialog').filter({ hasText: 'アイテムを追加' }).first();
		await expect(dialog).toBeVisible({ timeout: 5_000 });

		// Click on the dialog backdrop (outer div, not the inner content)
		const box = await dialog.boundingBox();
		if (!box) throw new Error('no bounding box');
		// Click near top-left corner (backdrop area) — viewport coords
		await page.mouse.click(10, 10);
		await expect(dialog).toBeHidden({ timeout: 3_000 });
	});

	test('CardOverrideDialog: detail panel から個別設定を開く + Escape で閉じる', async ({
		page,
	}) => {
		// seed 1 item
		const item = await createItem(page, {
			item_type: 'exe',
			label: 'TestPinItem',
			target: 'C:\\test\\pin.exe',
			aliases: [],
		});
		try {
			await page.reload();
			await page.locator('main').first().waitFor({ state: 'visible' });

			// click first library card
			await page.locator('[data-testid^="library-card-"]').first().click();
			// toggle card override on
			await page.locator('[data-testid="card-override-toggle"]').first().check();
			// open dialog
			await page.locator('[data-testid="card-override-open-dialog"]').first().click();

			const dialog = page.getByRole('dialog').filter({ hasText: 'カード個別設定' }).first();
			await expect(dialog).toBeVisible({ timeout: 5_000 });

			await page.keyboard.press('Escape');
			await expect(dialog).toBeHidden({ timeout: 3_000 });
		} finally {
			await deleteItem(page, item.id).catch(() => {});
		}
	});

	test('WidgetSettingsDialog: widget 設定を開く + Escape で閉じる', async ({ page }) => {
		// seed: ensure 1 workspace and 1 widget
		const wss = await listWorkspaces(page);
		const wsId = wss.length > 0 ? wss[0].id : (await createWorkspace(page, 'PinTestWS')).id;
		await addWidget(page, wsId, 'favorites');

		try {
			await page.reload();
			await page.locator('main').first().waitFor({ state: 'visible' });
			await page.getByRole('button', { name: 'Workspace', exact: true }).click();
			await page.waitForTimeout(800);

			// 単一 menu item の時 directly button "設定" として render される (WidgetShell)
			await page.locator('button[aria-label="設定"]').first().click();
			const dialog = page.getByRole('dialog').filter({ hasText: 'の設定' }).first();
			await expect(dialog).toBeVisible({ timeout: 5_000 });

			await page.keyboard.press('Escape');
			await expect(dialog).toBeHidden({ timeout: 3_000 });
		} finally {
			const widgets = await listWidgets(page, wsId).catch(() => []);
			for (const w of widgets) {
				await page
					.evaluate((id) => {
						const inv = (
							window as unknown as {
								__TAURI_INTERNALS__: {
									invoke: (cmd: string, args: Record<string, unknown>) => Promise<void>;
								};
							}
						).__TAURI_INTERNALS__.invoke;
						return inv('cmd_remove_widget', { id });
					}, w.id)
					.catch(() => {});
			}
		}
	});

	test('WorkspaceWallpaperDialog: 壁紙 button から開く + Escape で閉じる', async ({ page }) => {
		const wss = await listWorkspaces(page);
		if (wss.length === 0) await createWorkspace(page, 'PinTestWS');

		await page.reload();
		await page.locator('main').first().waitFor({ state: 'visible' });
		await page.getByRole('button', { name: 'Workspace', exact: true }).click();
		await page.waitForTimeout(800);

		await page.getByRole('button', { name: 'このワークスペースの壁紙を設定' }).first().click();
		const dialog = page.getByRole('dialog', { name: /の壁紙/ }).first();
		await expect(dialog).toBeVisible({ timeout: 5_000 });

		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden({ timeout: 3_000 });
	});
});
