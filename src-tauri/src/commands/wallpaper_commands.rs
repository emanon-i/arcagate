// PH-499 batch-109: Wallpaper image storage commands.
//
// 壁紙画像の **ファイル保存** だけを Rust 側に持ち、
// path / opacity / blur 等の **設定値** は既存の cmd_get_config / cmd_set_config を使う
// (新規 config commands を増やさない方針)。

use tauri::{AppHandle, Manager};

use crate::services::wallpaper_service;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_save_wallpaper_file(app: AppHandle, src_path: String) -> Result<String, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Io(std::io::Error::other(e.to_string())))?;
    wallpaper_service::save_wallpaper_file(&app_data_dir, &src_path)
}

#[tauri::command]
pub fn cmd_delete_wallpaper_file(stored_path: String) -> Result<(), AppError> {
    wallpaper_service::delete_wallpaper_file(&stored_path)
}
