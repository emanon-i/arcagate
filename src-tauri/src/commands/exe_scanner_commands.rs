use crate::services::exe_scanner_service::{self, ExeFolderEntry};
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_scan_exe_folders(root: String, depth: u8) -> Result<Vec<ExeFolderEntry>, AppError> {
    exe_scanner_service::scan_exe_folders(&root, depth)
}
