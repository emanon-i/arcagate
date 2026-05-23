use tauri::{AppHandle, Manager, State};

use crate::models::git::GitStatusBatchEntry;
use crate::models::item::Item;
use crate::models::workspace::{
    AddWidgetInput, CreateWorkspaceInput, UpdateWidgetPositionInput, UpdateWorkspaceInput,
    UpdateWorkspaceWallpaperInput, Workspace, WorkspaceWidget,
};
use crate::services::{wallpaper_service, workspace_service, AppServices};
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_create_workspace(
    services: State<AppServices>,
    name: String,
) -> Result<Workspace, AppError> {
    services
        .workspace
        .create_workspace(CreateWorkspaceInput { name })
}

#[tauri::command]
pub fn cmd_list_workspaces(services: State<AppServices>) -> Result<Vec<Workspace>, AppError> {
    services.workspace.list_workspaces()
}

#[tauri::command]
pub fn cmd_update_workspace(
    services: State<AppServices>,
    id: String,
    name: Option<String>,
) -> Result<Workspace, AppError> {
    services
        .workspace
        .update_workspace(&id, UpdateWorkspaceInput { name })
}

/// PH-CF-100: `delete_items` は **必須引数** (implicit default を持たない)。 frontend / CLI 双方で
/// 「workspace を消すときに紐付く item を Library からも消すかどうか」 を明示する契約。
/// 省略は型 / シリアライザ レベルで弾かれる (Codex review: implicit default は recurrence-unsafe)。
#[tauri::command]
pub fn cmd_delete_workspace(
    services: State<AppServices>,
    id: String,
    delete_items: bool,
) -> Result<(), AppError> {
    services.workspace.delete_workspace(&id, delete_items)
}

#[tauri::command]
pub fn cmd_add_widget(
    services: State<AppServices>,
    workspace_id: String,
    widget_type: String,
) -> Result<WorkspaceWidget, AppError> {
    use crate::models::workspace::WidgetType;
    let wt = WidgetType::from_str(&widget_type)
        .ok_or_else(|| AppError::InvalidInput(format!("unknown widget_type: {}", widget_type)))?;
    services.workspace.add_widget(AddWidgetInput {
        workspace_id,
        widget_type: wt,
    })
}

#[tauri::command]
pub fn cmd_list_widgets(
    services: State<AppServices>,
    workspace_id: String,
) -> Result<Vec<WorkspaceWidget>, AppError> {
    services.workspace.list_widgets(&workspace_id)
}

#[tauri::command]
pub fn cmd_update_widget_position(
    services: State<AppServices>,
    id: String,
    position_x: i64,
    position_y: i64,
    width: i64,
    height: i64,
) -> Result<WorkspaceWidget, AppError> {
    services.workspace.update_widget_position(
        &id,
        UpdateWidgetPositionInput {
            position_x,
            position_y,
            width,
            height,
        },
    )
}

#[tauri::command]
pub fn cmd_update_widget_config(
    services: State<AppServices>,
    id: String,
    config: Option<String>,
) -> Result<WorkspaceWidget, AppError> {
    services
        .workspace
        .update_widget_config(&id, config.as_deref())
}

#[tauri::command]
pub fn cmd_remove_widget(services: State<AppServices>, id: String) -> Result<(), AppError> {
    services.workspace.remove_widget(&id)
}

#[tauri::command]
pub fn cmd_get_frequent_items(
    services: State<AppServices>,
    limit: i64,
) -> Result<Vec<Item>, AppError> {
    services.workspace.get_frequent_items(limit)
}

#[tauri::command]
pub fn cmd_get_recent_items(
    services: State<AppServices>,
    limit: i64,
) -> Result<Vec<Item>, AppError> {
    services.workspace.get_recent_items(limit)
}

/// R9-A: frecency (frequency × recency) ranking。Palette empty-state で merged recent+frequent の代替。
#[tauri::command]
pub fn cmd_get_frecency_items(
    services: State<AppServices>,
    limit: i64,
) -> Result<Vec<Item>, AppError> {
    services.workspace.get_frecency_items(limit)
}

#[tauri::command]
pub fn cmd_get_folder_items(services: State<AppServices>) -> Result<Vec<Item>, AppError> {
    services.workspace.get_folder_items()
}

/// Phase L-1 (2026-05-07 user 検収 Library 真因 #1):
/// ProjectsWidget で各フォルダ別に N+1 IPC を発火すると累積数秒の遅延になるため、
/// 本 IPC は paths を batch で受け、内部で並列に実行して 1 roundtrip にまとめる。
///
/// W-2 (2026-05-19): 内部で git process を thread spawn するが、 thread join は
/// main thread を block するため command 全体を `spawn_blocking` で worker thread に逃がす。
#[tauri::command]
pub async fn cmd_get_git_statuses_batch(
    paths: Vec<String>,
) -> Result<Vec<GitStatusBatchEntry>, AppError> {
    tauri::async_runtime::spawn_blocking(move || workspace_service::git_statuses_batch(paths))
        .await
        .map_err(AppError::from_join_error)
}

/// #10: フォルダの実 mtime (filesystem 更新日時) を batch 取得する。
/// フォルダ監視 widget の「更新日時」ソートで DB の `updated_at` ではなく
/// 実フォルダの mtime を参照するため。ロジックは workspace_service に集約。
///
/// W-2 (2026-05-19): N 件の filesystem stat を worker thread に逃がす。
/// JoinError (closure panic) 時は best-effort で空 Vec。
#[tauri::command]
pub async fn cmd_get_folder_mtimes_batch(
    paths: Vec<String>,
) -> Vec<workspace_service::FolderMtimeEntry> {
    tauri::async_runtime::spawn_blocking(move || workspace_service::folder_mtimes_batch(paths))
        .await
        .unwrap_or_default()
}

/// PH-issue-009: 画像を `<app_data_dir>/wallpapers/<uuid>.<ext>` にコピーして保存先パスを返す。
/// UI 側で file picker → このコマンドを呼んで保存後 path を取得し、
/// `cmd_set_workspace_wallpaper` で workspace に紐付ける。
///
/// W-2 (2026-05-19): 画像 file copy を worker thread に逃がす。
#[tauri::command]
pub async fn cmd_save_wallpaper_file(
    app: AppHandle,
    source_path: String,
) -> Result<String, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Io(std::io::Error::other(e.to_string())))?;
    tauri::async_runtime::spawn_blocking(move || {
        wallpaper_service::save_wallpaper_file(&app_data_dir, &source_path)
    })
    .await
    .map_err(AppError::from_join_error)?
}

/// PH-issue-009: Workspace の壁紙設定を更新 (path / opacity / blur)。
/// `path = None` で壁紙クリア。opacity / blur は service 側で clamp。
#[tauri::command]
pub fn cmd_set_workspace_wallpaper(
    services: State<AppServices>,
    input: UpdateWorkspaceWallpaperInput,
) -> Result<Workspace, AppError> {
    wallpaper_service::set_workspace_wallpaper(&services.db, input)
}
