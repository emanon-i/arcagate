import type { BrowserContext, Page } from '@playwright/test';

/** SetupWizard overlay が消えるまで待機する */
export async function waitForAppReady(page: Page): Promise<void> {
	await page.waitForFunction(() => !document.querySelector('[data-testid="setup-wizard"]'), {
		timeout: 10_000,
	});
}

/** メインウィンドウ (/) を URL で特定する。パレットウィンドウ (/palette) を除外。 */
export function findMainPage(ctx: BrowserContext): Page | undefined {
	return ctx.pages().find((p) => {
		const url = p.url();
		return /^http:\/\/localhost:\d+\/?(\?.*)?$/.test(url);
	});
}
