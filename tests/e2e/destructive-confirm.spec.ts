import { expect, test } from '../fixtures/tauri.js';
import {
	addWidget,
	createItem,
	createWorkspace,
	deleteItem,
	deleteWorkspace,
	listItems,
	listWidgetsWithPosition,
	listWorkspaces,
	updateWidgetConfig,
} from '../helpers/ipc.js';

/**
 * PH-CF-300 e2e: 破壊的操作の確認パターン統一の実機検証。
 *
 * 引用元 guideline:
 * - `docs/l3_phases/clean-feedback/PH-CF-300_destructive-action-confirm.md` §受け入れ条件 (機械検出)
 * - `docs/l2_foundation/features/screens/library.md` §破壊的操作の確認契約
 * - `docs/l2_foundation/features/screens/workspace.md` §破壊的操作の確認契約
 *
 * scope:
 * - DC-1 (C1): Library カードの右クリックメニューに「削除」 が表示され、 クリックで item が
 *   消え undo snackbar が出る
 * - DC-2 (E3): タブ × クリックで `window.confirm` でなく専用 modal が開く + 「アイテムも消す」
 *   チェックボックスが存在
 * - DC-3 (E6 OFF): チェックボックス OFF でタブ削除 → item は Library に残る
 * - DC-4 (E6 ON): チェックボックス ON でタブ削除 → 他 workspace 非参照の item が消える
 * - DC-5 (dead-surface): `WorkspaceDeleteConfirmDialog` が実 import されている (modal DOM が
 *   実際に mount される) ことを DOM 経由で確認
 *
 * `window.confirm` の使用 0 は `scripts/audit-window-confirm.sh` (= `pnpm audit:all`) で
 * 担当。 本 spec は user flow の振る舞いを検証する。
 */

async function openLibrary(page: import('@playwright/test').Page): Promise<void> {
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'library'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
}

async function openWorkspace(page: import('@playwright/test').Page): Promise<void> {
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'workspace'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
	// workspace の widget 描画 + tab bar の hover-listener 設定が完了するまで小さく settle。
	// reload 直後に getByTestId(`workspace-tab-…-delete`).click(force) を打つと WebView2 が
	// race して "Target page closed" を返す flake が再現する (2026-05-23 DC-2 観測)。
	await page.waitForTimeout(300);
}

test('DC-1: Library カード右クリック → 「削除」 が出て、 クリックで item 消滅 + undo snackbar', async ({
	page,
}, testInfo) => {
	const label = `PH-CF-300 DC-1 ${Date.now()}`;
	const item = await createItem(page, {
		item_type: 'exe',
		label,
		target: 'C:/Windows/System32/notepad.exe',
		aliases: [],
		tag_ids: [],
	});

	try {
		await openLibrary(page);

		const card = page.getByTestId(`library-card-${item.id}`);
		await card.waitFor({ state: 'visible', timeout: 15_000 });

		// scrollIntoView でカードを viewport 内 (上寄り) に置き、 menu が下に展開できる余地を作る。
		await card.scrollIntoViewIfNeeded();
		// 右クリックで card context menu を開く。 Playwright の `click({button:'right'})` は
		// OS が pointer の mousedown + contextmenu を fire するため `oncontextmenu` listener が
		// 確実に発火する (dispatchEvent では clientX/Y が一部 webview で無視され menu が viewport
		// 外に開く flake が起きた、 2026-05-23 PH-CF-300 e2e 設定)。 position は card 左上寄り
		// で menu の下方展開を確保。
		await card.click({ button: 'right', position: { x: 8, y: 8 } });
		const deleteMenuItem = page.getByTestId('library-context-delete');
		await expect(deleteMenuItem).toBeVisible();
		// opener row は非同期で追加され menu height を伸ばすため、 高さ安定を 1 tick 待つ
		// (ContextMenu は ResizeObserver で adjustedY を追従、 100ms 程度で settle する)。
		await page.waitForTimeout(200);

		await testInfo.attach('dc-1-context-menu.png', {
			body: await page.screenshot({ fullPage: false }),
			contentType: 'image/png',
		});

		// 念のため menu item を viewport 内に scroll → force click で actionability 検査を bypass。
		await deleteMenuItem.scrollIntoViewIfNeeded();
		await deleteMenuItem.click({ force: true });

		// undo snackbar が表示される (deleteWithUndo 経路) → 破壊的操作の undo-toast 契約。
		await expect(page.getByTestId('library-undo-snackbar')).toBeVisible({ timeout: 10_000 });

		// item は DB から消えている (右クリックで undo していない限り)。
		await expect
			.poll(async () => (await listItems(page)).some((i) => i.id === item.id), {
				timeout: 5_000,
				intervals: [200, 400, 800],
			})
			.toBe(false);
	} finally {
		// 既に DB から削除済の場合は no-op だが best-effort で clean。
		try {
			await deleteItem(page, item.id);
		} catch {
			// already deleted by the flow
		}
	}
});

test('DC-2: タブ × クリックで専用 modal + 「アイテムも消す」 チェックボックス表示 + dead-surface 解消', async ({
	page,
}, testInfo) => {
	const ws = await createWorkspace(page, `PH-CF-300 DC-2 ${Date.now()}`);
	try {
		await openWorkspace(page);

		const tab = page.getByTestId(`workspace-tab-${ws.id}`);
		await tab.waitFor({ state: 'visible', timeout: 15_000 });

		// hover で × button を出してから click。
		await tab.hover();
		const deleteBtn = page.getByTestId(`workspace-tab-${ws.id}-delete`);
		await deleteBtn.click({ force: true });

		// 専用 modal (WorkspaceDeleteConfirmDialog → ConfirmDialog 経由) が表示される。
		// = window.confirm でない (= bits-ui Dialog の dialog role が存在)。
		const dialog = page.locator('[role="dialog"]');
		await expect(dialog).toBeVisible({ timeout: 5_000 });

		// E6: 「アイテムも消す」 チェックボックス (default = OFF)。
		const checkbox = page.getByTestId('confirm-dialog-checkbox');
		await expect(checkbox).toBeVisible();
		await expect(checkbox).not.toBeChecked();

		// 影響範囲文言 (widget 数) も提示されている。
		await expect(page.getByTestId('confirm-dialog-extra-note')).toBeVisible();

		await testInfo.attach('dc-2-tab-delete-modal.png', {
			body: await page.screenshot({ fullPage: false }),
			contentType: 'image/png',
		});

		// cancel して clean state へ戻す。 dialog 内 scope で button を取って ambiguity を避ける。
		await dialog.getByRole('button', { name: /^(Cancel|キャンセル)$/ }).click();
		await expect(dialog).not.toBeVisible({ timeout: 5_000 });
	} finally {
		if (!page.isClosed()) {
			try {
				const remaining = (await listWorkspaces(page)).find((w) => w.id === ws.id);
				if (remaining) {
					await deleteWorkspace(page, ws.id, false);
				}
			} catch {
				// page closed during teardown — best-effort cleanup
			}
		}
	}
});

test('DC-3: チェックボックス OFF でタブ削除 → item は Library に残る', async ({ page }) => {
	const ws = await createWorkspace(page, `PH-CF-300 DC-3 ${Date.now()}`);
	const item = await createItem(page, {
		item_type: 'exe',
		label: `PH-CF-300 DC-3 ${Date.now()}`,
		target: 'C:/Windows/System32/notepad.exe',
		aliases: [],
		tag_ids: [],
	});

	try {
		await openWorkspace(page);
		// 本 workspace を選択して item widget を 1 個追加 (ws.id への紐付け)。
		await page.getByTestId(`workspace-tab-${ws.id}`).click();
		await page.locator('.canvas-edit-mode').first().waitFor({ state: 'visible', timeout: 15_000 });

		// item widget を IPC で追加 + config (item_ids) を後付け。 cmd_add_widget は config を
		// 取らない signature のため、 add → update の 2 step。
		const widget = await addWidget(page, ws.id, 'item');
		await updateWidgetConfig(page, widget.id, JSON.stringify({ item_ids: [item.id] }));

		await expect
			.poll(async () => (await listWidgetsWithPosition(page, ws.id)).length, { timeout: 10_000 })
			.toBeGreaterThan(0);

		// タブ削除 modal を開いてチェックボックス OFF のまま削除。
		const tab = page.getByTestId(`workspace-tab-${ws.id}`);
		await tab.hover();
		await page.getByTestId(`workspace-tab-${ws.id}-delete`).click({ force: true });
		await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
		const checkbox = page.getByTestId('confirm-dialog-checkbox');
		await expect(checkbox).not.toBeChecked();
		// destructive primary button (= 削除) を押下。 cancel button と区別するため
		// "destructive" variant の Button (text="削除"/"Delete") を最後の match で取る。
		await page
			.locator('[role="dialog"]')
			.getByRole('button', { name: /^(削除|Delete)$/ })
			.click();
		await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });

		// workspace は消え、 item は Library に残る (チェック OFF = item 残す)。
		await expect
			.poll(async () => (await listWorkspaces(page)).some((w) => w.id === ws.id), {
				timeout: 10_000,
			})
			.toBe(false);
		const items = await listItems(page);
		expect(items.some((i) => i.id === item.id)).toBe(true);
	} finally {
		if (!page.isClosed()) {
			try {
				await deleteItem(page, item.id);
			} catch {
				// best-effort
			}
			try {
				const remaining = (await listWorkspaces(page)).find((w) => w.id === ws.id);
				if (remaining) {
					await deleteWorkspace(page, ws.id, false);
				}
			} catch {
				// best-effort
			}
		}
	}
});

test('DC-4: チェックボックス ON でタブ削除 → 他 workspace 非参照の **監視** item は消える (手動 item は残す)', async ({
	page,
}) => {
	const ws = await createWorkspace(page, `PH-CF-300 DC-4 ${Date.now()}`);

	let cleanupItem = true;
	let item: { id: string } | null = null;
	try {
		await openWorkspace(page);
		await page.getByTestId(`workspace-tab-${ws.id}`).click();
		await page.locator('.canvas-edit-mode').first().waitFor({ state: 'visible', timeout: 15_000 });

		// 本 workspace に widget を追加 → その widget が auto-register したように見せかけて
		// 監視 item を作る (source_widget_id を埋める = アイテムライフサイクル契約の監視 item)。
		// 確定原則: 手動 item (source NULL) は workspace 削除で消さない、 監視 item のみ消える。
		const widget = await addWidget(page, ws.id, 'item');
		item = await createItem(page, {
			item_type: 'folder',
			label: `PH-CF-300 DC-4 ${Date.now()}`,
			target: 'C:/Windows/System32/__lifecycle_test__',
			aliases: [],
			tag_ids: [],
			source_widget_id: widget.id,
			source_entry_key: 'C:/Windows/System32/__lifecycle_test__',
		});
		await updateWidgetConfig(page, widget.id, JSON.stringify({ item_ids: [item.id] }));

		await expect
			.poll(async () => (await listWidgetsWithPosition(page, ws.id)).length, { timeout: 10_000 })
			.toBeGreaterThan(0);

		const tab = page.getByTestId(`workspace-tab-${ws.id}`);
		await tab.hover();
		await page.getByTestId(`workspace-tab-${ws.id}-delete`).click({ force: true });
		await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });

		// E6 ON: チェックボックスを check して削除確定。
		await page.getByTestId('confirm-dialog-checkbox').check();
		await expect(page.getByTestId('confirm-dialog-checkbox')).toBeChecked();
		await page
			.locator('[role="dialog"]')
			.getByRole('button', { name: /^(削除|Delete)$/ })
			.click();
		await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });

		// workspace 消滅 + item も消える (他 workspace 非参照 → cascade で削除)。
		await expect
			.poll(async () => (await listWorkspaces(page)).some((w) => w.id === ws.id), {
				timeout: 10_000,
			})
			.toBe(false);
		// この行までで `item` は必ず assign されている (型 narrowing 用 local 変数化)。
		const created = item!;
		await expect
			.poll(async () => (await listItems(page)).some((i) => i.id === created.id), {
				timeout: 10_000,
			})
			.toBe(false);

		// flow が item を消した → cleanup の deleteItem は不要。
		cleanupItem = false;
	} finally {
		if (!page.isClosed()) {
			if (cleanupItem && item) {
				try {
					await deleteItem(page, item.id);
				} catch {
					// best-effort
				}
			}
			try {
				const remaining = (await listWorkspaces(page)).find((w) => w.id === ws.id);
				if (remaining) {
					await deleteWorkspace(page, ws.id, false);
				}
			} catch {
				// best-effort
			}
		}
	}
});
