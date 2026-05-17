//! #5: クリーン状態リセット (factory reset) の Tauri command (thin layer)。

use tauri::State;

use crate::services::{reset_service, AppServices};
use crate::utils::error::AppError;

/// ライブラリ / ワークスペースのデータを段階選択で初期化する。
/// 設定のリセットは frontend (resetAllSettings) が担当。
#[tauri::command]
pub fn cmd_factory_reset(
    services: State<AppServices>,
    reset_library: bool,
    reset_workspace: bool,
) -> Result<(), AppError> {
    reset_service::factory_reset(&services.db, reset_library, reset_workspace)
}
