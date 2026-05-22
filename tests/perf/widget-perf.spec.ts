import { expect, test } from '../fixtures/tauri';
import { addWidget, deleteWidget, waitForHomeWorkspace } from '../helpers/ipc';
import { pageInvoke } from './_helpers';

/**
 * PH-PQ-600 A4: widget 性能予算 計測 spec。
 *
 * 受け入れ条件 (PH-PQ-600 §受け入れ条件 A4):
 * - 全 widget で mount → first paint ≤ 100ms
 * - 設定変更 → 反映 ≤ 50ms (instant-feedback rule)
 * - 違反 0
 *
 * 計測方式:
 * - mountPaint: 専用 workspace への tab 切替を空 canvas で計測し固定オーバーヘッド
 *   (tab + canvas init + loadWidgets IPC) の baseline を取る。各 widget は「widget 1 個
 *   込みの tab 切替」 − baseline で marginal な mount → first paint を出す。
 * - configReflect: routine widget の設定 dialog で label 変更 → 保存 click から widget
 *   DOM が反映されるまでを in-page MutationObserver で計測 (modal close animation 非汚染)。
 *
 * このファイルは perf-gate 専用 dir (tests/perf) に置き `pnpm test:perf`
 * (playwright.perf.config.ts) で実行。CI は perf workflow (nightly + main push)。
 */

const WIDGET_TYPES = [
	'favorites',
	'recent',
	'projects',
	'item',
	'stats',
	'quick_note',
	'exe_folder',
	'daily_task',
	'snippet',
	'clipboard_history',
	'file_search',
	'system_monitor',
	'image_scrap',
	'file_preview',
	'script_folder',
	'routine',
] as const;

const MOUNT_BUDGET_MS = 100;
const REFLECT_BUDGET_MS = 50;

async function openWorkspaceView(page: import('@playwright/test').Page): Promise<void> {
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'workspace'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
}

test('PH-PQ-600 A4: 全 16 widget の mount → first paint ≤ 100ms', async ({ page }) => {
	test.setTimeout(300_000);

	await openWorkspaceView(page);
	const baseWs = await waitForHomeWorkspace(page);
	const perfWs = await pageInvoke<{ id: string }>(page, 'cmd_create_workspace', {
		name: 'pq600-perf',
	});

	// 全 tab を frontend に反映。
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });

	const baseTab = page.locator(`[data-testid="workspace-tab-${baseWs.id}"]`);
	const perfTab = page.locator(`[data-testid="workspace-tab-${perfWs.id}"]`);
	await expect(perfTab).toBeVisible({ timeout: 15_000 });

	/** base → perf tab 切替で untilSelector が出るまでの ms。複数回の最小値を取る。 */
	async function measureSwitch(untilSelector: string, samples: number): Promise<number> {
		let best = Number.POSITIVE_INFINITY;
		for (let s = 0; s < samples; s++) {
			await baseTab.click();
			await page.waitForTimeout(300);
			const t0 = Date.now();
			await perfTab.click();
			await page.locator(untilSelector).first().waitFor({ state: 'visible', timeout: 30_000 });
			best = Math.min(best, Date.now() - t0);
		}
		return best;
	}

	// 空 canvas の tab 切替コスト = mount 計測の固定オーバーヘッド (tab + canvas init + IPC)。
	// widget 個別の mount → first paint はこの baseline を差し引いた marginal cost。
	const emptyBaselineMs = await measureSwitch('[data-testid="workspace-drop-zone"]', 3);

	const results: Record<string, number> = {};

	for (const widgetType of WIDGET_TYPES) {
		// 専用 workspace に widget を 1 個だけ置く。
		const widget = await addWidget(page, perfWs.id, widgetType);
		const totalMs = await measureSwitch('[data-widget-id]', 2);
		// widget 単体の mount → first paint = (widget 込み) − (空 canvas baseline)。
		results[widgetType] = Math.max(0, totalMs - emptyBaselineMs);
		await deleteWidget(page, widget.id);
	}

	console.log(`[PH-PQ-600 A4] 空 canvas tab 切替 baseline: ${emptyBaselineMs}ms`);

	console.log('\n========== PH-PQ-600 A4: widget mount → first paint ==========');
	console.table(
		Object.fromEntries(
			Object.entries(results).map(([k, v]) => [
				k,
				{ 'mount→paint (ms)': v, 判定: v <= MOUNT_BUDGET_MS ? 'OK' : 'NG' },
			]),
		),
	);
	console.log('==============================================================\n');

	await baseTab.click().catch(() => {});
	await pageInvoke(page, 'cmd_delete_workspace', { id: perfWs.id });

	for (const [type, ms] of Object.entries(results)) {
		expect(ms, `${type}: mount → first paint`).toBeLessThanOrEqual(MOUNT_BUDGET_MS);
	}
});

test('PH-PQ-600 A4: routine widget の 設定変更 → 反映 ≤ 50ms', async ({ page }) => {
	test.setTimeout(120_000);

	await openWorkspaceView(page);
	const ws = await waitForHomeWorkspace(page);
	const widget = await addWidget(page, ws.id, 'routine');
	try {
		await openWorkspaceView(page);
		await page.locator(`[data-testid="workspace-tab-${ws.id}"]`).click();
		const widgetEl = page.locator(`[data-widget-id="${widget.id}"]`);
		await expect(widgetEl).toBeVisible({ timeout: 15_000 });

		// 設定 dialog を開く (header の歯車 = aria-label「設定」)。
		await widgetEl.getByRole('button', { name: '設定', exact: true }).click();
		const labelInput = page.locator('#ws-routine-label');
		await expect(labelInput).toBeVisible({ timeout: 10_000 });
		await labelInput.fill('反映計測ルーティン');

		// 保存 click → widget header title が反映されるまでを in-page で計測。
		// MutationObserver で widget DOM の変化を直接観測する (modal close animation や
		// overlay visibility に汚染されない純粋な「設定変更 → 反映」 = instant-feedback)。
		const reflectMs = await page.evaluate(
			({ widgetId, newLabel }) =>
				new Promise<number>((resolve, reject) => {
					const widgetEl = document.querySelector(`[data-widget-id="${widgetId}"]`);
					const saveBtn = [...document.querySelectorAll('button')].find(
						(b) => b.getAttribute('type') === 'submit' && b.textContent?.trim() === '保存',
					);
					if (!widgetEl || !saveBtn) {
						reject(new Error('widget または 保存 button が見つからない'));
						return;
					}
					const obs = new MutationObserver(() => {
						if (widgetEl.textContent?.includes(newLabel)) {
							obs.disconnect();
							resolve(performance.now() - t0);
						}
					});
					obs.observe(widgetEl, { childList: true, subtree: true, characterData: true });
					const t0 = performance.now();
					(saveBtn as HTMLButtonElement).click();
				}),
			{ widgetId: widget.id, newLabel: '反映計測ルーティン' },
		);

		console.log(`\n[PH-PQ-600 A4] routine 設定変更 → 反映: ${reflectMs.toFixed(1)}ms\n`);
		expect(reflectMs, '設定変更 → 反映 (instant-feedback)').toBeLessThanOrEqual(REFLECT_BUDGET_MS);
	} finally {
		await deleteWidget(page, widget.id).catch(() => {});
	}
});
