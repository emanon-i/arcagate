import * as configIpc from '$lib/ipc/config';
import { getErrorMessage } from '$lib/utils/format-error';
import {
	isValidSortField,
	isValidSortOrder,
	type SortField,
	type SortOrder,
} from '$lib/utils/library-sort';
import { loadJSON, loadNumber, saveJSON, saveNumber } from '$lib/utils/local-storage';

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
import { MAX_ZOOM, MIN_ZOOM, RESET_ZOOM } from '$lib/utils/zoom-math';

const ZOOM_STORAGE_KEY = 'widget-zoom';

let widgetZoom = $state(loadNumber(ZOOM_STORAGE_KEY, RESET_ZOOM, MIN_ZOOM, MAX_ZOOM));

function setWidgetZoom(zoom: number): void {
	// caller は clampZoom() 済の値を渡す前提。本関数は no-op-skip + persist のみ。
	if (widgetZoom === zoom) return;
	widgetZoom = zoom;
	saveNumber(ZOOM_STORAGE_KEY, zoom);
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
	get itemSize() {
		return itemSize;
	},
	get libraryCard() {
		return libraryCard;
	},
	get librarySort() {
		return librarySort;
	},
	loadConfig,
	saveHotkey,
	saveAutostart,
	completeSetup,
	setWidgetZoom,
	saveItemSize,
	setLibraryCardBackground,
	setLibraryCardStyle,
	setLibrarySort,
};
