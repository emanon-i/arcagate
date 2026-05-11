// Bookmark 関連 IPC (U-2)。

use crate::services::bookmark_service::{self, ParsedBookmark};
use crate::utils::error::AppError;

/// bookmark.html (Netscape Bookmark Format) を parse して URL リストを返す。
/// path は OS file picker から渡される。
#[tauri::command]
pub fn cmd_parse_bookmark_file(path: String) -> Result<Vec<ParsedBookmark>, AppError> {
    bookmark_service::parse_bookmark_file(&path)
}
