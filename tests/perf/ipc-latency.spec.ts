import { test } from '../fixtures/tauri';
import { percentile, reportBudget, seedItems } from './_helpers';

/**
 * D9: 主要 IPC 応答時間 P95 ≤ 100ms (1000 batch metadata は ≤ 500ms)。
 *
 * 1000 item を seed した状態で、 主要 read-only command を 100 回ずつ叩き P95 を測る。
 * 計測対象は副作用の無い command に限定 (launch / spawn 系は launch-latency.spec へ)。
 */

interface IpcCase {
	cmd: string;
	args?: Record<string, unknown>;
	threshold: number;
}

test('D9 IPC P95 latency gate', async ({ page }) => {
	test.setTimeout(600_000);

	// --- 1000 item seed (実スケールで IPC を測る) ---
	const existing = await page.evaluate(() =>
		(
			window as unknown as {
				__TAURI_INTERNALS__: { invoke<R>(c: string): Promise<R> };
			}
		).__TAURI_INTERNALS__.invoke<{ id: string }[]>('cmd_list_items'),
	);
	if (existing.length > 0) {
		await page.evaluate(
			(ids) =>
				(
					window as unknown as {
						__TAURI_INTERNALS__: {
							invoke<R>(c: string, a: Record<string, unknown>): Promise<R>;
						};
					}
				).__TAURI_INTERNALS__.invoke('cmd_bulk_delete_items', { itemIds: ids }),
			existing.map((i) => i.id),
		);
	}
	const ids = await seedItems(page, 1000, ['']);
	const workspaces = await page.evaluate(() =>
		(
			window as unknown as {
				__TAURI_INTERNALS__: { invoke<R>(c: string): Promise<R> };
			}
		).__TAURI_INTERNALS__.invoke<{ id: string }[]>('cmd_list_workspaces'),
	);
	const wsId = workspaces[0]?.id ?? '';
	const sampleId = ids[0];

	// 主要 read-only / 無引数 command 20 件。 batch metadata のみ閾値 500ms、 他は 100ms。
	const cases: IpcCase[] = [
		{ cmd: 'cmd_list_items', threshold: 100 },
		{ cmd: 'cmd_get_items_metadata_batch', args: { ids }, threshold: 500 },
		{ cmd: 'cmd_search_items', args: { query: 'item 0042' }, threshold: 100 },
		{ cmd: 'cmd_get_library_stats', threshold: 100 },
		{ cmd: 'cmd_get_tags', threshold: 100 },
		{ cmd: 'cmd_get_tag_counts', threshold: 100 },
		{ cmd: 'cmd_count_hidden_items', threshold: 100 },
		{ cmd: 'cmd_list_workspaces', threshold: 100 },
		{ cmd: 'cmd_list_widgets', args: { workspaceId: wsId }, threshold: 100 },
		{ cmd: 'cmd_get_item_tags', args: { itemId: sampleId }, threshold: 100 },
		{ cmd: 'cmd_list_recent', args: { limit: 20 }, threshold: 100 },
		{ cmd: 'cmd_list_frequent', args: { limit: 20 }, threshold: 100 },
		{ cmd: 'cmd_list_themes', threshold: 100 },
		{ cmd: 'cmd_get_active_theme_mode', threshold: 100 },
		{ cmd: 'cmd_get_hotkey', threshold: 100 },
		{ cmd: 'cmd_get_autostart', threshold: 100 },
		{ cmd: 'cmd_is_setup_complete', threshold: 100 },
		{ cmd: 'cmd_is_onboarding_complete', threshold: 100 },
		{ cmd: 'cmd_get_watched_paths', threshold: 100 },
		{ cmd: 'cmd_list_openers', threshold: 100 },
	];

	for (const c of cases) {
		const samples = await page.evaluate(
			async ({ cmd, args }) => {
				const invoke = (
					window as unknown as {
						__TAURI_INTERNALS__: {
							invoke<R>(c: string, a?: Record<string, unknown>): Promise<R>;
						};
					}
				).__TAURI_INTERNALS__.invoke;
				// warm-up 5 回 (cold cache を除外)
				for (let i = 0; i < 5; i++) await invoke(cmd, args);
				const out: number[] = [];
				for (let i = 0; i < 100; i++) {
					const t0 = performance.now();
					await invoke(cmd, args);
					out.push(performance.now() - t0);
				}
				return out;
			},
			{ cmd: c.cmd, args: c.args ?? {} },
		);
		const p95 = percentile(samples, 95);
		reportBudget({
			budget: 'D9',
			name: c.cmd,
			metric: 'p95',
			value: p95,
			unit: 'ms',
			threshold: c.threshold,
			comparator: 'lte',
		});
	}

	// cleanup
	await page.evaluate(
		(itemIds) =>
			(
				window as unknown as {
					__TAURI_INTERNALS__: {
						invoke<R>(c: string, a: Record<string, unknown>): Promise<R>;
					};
				}
			).__TAURI_INTERNALS__.invoke('cmd_bulk_delete_items', { itemIds }),
		ids,
	);
});
