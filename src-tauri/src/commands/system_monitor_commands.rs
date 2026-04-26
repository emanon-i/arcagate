use crate::services::system_monitor_service::{self, DiskStats, SystemStats};
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_get_system_stats() -> Result<SystemStats, AppError> {
    system_monitor_service::get_system_stats()
}

#[tauri::command]
pub fn cmd_get_disk_stats() -> Result<Vec<DiskStats>, AppError> {
    system_monitor_service::get_disk_stats()
}
