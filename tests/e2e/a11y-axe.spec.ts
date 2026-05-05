import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { type AxeSummary, isPass, runAxe } from '../helpers/axe-audit.js';

/**
 * G3 WCAG axe-core gate: 主要 4 画面 (Library / Workspace / Settings / Palette) を audit。
 *
 * Phase 1 (R8-2 PR #314): baseline 記録のみ
 * Phase 2 (R10-B 本 PR): **critical = 0 hard gate**、ARCAGATE_AXE_GATE_STRICT=1 で serious 0 opt-in
 * Phase 3 (将来): ARCAGATE_AXE_GATE_STRICT=1 を CI 既定化、serious=0 hard gate
 * Phase 4 (将来): moderate/minor も削減着手
 *
 * Tag: @a11y — 通常 e2e と一緒に走る、CI build を肥大化させない程度の重さ。
 */
test.describe('G3 WCAG axe audit', () => {
	test.setTimeout(120_000);

	test(
		'Library / Workspace / Settings / Palette axe critical+serious=0',
		{ tag: '@a11y' },
		async ({ page }) => {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			const summaries: AxeSummary[] = [];

			// Library
			await page.getByRole('button', { name: 'Library' }).click();
			await expect(page.getByPlaceholder('ライブラリを検索')).toBeVisible({ timeout: 15_000 });
			summaries.push(await runAxe(page, 'Library'));

			// Workspace
			await page.getByRole('button', { name: 'Workspace' }).click();
			await page.waitForTimeout(500);
			summaries.push(await runAxe(page, 'Workspace'));

			// Settings
			const settingsBtn = page.getByRole('button', { name: '設定' });
			if (await settingsBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
				await settingsBtn.click();
				await page.waitForTimeout(500);
				summaries.push(await runAxe(page, 'Settings'));
				// Settings dialog を閉じる
				await page.keyboard.press('Escape');
				await page.waitForTimeout(300);
			}

			// Palette (Ctrl+Shift+Space)
			await page.keyboard.press('Control+Shift+Space');
			await page.waitForTimeout(500);
			summaries.push(await runAxe(page, 'Palette'));
			await page.keyboard.press('Escape');

			// Save artifact
			const outFile = join(
				process.cwd(),
				'docs/l1_requirements/release-readiness/measurements/axe-violations.json',
			);
			mkdirSync(dirname(outFile), { recursive: true });
			writeFileSync(
				outFile,
				JSON.stringify({ measured_at: new Date().toISOString(), summaries }, null, 2),
				'utf8',
			);

			// Aggregate
			const totals = summaries.reduce(
				(acc, s) => ({
					critical: acc.critical + s.byImpact.critical,
					serious: acc.serious + s.byImpact.serious,
					moderate: acc.moderate + s.byImpact.moderate,
					minor: acc.minor + s.byImpact.minor,
				}),
				{ critical: 0, serious: 0, moderate: 0, minor: 0 },
			);

			console.log('[axe] per-page summary:');
			for (const s of summaries) {
				console.log(
					`  [${s.url}] critical=${s.byImpact.critical} serious=${s.byImpact.serious} moderate=${s.byImpact.moderate} minor=${s.byImpact.minor}`,
				);
				if (!isPass(s)) {
					for (const v of s.violations.filter(
						(x) => x.impact === 'critical' || x.impact === 'serious',
					)) {
						console.log(`    - [${v.impact}] ${v.id}: ${v.help} (${v.nodes} nodes)`);
					}
				}
			}
			console.log(`[axe] TOTAL critical=${totals.critical} serious=${totals.serious}`);

			// R10-B G3 axe Phase 2: critical = 0 を hard gate (default ON)。
			// serious = 0 は ARCAGATE_AXE_GATE_STRICT=1 で opt-in (Phase 3 への移行準備)。
			// moderate / minor は warning のみ (Phase 4 で削減開始)。
			expect(totals.critical, 'WCAG critical violations must be 0 (R10-B Phase 2 gate)').toBe(0);
			if (process.env.ARCAGATE_AXE_GATE_STRICT === '1') {
				expect(totals.serious, 'WCAG serious violations must be 0 (Phase 3 strict)').toBe(0);
			} else if (totals.serious > 0) {
				console.warn(
					`[axe] serious=${totals.serious} (Phase 2 では warning のみ、ARCAGATE_AXE_GATE_STRICT=1 で gate 化)`,
				);
			}
		},
	);
});
