use tauri::{AppHandle, Manager, State};

use crate::services::exe_scanner_service::{self, ExeFolderEntry};
use crate::services::file_search_state::ExeScanState;
use crate::services::AppServices;
use crate::utils::error::AppError;

/// 監視フォルダ配下を walk して対象ファイル (= `extensions` で指定) を列挙する。
///
/// W-2 (2026-05-19): depth は filesystem walk で main thread を block するため
/// `spawn_blocking` で worker thread に逃がす。
/// W-3 (2026-05-19): `search_id` で cancel 可能。 同じ search_id で再呼び出しすると
/// 古い scan は自動 cancel される (path / depth / extensions 変更時の re-scan)。
/// PH-CF-400 (2026-05-23): 監視拡張子を呼び出し側引数に変更 (ハードコード撤廃)、
/// 検出契約は service 側の型 doc 参照 (第1階層フォルダ = 1 entry)。
#[tauri::command]
pub async fn cmd_scan_exe_folders(
    app: AppHandle,
    search_id: String,
    root: String,
    depth: u8,
    extensions: Vec<String>,
) -> Result<Vec<ExeFolderEntry>, AppError> {
    let token = app.state::<ExeScanState>().0.register(&search_id);
    let result = tauri::async_runtime::spawn_blocking(move || {
        exe_scanner_service::scan_exe_folders_with_cancel(&root, depth, &extensions, &token)
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

/// PH-CF-900 A1-4: cache hit (= 同一入力で前回 scan 済) なら entries を即返す。 miss は `None`。
///
/// 起動経路 (widget mount) で `cmd_get_exe_scan_cached` を先に呼び、 hit なら UI を即描画し
/// (cold walk 10s+ をブロックしない)、 background で `cmd_scan_exe_folders` の fresh scan を
/// 並行して走らせて結果を `cmd_save_exe_scan_cache` で persist する経路を意図する
/// (`features/backend/exe-scanner.md` §scan キャッシュ契約)。
#[tauri::command]
pub fn cmd_get_exe_scan_cached(
    services: State<AppServices>,
    root: String,
    depth: u8,
    extensions: Vec<String>,
) -> Result<Option<Vec<ExeFolderEntry>>, AppError> {
    let key = exe_scanner_service::build_scan_cache_key(&root, depth, &extensions);
    exe_scanner_service::get_cached_scan(&services.db, &key)
}

/// PH-CF-900 A1-4: fresh scan 結果を cache に persist する。 entries 0 件でも save する
/// (= 「scan は走ったが対象なし」 を記録、 次回 mount でも cache hit になる)。
#[tauri::command]
pub fn cmd_save_exe_scan_cache(
    services: State<AppServices>,
    root: String,
    depth: u8,
    extensions: Vec<String>,
    entries: Vec<ExeFolderEntry>,
) -> Result<(), AppError> {
    let key = exe_scanner_service::build_scan_cache_key(&root, depth, &extensions);
    exe_scanner_service::save_cached_scan(&services.db, &key, &entries)
}

/// PH-CF-900 A1-4: cache を明示 invalidate する (watcher 検知 / user 強制 refresh 時)。
/// no-op safe (該当 key が無くても error にしない)。
#[tauri::command]
pub fn cmd_invalidate_exe_scan_cache(
    services: State<AppServices>,
    root: String,
    depth: u8,
    extensions: Vec<String>,
) -> Result<(), AppError> {
    let key = exe_scanner_service::build_scan_cache_key(&root, depth, &extensions);
    exe_scanner_service::invalidate_cached_scan(&services.db, &key)
}
