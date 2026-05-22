import { expect, test } from '../fixtures/tauri';
import { percentile, reportBudget } from './_helpers';

/**
 * D3: パレット表示 P95 ≤ 120ms (vision.md D3 / ux-standards §1)。
 *
 * palette window は起動時に生成され hidden で常駐する。 production の「表示」は
 * window.show() だけだが、 計測 harness では OS hotkey を駆動できない (e2e は
 * ARCAGATE_SKIP_HOTKEY)。 そこで palette route を reload して mount → first paint
 * までを navigation timing (first-contentful-paint) で測る。 これは webview を
 * 再構築する保守的な上界であり、 ≤ 120ms を満たせば実 hotkey 表示は確実に速い。
 */
test('D3 palette 表示 P95', async ({ page }) => {
	test.setTimeout(300_000);

	const ctx = page.context();
	let palette = ctx.pages().find((p) => p.url().endsWith('/palette'));
	for (let i = 0; !palette && i < 20; i++) {
		await new Promise((r) => setTimeout(r, 500));
		palette = ctx.pages().find((p) => p.url().endsWith('/palette'));
	}
	expect(palette, 'palette window page must be attached via CDP').toBeTruthy();
	if (!palette) return;

	const samples: number[] = [];
	const N = 20;
	for (let i = 0; i < N; i++) {
		await palette.reload();
		await palette.waitForLoadState('domcontentloaded');
		await palette.locator('input').first().waitFor({ state: 'visible', timeout: 15_000 });
		const fcp = await palette.evaluate(() => {
			const entry = performance.getEntriesByName('first-contentful-paint')[0];
			return entry ? entry.startTime : performance.now();
		});
		samples.push(fcp);
	}

	const p95 = percentile(samples, 95);
	console.log(
		`[perf] D3 palette samples: min=${Math.min(...samples).toFixed(1)} ` +
			`p50=${percentile(samples, 50).toFixed(1)} p95=${p95.toFixed(1)}`,
	);
	reportBudget({
		budget: 'D3',
		name: 'palette-open',
		metric: 'fcp-p95',
		value: p95,
		unit: 'ms',
		threshold: 120,
		comparator: 'lte',
	});
});
