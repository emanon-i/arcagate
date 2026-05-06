import { type Browser, test as base, chromium, type Page } from '@playwright/test';

/**
 * Tauri + WebView2 CDP attach fixture (minimal T1 phase 版)。
 *
 * 引用元:
 * - docs/l1_requirements/test-rebuild/index.md (T1 phase)
 * - .claude/skills/e2e-tauri-webview2 (Tauri + Playwright + CDP setup)
 *
 * Worker-scoped sharedBrowser: CDP 接続を Worker 全体で 1 回だけ確立。
 * browser.close() は CDP mode で WebView2 プロセス自体を終了させるため、
 * テストごとに接続/切断すると 2 テスト目以降で CDP ポートが消える。
 */
export const test = base.extend<{ page: Page }, { sharedBrowser: Browser }>({
	sharedBrowser: [
		// biome-ignore lint/correctness/noEmptyPattern: Playwright requires object destructuring
		async ({}, use) => {
			const port = process.env.ARCAGATE_TEST_CDP_PORT ?? '9515';
			const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
			await use(browser);
			await browser.close();
		},
		{ scope: 'worker' },
	],

	page: async ({ sharedBrowser }, use) => {
		const ctx = sharedBrowser.contexts()[0];
		// メインウィンドウは / (palette は /palette で別 URL)
		const pages = ctx.pages();
		const mainPage =
			pages.find((p) => /\/(\?|$)/.test(p.url())) ?? pages[0] ?? (await ctx.waitForEvent('page'));
		await mainPage.waitForURL(/^http:\/\/localhost:\d+\/?(\?.*)?$/, { timeout: 30_000 });
		await mainPage.waitForLoadState('domcontentloaded');
		// PR-Z5 fix forward: SetupWizard / Onboarding overlay が消えて main app (data-il-zone)
		// が描画されるまで待機。globalSetup で skip + reload 済だが SvelteKit hydration が
		// 完了するまで body は hidden になることがある。
		await mainPage.locator('[data-il-zone]').first().waitFor({ state: 'visible', timeout: 30_000 });
		await use(mainPage);
	},
});

export { expect } from '@playwright/test';
