import { listen } from '@tauri-apps/api/event';
import * as themeIpc from '$lib/ipc/theme';
import type { Theme, ThemeMode } from '$lib/types/theme';
import { getErrorMessage } from '$lib/utils/format-error';

let themes = $state<Theme[]>([]);
let activeMode = $state<ThemeMode>('dark');
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
