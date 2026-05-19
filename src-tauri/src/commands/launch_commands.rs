use tauri::{AppHandle, Manager, State};

use crate::models::launch::{ItemStats, LaunchLog};
use crate::services::AppServices;
use crate::utils::error::AppError;

/// W-2 (2026-05-19): item 起動は外部 process spawn を伴うため `spawn_blocking` で
/// worker thread に逃がす。 DB lock の早期解放は launch_service 側で対応済 (W-1)。
#[tauri::command]
pub async fn cmd_launch_item(app: AppHandle, item_id: String) -> Result<(), AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        app.state::<AppServices>()
            .launch
            .launch_item(&item_id, "palette")
    })
    .await
    .map_err(AppError::from_join_error)?
}

/// audit F15 (2026-05-18): Command / Script アイテムを起動確認済みとして記録する。
/// frontend が初回起動確認ダイアログでユーザー承認を得た後に呼ぶ。
#[tauri::command]
pub fn cmd_confirm_item(services: State<AppServices>, item_id: String) -> Result<(), AppError> {
    services.launch.confirm_item(&item_id)
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
///
/// W-2 (2026-05-19): path stat + `explorer.exe` spawn を worker thread に逃がす。
#[tauri::command]
pub async fn cmd_reveal_in_explorer(path: String) -> Result<(), AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        use std::path::Path;

        // audit F8 (2026-05-18): WebView から渡る raw path。 制御文字拒否 + 実在検証。
        crate::launcher::validate_existing_path(&path)?;

        let p = Path::new(&path);
        let metadata = std::fs::metadata(p).map_err(|e| {
            AppError::InvalidInput(format!("path not accessible: {} ({})", path, e))
        })?;

        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
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
    })
    .await
    .map_err(AppError::from_join_error)?
}
