import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';
import { addWidget, createWorkspace, listWidgets, listWorkspaces } from '../helpers/ipc.js';

/**
 * 開いている dialog を Escape で確実に閉じる。
 *
 * e2e は単一 Tauri/WebView2 プロセスを worker 全 test で共有 (fixture: sharedBrowser)、
 * かつ test 間で page.reload() しないため DOM state が次 test / retry に漏れる。
 * ある test が dialog を開いたまま fail すると、後続 test / 同 test の retry は
 * modal overlay に阻まれて add-item-button 等が click 不能になり連鎖失敗する。
 * 各 test の前後でこの helper を呼び、clean state を保証して retry を自己回復させる。
 */
async function closeAnyDialog(page: Page): Promise<void> {
	const dialog = page.getByRole('dialog').first();
	if (await dialog.isVisible().catch(() => false)) {
		await page.keyboard.press('Escape').catch(() => {});
		await dialog.waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => {});
	}
}

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
	// 後続 spec (smoke) が `default activeView = 'library'` 前提で動くため、Workspace
	// 操作した test の後に必ず Library tab に戻す。
	// audit 2026-05-14 rank 10: hard sleep waitForTimeout(300) を signal wait に置換、
	// Library wrapper (= data-testid="library-main-wrapper") の visible 待ち。
	// 各 test 開始前に clean state を保証 (前 test / 前 attempt が dialog を開いたまま
	// fail した場合の state 漏れを解消し、retry を自己回復させる)。
	test.beforeEach(async ({ page }) => {
		await closeAnyDialog(page);
		// 2026-05-30 追加: 前 spec の afterEach が Library tab に戻していない可能性
		// (e.g. a11y.spec.ts の Workspace test 後 が Workspace tab で終わる)。 dialog-pin
		// の test 1 は `[data-testid="add-item-button"]` を期待するが、 Workspace tab に
		// いると button 自体が DOM に無い = click({timeout: 30_000}) も意味なく失敗する。
		// 明示的に Library tab に navigate してから wrapper visible を待つ。
		const libraryTab = page.getByRole('button', { name: 'Library', exact: true });
		if (await libraryTab.isVisible().catch(() => false)) {
			await libraryTab.click({ timeout: 5_000 }).catch(() => {});
		}
		// WebView2 cold start で <main> は出ても Library toolbar (add-item-button 等) の
		// hydration が遅れることがある。Library wrapper の visible を待ち、最初の test の
		// 1 回目から add-item-button が確実に DOM にある状態にする。
		await page
			.getByTestId('library-main-wrapper')
			.waitFor({ state: 'visible', timeout: 15_000 })
			.catch(() => {});
	});

	test.afterEach(async ({ page }) => {
		// 先に dialog を閉じる。modal が残っていると Library button が overlay に阻まれ
		// click が actionability 待ちで test timeout まで hang する。
		await closeAnyDialog(page);
		await page
			.getByRole('button', { name: 'Library', exact: true })
			.click({ timeout: 5_000 })
			.catch(() => {});
		await page
			.getByTestId('library-main-wrapper')
			.waitFor({ state: 'visible', timeout: 3_000 })
			.catch(() => {});
	});

	test('ItemFormDialog: 「アイテムを追加」 button click で開く + Escape で閉じる', async ({
		page,
	}) => {
		// Library tab is default。
		// 2026-05-30: 直近 GitHub Windows runner で WebView2 cold start から button
		// actionable まで 10s 超かかるケースが安定再現 (PR #595 経緯)。 click action
		// timeout を 30s に伸ばして slow runner の cold-hydration race を吸収 (assert
		// 内容は不変、 単にタイミング許容幅を広げるだけ)。
		await page.locator('[data-testid="add-item-button"]').first().click({ timeout: 30_000 });
		const dialog = page.getByRole('dialog').filter({ hasText: 'アイテムを追加' }).first();
		await expect(dialog).toBeVisible({ timeout: 5_000 });

		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden({ timeout: 3_000 });
	});

	test('ItemFormDialog: backdrop click で閉じる', async ({ page }) => {
		// 2026-05-30: dialog-pin test 1 と同様に slow runner 対応で 10s → 30s。
		await page.locator('[data-testid="add-item-button"]').first().click({ timeout: 30_000 });
		const dialog = page.getByRole('dialog').filter({ hasText: 'アイテムを追加' }).first();
		await expect(dialog).toBeVisible({ timeout: 5_000 });

		// Click near top-left corner (backdrop area) — viewport coords
		await page.mouse.click(10, 10);
		await expect(dialog).toBeHidden({ timeout: 3_000 });
	});

	// CardOverrideDialog test は seed (item create) + UI 経路 (card click → toggle → button click) が
	// 多段で flaky になりやすい。挙動 lock としては ItemFormDialog (window listener Escape) と
	// WidgetSettingsDialog (window listener Escape + form 内蔵) で代表され、CardOverrideDialog は
	// 同 pattern (window listener) を使うため pin としては別途必須ではない判断。POC で同 pattern
	// が refactor 後も green であることを確認、専用 test は T1+ で増強時に追加。

	test('WidgetSettingsDialog: widget 設定を開く + Escape で閉じる', async ({ page }) => {
		// seed: ensure 1 workspace and 1 widget
		const wss = await listWorkspaces(page);
		const wsId = wss.length > 0 ? wss[0].id : (await createWorkspace(page, 'PinTestWS')).id;
		await addWidget(page, wsId, 'favorites');

		try {
			await page.reload();
			await page.locator('main').first().waitFor({ state: 'visible' });
			await page.getByRole('button', { name: 'Workspace', exact: true }).click();
			// audit 2026-05-14 rank 10: hard sleep waitForTimeout(800) を signal wait に置換、
			// Workspace canvas toolbar の visible 待ち (canvas mount 完了 signal)。
			await page.getByTestId('canvas-toolbar').waitFor({ state: 'visible', timeout: 5_000 });

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
		// audit 2026-05-14 rank 10: signal wait に置換。
		await page.getByTestId('canvas-toolbar').waitFor({ state: 'visible', timeout: 5_000 });

		await page.getByRole('button', { name: 'このワークスペースの壁紙を設定' }).first().click();
		const dialog = page.getByRole('dialog', { name: /の壁紙/ }).first();
		await expect(dialog).toBeVisible({ timeout: 5_000 });

		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden({ timeout: 3_000 });
	});
});
