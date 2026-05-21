import { expect, test } from '../fixtures/tauri.js';
import { addWidget, listWorkspaces } from '../helpers/ipc.js';

/**
 * 不具合修正 e2e: Workspace 画面の退行を実機 UI で guard する。
 *
 * - W-1: ページ切替タブ (PageTabBar) が 5 テーマで視認可能 (旧 bg-transparent regression guard)。
 * - W-2 (2026-05-22 更新): fit-to-content で全 widget BB 重心が canvas の **visual center**
 *        (= PageTabBar pill / floating toolbar / hint bar overlay を除いた使える領域の中央)
 *        に一致すること。 旧 fix (PR #516) は「canvas 幾何中心」 に置く設計だったが、 hint bar /
 *        floating toolbar が canvas 下端に overlay する状況で widget が視覚的に下に寄る user
 *        報告 (2026-05-22) を受け、 visual center 復活に変更。
 * - W-3 (2026-05-22 新規): PageTabBar wrapper の透明領域 (pill 外側) が widget レイヤーの
 *        pointer events を奪わない (`pointer-events: none`) こと。 旧実装は wrapper が flex
 *        item で canvas の上に高さを取り、 wrapper 透明領域が widget を覆う user 報告。
 *
 * unit 側の数値検証は src/lib/utils/zoom-math.test.ts を参照。
 */

// canvas 上端 overlay (PageTabBar pill) と下端 overlay (floating toolbar + hint bar) の reserve。
// src/lib/utils/zoom-math.ts の TOP_RESERVE / BOTTOM_RESERVE / HINT_BAR_RESERVE と一致させる。
const TOP_RESERVE = 56;
const BOTTOM_RESERVE = 72;
const HINT_BAR_RESERVE = 44;

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

	// 退行 guard: active タブの計算済み背景は透明でない (旧 bg-transparent では視認不能だった)。
	// PR #521 後の inactive タブは pill 内で transparent (text-color のみ active と区別する設計)
	// なので、 active を click してから assert する。
	await tab.click();
	const bg = await tab.evaluate((el) => getComputedStyle(el).backgroundColor);
	expect(bg).not.toBe('rgba(0, 0, 0, 0)');
	expect(bg).not.toBe('transparent');

	// 文字色も背景と別であること (contrast 退行の最低限 guard)。
	const fg = await tab.evaluate((el) => getComputedStyle(el).color);
	expect(fg).not.toBe(bg);
});

test('W-2: fit-to-content で widget 群 BB 重心が viewport visual center へ (hint bar 状態問わず)', async ({
	page,
}, testInfo) => {
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

	// after screenshot: fit-to-content で widget 群が visual center に配置された状態を artifact 保存。
	await testInfo.attach('w-2-fit-to-content-after.png', {
		body: await page.screenshot({ fullPage: false }),
		contentType: 'image/png',
	});

	const m = await page.evaluate(() => {
		const els = Array.from(document.querySelectorAll('[data-widget-id]'));
		const rects = els.map((el) => el.getBoundingClientRect());
		const minX = Math.min(...rects.map((r) => r.left));
		const minY = Math.min(...rects.map((r) => r.top));
		const maxX = Math.max(...rects.map((r) => r.right));
		const maxY = Math.max(...rects.map((r) => r.bottom));
		const canvasEl = document.querySelector('.canvas-edit-mode');
		const c = (canvasEl ?? document.body).getBoundingClientRect();
		// hint bar visibility は configStore localStorage に永続化される。 default は true。
		const hintBarKey = 'arcagate.config.hintBarVisible';
		const hintRaw = localStorage.getItem(hintBarKey);
		const hintVisible = hintRaw === null ? true : hintRaw === 'true';
		const hasHintBarDom = !!document.querySelector('[in\\:fly], .ag-glass.border-t'); // hint bar root
		return {
			count: els.length,
			bbCenterX: (minX + maxX) / 2,
			bbCenterY: (minY + maxY) / 2,
			vpLeft: c.left,
			vpTop: c.top,
			vpW: c.width,
			vpH: c.height,
			hintVisible,
			hasHintBarDom,
		};
	});

	expect(m.count).toBeGreaterThanOrEqual(5);
	// visual center: 左右は overlay 無しで幾何中心、 上下は TOP/BOTTOM/HINT overlay を除く領域の中央。
	const bottomReserve = m.hintVisible ? BOTTOM_RESERVE + HINT_BAR_RESERVE : BOTTOM_RESERVE;
	const visualCenterX = m.vpLeft + m.vpW / 2;
	const visualCenterY = m.vpTop + TOP_RESERVE + (m.vpH - TOP_RESERVE - bottomReserve) / 2;
	// 5% 許容 (rounding / scroll 微妙な差)。 10% から絞って visual center 検証を強化。
	expect(Math.abs(m.bbCenterX - visualCenterX)).toBeLessThan(m.vpW * 0.05);
	expect(Math.abs(m.bbCenterY - visualCenterY)).toBeLessThan(m.vpH * 0.05);
});

test('W-3: PageTabBar wrapper の透明領域は pointer-events を widget へ通す', async ({
	page,
}, testInfo) => {
	const ws = (await listWorkspaces(page))[0];
	expect(ws).toBeTruthy();
	// widget を 1 個追加して canvas 上端付近の pointer-events 透過確認用 (overlay 下に widget が居る状態)。
	await addWidget(page, ws.id, 'favorites');
	await openWorkspace(page);

	await page.getByTestId(`workspace-tab-${ws.id}`).click();
	await expect(page.locator('[data-widget-id]').first()).toBeVisible({ timeout: 15_000 });

	// PageTabBar wrapper (`.pointer-events-none.absolute.top-0`) の pointer-events を読む。
	// pill 外側の透明領域は wrapper の computed pointer-events: none を継承する。
	const wrapper = await page.evaluate(() => {
		const pill = document.querySelector('[data-testid^="workspace-tab-"]');
		if (!pill) return null;
		// pill の祖先で position: absolute かつ top-0 を持つ wrapper を探す。
		let el: HTMLElement | null = pill.parentElement;
		while (el) {
			const cs = getComputedStyle(el);
			if (cs.position === 'absolute' && el.classList.contains('z-20')) {
				return {
					pointerEvents: cs.pointerEvents,
					position: cs.position,
					top: cs.top,
				};
			}
			el = el.parentElement;
		}
		return null;
	});

	expect(wrapper).not.toBeNull();
	expect(wrapper?.pointerEvents).toBe('none'); // 透明領域は widget へ pass-through
	expect(wrapper?.position).toBe('absolute'); // canvas overlay として absolute
	expect(wrapper?.top).toBe('0px'); // canvas 上端から overlay

	// after screenshot: PageTabBar pill が canvas overlay として上部中央に浮かぶ状態を artifact 保存。
	await testInfo.attach('w-3-pagetab-overlay-after.png', {
		body: await page.screenshot({ fullPage: false }),
		contentType: 'image/png',
	});
});
