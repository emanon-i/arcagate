import { invoke } from '@tauri-apps/api/core';
import type { Theme, ThemeMode } from '$lib/types/theme';

export async function listThemes(): Promise<Theme[]> {
	return invoke<Theme[]>('cmd_list_themes');
}

export async function getTheme(id: string): Promise<Theme> {
	return invoke<Theme>('cmd_get_theme', { id });
}

export async function createTheme(
	name: string,
	baseTheme: string,
	cssVars: string,
): Promise<Theme> {
	return invoke<Theme>('cmd_create_theme', { name, baseTheme, cssVars });
}

export async function updateTheme(
	id: string,
	name?: string,
	baseTheme?: string,
	cssVars?: string,
): Promise<Theme> {
	return invoke<Theme>('cmd_update_theme', { id, name, baseTheme, cssVars });
}

export async function deleteTheme(id: string): Promise<void> {
	return invoke<void>('cmd_delete_theme', { id });
}

export async function getActiveThemeMode(): Promise<ThemeMode> {
	return invoke<ThemeMode>('cmd_get_active_theme_mode');
}

export async function setActiveThemeMode(mode: ThemeMode): Promise<void> {
	return invoke<void>('cmd_set_active_theme_mode', { mode });
}

export async function exportThemeJson(id: string): Promise<string> {
	return invoke<string>('cmd_export_theme_json', { id });
}

export async function importThemeJson(json: string): Promise<Theme> {
	return invoke<Theme>('cmd_import_theme_json', { json });
}
