use tauri::State;

use crate::launcher;
use crate::services::file_search_service::{self, FileEntry};
use crate::services::file_search_state::FileSearchState;
use crate::utils::error::AppError;

/// Cancel 可能な files 列挙 (PH-420 / Nielsen H3)。
/// `search_id` を指定すると、同 ID で `cmd_cancel_file_search` を呼んで中断できる。
/// 同じ search_id を再呼び出しすると、古い検索は自動 cancel される。
#[tauri::command]
pub fn cmd_list_files(
    state: State<FileSearchState>,
    search_id: String,
    root: String,
    depth: u8,
    limit: usize,
) -> Result<Vec<FileEntry>, AppError> {
    let token = state.register(&search_id);
    let result = file_search_service::list_files_with_cancel(&root, depth, limit, &token);
    state.complete(&search_id);
    result
}

/// 進行中の検索を中断 (PH-420 / Nielsen H3)。
/// 該当 search_id が見つからない場合は false (no-op)。
#[tauri::command]
pub fn cmd_cancel_file_search(state: State<FileSearchState>, search_id: String) -> bool {
    state.cancel(&search_id)
}

/// 任意の path（file / folder）を OS デフォルトで開く。
/// Library 経由でない一時アクセス用（FileSearchWidget 等）。
#[tauri::command]
pub fn cmd_open_path(path: String) -> Result<(), AppError> {
    launcher::launch_folder(&path)
}
