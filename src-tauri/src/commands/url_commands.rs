// URL 関連 IPC コマンド (U-1: spec docs/l0_ideas/screens-and-flows.md Library §)。

use crate::services::url_service;
use crate::utils::error::AppError;

/// Web ページの title を best-effort で取得して返す。
/// HTTP 失敗 / title 無し時は URL の host を fallback。 errors は invalid URL のみ。
#[tauri::command]
pub fn cmd_fetch_url_title(url: String) -> Result<String, AppError> {
    url_service::fetch_url_title(&url)
}
