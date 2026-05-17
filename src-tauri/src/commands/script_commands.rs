//! #11: スクリプト監視 widget の Tauri command (thin layer)。

use crate::services::script_runner_service::{self, ScriptEntry};
use crate::utils::error::AppError;

/// 監視フォルダを走査して allowlist 拡張子のスクリプトを列挙する。
#[tauri::command]
pub fn cmd_scan_script_folder(root: String, depth: u8) -> Result<Vec<ScriptEntry>, AppError> {
    script_runner_service::scan_script_folder(&root, depth)
}

/// スクリプトを実行する。`folder` 配下の allowlist スクリプトのみ実行可
/// (path traversal / 拡張子 allowlist の検証は service 層が行う)。
#[tauri::command]
pub fn cmd_run_script(folder: String, script_path: String) -> Result<(), AppError> {
    script_runner_service::run_script(&folder, &script_path)
}
