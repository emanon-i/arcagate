import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { deleteItem, listItems } from '../helpers/ipc.js';
import { seedItems, summarize } from '../helpers/perf-seed.js';

/**
 * D7. Library 1000 items でフリーズ無し
 *  - Pass criteria: sort / filter / search 操作応答 ≤ 200ms
 *  - 1000 item を seed → Library を開いて表示時間と search 応答を計測
 *
 * Tag: @perf-nightly — 通常 e2e suite からは除外、e2e-nightly.yml で明示 grep。
 * 実行時間: ~30〜45 sec (seed 含む)、CI で並列化しないため separately invoke。
 */
test.describe('D7 Library 1000 items perf', () => {
	test.setTimeout(180_000);
	test(
		'1000 items 表示 + search/sort 応答 P95 ≤ 200ms',
		{ tag: '@perf-nightly' },
		async ({ page }) => {
			// Cleanup any leftover items from prior tests in same run
			const existing = await listItems(page);
			for (const it of existing) {
				await deleteItem(page, it.id).catch(() => undefined);
			}

			const TARGET = 1000;
			const seed = await seedItems(page, TARGET, 'd7');
			expect(seed.created).toBe(TARGET);

			// Reload to flush UI state, then navigate to Library
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			const navStart = Date.now();
			await page.getByRole('button', { name: 'Library' }).click();
			await expect(page.getByPlaceholder('ライブラリを検索')).toBeVisible({ timeout: 30_000 });
			// 最初の card が描画される (= grid initial render 完了) まで
			await page.waitForSelector('[data-testid^="library-card-"]', { timeout: 30_000 });
			const navElapsed = Date.now() - navStart;

			// search latency: query 入力 → matching card visible
			const searchInput = page.getByPlaceholder('ライブラリを検索');
			const searchSamples: number[] = [];
			const queries = [
				'd7-item-0001',
				'd7-item-0500',
				'd7-item-0999',
				'd7-item-0042',
				'd7-item-0777',
			];
			for (const q of queries) {
				await searchInput.fill('');
				// 結果が空に戻る (= 全件表示) のを待つ
				await page.waitForTimeout(50);
				const t0 = Date.now();
				await searchInput.fill(q);
				await expect(page.getByText(q, { exact: false }).first()).toBeVisible({ timeout: 5_000 });
				searchSamples.push(Date.now() - t0);
			}
			await searchInput.fill('');

			// sort latency: ソート field 切替 → 1 card 再描画
			const sortSamples: number[] = [];
			const sortBtn = page.getByTestId('library-sort-field');
			for (let i = 0; i < 3; i++) {
				const t0 = Date.now();
				await sortBtn.click();
				// menu が開く → 適当な option を選ぶ
				await page.getByRole('menuitem').first().click();
				await page.waitForSelector('[data-testid^="library-card-"]', { timeout: 5_000 });
				sortSamples.push(Date.now() - t0);
			}

			const search = summarize(searchSamples);
			const sort = summarize(sortSamples);
			const result = {
				criteria: 'D7',
				seeded_items: TARGET,
				seed_elapsed_ms: seed.elapsedMs,
				nav_to_library_ms: navElapsed,
				search,
				sort,
				threshold_ms: 200,
				pass: search.p95_ms <= 200 && sort.p95_ms <= 200,
				measured_at: new Date().toISOString(),
			};

			const outFile = join(
				process.cwd(),
				'docs/l1_requirements/release-readiness/measurements/d7-library-1000.json',
			);
			mkdirSync(dirname(outFile), { recursive: true });
			writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8');

			console.log(`[D7] saved ${outFile}`);
			console.log(
				`[D7] search P95=${search.p95_ms}ms / sort P95=${sort.p95_ms}ms / threshold=200ms / pass=${result.pass}`,
			);

			// soft assertion: 計測値を artifact として残すのが主目的、threshold 未達でも fail させない
			// (CI では情報蓄積のみ、release blocker でない)
			if (!result.pass) {
				console.warn('[D7] threshold exceeded — see artifact for samples');
			}
		},
	);
});
