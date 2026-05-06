//! Watcher 用の薄い service 層 (V3 解消、A3 PR-C)。
//!
//! `watcher/mod.rs` が repositories を直接 use していた違反を解消するため、
//! file system 監視で必要な DB 操作を本 service に集約する。各関数は
//! `&DbState` を受け、内部で lock + repository call をまとめて実行する。

use std::path::Path;

use crate::db::DbState;
use crate::repositories::{item_repository, watched_path_repository};
use crate::utils::error::AppError;

/// 監視対象として登録済みのアクティブパス一覧を返す。
/// DB lock 失敗 / クエリ失敗時は空 Vec を返す (起動時 best-effort、watcher 全体は止めない)。
pub fn list_active_paths(db: &DbState) -> Vec<String> {
    let conn = match db.0.lock() {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    watched_path_repository::find_active(&conn)
        .unwrap_or_default()
        .into_iter()
        .map(|wp| wp.path)
        .collect()
}

/// rename event を受けて、items.target が `old_path` に一致する行を `new_path` に更新する。
/// 戻り値は更新行数 (0 = 該当 item なし、1+ = 更新済)。
pub fn rename_item_target(
    db: &DbState,
    old_path: &Path,
    new_path: &Path,
) -> Result<usize, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::update_target_by_path(&conn, old_path, new_path)
}

/// `path` を target に持つ tracked item が存在するか判定する。
/// remove event で「toast 嵐」を防ぐ filter 用 (DB に登録されている tracked item のみ通知)。
/// クエリ失敗時は false を返す (誤判定を抑制 = false negative 寄り)。
pub fn is_tracked_target(db: &DbState, path: &str) -> bool {
    let conn = match db.0.lock() {
        Ok(c) => c,
        Err(_) => return false,
    };
    matches!(
        item_repository::find_by_target(&conn, path),
        Ok(Some(it)) if it.is_tracked
    )
}
