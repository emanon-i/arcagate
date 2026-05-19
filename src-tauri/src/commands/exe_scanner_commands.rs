use tauri::{AppHandle, Manager, State};

use crate::services::exe_scanner_service::{self, ExeFolderEntry};
use crate::services::file_search_state::ExeScanState;
use crate::utils::error::AppError;

/// 監視フォルダ配下を walk して exe / script を列挙する。
///
/// W-2 (2026-05-19): depth 1-3 の filesystem walk は main thread を block するため
/// `spawn_blocking` で worker thread に逃がす。
/// W-3 (2026-05-19): `search_id` で cancel 可能。同じ search_id で再呼び出しすると
/// 古い scan は自動 cancel される (path / depth 変更時の re-scan)。
#[tauri::command]
pub async fn cmd_scan_exe_folders(
    app: AppHandle,
    search_id: String,
    root: String,
    depth: u8,
) -> Result<Vec<ExeFolderEntry>, AppError> {
    let token = app.state::<ExeScanState>().0.register(&search_id);
    let result = tauri::async_runtime::spawn_blocking(move || {
        exe_scanner_service::scan_exe_folders_with_cancel(&root, depth, &token)
    })
    .await;
    app.state::<ExeScanState>().0.complete(&search_id);
    result.map_err(AppError::from_join_error)?
}

/// 進行中の exe scan を中断する (W-3)。
/// 該当 search_id が見つからない場合は false (no-op)。
#[tauri::command]
pub fn cmd_cancel_exe_scan(state: State<ExeScanState>, search_id: String) -> bool {
    state.0.cancel(&search_id)
}
