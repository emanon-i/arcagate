import { test as base, chromium, type Page } from '@playwright/test';
import { findMainPage, waitForAppReady } from '../helpers/app-ready.js';

export const test = base.extend<{ page: Page }>({
	// biome-ignore lint/correctness/noEmptyPattern: Playwright requires object destructuring
	page: async ({}, use) => {
		const port = process.env.ARCAGATE_TEST_CDP_PORT ?? '9515';
		const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
		const ctx = browser.contexts()[0];
		// メインウィンドウを URL で特定（パレットウィンドウ /palette を除外）
		let page = findMainPage(ctx);
		if (!page) {
			page = ctx.pages()[0] ?? (await ctx.waitForEvent('page'));
		}
		await page.waitForURL(/^http:\/\/localhost:\d+\/?(\?.*)?$/, { timeout: 30_000 });
		await page.waitForLoadState('domcontentloaded');
		// configStore.loadConfig() 完了まで SetupWizard overlay が表示されるため待機
		await waitForAppReady(page);
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
		// connection のみ切断。WebView2 プロセスは継続
		await browser.close();
	},
});

export { expect } from '@playwright/test';
