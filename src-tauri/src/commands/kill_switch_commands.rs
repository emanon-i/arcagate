use crate::services::kill_switch_service::{self, KillSwitchResult};

/// PH-470: 起動時 / オンデマンドで disabled.json を fetch して、
/// 現在 version が無効化対象か確認する。
///
/// 失敗時は best-effort で `disabled=false` を返す (offline / fetch error でアプリを止めない)。
///
/// W-2 (2026-05-19): HTTP GET (5 秒 timeout) を同期実行すると起動経路で main thread を
/// 最大 5 秒 block するため `spawn_blocking` で worker thread に逃がす。
/// JoinError (closure panic) 時も best-effort で `disabled=false` を返す。
#[tauri::command]
pub async fn cmd_check_kill_switch(current_version: String) -> KillSwitchResult {
    let fallback_version = current_version.clone();
    tauri::async_runtime::spawn_blocking(move || kill_switch_service::check(&current_version))
        .await
        .unwrap_or(KillSwitchResult {
            disabled: false,
            message: None,
            current_version: fallback_version,
        })
}
