use tauri::State;

use crate::db::DbState;
use crate::models::launch::{ItemStats, LaunchLog};
use crate::services::launch_service;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_launch_item(db: State<DbState>, item_id: String) -> Result<(), AppError> {
    launch_service::launch_item(&db, &item_id)
}

#[tauri::command]
pub fn cmd_list_recent(db: State<DbState>, limit: Option<i64>) -> Result<Vec<LaunchLog>, AppError> {
    launch_service::list_recent(&db, limit.unwrap_or(20))
}

#[tauri::command]
pub fn cmd_list_frequent(
    db: State<DbState>,
    limit: Option<i64>,
) -> Result<Vec<ItemStats>, AppError> {
    launch_service::list_frequent(&db, limit.unwrap_or(20))
}
