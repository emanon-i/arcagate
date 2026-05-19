// URL 関連 IPC コマンド (U-1: spec docs/l0_ideas/screens-and-flows.md Library §)。

use crate::services::url_service;
use crate::utils::error::AppError;

/// Web ページの title を best-effort で取得して返す。
/// HTTP 失敗 / title 無し時は URL の host を fallback。 errors は invalid URL のみ。
///
/// W-2 (2026-05-19): HTTP GET (5 秒 timeout) を同期実行すると main thread を最大 5 秒
/// block するため `spawn_blocking` で worker thread に逃がす。
#[tauri::command]
pub async fn cmd_fetch_url_title(url: String) -> Result<String, AppError> {
    tauri::async_runtime::spawn_blocking(move || url_service::fetch_url_title(&url))
        .await
        .map_err(AppError::from_join_error)?
}
