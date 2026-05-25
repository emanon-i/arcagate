import type { Page } from '@playwright/test';

/**
 * `pickIconFile()` (`src/lib/ipc/icon-picker.ts`) の test seam を Playwright から制御するヘルパー。
 *
 * 真因経路の e2e (PH-CF-1100 ② / LB-2) で、 native OS file picker leaf だけを fixture path
 * に差し替えて上流の click sequence (見た目設定 checkbox → 歯車 → 「画像を選択」 button) と
 * 下流の `cmd_save_icon_file` → `applyOptimisticUpdate` → `updateItem` → ItemIcon
 * `{#key iconSrc}` 再生成 → 一覧カード `<img src>` 切替を実 UI のまま機械検証するために使う。
 *
 * 前提: `playwright.config.ts` の webServer.env で `VITE_E2E: '1'` を set すること。 production
 * build (`pnpm tauri build`) は `import.meta.env.VITE_E2E` が undefined のため seam ブロックが
 * tree-shake で除去される (`icon-picker.ts` の `IS_E2E` 定数参照)。
 *
 * 引用元:
 *   docs/l2_foundation/features/screens/library.md §即時反映 (test-seam 経路)
 *   docs/l3_phases/audit/LIBRARY_ICON_REFRESH_TARGET_ARCH_2026-05-25.md
 */

const SEAM_KEY = '__arcagateIconPickerE2ESeam__' as const;

/**
 * 次回 `pickIconFile` 呼出で `fixturePath` を **1 回だけ** 返すよう seam を仕込む。 `pickIconFile`
 * が `next` を消費した後は `delete seam.next` で消し、 同 seam を再利用したい場合は再度
 * `primeIconPickerSeam` を呼び直す。
 */
export async function primeIconPickerSeam(page: Page, fixturePath: string): Promise<void> {
	await page.evaluate(
		([key, path]) => {
			const g = globalThis as unknown as Record<string, { next?: string | null }>;
			g[key] = { next: path };
		},
		[SEAM_KEY, fixturePath] as const,
	);
}

/**
 * seam holder を未定義に戻す (afterEach 等での隔離保険)。 production code は `pickIconFile`
 * 呼出で 1 回消費する仕様だが、 cancel 経路 / fail 時に未消費の seam が次 test に持ち越されて
 * 偽 pass を起こす可能性を排除する。
 */
export async function clearIconPickerSeam(page: Page): Promise<void> {
	await page.evaluate((key) => {
		const g = globalThis as unknown as Record<string, unknown>;
		delete g[key];
	}, SEAM_KEY);
}
