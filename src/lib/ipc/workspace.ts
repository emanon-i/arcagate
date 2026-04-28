import { invoke } from '@tauri-apps/api/core';
import type { GitStatus } from '$lib/types/git';
import type { Item } from '$lib/types/item';
import type {
	UpdateWorkspaceWallpaperInput,
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

// PH-issue-009: 壁紙画像を <app_data_dir>/wallpapers/<uuid>.<ext> にコピー、保存先パスを返す。
export async function saveWallpaperFile(sourcePath: string): Promise<string> {
	return invoke<string>('cmd_save_wallpaper_file', { sourcePath });
}

// PH-issue-009: Workspace 壁紙設定を更新 (path / opacity / blur)、null path でクリア。
export async function setWorkspaceWallpaper(
	input: UpdateWorkspaceWallpaperInput,
): Promise<Workspace> {
	return invoke<Workspace>('cmd_set_workspace_wallpaper', { input });
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
