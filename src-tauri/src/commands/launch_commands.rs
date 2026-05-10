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

/// I-2 (2026-05-10): widget context menu「Explorer で開く」 用。
/// 与えられた path を Explorer で reveal (file の場合は親フォルダを開いて選択、folder は開く)。
#[tauri::command]
pub fn cmd_reveal_in_explorer(path: String) -> Result<(), AppError> {
    use std::path::Path;
    use std::process::Command;

    let p = Path::new(&path);
    let metadata = std::fs::metadata(p)
        .map_err(|e| AppError::InvalidInput(format!("path not accessible: {} ({})", path, e)))?;

    #[cfg(target_os = "windows")]
    {
        let result = if metadata.is_dir() {
            Command::new("explorer.exe").arg(&path).spawn()
        } else {
            Command::new("explorer.exe")
                .arg(format!("/select,{}", path))
                .spawn()
        };
        result.map_err(|e| AppError::InvalidInput(format!("explorer spawn failed: {}", e)))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = metadata;
        return Err(AppError::InvalidInput(
            "reveal_in_explorer is Windows-only".to_string(),
        ));
    }

    Ok(())
}
