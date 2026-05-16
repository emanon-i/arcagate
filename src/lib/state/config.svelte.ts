import * as configIpc from '$lib/ipc/config';
import { getErrorMessage } from '$lib/utils/format-error';
import {
	isValidSortField,
	isValidSortOrder,
	type SortField,
	type SortOrder,
} from '$lib/utils/library-sort';
import {
	loadBool,
	loadJSON,
	loadNumber,
	saveBool,
	saveJSON,
	saveNumber,
} from '$lib/utils/local-storage';

export type ItemSize = 'S' | 'M' | 'L';

export type LibraryCardBackgroundMode = 'fill' | 'image' | 'none';

export interface LibraryCardStyleConfig {
	textColor: string;
	strokeEnabled: boolean;
	strokeColor: string;
	strokeWidthPx: number;
	overlayEnabled: boolean;
}

export interface LibraryCardBackgroundConfig {
	mode: LibraryCardBackgroundMode;
	fillBgColor: string;
	fillIconColor: string;
	focalX: number;
	focalY: number;
}

export interface LibraryCardConfig {
	background: LibraryCardBackgroundConfig;
	style: LibraryCardStyleConfig;
}

const LIBRARY_CARD_STORAGE_KEY = 'arcagate-library-card';

const DEFAULT_LIBRARY_CARD: LibraryCardConfig = {
	background: {
		mode: 'image',
		fillBgColor: '#1f2937',
		fillIconColor: '#ffffff',
		focalX: 50,
		focalY: 50,
	},
	style: {
		textColor: '#ffffff',
		strokeEnabled: true,
		strokeColor: '#000000',
		strokeWidthPx: 0.5,
		overlayEnabled: true,
	},
};

function loadLibraryCardFromStorage(): LibraryCardConfig {
	// nested 構造のため loadJSON の shallow merge では不足。background / style を
	// それぞれ個別 merge する。
	const top = loadJSON<{
		background: Partial<LibraryCardBackgroundConfig>;
		style: Partial<LibraryCardStyleConfig>;
	}>(LIBRARY_CARD_STORAGE_KEY, { background: {}, style: {} });
	return {
		background: { ...DEFAULT_LIBRARY_CARD.background, ...(top.background ?? {}) },
		style: { ...DEFAULT_LIBRARY_CARD.style, ...(top.style ?? {}) },
	};
}

let hotkey = $state('Ctrl+Shift+Space');
let autostart = $state(false);
let setupComplete = $state(false);
let loading = $state(false);
let error = $state<string | null>(null);
let itemSize = $state<ItemSize>('M');

let libraryCard = $state<LibraryCardConfig>(loadLibraryCardFromStorage());

// L2-C C1: Library sort spec 永続化 (localStorage、IPC 経由しない軽量設定)。
const LIBRARY_SORT_STORAGE_KEY = 'arcagate-library-sort';
function loadLibrarySortFromStorage(): { field: SortField; order: SortOrder } {
	const raw = loadJSON<{ field?: string; order?: string }>(LIBRARY_SORT_STORAGE_KEY, {});
	const field: SortField =
		raw.field && isValidSortField(raw.field) ? (raw.field as SortField) : 'name';
	const order: SortOrder =
		raw.order && isValidSortOrder(raw.order) ? (raw.order as SortOrder) : 'asc';
	return { field, order };
}
let librarySort = $state<{ field: SortField; order: SortOrder }>(loadLibrarySortFromStorage());

function setLibrarySort(field: SortField, order: SortOrder): void {
	if (librarySort.field === field && librarySort.order === order) return;
	librarySort = { field, order };
	saveJSON(LIBRARY_SORT_STORAGE_KEY, librarySort);
}

// F-1 (2026-05-08 user 検収): Library 一覧の「非表示アイテムを表示」 toggle 状態を永続化。
// default: false (= 非表示アイテムは Library 一覧から外れる、検索 / widget も同様)。
const LIBRARY_SHOW_HIDDEN_KEY = 'arcagate.library.show-hidden';
let libraryShowHidden = $state<boolean>(loadBool(LIBRARY_SHOW_HIDDEN_KEY, false));

function setLibraryShowHidden(value: boolean): void {
	if (libraryShowHidden === value) return;
	libraryShowHidden = value;
	saveBool(LIBRARY_SHOW_HIDDEN_KEY, value);
}

function persistLibraryCard(): void {
	saveJSON(LIBRARY_CARD_STORAGE_KEY, libraryCard);
}

function patchEqual<T extends object>(current: T, patch: Partial<T>): boolean {
	for (const k of Object.keys(patch) as (keyof T)[]) {
		if (current[k] !== patch[k]) return false;
	}
	return true;
}

function setLibraryCardBackground(patch: Partial<LibraryCardBackgroundConfig>): void {
	if (patchEqual(libraryCard.background, patch)) return;
	libraryCard = { ...libraryCard, background: { ...libraryCard.background, ...patch } };
	persistLibraryCard();
}

function setLibraryCardStyle(patch: Partial<LibraryCardStyleConfig>): void {
	if (patchEqual(libraryCard.style, patch)) return;
	libraryCard = { ...libraryCard, style: { ...libraryCard.style, ...patch } };
	persistLibraryCard();
}

// Widget zoom (25-200%, persisted in localStorage)
// 5/04 user 検収 (Q2 override 確定): write-time clamp 撤廃。
//   - clamp は zoom-math の `clampZoom()` 一箇所のみ
//   - caller は **必ず** clampZoom 済の値を渡す前提 (defense in depth ではない)
//   - 二重 clamp / 5 単位 round / 整数化を全部撤廃
//   - load-time clamp のみ残す (corrupted localStorage 対策、value drift 検知不能のため)
import {
	MAX_ZOOM,
	MIN_ZOOM,
	MIN_ZOOM_FIT,
	RESET_ZOOM,
	ZOOM_LIMIT_MAX,
	ZOOM_LIMIT_MIN,
} from '$lib/utils/zoom-math';

const ZOOM_STORAGE_KEY = 'widget-zoom';
const WIDGET_MAX_ZOOM_KEY = 'arcagate.widget.max-zoom';
const WIDGET_MIN_ZOOM_KEY = 'arcagate.widget.min-zoom';

// 2026-05-17 user 検収: 拡大率の上下限を Settings で変更可能に。
// 設定可能 range は max ∈ [100, 1000] / min ∈ [10, 100] (zoom-math の ZOOM_LIMIT_*)。
// default は zoom-math の MAX_ZOOM (300) / MIN_ZOOM (25)。
let widgetMaxZoom = $state(loadNumber(WIDGET_MAX_ZOOM_KEY, MAX_ZOOM, 100, ZOOM_LIMIT_MAX));
let widgetMinZoom = $state(loadNumber(WIDGET_MIN_ZOOM_KEY, MIN_ZOOM, ZOOM_LIMIT_MIN, 100));

// F-8 v2 (2026-05-09): load range の下限は MIN_ZOOM_FIT (1) — fit-to-content で 25% 未満になった
// 値も persist して reload 時復元する (旧: MIN_ZOOM=25 で範囲外 → fallback で全体表示状態が失われていた)。
// 2026-05-17: load 上限は user 設定の widgetMaxZoom (固定 MAX_ZOOM ではなく)。
let widgetZoom = $state(loadNumber(ZOOM_STORAGE_KEY, RESET_ZOOM, MIN_ZOOM_FIT, widgetMaxZoom));

function setWidgetZoom(zoom: number): void {
	// caller は clampZoom() 済の値を渡す前提。本関数は no-op-skip + persist のみ。
	if (widgetZoom === zoom) return;
	widgetZoom = zoom;
	saveNumber(ZOOM_STORAGE_KEY, zoom);
}

function setWidgetMaxZoom(value: number): void {
	const next = Math.round(Math.max(100, Math.min(ZOOM_LIMIT_MAX, value)));
	if (widgetMaxZoom === next) return;
	widgetMaxZoom = next;
	saveNumber(WIDGET_MAX_ZOOM_KEY, next);
	// 現在 zoom が新上限を超えていたら即引き下げる (instant-feedback)。
	if (widgetZoom > next) setWidgetZoom(next);
}

function setWidgetMinZoom(value: number): void {
	const next = Math.round(Math.max(ZOOM_LIMIT_MIN, Math.min(100, value)));
	if (widgetMinZoom === next) return;
	widgetMinZoom = next;
	saveNumber(WIDGET_MIN_ZOOM_KEY, next);
	if (widgetZoom < next) setWidgetZoom(next);
}

// 2026-05-17 user 検収: 下部ショートカットヒントバーの表示/非表示。
const HINT_BAR_VISIBLE_KEY = 'arcagate.workspace.hint-bar.visible';
let hintBarVisible = $state<boolean>(loadBool(HINT_BAR_VISIBLE_KEY, true));

function setHintBarVisible(value: boolean): void {
	if (hintBarVisible === value) return;
	hintBarVisible = value;
	saveBool(HINT_BAR_VISIBLE_KEY, value);
}

async function loadConfig(): Promise<void> {
	loading = true;
	error = null;
	try {
		const [h, a, sc, is] = await Promise.all([
			configIpc.getHotkey(),
			configIpc.getAutostart(),
			configIpc.isSetupComplete(),
			configIpc.getConfig('item_size'),
		]);
		hotkey = h;
		autostart = a;
		setupComplete = sc;
		if (is === 'S' || is === 'M' || is === 'L') itemSize = is;
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function saveItemSize(size: ItemSize): Promise<void> {
	try {
		await configIpc.setConfig('item_size', size);
		itemSize = size;
	} catch (e) {
		error = getErrorMessage(e);
	}
}

async function saveHotkey(newHotkey: string): Promise<void> {
	loading = true;
	error = null;
	try {
		await configIpc.setHotkey(newHotkey);
		hotkey = newHotkey;
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function saveAutostart(enabled: boolean): Promise<void> {
	loading = true;
	error = null;
	try {
		await configIpc.setAutostart(enabled);
		autostart = enabled;
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function completeSetup(): Promise<void> {
	loading = true;
	error = null;
	try {
		await configIpc.markSetupComplete();
		setupComplete = true;
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

/**
 * K-4 (2026-05-15): 全設定を default 値に reset。
 *
 * **対象 (= ユーザー preference)**:
 *   - hotkey → Ctrl+Shift+Space (DEFAULT_HOTKEY)
 *   - autostart → false
 *   - itemSize → 'M'
 *   - libraryCard → DEFAULT_LIBRARY_CARD
 *   - librarySort → { field: 'name', order: 'asc' }
 *   - libraryShowHidden → false
 *   - widgetZoom → 100% (RESET_ZOOM)
 *   - locale 保存値 → 削除 (= 次回起動で OS auto-detect)
 *
 * **非対象 (= ユーザー data、 残す)**:
 *   - workspaces / widgets / wallpapers
 *   - Library items / tags / openers / themes
 *
 * UI 経由の destructive action なので caller (SettingsDataPane) で必ず confirm 経由。
 */
async function resetAllSettings(): Promise<void> {
	loading = true;
	error = null;
	try {
		await Promise.all([
			configIpc.setHotkey('Ctrl+Shift+Space'),
			configIpc.setAutostart(false),
			configIpc.setConfig('item_size', 'M'),
		]);
		hotkey = 'Ctrl+Shift+Space';
		autostart = false;
		itemSize = 'M';
		// localStorage 系を一括 reset。 直接書き戻すと load 時 default に合致せず壊れる
		// 可能性があるため localStorage.removeItem で「キーごと消す」 → 次回 load で default。
		libraryCard = structuredClone(DEFAULT_LIBRARY_CARD);
		saveJSON(LIBRARY_CARD_STORAGE_KEY, libraryCard);
		librarySort = { field: 'name', order: 'asc' };
		saveJSON(LIBRARY_SORT_STORAGE_KEY, librarySort);
		libraryShowHidden = false;
		saveBool(LIBRARY_SHOW_HIDDEN_KEY, false);
		widgetZoom = RESET_ZOOM;
		saveNumber(ZOOM_STORAGE_KEY, RESET_ZOOM);
		widgetMaxZoom = MAX_ZOOM;
		saveNumber(WIDGET_MAX_ZOOM_KEY, MAX_ZOOM);
		widgetMinZoom = MIN_ZOOM;
		saveNumber(WIDGET_MIN_ZOOM_KEY, MIN_ZOOM);
		hintBarVisible = true;
		saveBool(HINT_BAR_VISIBLE_KEY, true);
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem('arcagate.locale');
		}
	} catch (e) {
		error = getErrorMessage(e);
		throw e;
	} finally {
		loading = false;
	}
}

export const configStore = {
	get hotkey() {
		return hotkey;
	},
	get autostart() {
		return autostart;
	},
	get setupComplete() {
		return setupComplete;
	},
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},
	get widgetZoom() {
		return widgetZoom;
	},
	get widgetMaxZoom() {
		return widgetMaxZoom;
	},
	get widgetMinZoom() {
		return widgetMinZoom;
	},
	get hintBarVisible() {
		return hintBarVisible;
	},
	get itemSize() {
		return itemSize;
	},
	get libraryCard() {
		return libraryCard;
	},
	get librarySort() {
		return librarySort;
	},
	get libraryShowHidden() {
		return libraryShowHidden;
	},
	loadConfig,
	saveHotkey,
	saveAutostart,
	completeSetup,
	setWidgetZoom,
	setWidgetMaxZoom,
	setWidgetMinZoom,
	setHintBarVisible,
	saveItemSize,
	setLibraryCardBackground,
	setLibraryCardStyle,
	setLibrarySort,
	setLibraryShowHidden,
	resetAllSettings,
};
