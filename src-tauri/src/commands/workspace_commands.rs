use tauri::{AppHandle, Manager, State};

use crate::db::DbState;
use crate::models::git::GitStatus;
use crate::models::item::Item;
use crate::models::workspace::{
    AddWidgetInput, CreateWorkspaceInput, UpdateWidgetPositionInput, UpdateWorkspaceInput,
    UpdateWorkspaceWallpaperInput, Workspace, WorkspaceWidget,
};
use crate::services::{wallpaper_service, workspace_service};
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_create_workspace(db: State<DbState>, name: String) -> Result<Workspace, AppError> {
    workspace_service::create_workspace(&db, CreateWorkspaceInput { name })
}

#[tauri::command]
pub fn cmd_list_workspaces(db: State<DbState>) -> Result<Vec<Workspace>, AppError> {
    workspace_service::list_workspaces(&db)
}

#[tauri::command]
pub fn cmd_update_workspace(
    db: State<DbState>,
    id: String,
    name: Option<String>,
) -> Result<Workspace, AppError> {
    workspace_service::update_workspace(&db, &id, UpdateWorkspaceInput { name })
}

#[tauri::command]
pub fn cmd_delete_workspace(db: State<DbState>, id: String) -> Result<(), AppError> {
    workspace_service::delete_workspace(&db, &id)
}

#[tauri::command]
pub fn cmd_add_widget(
    db: State<DbState>,
    workspace_id: String,
    widget_type: String,
) -> Result<WorkspaceWidget, AppError> {
    use crate::models::workspace::WidgetType;
    let wt = WidgetType::from_str(&widget_type)
        .ok_or_else(|| AppError::InvalidInput(format!("unknown widget_type: {}", widget_type)))?;
    workspace_service::add_widget(
        &db,
        AddWidgetInput {
            workspace_id,
            widget_type: wt,
        },
    )
}

#[tauri::command]
pub fn cmd_list_widgets(
    db: State<DbState>,
    workspace_id: String,
) -> Result<Vec<WorkspaceWidget>, AppError> {
    workspace_service::list_widgets(&db, &workspace_id)
}

#[tauri::command]
pub fn cmd_update_widget_position(
    db: State<DbState>,
    id: String,
    position_x: i64,
    position_y: i64,
    width: i64,
    height: i64,
) -> Result<WorkspaceWidget, AppError> {
    workspace_service::update_widget_position(
        &db,
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
    db: State<DbState>,
    id: String,
    config: Option<String>,
) -> Result<WorkspaceWidget, AppError> {
    workspace_service::update_widget_config(&db, &id, config.as_deref())
}

#[tauri::command]
pub fn cmd_remove_widget(db: State<DbState>, id: String) -> Result<(), AppError> {
    workspace_service::remove_widget(&db, &id)
}

#[tauri::command]
pub fn cmd_get_frequent_items(db: State<DbState>, limit: i64) -> Result<Vec<Item>, AppError> {
    workspace_service::get_frequent_items(&db, limit)
}

#[tauri::command]
pub fn cmd_get_recent_items(db: State<DbState>, limit: i64) -> Result<Vec<Item>, AppError> {
    workspace_service::get_recent_items(&db, limit)
}

#[tauri::command]
pub fn cmd_get_folder_items(db: State<DbState>) -> Result<Vec<Item>, AppError> {
    workspace_service::get_folder_items(&db)
}

#[tauri::command]
pub fn cmd_git_status(path: String) -> Result<GitStatus, AppError> {
    workspace_service::git_status(&path)
}

/// PH-issue-009: 画像を `<app_data_dir>/wallpapers/<uuid>.<ext>` にコピーして保存先パスを返す。
/// UI 側で file picker → このコマンドを呼んで保存後 path を取得し、
/// `cmd_set_workspace_wallpaper` で workspace に紐付ける。
#[tauri::command]
pub fn cmd_save_wallpaper_file(app: AppHandle, source_path: String) -> Result<String, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Io(std::io::Error::other(e.to_string())))?;
    wallpaper_service::save_wallpaper_file(&app_data_dir, &source_path)
}

/// PH-issue-009: Workspace の壁紙設定を更新 (path / opacity / blur)。
/// `path = None` で壁紙クリア。opacity / blur は service 側で clamp。
#[tauri::command]
pub fn cmd_set_workspace_wallpaper(
    db: State<DbState>,
    input: UpdateWorkspaceWallpaperInput,
) -> Result<Workspace, AppError> {
    wallpaper_service::set_workspace_wallpaper(&db, input)
}
