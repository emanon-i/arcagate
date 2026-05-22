import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { expect, test } from '../../fixtures/tauri.js';
import {
	createItem,
	deleteItem,
	markOnboardingComplete,
	markSetupComplete,
	resetFirstRun,
} from '../../helpers/ipc.js';

/**
 * PH-PQ-700 T7: EN locale で WCAG 2.2 AA 自動検証 (axe-core)。
 *
 * a11y.spec.ts (ja) と同じく全 screen を axe 検査するが、 globalSetup が
 * ARCAGATE_E2E_LOCALE=en で英語 UI を強制した状態で走る。 EN release で a11y violation
 * (lang 属性 / role name / 翻訳漏れによる空 name 等) が無いことを CI gate にする。
 *
 * 引用元: docs/l3_phases/paid-quality/PH-PQ-700_i18n-and-global.md T7
 *         PH-PQ-300 T4 (axe-core gate) / WCAG 2.2: https://www.w3.org/TR/WCAG22/
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
// color-contrast は a11y.spec.ts (ja) と同じく theme token 起因のため本 gate から除外。
const DEFERRED_RULES = ['color-contrast'];

async function expectNoA11yViolations(
	page: Page,
	testInfo: TestInfo,
	label: string,
	include?: string,
): Promise<void> {
	let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS).disableRules(DEFERRED_RULES);
	if (include) builder = builder.include(include);
	const results = await builder.analyze();

	if (results.violations.length > 0) {
		const report = results.violations
			.map((v) => {
				const nodes = v.nodes
					.slice(0, 5)
					.map((n) => `      - ${n.target.join(' ')}\n        ${n.failureSummary ?? ''}`)
					.join('\n');
				return `  [${v.impact ?? 'n/a'}] ${v.id}: ${v.help}\n${nodes}`;
			})
			.join('\n\n');
		await testInfo.attach(`axe-en-violations-${label}`, {
			body: JSON.stringify(results.violations, null, 2),
			contentType: 'application/json',
		});
		expect(results.violations, `WCAG 2.2 AA violations on ${label} (EN):\n${report}`).toEqual([]);
	}
}

test.describe('WCAG 2.2 AA — axe-core (EN locale)', () => {
	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => {});
		await page.keyboard.press('Escape').catch(() => {});
		await markSetupComplete(page).catch(() => {});
		await markOnboardingComplete(page).catch(() => {});
		const libraryTab = page.getByRole('button', { name: 'Library', exact: true });
		if (await libraryTab.isVisible().catch(() => false)) {
			await libraryTab.click().catch(() => {});
		}
	});

	test('Library — empty (EN)', async ({ page }, testInfo) => {
		await expect(page.getByRole('region', { name: 'Library' })).toBeVisible({ timeout: 15_000 });
		await expectNoA11yViolations(page, testInfo, 'library-empty');
	});

	test('Library — populated (EN)', async ({ page }, testInfo) => {
		const created: string[] = [];
		for (let i = 0; i < 6; i++) {
			const item = await createItem(page, {
				item_type: 'url',
				label: `a11y en probe ${i}`,
				target: `https://example.com/en-${i}`,
				aliases: [],
				tag_ids: [],
			});
			created.push(item.id);
		}
		try {
			await page.reload();
			await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
			await expect(page.getByRole('region', { name: 'Library' })).toBeVisible({ timeout: 15_000 });
			await expectNoA11yViolations(page, testInfo, 'library-populated');
		} finally {
			for (const id of created) await deleteItem(page, id).catch(() => {});
		}
	});

	test('Workspace — empty (EN)', async ({ page }, testInfo) => {
		await page.getByRole('button', { name: 'Workspace', exact: true }).click();
		await expect(page.getByTestId('canvas-toolbar')).toBeVisible({ timeout: 15_000 });
		await expectNoA11yViolations(page, testInfo, 'workspace-empty');
	});

	for (const cat of ['general', 'library', 'appearance', 'data', 'about'] as const) {
		test(`Settings — ${cat} pane (EN)`, async ({ page }, testInfo) => {
			await page.getByRole('button', { name: 'Settings', exact: true }).click();
			// tablist の aria-label は EN value "Settings category"
			await expect(page.getByRole('tablist', { name: 'Settings category' })).toBeVisible({
				timeout: 15_000,
			});
			// tab は #tab-{cat} で locale 非依存に選択
			await page.locator(`#tab-${cat}`).click();
			await page.locator(`#settings-panel-${cat}`).waitFor({ state: 'visible', timeout: 10_000 });
			await expectNoA11yViolations(page, testInfo, `settings-${cat}`);
		});
	}

	test('Palette — initial (EN)', async ({ page }, testInfo) => {
		const palettePage = page
			.context()
			.pages()
			.find((p) => /\/palette/.test(p.url()));
		test.skip(!palettePage, 'palette window page not attached over CDP');
		if (!palettePage) return;
		await palettePage.waitForLoadState('domcontentloaded');
		await expectNoA11yViolations(palettePage, testInfo, 'palette-initial');
	});

	test('SetupWizard — all steps (EN)', async ({ page }, testInfo) => {
		await resetFirstRun(page);
		await page.reload();
		await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
		const wizard = page.getByTestId('setup-wizard');
		await expect(wizard).toBeVisible({ timeout: 15_000 });

		await expectNoA11yViolations(page, testInfo, 'setup-welcome', '[data-testid="setup-wizard"]');
		await page.getByTestId('setup-welcome-next').click();
		await expectNoA11yViolations(page, testInfo, 'setup-hotkey', '[data-testid="setup-wizard"]');
		await page.getByTestId('setup-hotkey-next').click();
		await expectNoA11yViolations(page, testInfo, 'setup-autostart', '[data-testid="setup-wizard"]');
		await page.getByTestId('setup-finish').click();
		await expect(wizard).toBeHidden({ timeout: 10_000 });

		await markSetupComplete(page);
		await markOnboardingComplete(page);
		await page.reload();
		await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
	});
});
