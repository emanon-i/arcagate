import { listen } from '@tauri-apps/api/event';
import * as themeIpc from '$lib/ipc/theme';
import type { Theme, ThemeMode } from '$lib/types/theme';
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
	if (typeof window === 'undefined') return 'dark';
	try {
		const v = window.localStorage.getItem(THEME_MODE_CACHE_KEY);
		if (v === 'dark' || v === 'light' || v === 'system') return v;
		// 任意の custom theme ID も受容 (theme load 後に存在性確認、無効なら fallback)
		if (v && v.length > 0) return v as ThemeMode;
	} catch {
		// localStorage 不可環境は dark default
	}
	return 'dark';
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

function resolveMode(mode: ThemeMode): 'dark' | 'light' {
	if (mode === 'system') {
		if (typeof window !== 'undefined') {
			return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
		return 'dark';
	}
	if (mode === 'dark' || mode === 'light') {
		return mode;
	}
	// Custom theme: resolve from base_theme
	const theme = themes.find((t) => t.id === mode);
	return theme ? (theme.base_theme as 'dark' | 'light') : 'dark';
}

function applyTheme(): void {
	if (typeof document === 'undefined') return;

	const el = document.documentElement;

	// 1. Reset all --ag-* custom properties
	const style = el.style;
	const toRemove: string[] = [];
	for (let i = 0; i < style.length; i++) {
		const prop = style[i];
		if (prop.startsWith('--ag-')) {
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

	// 3. Apply custom theme CSS variables + data-theme attribute
	if (activeMode !== 'dark' && activeMode !== 'light' && activeMode !== 'system') {
		const theme = themes.find((t) => t.id === activeMode);
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
		el.dataset.theme = activeMode;
	} else {
		delete el.dataset.theme;
	}

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
		// If deleted theme was active, backend resets to "dark"
		if (activeMode === id) {
			activeMode = 'dark';
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
