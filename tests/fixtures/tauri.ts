import { test as base, chromium, type Page } from '@playwright/test';

export const test = base.extend<{ page: Page }>({
	// biome-ignore lint/correctness/noEmptyPattern: Playwright requires object destructuring
	page: async ({}, use) => {
		const port = process.env.ARCAGATE_TEST_CDP_PORT ?? '9515';
		const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
		const ctx = browser.contexts()[0];
		const page = ctx.pages()[0] ?? (await ctx.waitForEvent('page'));
		// WebView2 が devUrl (localhost:5173) にいることを保証
		// about:blank や chrome-error:// だと page.evaluate が失敗するため
		await page.waitForURL(/^http:\/\/localhost:5173/, { timeout: 30_000 });
		await page.waitForLoadState('domcontentloaded');
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
