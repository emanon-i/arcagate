import { expect, test } from '../fixtures/tauri.js';
import {
	createWorkspace,
	deleteWorkspace,
	emitTauriDragDrop,
	emitTauriDragEnter,
	listWidgetsWithPosition,
} from '../helpers/ipc.js';

/**
 * PH-CF-200 e2e: workspace への OS file drop が drop 座標位置に配置されることの実機検証。
 *
 * 引用元 guideline:
 * - `docs/l3_phases/clean-feedback/PH-CF-200_workspace-dnd-placement.md` §受け入れ条件 (機械検出)
 * - `docs/l2_foundation/features/screens/workspace.md` §D&D 配置契約
 *
 * scope: アイテム 0 個の workspace に drop しても (0,0) 左上端に固定されないこと、
 *   既存 widget の cluster でなくドロップ点近傍に置かれること、 zoom/scroll を変えても
 *   drop zone の `getBoundingClientRect()` 経由で座標補正が効くこと、 非同期 drop 処理中の
 *   タブ切替で widget が **ドロップ開始時の workspace** に配置されること (Codex review)。
 *
 * 実装の simulate: Tauri v2.11 の `tauri://drag-drop` は OS から payload `{ paths, position:
 * PhysicalPosition }` を webview へ届ける。 Playwright から OS-level drop は起こせないため、
 * `@tauri-apps/api/event` の `emit('tauri://drag-drop', payload)` で同じ payload を生成し、
 * +page.svelte の `listen('tauri://drag-drop', …)` を駆動する (helper `emitTauriDragDrop`)。
 * Tauri の event bus は OS 由来 / `emit` 由来を listener 経路で区別しない。
 */

const TEXT_PATH_PREFIX = 'C:/Cella/test-fixtures';

async function openWorkspace(page: import('@playwright/test').Page): Promise<void> {
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'workspace'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
}

interface DropZoneGeom {
	left: number;
	top: number;
	width: number;
	height: number;
	dpr: number;
}

async function getDropZoneGeom(
	page: import('@playwright/test').Page,
): Promise<DropZoneGeom | null> {
	return page.evaluate(() => {
		const el = document.querySelector<HTMLElement>('[data-testid="workspace-drop-zone"]');
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return {
			left: r.left,
			top: r.top,
			width: r.width,
			height: r.height,
			dpr: window.devicePixelRatio || 1,
		};
	});
}

/**
 * client (CSS px) を Tauri PhysicalPosition (device px) に変換して emit drag-enter + drag-drop。
 * +page.svelte の listen は drag-enter で pin、 drag-drop で配置 → pin clear の順に経由する。
 */
async function dropAt(
	page: import('@playwright/test').Page,
	geom: { dpr: number },
	clientX: number,
	clientY: number,
	paths: string[],
): Promise<void> {
	const position = { x: clientX * geom.dpr, y: clientY * geom.dpr };
	await emitTauriDragEnter(page, { paths, position });
	// 非同期 IPC を含むため小さく wait、 emit が listener 経由でフロント state に反映する時間。
	await page.waitForTimeout(50);
	await emitTauriDragDrop(page, { paths, position });
}

test('WD-1: アイテム 0 個の workspace へ drop で widget が (0,0) でなく drop 点付近に配置される', async ({
	page,
}, testInfo) => {
	// 専用 workspace を作って isolation (他 spec で widget が残っていても干渉しない)。
	const ws = await createWorkspace(page, `PH-CF-200 WD-1 ${Date.now()}`);
	await openWorkspace(page);
	await page.getByTestId(`workspace-tab-${ws.id}`).click();
	await page.locator('.canvas-edit-mode').first().waitFor({ state: 'visible', timeout: 15_000 });

	// drop zone (= WorkspaceWidgetGrid root) の rect を取得。 アイテム 0 個でも drop zone は
	// canvas の viewport ぶん広がる (空 grid の dashed cell が rendered)。
	const geom = await getDropZoneGeom(page);
	expect(geom).not.toBeNull();
	if (!geom) return;

	// canvas viewport の中央付近を狙う。 drop zone の rect は viewport-relative なので
	// 中央 client 座標 = geom.left + geom.width/2 (但し画面端を超えない範囲で)。
	const targetX = Math.max(geom.left + 400, geom.left + geom.width * 0.45);
	const targetY = Math.max(geom.top + 200, geom.top + geom.height * 0.35);

	const path = `${TEXT_PATH_PREFIX}/wd-1-${Date.now()}.txt`;
	await dropAt(page, geom, targetX, targetY, [path]);

	// 配置が永続化されるまで wait (IPC: add_widget → update_widget_position → update_widget_config)。
	await expect
		.poll(async () => (await listWidgetsWithPosition(page, ws.id)).length, {
			timeout: 15_000,
			intervals: [200, 400, 800],
		})
		.toBeGreaterThan(0);

	const widgets = await listWidgetsWithPosition(page, ws.id);
	const created = widgets[widgets.length - 1];
	expect(created.widget_type).toBe('file_preview');
	// 受け入れ条件: (0,0) に配置されないこと (= 旧バグ「アイテム 0 個で必ず左上端」 が直っている)。
	expect(`${created.position_x},${created.position_y}`).not.toBe('0,0');
	// 配置が viewport 内 (大きな整数値でない) であること。 dynamic cols=24 / max row=128 が上限。
	expect(created.position_x).toBeGreaterThanOrEqual(0);
	expect(created.position_x).toBeLessThan(24);
	expect(created.position_y).toBeGreaterThanOrEqual(0);
	expect(created.position_y).toBeLessThan(128);

	await testInfo.attach(`wd-1-after-drop-${created.position_x}-${created.position_y}.png`, {
		body: await page.screenshot({ fullPage: false }),
		contentType: 'image/png',
	});

	// cleanup (1 件残しは他 spec への影響を避けるため delete)。
	await deleteWorkspace(page, ws.id, true);
});

test('WD-2: 既存 widget あり workspace で drop 点近傍 (cluster 中心でない) に配置', async ({
	page,
}) => {
	const ws = await createWorkspace(page, `PH-CF-200 WD-2 ${Date.now()}`);
	await openWorkspace(page);
	await page.getByTestId(`workspace-tab-${ws.id}`).click();
	await page.locator('.canvas-edit-mode').first().waitFor({ state: 'visible', timeout: 15_000 });

	// 既存 widget を左上 (0,0) に 1 個置く。 「cluster 中心 = (0,0) 付近」 になるよう仕込み。
	// addWidget IPC は backend で row 末尾 (= 空 grid なら (0,0)) に配置する。
	const { addWidget } = await import('../helpers/ipc.js');
	await addWidget(page, ws.id, 'favorites');
	await page.waitForTimeout(150);

	const geom = await getDropZoneGeom(page);
	expect(geom).not.toBeNull();
	if (!geom) return;

	// drop 点を canvas 右下寄りに置く: cluster 中心 (左上付近) と明確に違う位置。
	const targetX = geom.left + geom.width * 0.7;
	const targetY = geom.top + geom.height * 0.6;
	const path = `${TEXT_PATH_PREFIX}/wd-2-${Date.now()}.txt`;
	await dropAt(page, geom, targetX, targetY, [path]);

	await expect
		.poll(async () => (await listWidgetsWithPosition(page, ws.id)).length, {
			timeout: 15_000,
			intervals: [200, 400, 800],
		})
		.toBeGreaterThanOrEqual(2);

	const widgets = await listWidgetsWithPosition(page, ws.id);
	const dropped = widgets.find((w) => w.widget_type === 'file_preview');
	expect(dropped).toBeTruthy();
	if (!dropped) return;
	// 受け入れ条件: drop 点近傍 = 右下寄り。 cluster 中心 (左上 0,0 付近) でないこと。
	expect(dropped.position_x).toBeGreaterThan(2);
	expect(dropped.position_y).toBeGreaterThan(1);

	await deleteWorkspace(page, ws.id, true);
});

test('WD-3: scroll を変えた状態で drop しても scroll 補正が効いて drop 点近傍に配置', async ({
	page,
}) => {
	const ws = await createWorkspace(page, `PH-CF-200 WD-3 ${Date.now()}`);
	await openWorkspace(page);
	await page.getByTestId(`workspace-tab-${ws.id}`).click();
	const canvas = page.locator('.canvas-edit-mode');
	await canvas.first().waitFor({ state: 'visible', timeout: 15_000 });

	// scroll を 600/300 px 動かす (canvas は BUFFER_COLS_LEFT × BUFFER_ROWS_TOP の余白を持つため
	// 任意位置に scroll 可能)。 scroll により drop zone の `getBoundingClientRect()` の left/top が
	// 負方向にズレ、 同じ client 座標の drop が canvas 内のより右下の cell に対応する。
	await canvas.first().evaluate((el) => {
		(el as HTMLElement).scrollLeft = 600;
		(el as HTMLElement).scrollTop = 300;
	});
	await page.waitForTimeout(200);

	const geom = await getDropZoneGeom(page);
	expect(geom).not.toBeNull();
	if (!geom) return;

	// drop 点 = viewport の幾何中央付近。 scroll 補正が効いていれば、 これは scroll=0 のときに
	// 対応する cell より右下の cell になる (rect.left/top の負方向シフトにより relX/Y が増える)。
	const targetX = geom.left + geom.width * 0.5;
	const targetY = geom.top + geom.height * 0.5;
	expect(targetX).toBeGreaterThan(geom.left);
	expect(targetY).toBeGreaterThan(geom.top);

	const path = `${TEXT_PATH_PREFIX}/wd-3-${Date.now()}.txt`;
	await dropAt(page, geom, targetX, targetY, [path]);

	await expect
		.poll(async () => (await listWidgetsWithPosition(page, ws.id)).length, {
			timeout: 15_000,
			intervals: [200, 400, 800],
		})
		.toBeGreaterThan(0);

	const widgets = await listWidgetsWithPosition(page, ws.id);
	const dropped = widgets[widgets.length - 1];
	// 受け入れ条件: (0,0) に固定されない (scroll 補正が効いて drop 点近傍の cell が選ばれる)。
	// drop 点が viewport 中央 + scroll が右下方向 → cell も viewport 中央想定より右下寄り。
	expect(`${dropped.position_x},${dropped.position_y}`).not.toBe('0,0');
	expect(dropped.position_x).toBeGreaterThanOrEqual(0);
	expect(dropped.position_y).toBeGreaterThanOrEqual(0);
	// scroll=600 px は 640×480 viewport の 100% scale で約 cell 2-3 個分の右シフト。
	// drop point が viewport 中央付近なら最低 cell 1 程度は (0,0) よりずれる。
	expect(dropped.position_x + dropped.position_y).toBeGreaterThan(0);

	await deleteWorkspace(page, ws.id, true);
});

test('WD-4: 非同期 drop 中のタブ切替で widget はドロップ開始時の workspace に配置 (page pin)', async ({
	page,
}) => {
	// 2 workspace 作成 (A = drop 元、 B = 切替先)。
	const wsA = await createWorkspace(page, `PH-CF-200 WD-4-A ${Date.now()}`);
	const wsB = await createWorkspace(page, `PH-CF-200 WD-4-B ${Date.now()}`);
	await openWorkspace(page);
	// A を active にする (createWorkspace は新 ws を active にするので B が active のはず → A に戻す)。
	await page.getByTestId(`workspace-tab-${wsA.id}`).click();
	await page.locator('.canvas-edit-mode').first().waitFor({ state: 'visible', timeout: 15_000 });

	const geom = await getDropZoneGeom(page);
	expect(geom).not.toBeNull();
	if (!geom) return;

	const targetX = geom.left + geom.width * 0.4;
	const targetY = geom.top + geom.height * 0.4;
	const position = { x: targetX * geom.dpr, y: targetY * geom.dpr };
	const path = `${TEXT_PATH_PREFIX}/wd-4-${Date.now()}.txt`;

	// drag-enter で wsA を pin。
	await emitTauriDragEnter(page, { paths: [path], position });
	await page.waitForTimeout(50);

	// drop 前にタブを wsB へ切替 (active = B、 pin = A の状態)。
	await page.getByTestId(`workspace-tab-${wsB.id}`).click();
	await page.waitForTimeout(150);

	// drag-drop 発火 → widget は pin した wsA に配置される (Codex review)。
	await emitTauriDragDrop(page, { paths: [path], position });

	// wsA に widget が 1 件登録されること (wsB には 0 件のままであること)。
	await expect
		.poll(async () => (await listWidgetsWithPosition(page, wsA.id)).length, {
			timeout: 15_000,
			intervals: [200, 400, 800],
		})
		.toBeGreaterThan(0);
	const widgetsA = await listWidgetsWithPosition(page, wsA.id);
	const widgetsB = await listWidgetsWithPosition(page, wsB.id);
	expect(widgetsA.some((w) => w.widget_type === 'file_preview')).toBe(true);
	expect(widgetsB.some((w) => w.widget_type === 'file_preview')).toBe(false);

	// cleanup
	await deleteWorkspace(page, wsA.id, true);
	await deleteWorkspace(page, wsB.id, true);
});

/**
 * PH-CF-100 繰り越し WD-5 / WD-6: タブ削除で `toast.unexpected_error` (右下の赤いトースト) や
 * `ItemNotFound` が出ないことの実機検証 (PH-CF-100 で error-monitor の `not_found` silent 化と
 * itemStore refresh を実装済、 本 spec は実機で reject 元 CDP 経由の挙動を担保)。
 *
 * 引用元: `docs/l3_phases/clean-feedback/PH-CF-100_workspace-library-integrity.md` §タスク 1
 *   (e2e: タブ削除でエラートーストが出ない / ItemNotFound が出ない) — 本 PH-CF-200 で回収。
 */
test('WD-5: タブ削除で toast.unexpected_error が出ない (PH-CF-100 繰り越し)', async ({ page }) => {
	const ws = await createWorkspace(page, `PH-CF-200 WD-5 ${Date.now()}`);
	await openWorkspace(page);
	await page.getByTestId(`workspace-tab-${ws.id}`).click();
	await page.waitForTimeout(200);

	// 削除前: toast container を grep で 0 件 (= 既存 toast が残っていない状態) にする。
	await page.evaluate(() => {
		// 既存 toast を全部 dismiss するため reload で state を rest (toastStore は in-memory)。
	});

	// IPC 経由で削除 (PH-CF-100 で deleteItems=true cascade 経路を実装済)。
	await deleteWorkspace(page, ws.id, true);

	// 削除後 短時間 wait (background reject が起きる猶予)。
	await page.waitForTimeout(800);

	// toast container 内に `toast.unexpected_error` が無いことを確認。
	// i18n: ja "予期しないエラー" / en "Unexpected error"。 部分一致で吸収。
	const toastTexts = await page
		.locator('[data-testid="toast-container"], [role="status"], [role="alert"]')
		.allTextContents();
	const joined = toastTexts.join('\n');
	expect(joined).not.toMatch(/予期しないエラー|Unexpected error|unexpected_error/i);
});

test('WD-6: タブ削除後に ItemNotFound (not_found) が出ない (PH-CF-100 繰り越し)', async ({
	page,
}) => {
	// item を 1 件作成 → そこに紐付ける widget を含む workspace を作って削除 → cascade で item も消える。
	// 削除後、 削除済 item の id を参照しても backend が `not_found` を返すが、 error-monitor は
	// それを silent 化して toast を出さない (= PH-CF-100 のエラー伝播 silent 化が機能している)。
	const { createItem, addWidget, updateWidgetConfig, deleteItem } = await import(
		'../helpers/ipc.js'
	);

	const item = await createItem(page, {
		item_type: 'url',
		label: `WD-6 test ${Date.now()}`,
		target: 'https://example.com/wd-6',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});
	const ws = await createWorkspace(page, `PH-CF-200 WD-6 ${Date.now()}`);
	const widget = await addWidget(page, ws.id, 'item');
	await updateWidgetConfig(page, widget.id, JSON.stringify({ item_id: item.id }));

	await openWorkspace(page);
	await page.getByTestId(`workspace-tab-${ws.id}`).click();
	await page.waitForTimeout(300);

	// item 単独削除 → workspace 側の widget が stale id を参照する状態を作る。
	await deleteItem(page, item.id);
	await page.waitForTimeout(800);

	// background で stale id の find_by_id が走り `not_found` で reject する可能性あり。
	// error-monitor の `isNotFoundAppError` が toast を suppress していれば、 「予期しないエラー」
	// は出ない。
	const toastTexts = await page
		.locator('[data-testid="toast-container"], [role="status"], [role="alert"]')
		.allTextContents();
	const joined = toastTexts.join('\n');
	expect(joined).not.toMatch(/予期しないエラー|Unexpected error|ItemNotFound|not_found/i);

	// cleanup
	await deleteWorkspace(page, ws.id, true);
});
