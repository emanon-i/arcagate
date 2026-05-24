import type { Page } from '@playwright/test';

/**
 * Tauri main window を logical size で resize する test helper。
 *
 * Tauri default は 800x600 (`src-tauri/tauri.conf.json`) で Tailwind `lg:` breakpoint
 * (1024px) を満たさないため、 `LibraryLayout` の detail panel wrapper が
 * `class="hidden ... lg:block"` で display:none になり panel 内要素を操作できない。
 * 実 UI 経路の e2e (PH-CF-1100 ②⑤⑥ 等) で detail panel を経由するテストは本 helper で
 * main window を 1280×800 等の wide size に変えてから実行する。
 *
 * 実装は `@tauri-apps/api/window` の bare specifier が WebView 内で resolve できない
 * (= Vite build 前提) ため、 Tauri v2 internal IPC `plugin:window|set_size` を
 * `window.__TAURI_INTERNALS__.invoke` 経由で直接呼ぶ (PH-CF-200 e2e と同じ手法)。
 */
export async function resizeMainWindow(page: Page, width: number, height: number): Promise<void> {
	await page.evaluate(
		async ({ w, h }) => {
			const win = window as unknown as {
				__TAURI_INTERNALS__?: {
					invoke?: (cmd: string, args: unknown) => Promise<unknown>;
				};
			};
			const invoke = win.__TAURI_INTERNALS__?.invoke;
			if (!invoke) return;
			await invoke('plugin:window|set_size', {
				size: { type: 'Logical', data: { width: w, height: h } },
			});
		},
		{ w: width, h: height },
	);
}
