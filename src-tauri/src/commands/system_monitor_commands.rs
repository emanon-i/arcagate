use crate::services::system_monitor_service::{self, DiskStats, NetworkStats, SystemStats};
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_get_system_stats() -> Result<SystemStats, AppError> {
    system_monitor_service::get_system_stats()
}

#[tauri::command]
pub fn cmd_get_disk_stats() -> Result<Vec<DiskStats>, AppError> {
    system_monitor_service::get_disk_stats()
}

/// PH-issue-042 / 検収項目 #27: ネットワーク stats (累積受信 / 送信バイト、interface 別)。
#[tauri::command]
pub fn cmd_get_network_stats() -> Result<Vec<NetworkStats>, AppError> {
    system_monitor_service::get_network_stats()
}
