import { invoke } from '@tauri-apps/api/core';
import type { GitStatus } from '$lib/types/git';
import type { Item } from '$lib/types/item';
import type {
	WallpaperSettings,
	WidgetType,
	Workspace,
	WorkspaceWidget,
} from '$lib/types/workspace';

export async function createWorkspace(name: string): Promise<Workspace> {
	return invoke<Workspace>('cmd_create_workspace', { name });
}

export async function listWorkspaces(): Promise<Workspace[]> {
	return invoke<Workspace[]>('cmd_list_workspaces');
}

export async function updateWorkspace(id: string, name: string): Promise<Workspace> {
	return invoke<Workspace>('cmd_update_workspace', { id, name });
}

export async function deleteWorkspace(id: string): Promise<void> {
	return invoke<void>('cmd_delete_workspace', { id });
}

export async function addWidget(
	workspaceId: string,
	widgetType: WidgetType,
): Promise<WorkspaceWidget> {
	return invoke<WorkspaceWidget>('cmd_add_widget', { workspaceId, widgetType });
}

export async function listWidgets(workspaceId: string): Promise<WorkspaceWidget[]> {
	return invoke<WorkspaceWidget[]>('cmd_list_widgets', { workspaceId });
}

export async function updateWidgetPosition(
	id: string,
	positionX: number,
	positionY: number,
	width: number,
	height: number,
): Promise<WorkspaceWidget> {
	return invoke<WorkspaceWidget>('cmd_update_widget_position', {
		id,
		positionX,
		positionY,
		width,
		height,
	});
}

export async function updateWidgetConfig(
	id: string,
	config: string | null,
): Promise<WorkspaceWidget> {
	return invoke<WorkspaceWidget>('cmd_update_widget_config', { id, config });
}

export async function removeWidget(id: string): Promise<void> {
	return invoke<void>('cmd_remove_widget', { id });
}

export async function getFrequentItems(limit: number): Promise<Item[]> {
	return invoke<Item[]>('cmd_get_frequent_items', { limit });
}

export async function getRecentItems(limit: number): Promise<Item[]> {
	return invoke<Item[]>('cmd_get_recent_items', { limit });
}

export async function getFolderItems(): Promise<Item[]> {
	return invoke<Item[]>('cmd_get_folder_items');
}

export async function getGitStatus(path: string): Promise<GitStatus> {
	return invoke<GitStatus>('cmd_git_status', { path });
}

// PH-499: 背景壁紙
export async function saveWallpaper(srcPath: string): Promise<string> {
	return invoke<string>('cmd_save_wallpaper', { srcPath });
}

export async function setWorkspaceWallpaper(
	workspaceId: string,
	path: string | null,
	opacity: number,
	blur: number,
): Promise<Workspace> {
	return invoke<Workspace>('cmd_set_workspace_wallpaper', {
		workspaceId,
		path,
		opacity,
		blur,
	});
}

export async function clearWorkspaceWallpaper(workspaceId: string): Promise<Workspace> {
	return invoke<Workspace>('cmd_clear_workspace_wallpaper', { workspaceId });
}

export async function setLibraryWallpaper(
	path: string | null,
	opacity: number,
	blur: number,
): Promise<void> {
	return invoke<void>('cmd_set_library_wallpaper', { path, opacity, blur });
}

export async function getLibraryWallpaper(): Promise<WallpaperSettings> {
	return invoke<WallpaperSettings>('cmd_get_library_wallpaper');
}
