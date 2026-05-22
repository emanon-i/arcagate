import { expect, test } from '../fixtures/tauri';
import {
	buildIconPool,
	cleanupIconPool,
	clearAllItems,
	measureScrollFps,
	pageInvoke,
	reportBudget,
	seedItems,
} from './_helpers';

/**
 * D7: Library 1000 items でフリーズ無し (scroll ≥ 50fps / sort ≤ 200ms / filter ≤ 200ms)。
 *
 * 規模 N は ARCAGATE_PERF_LIBRARY_N で上書き可能 (default 1000)。
 * perf.yml nightly は 5000 / 10000 の stress run も回す (T2)。
 *
 * 計測:
 *  1. nav-render: Workspace → Library 遷移で N card が DOM に揃うまでの wall time
 *  2. scroll-fps: main-wrapper を 2.5s スクロールしながらの実 frame rate
 *  3. sort: library-sort-order クリック → 先頭 card の並び替え完了まで
 *  4. filter: 検索 query 入力 → filteredItems 反映まで (150ms debounce 込み)
 */
const N = Number.parseInt(process.env.ARCAGATE_PERF_LIBRARY_N ?? '1000', 10);

test(`D7 Library ${N} items perf`, async ({ page }) => {
	test.setTimeout(900_000);

	const iconPool = buildIconPool(Math.min(N, 200));

	await clearAllItems(page);
	const ids = await seedItems(page, N, iconPool);
	expect(ids.length).toBe(N);

	// itemStore を最新化 (+page.svelte init effect が再 fetch)
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });

	// Workspace タブへ退避 (Library を未描画状態にしてから遷移を測る)
	await page.getByRole('button', { name: 'Workspace', exact: true }).first().click();
	await page.waitForTimeout(500);

	// --- 1. nav-render: Library 遷移で N card 描画完了まで ---
	const navStart = Date.now();
	await page.getByRole('button', { name: 'Library', exact: true }).first().click();
	await page
		.locator('[data-testid^="library-card-"]')
		.first()
		.waitFor({ state: 'visible', timeout: 120_000 });
	await expect
		.poll(() => page.locator('[data-testid^="library-card-"]').count(), { timeout: 120_000 })
		.toBe(N);
	const navRenderMs = Date.now() - navStart;
	reportBudget({
		budget: 'D7',
		name: `library-${N}`,
		metric: 'nav-render-ms',
		value: navRenderMs,
		unit: 'ms',
		threshold: N <= 1000 ? 2000 : 6000,
		comparator: 'lte',
	});

	// --- 2. scroll-fps ---
	const scroll = await measureScrollFps(page, '[data-testid="library-main-wrapper"]', 2500);
	console.log(
		`[perf] D7 library-${N} scroll: fps=${scroll.fps.toFixed(1)} ` +
			`frames=${scroll.frames} longTask=${scroll.longTaskMs.toFixed(1)}ms`,
	);
	reportBudget({
		budget: 'D7',
		name: `library-${N}`,
		metric: 'scroll-fps',
		value: scroll.fps,
		unit: 'fps',
		threshold: N <= 1000 ? 50 : 45,
		comparator: 'gte',
	});

	// スクロール位置を先頭に戻す
	await page.evaluate(() => {
		const el = document.querySelector('[data-testid="library-main-wrapper"]');
		if (el) el.scrollTop = 0;
	});
	await page.waitForTimeout(300);

	// --- 3. sort: 並び順トグル → 先頭 card 変化まで (ms 精度) ---
	const sortMs = await page.evaluate(async () => {
		const firstId = () =>
			document.querySelector('[data-testid^="library-card-"]')?.getAttribute('data-testid') ?? null;
		const before = firstId();
		const btn = document.querySelector('[data-testid="library-sort-order"]') as HTMLElement | null;
		if (!btn) return -1;
		const t0 = performance.now();
		btn.click();
		while (firstId() === before && performance.now() - t0 < 5000) {
			await new Promise((r) => requestAnimationFrame(() => r(null)));
		}
		return performance.now() - t0;
	});
	expect(sortMs, 'library-sort-order button must exist').toBeGreaterThanOrEqual(0);
	reportBudget({
		budget: 'D7',
		name: `library-${N}`,
		metric: 'sort-ms',
		value: sortMs,
		unit: 'ms',
		threshold: 200,
		comparator: 'lte',
	});

	// --- 4. filter: 検索入力 → filteredItems 反映まで (150ms debounce 込み) ---
	const filterMs = await page.evaluate(
		async (query) => {
			const countCards = () => document.querySelectorAll('[data-testid^="library-card-"]').length;
			const input = document.querySelector(
				'input[placeholder="ライブラリを検索"]',
			) as HTMLInputElement | null;
			if (!input) return -1;
			const before = countCards();
			const setter = Object.getOwnPropertyDescriptor(
				window.HTMLInputElement.prototype,
				'value',
			)?.set;
			setter?.call(input, query);
			input.dispatchEvent(new Event('input', { bubbles: true }));
			const t0 = performance.now();
			while (countCards() === before && performance.now() - t0 < 5000) {
				await new Promise((r) => requestAnimationFrame(() => r(null)));
			}
			return performance.now() - t0;
		},
		`perf scale item ${String(Math.min(42, N - 1)).padStart(5, '0')}`,
	);
	expect(filterMs, 'library search input must exist').toBeGreaterThanOrEqual(0);
	reportBudget({
		budget: 'D7',
		name: `library-${N}`,
		metric: 'filter-ms',
		value: filterMs,
		unit: 'ms',
		threshold: 200,
		comparator: 'lte',
	});

	// --- cleanup ---
	await pageInvoke(page, 'cmd_bulk_delete_items', { itemIds: ids });
	cleanupIconPool();
});
