import { open } from '@tauri-apps/plugin-dialog';

/**
 * Library item の「見た目設定」 で「画像を選択」 した時に開く native OS file picker の
 * thin wrapper。 production では `@tauri-apps/plugin-dialog` の `open()` を呼ぶだけの 1 関数。
 *
 * ## E2E test seam (なぜ production code に置くか)
 *
 * Tauri v2 の `window.__TAURI_INTERNALS__.invoke` は `writable: false` で定義されており、
 * Playwright の `page.evaluate` から IPC を上書きできない。 旧 PR #570 の
 * `__arcagateTest__.itemStore` 経由 UI bypass は「test は通るが実機で直っていない」
 * (PH-CF-1100 ② root cause) を許してしまった。 そこで、 **自動化不能なネイティブダイアログ
 * の葉 1 点だけ** を差し替える seam を本 wrapper に持たせる。
 *
 * ## Seam protocol
 *
 * E2E ビルド (Vite を `VITE_E2E=1` で起動した時) でだけ live になる:
 * - test が `globalThis.__arcagateIconPickerE2ESeam__ = { next: '/abs/path/foo.png' }` を set
 *   すると、 次回 1 回限り native dialog を bypass して `next` を返す (`delete seam.next` で
 *   消費後は production path = 本物の `open()` に自動復帰)。
 * - 上流の click sequence (見た目設定 checkbox → 歯車 button → 「画像を選択」 button click)
 *   は production と同じパスで走り、 下流 (`cmd_save_icon_file` / `applyOptimisticUpdate` /
 *   `updateItem` / ItemIcon `{#key iconSrc}`) も実 IPC を踏む。
 * - production build (`pnpm tauri build`) では `import.meta.env.VITE_E2E` が undefined のため
 *   `IS_E2E` が compile-time `false` に展開され、 seam ブロックが Vite tree-shake で削除される
 *   (production binary に seam check は残らない)。
 *
 * ## 引用元 guideline
 *
 * - `docs/l2_foundation/features/screens/library.md` §即時反映
 * - `docs/l3_phases/audit/LIBRARY_ICON_REFRESH_TARGET_ARCH_2026-05-25.md`
 */

export interface IconPickerE2ESeam {
	next?: string | null;
}

const SEAM_KEY = '__arcagateIconPickerE2ESeam__' as const;

// Vite が `VITE_E2E` env を `import.meta.env` に bake する (Tauri dev server を
// `VITE_E2E=1 pnpm dev` で起動した時のみ true)。 production / 通常 dev では undefined。
const IS_E2E = import.meta.env.VITE_E2E === '1';

export const ICON_FILE_EXTENSIONS = ['png', 'ico', 'jpg', 'jpeg', 'svg', 'webp'] as const;

/**
 * Native OS file picker を開いて 1 ファイル選択させ、 絶対 path を返す。 user が cancel した
 * 場合は null。 E2E ビルド + seam set 済の時は dialog を出さず seam を 1 回消費する。
 *
 * @param filterName i18n 済の「画像ファイル」 フィルタ表示名 (e.g.
 *   `t('item.appearance_settings.filter_image')`)。
 */
export async function pickIconFile(filterName: string): Promise<string | null> {
	if (IS_E2E) {
		const seamHolder = globalThis as unknown as Record<string, IconPickerE2ESeam | undefined>;
		const seam = seamHolder[SEAM_KEY];
		if (seam && 'next' in seam) {
			const fixture = seam.next ?? null;
			delete seam.next;
			return fixture;
		}
	}
	const selected = await open({
		multiple: false,
		filters: [{ name: filterName, extensions: [...ICON_FILE_EXTENSIONS] }],
	});
	return typeof selected === 'string' ? selected : null;
}
