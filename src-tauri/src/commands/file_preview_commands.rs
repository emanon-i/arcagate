// File preview 関連 IPC (U-6)。

use crate::services::file_preview_service::{self, FilePreview};
use crate::utils::error::AppError;

/// テキストファイルの preview metadata + content + Markdown frontmatter を返す。
///
/// W-2 (2026-05-19): 最大 256KB の file open + read は対象 file の Defender scan 経路を
/// 踏み main thread を block するため `spawn_blocking` で worker thread に逃がす。
#[tauri::command]
pub async fn cmd_read_file_preview(path: String) -> Result<FilePreview, AppError> {
    tauri::async_runtime::spawn_blocking(move || file_preview_service::read_file_preview(&path))
        .await
        .map_err(AppError::from_join_error)?
}
