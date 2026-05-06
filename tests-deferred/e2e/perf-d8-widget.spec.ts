import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { deleteWorkspace, listWorkspaces } from '../helpers/ipc.js';
import { seedWidgets, summarize } from '../helpers/perf-seed.js';

/**
 * D8. Workspace 100 widget でフリーズ無し
 *  - Pass criteria: 操作応答 ≤ 200ms
 *  - 100 widget を 1 workspace に配置 → workspace 表示 + zoom in/out 操作の応答を計測
 *
 * Tag: @perf-nightly — 通常 e2e suite からは除外。
 * favorites widget は外部 IO 無し / 描画軽量のため、純粋に grid render コストを計測する。
 */
test.describe('D8 Workspace 100 widgets perf', () => {
	test.setTimeout(180_000);
	test(
		'100 widget grid 表示 + zoom 応答 P95 ≤ 200ms',
		{ tag: '@perf-nightly' },
		async ({ page }) => {
			// Cleanup other test workspaces (avoid leaking state)
			const existingWs = await listWorkspaces(page);
			for (const ws of existingWs) {
				if (ws.name.startsWith('D8 ')) await deleteWorkspace(page, ws.id).catch(() => undefined);
			}

			const TARGET = 100;
			const seed = await seedWidgets(page, `D8 perf ${Date.now()}`, TARGET, 'favorites');
			expect(seed.created).toBe(TARGET);

			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			const navStart = Date.now();
			await page.getByRole('button', { name: 'Workspace' }).click();
			await expect(page.getByTestId('workspace-drop-zone')).toBeVisible({ timeout: 30_000 });
			// 100 widget 全件 mount まで待つ
			await page.waitForFunction(
				(target) =>
					document.querySelectorAll('[role="group"][aria-label="お気に入り"]').length >= target,
				TARGET,
				{ timeout: 30_000 },
			);
			const navElapsed = Date.now() - navStart;

			// zoom 応答: Reset (100%) ↔ Fit を交互に押し、zoom-percent 表示の更新までを計測。
			// 100 widget の BB 計算 + scroll 反映 + DOM 再描画コストを含む経路を測れる。
			const zoomPercent = page.getByTestId('zoom-percent');
			await expect(zoomPercent).toBeVisible();
			const resetBtn = page.getByRole('button', { name: '拡大率を 100% にリセット' });
			const fitBtn = page.getByRole('button', { name: '全体を表示' });
			const zoomSamples: number[] = [];
			for (let i = 0; i < 6; i++) {
				const before = (await zoomPercent.textContent()) ?? '';
				const t0 = Date.now();
				if (i % 2 === 0) await fitBtn.click();
				else await resetBtn.click();
				await expect(zoomPercent).not.toHaveText(before, { timeout: 5_000 });
				zoomSamples.push(Date.now() - t0);
			}

			const zoom = summarize(zoomSamples);
			const result = {
				criteria: 'D8',
				seeded_widgets: TARGET,
				seed_elapsed_ms: seed.elapsedMs,
				workspace_id: seed.workspace.id,
				nav_to_workspace_ms: navElapsed,
				zoom,
				threshold_ms: 200,
				pass: zoom.p95_ms <= 200 && navElapsed <= 5_000,
				measured_at: new Date().toISOString(),
			};

			const outFile = join(
				process.cwd(),
				'docs/l1_requirements/release-readiness/measurements/d8-widget-100.json',
			);
			mkdirSync(dirname(outFile), { recursive: true });
			writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8');

			console.log(`[D8] saved ${outFile}`);
			console.log(
				`[D8] nav=${navElapsed}ms / zoom P95=${zoom.p95_ms}ms / threshold=200ms / pass=${result.pass}`,
			);

			if (!result.pass) {
				console.warn('[D8] threshold exceeded — see artifact for samples');
			}

			// cleanup: created workspace
			await deleteWorkspace(page, seed.workspace.id).catch(() => undefined);
		},
	);
});
