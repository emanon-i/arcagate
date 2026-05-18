import { expect, test } from '../fixtures/tauri.js';
import { addWidget, listWorkspaces } from '../helpers/ipc.js';

/**
 * 不具合修正 e2e (2026-05-19): Workspace 画面の 2 件の退行を実機 UI で guard する。
 *
 * - W-1: ページ切替タブ (PageTabBar) が 5 テーマで視認可能であること。
 *        旧 bg-transparent + border-only タブが wallpaper / 暗い背景に紛れて見えない
 *        不具合の退行 guard — 計算済み背景色が透明でないことを検証する。
 * - W-2: fit-to-content で全 widget の bounding box 重心が canvas viewport の幾何中心に
 *        一致すること。 旧 computeFitZoom は固定 gap を zoom 倍率で縮む前提で誤計算し、
 *        zoom<100% の複数 widget で BB が overflow → top-left fallback に落ちて中央に
 *        来なかった。 実 DOM の widget rect から BB を測って中心一致を検証する。
 *
 * unit 側の数値検証は src/lib/utils/zoom-math.test.ts を参照。
 */

async function openWorkspace(page: import('@playwright/test').Page): Promise<void> {
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'workspace'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
}

test('W-1: workspace ページ切替タブが視認可能 (不透明 surface)', async ({ page }) => {
	const ws = (await listWorkspaces(page))[0];
	expect(ws).toBeTruthy();
	await openWorkspace(page);

	const tab = page.getByTestId(`workspace-tab-${ws.id}`);
	await expect(tab).toBeVisible({ timeout: 15_000 });

	// 退行 guard: タブの計算済み背景は透明でない (旧 bg-transparent では視認不能だった)。
	const bg = await tab.evaluate((el) => getComputedStyle(el).backgroundColor);
	expect(bg).not.toBe('rgba(0, 0, 0, 0)');
	expect(bg).not.toBe('transparent');

	// 文字色も背景と別であること (contrast 退行の最低限 guard)。
	const fg = await tab.evaluate((el) => getComputedStyle(el).color);
	expect(fg).not.toBe(bg);
});

test('W-2: fit-to-content で widget 群 BB 重心が viewport 幾何中心へ', async ({ page }) => {
	const ws = (await listWorkspaces(page))[0];
	expect(ws).toBeTruthy();
	// 5 widget を追加 (fit-all なので全 widget が BB に含まれる)。
	for (let i = 0; i < 5; i++) {
		await addWidget(page, ws.id, 'favorites');
	}
	await openWorkspace(page);

	// 対象 workspace を active にしてから widget の描画を待つ。
	await page.getByTestId(`workspace-tab-${ws.id}`).click();
	await expect(page.locator('[data-widget-id]').first()).toBeVisible({ timeout: 15_000 });

	const canvas = page.locator('.canvas-edit-mode');
	await expect(canvas).toBeVisible({ timeout: 15_000 });

	// canvas-toolbar 末尾の button = fit-to-content (Maximize2)。
	await page.getByTestId('canvas-toolbar').locator('button').last().click();
	// rAF 経由の scroll 適用を待つ。
	await page.waitForTimeout(400);

	const m = await page.evaluate(() => {
		const els = Array.from(document.querySelectorAll('[data-widget-id]'));
		const rects = els.map((el) => el.getBoundingClientRect());
		const minX = Math.min(...rects.map((r) => r.left));
		const minY = Math.min(...rects.map((r) => r.top));
		const maxX = Math.max(...rects.map((r) => r.right));
		const maxY = Math.max(...rects.map((r) => r.bottom));
		const canvasEl = document.querySelector('.canvas-edit-mode');
		const c = (canvasEl ?? document.body).getBoundingClientRect();
		return {
			count: els.length,
			bbCenterX: (minX + maxX) / 2,
			bbCenterY: (minY + maxY) / 2,
			vpCenterX: c.left + c.width / 2,
			vpCenterY: c.top + c.height / 2,
			vpW: c.width,
			vpH: c.height,
		};
	});

	expect(m.count).toBeGreaterThanOrEqual(5);
	// BB 重心が canvas viewport の幾何中心に一致 (rounding / chrome 等の許容で viewport の 10%)。
	expect(Math.abs(m.bbCenterX - m.vpCenterX)).toBeLessThan(m.vpW * 0.1);
	expect(Math.abs(m.bbCenterY - m.vpCenterY)).toBeLessThan(m.vpH * 0.1);
});
