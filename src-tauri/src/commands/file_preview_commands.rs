// File preview 関連 IPC (U-6)。

use crate::services::file_preview_service::{self, FilePreview};
use crate::utils::error::AppError;

/// テキストファイルの preview metadata + content + Markdown frontmatter を返す。
#[tauri::command]
pub fn cmd_read_file_preview(path: String) -> Result<FilePreview, AppError> {
    file_preview_service::read_file_preview(&path)
}
