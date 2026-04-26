use crate::launcher;
use crate::services::file_search_service::{self, FileEntry};
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_list_files(root: String, depth: u8, limit: usize) -> Result<Vec<FileEntry>, AppError> {
    file_search_service::list_files(&root, depth, limit)
}

/// 任意の path（file / folder）を OS デフォルトで開く。
/// Library 経由でない一時アクセス用（FileSearchWidget 等）。
#[tauri::command]
pub fn cmd_open_path(path: String) -> Result<(), AppError> {
    launcher::launch_folder(&path)
}
