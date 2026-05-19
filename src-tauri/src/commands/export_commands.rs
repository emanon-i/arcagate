use tauri::{AppHandle, Manager};

use crate::services::AppServices;
use crate::utils::error::AppError;

/// W-2 (2026-05-19): item 数に対し線形な JSON file write + DB read を worker thread に逃がす。
#[tauri::command]
pub async fn cmd_export_json(app: AppHandle, output_path: String) -> Result<(), AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        app.state::<AppServices>().export.export_json(&output_path)
    })
    .await
    .map_err(AppError::from_join_error)?
}

/// W-2 (2026-05-19): JSON file read + DB merge import を worker thread に逃がす。
#[tauri::command]
pub async fn cmd_import_json(app: AppHandle, input_path: String) -> Result<(), AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        app.state::<AppServices>().export.import_json(&input_path)
    })
    .await
    .map_err(AppError::from_join_error)?
}
