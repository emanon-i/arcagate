use tauri::State;

use crate::models::watched_path::WatchedPath;
use crate::services::AppServices;
use crate::utils::error::AppError;
use crate::watcher::WatcherState;

#[tauri::command]
pub fn cmd_add_watched_path(
    services: State<AppServices>,
    watcher: State<WatcherState>,
    path: String,
    label: Option<String>,
) -> Result<WatchedPath, AppError> {
    services.watched_path.add_watched_path(
        &watcher,
        crate::models::watched_path::CreateWatchedPathInput { path, label },
    )
}

#[tauri::command]
pub fn cmd_get_watched_paths(services: State<AppServices>) -> Result<Vec<WatchedPath>, AppError> {
    services.watched_path.get_watched_paths()
}

#[tauri::command]
pub fn cmd_remove_watched_path(
    services: State<AppServices>,
    watcher: State<WatcherState>,
    id: String,
) -> Result<(), AppError> {
    services.watched_path.remove_watched_path(&watcher, &id)
}
