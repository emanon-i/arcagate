import { expect, test } from '../fixtures/tauri';
import { measureScrollFps, pageInvoke, reportBudget } from './_helpers';

/**
 * D8: Workspace 100 widget でフリーズ無し (操作応答 ≤ 200ms / frame rate ≥ 50fps)。
 *
 * 専用 workspace に 100 widget (quick_note) を配置し、 タブ遷移 = 100 widget mount の
 * 応答時間と、 canvas スクロール中の frame rate を測る。 fps が 50 未満なら T4 の
 * viewport virtualization 採用判断材料になる (virtualization-decision.md)。
 */
const WIDGET_COUNT = 100;

test(`D8 Workspace ${WIDGET_COUNT} widget perf`, async ({ page }) => {
	test.setTimeout(600_000);

	const workspaces = await pageInvoke<{ id: string; name: string }[]>(page, 'cmd_list_workspaces');
	expect(workspaces.length).toBeGreaterThan(0);
	const baseWsId = workspaces[0].id;

	// 専用 workspace を作って 100 widget を配置
	const perfWs = await pageInvoke<{ id: string }>(page, 'cmd_create_workspace', {
		name: 'perf-100-widget',
	});

	await page.evaluate(
		async ({ wsId, count }) => {
			const invoke = (
				window as unknown as {
					__TAURI_INTERNALS__: {
						invoke<R>(c: string, a?: Record<string, unknown>): Promise<R>;
					};
				}
			).__TAURI_INTERNALS__.invoke;
			const tasks: Promise<unknown>[] = [];
			for (let i = 0; i < count; i++) {
				tasks.push(invoke('cmd_add_widget', { workspaceId: wsId, widgetType: 'quick_note' }));
			}
			await Promise.all(tasks);
		},
		{ wsId: perfWs.id, count: WIDGET_COUNT },
	);

	const widgets = await pageInvoke<unknown[]>(page, 'cmd_list_widgets', {
		workspaceId: perfWs.id,
	});
	expect(widgets.length).toBe(WIDGET_COUNT);

	// frontend に workspace / widget を反映
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
	await page.getByRole('button', { name: 'Workspace', exact: true }).first().click();
	await page.waitForTimeout(500);

	const perfTab = page.locator(`[data-testid="workspace-tab-${perfWs.id}"]`);
	const baseTab = page.locator(`[data-testid="workspace-tab-${baseWsId}"]`);
	await expect(perfTab).toBeVisible({ timeout: 15_000 });

	// --- render: base workspace → 100-widget workspace 遷移で全 widget mount まで ---
	async function switchToPerfAndMeasure(): Promise<number> {
		await baseTab.click();
		await page.waitForTimeout(400);
		const t0 = Date.now();
		await perfTab.click();
		await expect
			.poll(() => page.locator('[data-widget-id]').count(), { timeout: 60_000 })
			.toBe(WIDGET_COUNT);
		return Date.now() - t0;
	}

	const renderMs = await switchToPerfAndMeasure();
	reportBudget({
		budget: 'D8',
		name: `workspace-${WIDGET_COUNT}`,
		metric: 'render-ms',
		value: renderMs,
		unit: 'ms',
		threshold: 2000,
		comparator: 'lte',
	});

	const reswitchMs = await switchToPerfAndMeasure();
	console.log(`[perf] D8 workspace render=${renderMs}ms reswitch=${reswitchMs}ms`);
	reportBudget({
		budget: 'D8',
		name: `workspace-${WIDGET_COUNT}`,
		metric: 'reswitch-ms',
		value: reswitchMs,
		unit: 'ms',
		threshold: 1000,
		comparator: 'lte',
	});

	// --- fps: canvas スクロール中の frame rate ---
	const scroll = await measureScrollFps(page, '[data-testid="workspace-drop-zone"]', 2500);
	console.log(
		`[perf] D8 workspace scroll: fps=${scroll.fps.toFixed(1)} ` +
			`frames=${scroll.frames} longTask=${scroll.longTaskMs.toFixed(1)}ms`,
	);
	reportBudget({
		budget: 'D8',
		name: `workspace-${WIDGET_COUNT}`,
		metric: 'scroll-fps',
		value: scroll.fps,
		unit: 'fps',
		threshold: 50,
		comparator: 'gte',
	});

	// --- cleanup: workspace 削除で widget も cascade ---
	await baseTab.click().catch(() => {});
	await pageInvoke(page, 'cmd_delete_workspace', { id: perfWs.id });
});
