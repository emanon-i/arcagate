// Image scrap 関連 IPC (U-5)。

use crate::services::image_scrap_service;
use crate::utils::error::AppError;
use tauri::{AppHandle, Manager};

/// U-5: 画像 file を `<app_data_dir>/image-scraps/<uuid>.<ext>` にコピーして保存先 path を返す。
/// FE: D&D / settings 経由で取得した画像 path を本 IPC に渡し、 widget config.path には保存後 path を入れる。
/// asset protocol scope `$APPDATA/image-scraps/**` で webview 読み込み可。
#[tauri::command]
pub fn cmd_save_image_scrap(app: AppHandle, source_path: String) -> Result<String, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Io(std::io::Error::other(e.to_string())))?;
    image_scrap_service::save_image_scrap(&app_data_dir, &source_path)
}
