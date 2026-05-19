use tauri::{AppHandle, Manager, State};

use crate::launcher;
use crate::services::file_search_service::{self, FileEntry};
use crate::services::file_search_state::FileSearchState;
use crate::utils::error::AppError;

/// Cancel 可能な files 列挙 (PH-420 / Nielsen H3)。
/// `search_id` を指定すると、同 ID で `cmd_cancel_file_search` を呼んで中断できる。
/// 同じ search_id を再呼び出しすると、古い検索は自動 cancel される。
///
/// W-2 (2026-05-19): depth 1-3 / limit 上限の filesystem walk は main thread を
/// block するため `spawn_blocking` で worker thread に逃がす。
#[tauri::command]
pub async fn cmd_list_files(
    app: AppHandle,
    search_id: String,
    root: String,
    depth: u8,
    limit: usize,
) -> Result<Vec<FileEntry>, AppError> {
    let token = app.state::<FileSearchState>().0.register(&search_id);
    let result = tauri::async_runtime::spawn_blocking(move || {
        file_search_service::list_files_with_cancel(&root, depth, limit, &token)
    })
    .await;
    app.state::<FileSearchState>().0.complete(&search_id);
    result.map_err(AppError::from_join_error)?
}

/// 進行中の検索を中断 (PH-420 / Nielsen H3)。
/// 該当 search_id が見つからない場合は false (no-op)。
#[tauri::command]
pub fn cmd_cancel_file_search(state: State<FileSearchState>, search_id: String) -> bool {
    state.0.cancel(&search_id)
}

/// 任意の path（file / folder）を OS デフォルトで開く。
/// Library 経由でない一時アクセス用（FileSearchWidget 等）。
///
/// audit F8 (2026-05-18): path は WebView から直接渡る raw 入力。 起動前に
/// `validate_existing_path` で制御文字拒否 + 実在検証を行う。
///
/// W-2 (2026-05-19): 実在検証の stat + `explorer.exe` spawn を worker thread に逃がす。
#[tauri::command]
pub async fn cmd_open_path(path: String) -> Result<(), AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        launcher::validate_existing_path(&path)?;
        launcher::launch_folder(&path)
    })
    .await
    .map_err(AppError::from_join_error)?
}
