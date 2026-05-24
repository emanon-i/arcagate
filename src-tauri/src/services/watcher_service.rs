//! Watcher 用の薄い service 層 (V3 解消、A3 PR-C)。
//!
//! `watcher/mod.rs` が repositories を直接 use していた違反を解消するため、
//! file system 監視で必要な DB 操作を本 service に集約する。各関数は
//! `&DbState` を受け、内部で lock + repository call をまとめて実行する。

use std::path::Path;

use crate::db::DbState;
use crate::repositories::{item_repository, watched_path_repository, widget_item_hides_repository};
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

/// アイテムライフサイクル契約 (Bug 7 / D14 rename): folder / file rename イベントで
/// `items.target` / `items.source_entry_key` / `widget_item_hides.item_target` の
/// **3 箇所を同期更新** する (旧実装は target のみ更新で `source_entry_key` と hide
/// の key 空間が stale 化して exe-folder で重複 item を生んでいた)。
///
/// 1 transaction で 3 経路を atomic に更新。 戻り値は影響を受けた item 行数。
pub fn rename_item_target(
    db: &DbState,
    old_path: &Path,
    new_path: &Path,
) -> Result<usize, AppError> {
    let mut conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let tx = conn.transaction()?;
    let item_rows = item_repository::rename_path_prefix(&tx, old_path, new_path)?;
    widget_item_hides_repository::rename_path_prefix(&tx, old_path, new_path)?;
    tx.commit()?;
    Ok(item_rows)
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

/// アイテムライフサイクル契約 (U-3): fs Remove イベントで該当 tracked item を
/// `is_enabled=false` でグレーアウト化する (削除はしない、 user 判断は frontend toast
/// アクションで)。 戻り値は影響を受けた item id (toast に渡す)、 該当なしなら None。
pub fn disable_tracked_target(db: &DbState, path: &str) -> Option<String> {
    let conn = match db.0.lock() {
        Ok(c) => c,
        Err(_) => return None,
    };
    let item = match item_repository::find_by_target(&conn, path) {
        Ok(Some(it)) if it.is_tracked => it,
        _ => return None,
    };
    if !item.is_enabled {
        // 既に disabled (前回 fs event で処理済) → 二重 toast を避けるため None。
        return None;
    }
    match item_repository::set_is_enabled(&conn, &item.id, false) {
        Ok(_) => Some(item.id),
        Err(e) => {
            log::warn!("disable_tracked_target failed for {}: {}", path, e);
            None
        }
    }
}
