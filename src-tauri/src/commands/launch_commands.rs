use tauri::State;

use crate::models::launch::{ItemStats, LaunchLog};
use crate::services::AppServices;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_launch_item(services: State<AppServices>, item_id: String) -> Result<(), AppError> {
    services.launch.launch_item(&item_id, "palette")
}

#[tauri::command]
pub fn cmd_get_item_stats(
    services: State<AppServices>,
    item_id: String,
) -> Result<Option<ItemStats>, AppError> {
    services.launch.get_item_stats(&item_id)
}

#[tauri::command]
pub fn cmd_list_recent(
    services: State<AppServices>,
    limit: Option<i64>,
) -> Result<Vec<LaunchLog>, AppError> {
    services.launch.list_recent(limit.unwrap_or(20))
}

#[tauri::command]
pub fn cmd_list_frequent(
    services: State<AppServices>,
    limit: Option<i64>,
) -> Result<Vec<ItemStats>, AppError> {
    services.launch.list_frequent(limit.unwrap_or(20))
}
