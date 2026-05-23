import { invoke } from '@tauri-apps/api/core';
import type { GitStatus } from '$lib/types/git';
import type { Item } from '$lib/types/item';
import type {
	LibraryWallpaper,
	UpdateLibraryWallpaperInput,
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

// PH-CF-100: `deleteItems` は **必須引数** (implicit default を持たない契約)。
// true: workspace に紐付く item を Library からも削除 (sys-ws-* tag ∪ widget config item_ids
// の和集合、 他 workspace 非参照のみ)。 false: workspace と widget だけ消し item は残す。
// E6 (PH-CF-300) で confirm modal が user 選択を渡せるよう、 ここを最初から bool 引数にしておく。
export async function deleteWorkspace(id: string, deleteItems: boolean): Promise<void> {
	return invoke<void>('cmd_delete_workspace', { id, deleteItems });
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

// PH-CF-700 C8: Library 画面の壁紙設定 (グローバル) を取得 / 更新する。 path / opacity / blur
// は backend の wallpaper_service で clamp 済み。 `save_wallpaper_file` (workspace 壁紙と共用)
// で copy した path を `setLibraryWallpaper` でこのグローバル設定に紐付ける。
export async function getLibraryWallpaper(): Promise<LibraryWallpaper> {
	return invoke<LibraryWallpaper>('cmd_get_library_wallpaper');
}

export async function setLibraryWallpaper(
	input: UpdateLibraryWallpaperInput,
): Promise<LibraryWallpaper> {
	return invoke<LibraryWallpaper>('cmd_set_library_wallpaper', { input });
}

export async function getFrequentItems(limit: number): Promise<Item[]> {
	return invoke<Item[]>('cmd_get_frequent_items', { limit });
}

export async function getRecentItems(limit: number): Promise<Item[]> {
	return invoke<Item[]>('cmd_get_recent_items', { limit });
}

/**
 * R9-A: frecency (frequency × recency) ranking。
 * Mozilla-inspired bucketed weight、palette empty-state で merged recent+frequent の代替。
 */
export async function getFrecencyItems(limit: number): Promise<Item[]> {
	return invoke<Item[]>('cmd_get_frecency_items', { limit });
}

export async function getFolderItems(): Promise<Item[]> {
	return invoke<Item[]>('cmd_get_folder_items');
}

/**
 * Phase L-1 (2026-05-07 user 検収 Library 真因 #1):
 * 複数 path の git_status を 1 IPC に集約。backend で並列実行。
 * 旧 N+1 問題 (各フォルダ別 IPC × N) を解消。
 *
 * 入力 paths と同じ順序で entry が返る。git repo でない / エラーは `status: null` で silent skip。
 */
export interface GitStatusBatchEntry {
	path: string;
	status: GitStatus | null;
}

export async function getGitStatusesBatch(paths: string[]): Promise<GitStatusBatchEntry[]> {
	return invoke<GitStatusBatchEntry[]>('cmd_get_git_statuses_batch', { paths });
}

/**
 * #10: フォルダの実 mtime (filesystem 更新日時、ms epoch) を batch 取得。
 * フォルダ監視 widget の「更新日時」ソート用。取得失敗時は `mtimeMs: 0`。
 * 入力 paths と同じ順序で entry が返る。
 */
export interface FolderMtimeEntry {
	path: string;
	mtimeMs: number;
}

export async function getFolderMtimesBatch(paths: string[]): Promise<FolderMtimeEntry[]> {
	return invoke<FolderMtimeEntry[]>('cmd_get_folder_mtimes_batch', { paths });
}
