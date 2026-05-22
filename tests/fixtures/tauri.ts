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
		// メインウィンドウは / (palette は /palette で別 URL)。
		// global-setup の browser.close() で WebView2 process が一度落ち、
		// fixture の reconnect 時に main page が遅れて attach する場合があるため、
		// 30s polling で main URL を確実に拾う (旧実装の `?? pages[0]` fallback は
		// palette page を main と誤認して `<main>` 30s timeout で全 spec を壊していた、
		// 2026-05-20 CI run 26131222207 の page snapshot で確認)。
		// PH-PQ-400 T1: debug は devUrl (localhost:PORT)、 release は http://tauri.localhost/。
		const mainUrlRe = /^https?:\/\/(localhost:\d+|tauri\.localhost)\/?(\?.*)?$/;
		let mainPage = ctx.pages().find((p) => mainUrlRe.test(p.url()));
		for (let i = 0; !mainPage && i < 60; i++) {
			await new Promise((r) => setTimeout(r, 500));
			mainPage = ctx.pages().find((p) => mainUrlRe.test(p.url()));
		}
		if (!mainPage) {
			throw new Error(
				'main window (/) page did not appear within 30s in fixture — only palette window attached',
			);
		}
		await mainPage.waitForURL(mainUrlRe, { timeout: 30_000 });
		await mainPage.waitForLoadState('domcontentloaded');
		// PR-Z5 fix #2: data-il-zone は workspace/settings/palette のみで library に
		// 存在せず default 画面 (library) で永久 timeout。<main> タグは root layout
		// (src/routes/+page.svelte) で常時 render される、SvelteKit hydration 完了の signal。
		// vite cold-optimize race (memory ops_agent_dev_verification.md #4) で初回 mount が
		// 失敗することがあるため reload で 3 回まで retry。
		let lastErr: unknown = null;
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				await mainPage.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
				lastErr = null;
				break;
			} catch (e) {
				lastErr = e;
				if (attempt < 2) {
					await mainPage.reload();
					await mainPage.waitForLoadState('domcontentloaded');
				}
			}
		}
		if (lastErr) throw lastErr;
		// T3-1 safe net: 前 spec で deleteWorkspace 等で setup-complete state が破壊された
		// 場合に SetupWizard が復活するため、各 spec 開始時に markSetupComplete を呼んで
		// 確実に skip 状態にする。既に setup-complete なら backend 側で no-op、IPC 自体が
		// 失敗した場合 (Tauri bridge 不通 / cmd 削除 / transient invoke 失敗) は fail-fast
		// させて誤診断を避ける (Codex P2 review)。
		await markSetupComplete(mainPage);
		// markSetupComplete は DB を mark するだけで frontend の reactive state (showWizard) は
		// refresh されない。 setup-wizard overlay が残っていると UI test (T2-2-5 等) で
		// pointer event を intercept して 120s timeout になる (CI run 26212348925 で再現)。
		// visible なら reload で UI を refresh、 hidden が確定するまで wait。
		const wizard = mainPage.getByTestId('setup-wizard');
		if (await wizard.isVisible().catch(() => false)) {
			await mainPage.reload();
			await mainPage.waitForLoadState('domcontentloaded');
			await mainPage.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
			await wizard.waitFor({ state: 'hidden', timeout: 10_000 });
		}
		await use(mainPage);
	},
});

export { expect } from '@playwright/test';
