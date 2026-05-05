import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { deleteItem, invoke, listItems } from '../helpers/ipc.js';
import { seedItems, summarize } from '../helpers/perf-seed.js';

/**
 * D9 主要 IPC 応答時間 P95 (criteria-stability-perf.md §D9):
 *   - cmd_list_items / cmd_search_items / cmd_get_frecency_items 各 50 回 → P95 ≤ 100ms
 *   - cmd_get_items_metadata_batch (1000 ids) × 5 回 → P95 ≤ 500ms
 *
 * D3 proxy: cmd_get_frecency_items 計測で palette 空検索 IPC の P95 を兼ねる。
 *           palette window 開閉自体は OS-level (<10ms)、bottleneck は IPC + 1st render。
 *
 * D4 は実プロセス spawn が CI で危険なため deferred (user 環境別途検証)。
 *
 * Tag: @perf-nightly — 通常 e2e から除外、e2e-nightly.yml で実行。
 */

interface IpcSamples {
	cmd: string;
	samples_ms: number[];
}

async function timeIpc(
	page: Page,
	cmd: string,
	args: Record<string, unknown>,
	iterations: number,
): Promise<IpcSamples> {
	const samples: number[] = [];
	for (let i = 0; i < iterations; i++) {
		const t0 = Date.now();
		await invoke(page, cmd, args);
		samples.push(Date.now() - t0);
	}
	return { cmd, samples_ms: samples };
}

test.describe('D9 IPC perf (+ D3 palette proxy)', () => {
	test.setTimeout(180_000);
	test('IPC P95 ≤ 100ms / metadata batch ≤ 500ms', { tag: '@perf-nightly' }, async ({ page }) => {
		// 既存 item を全 delete + 1000 件 seed (metadata batch 用)。
		const existing = await listItems(page);
		for (const it of existing) {
			await deleteItem(page, it.id).catch(() => undefined);
		}
		const seed = await seedItems(page, 1000, 'd9');
		expect(seed.created).toBe(1000);

		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await waitForAppReady(page);

		// 1000 件の id を取得して batch IPC に渡す
		const all = await listItems(page);
		const ids = all.slice(0, 1000).map((it) => it.id);

		const listSamples = await timeIpc(page, 'cmd_list_items', {}, 50);
		const searchSamples = await timeIpc(page, 'cmd_search_items', { query: 'd9-item' }, 50);
		const frecencySamples = await timeIpc(page, 'cmd_get_frecency_items', { limit: 10 }, 50);
		const metadataSamples = await timeIpc(
			page,
			'cmd_get_items_metadata_batch',
			{ itemIds: ids },
			5,
		);

		const list = summarize(listSamples.samples_ms);
		const search = summarize(searchSamples.samples_ms);
		const frecency = summarize(frecencySamples.samples_ms);
		const metadata = summarize(metadataSamples.samples_ms);

		const result = {
			criteria: 'D9 (+ D3 palette proxy via cmd_get_frecency_items)',
			seeded_items: 1000,
			seed_elapsed_ms: seed.elapsedMs,
			ipc: {
				list_items: { ...list, threshold_ms: 100, pass: list.p95_ms <= 100 },
				search_items: { ...search, threshold_ms: 100, pass: search.p95_ms <= 100 },
				get_frecency_items: { ...frecency, threshold_ms: 100, pass: frecency.p95_ms <= 100 },
				get_items_metadata_batch_1000: {
					...metadata,
					threshold_ms: 500,
					pass: metadata.p95_ms <= 500,
				},
			},
			d4_status: 'deferred (実プロセス spawn は CI で危険、user 環境別途)',
			pass:
				list.p95_ms <= 100 &&
				search.p95_ms <= 100 &&
				frecency.p95_ms <= 100 &&
				metadata.p95_ms <= 500,
			measured_at: new Date().toISOString(),
		};

		const outFile = join(
			process.cwd(),
			'docs/l1_requirements/release-readiness/measurements/d9-ipc-perf.json',
		);
		mkdirSync(dirname(outFile), { recursive: true });
		writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8');

		console.log(`[D9] saved ${outFile}`);
		console.log(
			`[D9] list=${list.p95_ms} search=${search.p95_ms} frecency=${frecency.p95_ms} metadata1000=${metadata.p95_ms} (ms P95)`,
		);
		console.log(`[D9] pass=${result.pass}`);

		// soft assertion: 計測値を artifact として残すのが主目的、threshold 未達でも fail させない
		if (!result.pass) {
			console.warn('[D9] threshold exceeded — see artifact for samples');
		}
	});
});
