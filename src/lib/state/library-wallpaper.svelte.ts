import { getLibraryWallpaper, setLibraryWallpaper } from '$lib/ipc/workspace';
import type { LibraryWallpaper, UpdateLibraryWallpaperInput } from '$lib/types/workspace';

/**
 * PH-CF-700 C8: ライブラリ画面のグローバル壁紙設定 store。
 *
 * 引用元 guideline:
 * - `docs/l3_phases/clean-feedback/PH-CF-700_library-ux-wallpaper.md` §C8 (描画 / 保持)
 * - `docs/l2_foundation/features/backend/wallpaper-service.md` §壁紙格納先契約
 *
 * 用途:
 * - LibraryLayout が `wallpaper` を購読し z-0 layer に background-image を描画
 * - Settings UI (`SettingsAppearancePane`) が pickImage / setSliders / clear で更新
 *
 * 設計:
 * - 初期値 (path=null / opacity=0.6 / blur=0) は backend の `get_library_wallpaper` が
 *   defaults を返すため、 mount 時に 1 回 fetch して store に格納する。
 * - mutation 系は backend の clamp 済 response を store に書き戻し、 frontend / backend が
 *   常に同じ正規化値を持つ。 失敗時は前回値を維持して toast を表示 (呼び出し側で実施)。
 */

const DEFAULT_WALLPAPER: LibraryWallpaper = {
	path: null,
	opacity: 0.6,
	blur: 0,
};

let wallpaper = $state<LibraryWallpaper>({ ...DEFAULT_WALLPAPER });
let loaded = $state(false);

async function load(): Promise<void> {
	try {
		wallpaper = await getLibraryWallpaper();
	} catch {
		// best-effort: backend 未到達時は default を維持。 user 操作は再 fetch で復帰する。
	} finally {
		loaded = true;
	}
}

async function apply(input: UpdateLibraryWallpaperInput): Promise<LibraryWallpaper> {
	const updated = await setLibraryWallpaper(input);
	wallpaper = updated;
	return updated;
}

export const libraryWallpaperStore = {
	get wallpaper(): LibraryWallpaper {
		return wallpaper;
	},
	get loaded(): boolean {
		return loaded;
	},
	load,
	apply,
};
