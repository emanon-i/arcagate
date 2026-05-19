// Bookmark 関連 IPC (U-2)。

use crate::services::bookmark_service::{self, ParsedBookmark};
use crate::utils::error::AppError;

/// bookmark.html (Netscape Bookmark Format) を parse して URL リストを返す。
/// path は OS file picker から渡される。
///
/// W-2 (2026-05-19): bookmark HTML の file read を worker thread に逃がす。
#[tauri::command]
pub async fn cmd_parse_bookmark_file(path: String) -> Result<Vec<ParsedBookmark>, AppError> {
    tauri::async_runtime::spawn_blocking(move || bookmark_service::parse_bookmark_file(&path))
        .await
        .map_err(AppError::from_join_error)?
}
