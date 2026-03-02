use tauri::State;

use crate::db::DbState;
use crate::models::watched_path::WatchedPath;
use crate::services::watched_path_service;
use crate::utils::error::AppError;
use crate::watcher::WatcherState;

#[tauri::command]
pub fn cmd_add_watched_path(
    db: State<DbState>,
    watcher: State<WatcherState>,
    path: String,
    label: Option<String>,
) -> Result<WatchedPath, AppError> {
    watched_path_service::add_watched_path(
        &db,
        &watcher,
        crate::models::watched_path::CreateWatchedPathInput { path, label },
    )
}

#[tauri::command]
pub fn cmd_get_watched_paths(db: State<DbState>) -> Result<Vec<WatchedPath>, AppError> {
    watched_path_service::get_watched_paths(&db)
}

#[tauri::command]
pub fn cmd_remove_watched_path(
    db: State<DbState>,
    watcher: State<WatcherState>,
    id: String,
) -> Result<(), AppError> {
    watched_path_service::remove_watched_path(&db, &watcher, &id)
}
