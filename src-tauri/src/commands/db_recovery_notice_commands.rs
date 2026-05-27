//! DB self-recovery 通知 (marker file) を取得 / 確認済み化する IPC エントリ。
//!
//! 詳細は `services::db_recovery_notice` 参照。 marker file は app data dir 直下に
//! 置かれ、 ack されるまで起動毎に banner で再表示される (永続性が要件)。

use tauri::{AppHandle, Manager, Runtime};

use crate::services::db_recovery_notice::{self, DbRecoveryNotice};

fn resolve_app_data_dir<R: Runtime>(app: &AppHandle<R>) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data dir: {e}"))
}

/// marker file から DB recovery 通知を読み出す。 file 不在 / parse 失敗時は `None`。
#[tauri::command]
pub fn cmd_get_db_recovery_notice<R: Runtime>(
    app: AppHandle<R>,
) -> Result<Option<DbRecoveryNotice>, String> {
    let dir = resolve_app_data_dir(&app)?;
    Ok(db_recovery_notice::read_marker(&dir))
}

/// 「了解」 = marker file を削除して以降の起動で banner を出さなくする。
#[tauri::command]
pub fn cmd_ack_db_recovery_notice<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let dir = resolve_app_data_dir(&app)?;
    db_recovery_notice::clear_marker(&dir).map_err(|e| format!("failed to clear marker: {e}"))
}
