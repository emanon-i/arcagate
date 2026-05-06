import { type Browser, test as base, chromium, type Page } from '@playwright/test';
import { findMainPage, waitForAppReady } from '../helpers/app-ready.js';

export const test = base.extend<{ page: Page }, { sharedBrowser: Browser }>({
	// Worker-scoped: CDP 接続を Worker 全体で 1 回だけ確立する。
	// browser.close() は CDP mode で WebView2 プロセス自体を終了させるため、
	// テストごとに接続/切断すると 2 テスト目以降で CDP ポートが消える。
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
		// メインウィンドウを URL で特定（パレットウィンドウ /palette を除外）
		let page = findMainPage(ctx);
		if (!page) {
			page = ctx.pages()[0] ?? (await ctx.waitForEvent('page'));
		}
		await page.waitForURL(/^http:\/\/localhost:\d+\/?(\?.*)?$/, { timeout: 30_000 });
		await page.waitForLoadState('domcontentloaded');
		// configStore.loadConfig() 完了まで SetupWizard overlay が表示されるため待機
		await waitForAppReady(page);

		// 共通プロセス / WebView2 を全 test で再利用するため、UI 状態 (localStorage) が
		// 前 test から漏れる。各 test 開始前に既知のデフォルトに戻す。
		// 既知 leak の影響: 14 件の e2e fail (full suite)、PR #322 R10-B 頃から累積
		// - arcagate.app.activeView (canvas-pan-zoom が workspace に設定 → library 系が空表示)
		// - arcagate.library.activeTag (前 test の tag filter が残ると別 type の items が不可視)
		// - arcagate.library.sidebar.expanded / mainScrollTop
		// - widget-zoom (zoom test が 60/200% を残すと canvas 起点がずれる)
		// - arcagate.workspace.pan.* (workspace ID 毎の pan、無限増殖)
		// 全リセット方針: arcagate.* / widget-zoom / tip-dismissed-* など UI 系を一括削除
		// (sound-enabled / sound-volume / arcagate-library-card 等の設定値は触らない)
		const needsReload = await page.evaluate(() => {
			let dirty = false;
			const keysToRemove: string[] = [];
			for (let i = 0; i < localStorage.length; i++) {
				const k = localStorage.key(i);
				if (!k) continue;
				if (
					k.startsWith('arcagate.app.') ||
					k.startsWith('arcagate.library.') ||
					k.startsWith('arcagate.workspace.') ||
					k === 'widget-zoom' ||
					k.startsWith('tip-dismissed-')
				) {
					keysToRemove.push(k);
				}
			}
			for (const k of keysToRemove) {
				localStorage.removeItem(k);
				dirty = true;
			}
			return dirty;
		});
		if (needsReload) {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);
		}

		await use(page);
		// テスト後: 開いているダイアログ・パレットを Escape で閉じる（次テストへの状態リーク防止）
		// パレットの keydown ハンドラは input にアタッチされているため、先にフォーカスが必要
		try {
			const textbox = page.getByRole('textbox').first();
			if (await textbox.isVisible({ timeout: 300 })) {
				await textbox.focus();
			}
			await page.keyboard.press('Escape');
		} catch {
			// ページが閉じている場合は無視
		}
	},
});

export { expect } from '@playwright/test';
