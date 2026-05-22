import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '../fixtures/tauri';
import { clearAllItems, pageInvoke, percentile, reportBudget } from './_helpers';

/**
 * D4: アイテム起動 P95 ≤ 200ms (Arcagate 側の処理だけ計測)。
 *
 * folder item を temp dir に作り cmd_launch_item を繰り返す。 cmd_launch_item は
 * 起動履歴の記録 + target 解決を行い、 OS へ open を発行して return する (起動先 app の
 * 描画完了は待たない)。 同一 folder の繰り返し open は Explorer が既存 window を再利用
 * するため副作用は最小。 計測値 = 起動履歴 DB write + 解決 + open 発行 = D4 の対象範囲。
 */
test('D4 item 起動 P95 (Arcagate 側)', async ({ page }) => {
	test.setTimeout(300_000);

	const dir = join(process.cwd(), 'tmp', `perf-launch-${Date.now()}`);
	mkdirSync(dir, { recursive: true });

	await clearAllItems(page);
	const item = await pageInvoke<{ id: string }>(page, 'cmd_create_item', {
		input: {
			item_type: 'folder',
			label: 'perf launch target',
			target: dir,
			aliases: [],
			tag_ids: [],
		},
	});

	const samples = await page.evaluate(async (itemId) => {
		const invoke = (
			window as unknown as {
				__TAURI_INTERNALS__: {
					invoke<R>(c: string, a?: Record<string, unknown>): Promise<R>;
				};
			}
		).__TAURI_INTERNALS__.invoke;
		for (let i = 0; i < 3; i++) await invoke('cmd_launch_item', { itemId });
		const out: number[] = [];
		for (let i = 0; i < 15; i++) {
			const t0 = performance.now();
			await invoke('cmd_launch_item', { itemId });
			out.push(performance.now() - t0);
		}
		return out;
	}, item.id);

	const p95 = percentile(samples, 95);
	console.log(
		`[perf] D4 launch samples: min=${Math.min(...samples).toFixed(1)} ` +
			`p50=${percentile(samples, 50).toFixed(1)} p95=${p95.toFixed(1)}`,
	);
	reportBudget({
		budget: 'D4',
		name: 'launch-item',
		metric: 'ipc-p95',
		value: p95,
		unit: 'ms',
		threshold: 200,
		comparator: 'lte',
	});

	await pageInvoke(page, 'cmd_bulk_delete_items', { itemIds: [item.id] });
	rmSync(dir, { recursive: true, force: true });
});
