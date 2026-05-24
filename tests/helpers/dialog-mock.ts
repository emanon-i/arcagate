import type { Page } from '@playwright/test';

/**
 * Tauri `@tauri-apps/plugin-dialog` の `open()` (OS file picker) を **実 UI 経路**で
 * 駆動するための test helper。
 *
 * PH-CF-1100 ② root cause: PR #570 で LB-2 を window.__arcagateTest__ の合成 store 経路で
 * 駆動していたが、 LibraryDetailPanel → CardOverrideDialog → ItemFormCardOverride の
 * `selectImage()` が呼ぶ `open()` (= OS picker) を経由していなかったため、 実機での
 * 「modal 開いて画像変更 → 一覧カードが反映しない」 を検出できていなかった。
 *
 * 本 helper は Tauri の IPC bridge を browser 側で hook して、 `plugin:dialog|open` 呼出を
 * 事前注入した path で即時 resolve する。 これで OS picker を出さずに「実 UI flow」 を
 * 通せる。
 *
 * 使い方:
 *   await mockTauriOpenDialog(page, '/path/to/fixture.png');
 *   await page.getByTestId('card-override-image-select').click(); // selectImage() を発火
 *   // → open() が即時 fixture path を return → cmd_save_icon_file → applyOptimisticUpdate
 *   //   → updateItem の実経路がそのまま走る
 *
 * 引用元 guideline:
 *   .claude/skills/e2e-tauri-webview2 §Mocking Tauri IPC from the page
 *   docs/l2_foundation/features/screens/library.md §appearance 設定の状態管理契約
 */
export async function mockTauriOpenDialog(page: Page, fixturePath: string): Promise<void> {
	// page.evaluate で window.__TAURI_INTERNALS__.transformCallback を経由する IPC を hook。
	// Tauri v2 は invoke handlers が `window.__TAURI_INTERNALS__.invoke` を経由する。
	// `plugin:dialog|open` の resolved value はそのまま selectImage() 内の `selected` 変数に渡る。
	await page.evaluate((resolved) => {
		const w = window as unknown as {
			__TAURI_INTERNALS__?: {
				invoke?: (cmd: string, args: unknown) => Promise<unknown>;
				__origInvoke?: (cmd: string, args: unknown) => Promise<unknown>;
			};
		};
		if (!w.__TAURI_INTERNALS__) return;
		// 元の invoke を 1 回だけ保存 (test 中の再 mock で stack させない)。
		w.__TAURI_INTERNALS__.__origInvoke ??= w.__TAURI_INTERNALS__.invoke;
		const orig = w.__TAURI_INTERNALS__.__origInvoke;
		if (!orig) return;
		w.__TAURI_INTERNALS__.invoke = async (cmd: string, args: unknown) => {
			if (cmd === 'plugin:dialog|open') return resolved;
			return orig(cmd, args);
		};
	}, fixturePath);
}

/** mockTauriOpenDialog で挿し込んだ hook を解除し、 元の invoke を復元する。 */
export async function unmockTauriOpenDialog(page: Page): Promise<void> {
	await page.evaluate(() => {
		const w = window as unknown as {
			__TAURI_INTERNALS__?: {
				invoke?: (cmd: string, args: unknown) => Promise<unknown>;
				__origInvoke?: (cmd: string, args: unknown) => Promise<unknown>;
			};
		};
		if (!w.__TAURI_INTERNALS__?.__origInvoke) return;
		w.__TAURI_INTERNALS__.invoke = w.__TAURI_INTERNALS__.__origInvoke;
		w.__TAURI_INTERNALS__.__origInvoke = undefined;
	});
}
