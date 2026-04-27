use crate::services::kill_switch_service::{self, KillSwitchResult};

/// PH-470: 起動時 / オンデマンドで disabled.json を fetch して、
/// 現在 version が無効化対象か確認する。
///
/// 失敗時は best-effort で `disabled=false` を返す (offline / fetch error でアプリを止めない)。
#[tauri::command]
pub fn cmd_check_kill_switch(current_version: String) -> KillSwitchResult {
    kill_switch_service::check(&current_version)
}
