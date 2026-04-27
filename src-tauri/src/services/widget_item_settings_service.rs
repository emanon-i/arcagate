// PH-504 batch-109: Per-item settings persistence service
//
// 案 C: entries は揮発、settings は別テーブルで永続 (論理削除なし)。

use crate::db::DbState;
use crate::models::widget_item_settings::{WidgetItemSettings, WidgetItemSettingsPatch};
use crate::repositories::widget_item_settings_repository as repo;
use crate::utils::error::AppError;

pub fn get(
    db: &DbState,
    widget_id: &str,
    item_key: &str,
) -> Result<Option<WidgetItemSettings>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::find(&conn, widget_id, item_key)
}

pub fn list(db: &DbState, widget_id: &str) -> Result<Vec<WidgetItemSettings>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::list_for_widget(&conn, widget_id)
}

/// Patch (None = 変更なし) で既存値とマージして upsert。
pub fn patch(
    db: &DbState,
    widget_id: &str,
    item_key: &str,
    patch: WidgetItemSettingsPatch,
    last_seen_at: Option<i64>,
) -> Result<WidgetItemSettings, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let existing = repo::find(&conn, widget_id, item_key)?;

    let opener = match patch.opener {
        Some(v) => v,
        None => existing.as_ref().and_then(|s| s.opener.clone()),
    };
    let custom_label = match patch.custom_label {
        Some(v) => v,
        None => existing.as_ref().and_then(|s| s.custom_label.clone()),
    };
    let custom_icon = match patch.custom_icon {
        Some(v) => v,
        None => existing.as_ref().and_then(|s| s.custom_icon.clone()),
    };
    let favorite = match patch.favorite {
        Some(v) => v,
        None => existing.as_ref().is_some_and(|s| s.favorite),
    };

    repo::upsert(
        &conn,
        widget_id,
        item_key,
        opener.as_deref(),
        custom_label.as_deref(),
        custom_icon.as_deref(),
        favorite,
        last_seen_at,
    )
}

pub fn touch_seen(
    db: &DbState,
    widget_id: &str,
    item_keys: Vec<String>,
    timestamp: i64,
) -> Result<usize, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::touch_last_seen(&conn, widget_id, &item_keys, timestamp)
}

pub fn delete(db: &DbState, widget_id: &str, item_key: &str) -> Result<bool, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::delete_one(&conn, widget_id, item_key)
}

pub fn delete_all(db: &DbState, widget_id: &str) -> Result<usize, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::delete_all_for_widget(&conn, widget_id)
}

pub fn prune_orphans(db: &DbState, widget_id: &str, cutoff_unix: i64) -> Result<usize, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::delete_orphans(&conn, widget_id, cutoff_unix)
}
