//! #11: スクリプト監視 widget の Tauri command (thin layer)。

use tauri::State;

use crate::services::script_runner_service::{self, ScriptEntry};
use crate::services::AppServices;
use crate::utils::error::AppError;

/// 監視フォルダを走査して allowlist 拡張子のスクリプトを列挙する。
#[tauri::command]
pub fn cmd_scan_script_folder(root: String, depth: u8) -> Result<Vec<ScriptEntry>, AppError> {
    script_runner_service::scan_script_folder(&root, depth)
}

/// スクリプトを実行する。`folder` 配下の allowlist スクリプトのみ実行可
/// (path traversal / 拡張子 allowlist の検証は service 層が行う)。
///
/// audit F15 (2026-05-18): 初回実行時はユーザー確認を要求する。 未確認なら
/// `launch.confirmation_required` を返し、 frontend が確認ダイアログを表示する
/// (実行対象は canonical path)。 確認は path traversal / 拡張子検証を通過した
/// canonical path をキーに記録する。
#[tauri::command]
pub fn cmd_run_script(
    services: State<AppServices>,
    folder: String,
    script_path: String,
) -> Result<(), AppError> {
    let (canonical, _ext) = script_runner_service::validate_script(&folder, &script_path)?;
    let key = canonical.to_string_lossy().to_string();
    if !services.launch.is_script_confirmed(&key)? {
        return Err(AppError::ConfirmationRequired(key));
    }
    script_runner_service::run_script(&folder, &script_path)
}

/// audit F15 (2026-05-18): スクリプトを実行確認済みとして記録する。
/// frontend が初回実行確認ダイアログでユーザー承認を得た後に呼ぶ。
/// `folder` 配下の許可スクリプトであることを検証してから canonical path で記録する。
#[tauri::command]
pub fn cmd_confirm_script(
    services: State<AppServices>,
    folder: String,
    script_path: String,
) -> Result<(), AppError> {
    let (canonical, _ext) = script_runner_service::validate_script(&folder, &script_path)?;
    services.launch.confirm_script(&canonical.to_string_lossy())
}
