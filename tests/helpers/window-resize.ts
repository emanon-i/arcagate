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
 * `window.__TAURI_INTERNALS__.invoke` 経由で直接呼ぶ。 IPC payload は dpi.js の
 * `Size#[SERIALIZE_TO_IPC_FN]` と一致させる必要があり、 `value` キー + 外部 tag 化
 * された `{ Logical: { width, height } }` 形式を使う (旧実装の `{ type, data }` は
 * v1 系の serde adjacently tagged 形式で v2 では受け付けられない)。
 */
export async function resizeMainWindow(page: Page, width: number, height: number): Promise<void> {
	await page.evaluate(
		async ({ w, h }) => {
			const win = window as unknown as {
				__TAURI_INTERNALS__?: {
					invoke?: (cmd: string, args: unknown) => Promise<unknown>;
					metadata?: { currentWindow?: { label?: string } };
				};
			};
			const invoke = win.__TAURI_INTERNALS__?.invoke;
			if (!invoke) return;
			const label = win.__TAURI_INTERNALS__?.metadata?.currentWindow?.label ?? 'main';
			await invoke('plugin:window|set_size', {
				label,
				value: { Logical: { width: w, height: h } },
			});
		},
		{ w: width, h: height },
	);
	// resize 直後は CSS media query の再評価 + LibraryLayout の reactive flush に数 frame 要する。
	// `lg:block` が effective になるまで wait しないと直後の `getByTestId(...).waitFor visible`
	// が hidden で resolve され続けて timeout する。
	await page.waitForTimeout(300);
}
