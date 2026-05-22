import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { expect, test } from '../fixtures/tauri.js';
import {
	addWidget,
	createItem,
	deleteItem,
	deleteWidget,
	listWorkspaces,
	markOnboardingComplete,
	markSetupComplete,
	resetFirstRun,
} from '../helpers/ipc.js';

/**
 * PH-PQ-300 T4: WCAG 2.2 AA 自動検証 (axe-core)。
 *
 * 全 5 screen (Library / Workspace / Palette / Settings / SetupWizard) を代表 state ごとに
 * @axe-core/playwright で機械検査し、 違反 0 を CI gate にする。 axe-core は WCAG 違反の
 * ~57% を自動検出 (Deque) — manual review を置き換えるものではないが「最初の防壁」。
 *
 * 引用元: docs/l3_phases/paid-quality/PH-PQ-300_craft-sweep.md T4
 *         WCAG 2.2: https://www.w3.org/TR/WCAG22/
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * color-contrast は本 gate から除外する。 違反の根本原因は theme token の値
 * (`--ag-text-muted` の base 混合比、 shadcn bridge の `--primary-foreground` 等) であり、
 * PH-PQ-300 は「やらないこと: 既存 design tokens の再定義」 を明示スコープ外としている。
 * 計測値と対象は audit/craft-checklist.md に記録し、 token contrast pass は後続スコープ。
 * 構造的 a11y (role / name / ARIA 妥当性 / landmark / document-title 等) は全て gate 対象。
 */
const DEFERRED_RULES = ['color-contrast'];

/**
 * 指定 page を axe で解析し、 違反があれば人が読めるレポートを添付して fail させる。
 * `include` を渡すと検査対象を CSS selector に絞れる (overlay 等の隔離検査用)。
 */
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
		await testInfo.attach(`axe-violations-${label}`, {
			body: JSON.stringify(results.violations, null, 2),
			contentType: 'application/json',
		});
		expect(results.violations, `WCAG 2.2 AA violations on ${label}:\n${report}`).toEqual([]);
	}
}

test.describe('WCAG 2.2 AA — axe-core', () => {
	test.afterEach(async ({ page }) => {
		// modal (Settings 等) を開いたまま test が終わると次 test の click が intercept される。
		// Esc を 2 回送って閉じてから setup state を復帰させる。
		await page.keyboard.press('Escape').catch(() => {});
		await page.keyboard.press('Escape').catch(() => {});
		// 後続 spec が SetupWizard / OnboardingTour overlay に阻まれないよう復帰。
		await markSetupComplete(page).catch(() => {});
		await markOnboardingComplete(page).catch(() => {});
		// activeView は persist されるため、 Workspace に居たまま終わると後続 spec の
		// 「Library default view」 前提が壊れる。 Library tab に戻して view を復帰させる。
		const libraryTab = page.getByRole('button', { name: 'Library', exact: true });
		if (await libraryTab.isVisible().catch(() => false)) {
			await libraryTab.click().catch(() => {});
		}
	});

	test('Library — 空状態', async ({ page }, testInfo) => {
		await expect(page.getByRole('region', { name: 'ライブラリ' })).toBeVisible({
			timeout: 15_000,
		});
		await expectNoA11yViolations(page, testInfo, 'library-empty');
	});

	test('Library — item 投入後', async ({ page }, testInfo) => {
		const created: string[] = [];
		for (let i = 0; i < 6; i++) {
			const item = await createItem(page, {
				item_type: 'url',
				label: `a11y probe ${i}`,
				target: `https://example.com/${i}`,
				aliases: [],
				tag_ids: [],
			});
			created.push(item.id);
		}
		try {
			await page.reload();
			await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
			await expect(page.getByRole('region', { name: 'ライブラリ' })).toBeVisible({
				timeout: 15_000,
			});
			await expectNoA11yViolations(page, testInfo, 'library-populated');
		} finally {
			for (const id of created) await deleteItem(page, id).catch(() => {});
		}
	});

	test('Workspace — 空状態', async ({ page }, testInfo) => {
		await page.getByRole('button', { name: 'Workspace', exact: true }).click();
		await expect(page.getByTestId('canvas-toolbar')).toBeVisible({ timeout: 15_000 });
		await expectNoA11yViolations(page, testInfo, 'workspace-empty');
	});

	test('Workspace — widget 配置後', async ({ page }, testInfo) => {
		const workspaces = await listWorkspaces(page);
		const ws = workspaces[0];
		const widget = await addWidget(page, ws.id, 'clipboard_history');
		try {
			await page.reload();
			await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
			await page.getByRole('button', { name: 'Workspace', exact: true }).click();
			await expect(page.getByTestId('canvas-toolbar')).toBeVisible({ timeout: 15_000 });
			await expectNoA11yViolations(page, testInfo, 'workspace-with-widget');
		} finally {
			await deleteWidget(page, widget.id).catch(() => {});
		}
	});

	for (const cat of ['general', 'library', 'appearance', 'data', 'about'] as const) {
		test(`Settings — ${cat} pane`, async ({ page }, testInfo) => {
			await page.getByRole('button', { name: 'Settings', exact: true }).click();
			await expect(page.getByRole('tablist', { name: '設定カテゴリ' })).toBeVisible({
				timeout: 15_000,
			});
			await page.getByRole('tab', { name: new RegExp(cat, 'i') }).click();
			// pane 切替の描画安定を待つ
			await page.locator(`#settings-panel-${cat}`).waitFor({ state: 'visible', timeout: 10_000 });
			await expectNoA11yViolations(page, testInfo, `settings-${cat}`);
		});
	}

	test('Palette — 初期表示', async ({ page }, testInfo) => {
		const palettePage = page
			.context()
			.pages()
			.find((p) => /\/palette/.test(p.url()));
		test.skip(!palettePage, 'palette window page not attached over CDP');
		if (!palettePage) return;
		await palettePage.waitForLoadState('domcontentloaded');
		await expectNoA11yViolations(palettePage, testInfo, 'palette-initial');
	});

	test('SetupWizard — 全 step', async ({ page }, testInfo) => {
		await resetFirstRun(page);
		await page.reload();
		await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
		const wizard = page.getByTestId('setup-wizard');
		await expect(wizard).toBeVisible({ timeout: 15_000 });

		// Step 1: Welcome
		await expectNoA11yViolations(page, testInfo, 'setup-welcome', '[data-testid="setup-wizard"]');
		await page.getByTestId('setup-welcome-next').click();
		// Step 2: Hotkey
		await expectNoA11yViolations(page, testInfo, 'setup-hotkey', '[data-testid="setup-wizard"]');
		await page.getByTestId('setup-hotkey-next').click();
		// Step 3: Autostart
		await expectNoA11yViolations(page, testInfo, 'setup-autostart', '[data-testid="setup-wizard"]');
		await page.getByTestId('setup-finish').click();
		await expect(wizard).toBeHidden({ timeout: 10_000 });

		// resetFirstRun でこの spec は first-run state を巻き戻している。 完走後に出る
		// OnboardingTour overlay が残ると後続 spec の UI test を阻害するため、 setup/onboarding を
		// complete に戻して reload し、 clean な状態を次 spec に渡す。
		await markSetupComplete(page);
		await markOnboardingComplete(page);
		await page.reload();
		await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
	});
});
