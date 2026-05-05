import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { type AxeSummary, isPass, runAxe } from '../helpers/axe-audit.js';

/**
 * R8-2 G3 WCAG axe-core measurement: 主要 4 画面 (Library / Workspace / Settings / Palette)
 * を axe-core で audit。
 *
 * Phase 1 (本 PR): baseline 記録のみ。critical / serious 件数を JSON artifact + log。
 *   ARCAGATE_AXE_GATE=1 が設定されている時のみ critical+serious=0 を assert する。
 * Phase 2 (後続 PR): baseline の violations を fix → ARCAGATE_AXE_GATE=1 を CI 既定化 → 真の gate 化。
 *
 * Tag: @a11y — 通常 e2e と一緒に走る (PR で baseline 記録)、CI build を肥大化させない程度の重さ。
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

			// Gate (opt-in): ARCAGATE_AXE_GATE=1 の時のみ critical+serious=0 を assert。
			// 既定は baseline 記録のみで pass、CI gate 化は後続 PR で違反 fix 後に切替。
			if (process.env.ARCAGATE_AXE_GATE === '1') {
				expect(totals.critical, 'WCAG critical violations must be 0').toBe(0);
				expect(totals.serious, 'WCAG serious violations must be 0').toBe(0);
			} else if (totals.critical > 0 || totals.serious > 0) {
				console.warn(
					`[axe] baseline contains critical=${totals.critical} serious=${totals.serious} — gate disabled (set ARCAGATE_AXE_GATE=1 to enforce)`,
				);
			}
		},
	);
});
