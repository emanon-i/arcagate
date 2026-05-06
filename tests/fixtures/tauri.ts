import { type Browser, test as base, chromium, type Page } from '@playwright/test';
import { markSetupComplete } from '../helpers/ipc.js';

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
		// PR-Z5 fix #2: data-il-zone は workspace/settings/palette のみで library に
		// 存在せず default 画面 (library) で永久 timeout。<main> タグは root layout
		// (src/routes/+page.svelte) で常時 render される、SvelteKit hydration 完了の signal。
		await mainPage.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
		// T3-1 safe net: 前 spec で deleteWorkspace 等で setup-complete state が破壊された
		// 場合に SetupWizard が復活するため、各 spec 開始時に markSetupComplete を呼んで
		// 確実に skip 状態にする。既に setup-complete なら backend 側で no-op、IPC 自体が
		// 失敗した場合 (Tauri bridge 不通 / cmd 削除 / transient invoke 失敗) は fail-fast
		// させて誤診断を避ける (Codex P2 review)。
		await markSetupComplete(mainPage);
		await use(mainPage);
	},
});

export { expect } from '@playwright/test';
