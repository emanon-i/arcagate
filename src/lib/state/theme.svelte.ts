import { listen } from '@tauri-apps/api/event';
import * as themeIpc from '$lib/ipc/theme';
import {
	BUILTIN_THEME_DARK,
	BUILTIN_THEME_LIGHT,
	type Theme,
	type ThemeMode,
} from '$lib/types/theme';
import { getErrorMessage } from '$lib/utils/format-error';

/**
 * E-1 (2026-05-07 user 検収): 起動時 古い初期 UI ちらつき (light theme 一瞬表示) の真因対策。
 *
 * 旧: theme apply は loadTheme() の IPC 完了後 → IPC 待ち中 (100-300ms) に default CSS
 * (light mode、`dark` class なし) で UI 描画される。user / e2e で「古い初期 UI が一瞬見える」
 * と観測される根本原因。
 *
 * 新: 前回 active mode を localStorage に cache し、module 初期化時に **同期** で apply。
 * loadTheme 完了後に最新値で再 apply (custom theme tokens 等は IPC 必須なので)。
 */
const THEME_MODE_CACHE_KEY = 'arcagate.theme.activeMode';

function readCachedMode(): ThemeMode {
	if (typeof window === 'undefined') return BUILTIN_THEME_DARK;
	try {
		const v = window.localStorage.getItem(THEME_MODE_CACHE_KEY);
		if (!v) return BUILTIN_THEME_DARK;
		if (v === 'system') return 'system';
		// #7: 旧 theme ID (theme-builtin-*) は 'dark' / 'light' へ読み替え
		if (v === 'theme-builtin-light' || v === 'theme-builtin-liquid-glass-light') {
			return BUILTIN_THEME_LIGHT;
		}
		if (v.startsWith('theme-builtin-')) return BUILTIN_THEME_DARK;
		// 'dark' / 'light' / custom theme ID をそのまま受容 (theme load 後に存在性確認)
		return v as ThemeMode;
	} catch {
		// localStorage 不可環境は Dark default
	}
	return BUILTIN_THEME_DARK;
}

function writeCachedMode(mode: ThemeMode): void {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(THEME_MODE_CACHE_KEY, mode);
	} catch {
		// quota / SecurityError は黙殺
	}
}

let themes = $state<Theme[]>([]);
let activeMode = $state<ThemeMode>(readCachedMode());
const resolvedMode = $derived(resolveMode(activeMode));
let error = $state<string | null>(null);

let systemMediaQuery: MediaQueryList | null = null;
let systemListener: ((e: MediaQueryListEvent) => void) | null = null;
let themeChangedUnlisten: (() => void) | null = null;

/** OS が dark を要求しているか (system mode 解決用)。 */
function systemPrefersDark(): boolean {
	if (typeof window === 'undefined') return true;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * activeMode を実際に適用する builtin/custom theme ID へ解決する。
 * 'system' は OS 設定で Dark / Light テーマを自動選択。
 */
function resolveThemeId(mode: ThemeMode): string {
	if (mode === 'system') {
		return systemPrefersDark() ? BUILTIN_THEME_DARK : BUILTIN_THEME_LIGHT;
	}
	return mode;
}

function resolveMode(mode: ThemeMode): 'dark' | 'light' {
	const id = resolveThemeId(mode);
	// builtin Dark / Light は themes 配列未 load でも同期解決 (起動時ちらつき防止、E-1)
	if (id === BUILTIN_THEME_DARK) return 'dark';
	if (id === BUILTIN_THEME_LIGHT) return 'light';
	// custom theme: base_theme から解決
	const theme = themes.find((t) => t.id === id);
	return theme ? (theme.base_theme as 'dark' | 'light') : 'dark';
}

function applyTheme(): void {
	if (typeof document === 'undefined') return;

	const el = document.documentElement;

	// 1. Reset all theme custom properties (design tokens v2: seed --c-* + semantic --ag-*)
	const style = el.style;
	const toRemove: string[] = [];
	for (let i = 0; i < style.length; i++) {
		const prop = style[i];
		if (prop.startsWith('--ag-') || prop.startsWith('--c-')) {
			toRemove.push(prop);
		}
	}
	for (const prop of toRemove) {
		style.removeProperty(prop);
	}

	// 2. Set .dark class based on resolved mode
	if (resolvedMode === 'dark') {
		el.classList.add('dark');
	} else {
		el.classList.remove('dark');
	}

	// 3. Apply effective theme CSS variables + data-theme attribute.
	//    #7: 全 mode が theme へ解決される ('system' は OS 設定で Dark/Light 自動選択)。
	const effectiveId = resolveThemeId(activeMode);
	const theme = themes.find((t) => t.id === effectiveId);
	if (theme) {
		try {
			const vars = JSON.parse(theme.css_vars) as Record<string, string>;
			for (const [key, value] of Object.entries(vars)) {
				style.setProperty(key, value);
			}
		} catch {
			// Invalid JSON — ignore
		}
	}
	el.dataset.theme = effectiveId;

	// 4. System mode listener
	setupSystemListener();
}

function setupSystemListener(): void {
	cleanupSystemListener();

	if (activeMode !== 'system' || typeof window === 'undefined') return;

	systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	systemListener = () => {
		applyTheme();
	};
	systemMediaQuery.addEventListener('change', systemListener);
}

function cleanupSystemListener(): void {
	if (systemMediaQuery && systemListener) {
		systemMediaQuery.removeEventListener('change', systemListener);
	}
	systemMediaQuery = null;
	systemListener = null;
}

async function loadTheme(): Promise<void> {
	error = null;
	try {
		const [mode, allThemes] = await Promise.all([
			themeIpc.getActiveThemeMode(),
			themeIpc.listThemes(),
		]);
		themes = allThemes;
		activeMode = mode;
		writeCachedMode(mode);
		applyTheme();

		if (!themeChangedUnlisten) {
			themeChangedUnlisten = await listen('theme-changed', () => {
				void loadTheme();
			});
		}
	} catch (e) {
		error = getErrorMessage(e);
	}
}

async function setThemeMode(mode: ThemeMode): Promise<void> {
	activeMode = mode;
	writeCachedMode(mode);
	applyTheme();
	try {
		await themeIpc.setActiveThemeMode(mode);
	} catch (e) {
		error = getErrorMessage(e);
	}
}

async function createTheme(
	name: string,
	baseTheme: string,
	cssVars: string,
): Promise<Theme | null> {
	error = null;
	try {
		const theme = await themeIpc.createTheme(name, baseTheme, cssVars);
		themes = [...themes, theme];
		return theme;
	} catch (e) {
		error = getErrorMessage(e);
		return null;
	}
}

async function updateTheme(
	id: string,
	name?: string,
	baseTheme?: string,
	cssVars?: string,
): Promise<Theme | null> {
	error = null;
	try {
		const updated = await themeIpc.updateTheme(id, name, baseTheme, cssVars);
		themes = themes.map((t) => (t.id === id ? updated : t));
		// Re-apply if this is the active theme
		if (activeMode === id) {
			applyTheme();
		}
		return updated;
	} catch (e) {
		error = getErrorMessage(e);
		return null;
	}
}

async function deleteTheme(id: string): Promise<void> {
	error = null;
	try {
		await themeIpc.deleteTheme(id);
		themes = themes.filter((t) => t.id !== id);
		// 削除した theme が active だった場合、backend は LG Dark に reset する
		if (activeMode === id) {
			activeMode = BUILTIN_THEME_DARK;
			writeCachedMode(activeMode);
			applyTheme();
		}
	} catch (e) {
		error = getErrorMessage(e);
	}
}

async function exportTheme(id: string): Promise<string | null> {
	error = null;
	try {
		return await themeIpc.exportThemeJson(id);
	} catch (e) {
		error = getErrorMessage(e);
		return null;
	}
}

async function importTheme(json: string): Promise<Theme | null> {
	error = null;
	try {
		const theme = await themeIpc.importThemeJson(json);
		themes = [...themes, theme];
		return theme;
	} catch (e) {
		error = getErrorMessage(e);
		return null;
	}
}

// E-1 fix: module load 時に cached mode で即時 apply (IPC 待ちで default light mode が一瞬出る問題を解消)。
// loadTheme が後で IPC で正しい theme 状態を fetch して再 apply する (custom themes の tokens は IPC 必須)。
if (typeof document !== 'undefined') {
	applyTheme();
}

export const themeStore = {
	get themes() {
		return themes;
	},
	get activeMode() {
		return activeMode;
	},
	get resolvedMode() {
		return resolvedMode;
	},
	get error() {
		return error;
	},
	loadTheme,
	setThemeMode,
	createTheme,
	updateTheme,
	deleteTheme,
	exportTheme,
	importTheme,
};
