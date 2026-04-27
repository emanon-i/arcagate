// PH-504: Per-item settings persistence — repository layer
use rusqlite::{params, Connection, OptionalExtension};

use crate::models::widget_item_settings::{UpsertWidgetItemSettingsInput, WidgetItemSettings};
use crate::utils::error::AppError;

const SELECT_COLS: &str =
    "widget_id, item_key, opener, custom_label, custom_icon, favorite, last_seen_at, created_at, updated_at";

pub(crate) fn row_to_settings(row: &rusqlite::Row) -> rusqlite::Result<WidgetItemSettings> {
    let favorite_int: i64 = row.get(5)?;
    Ok(WidgetItemSettings {
        widget_id: row.get(0)?,
        item_key: row.get(1)?,
        opener: row.get(2)?,
        custom_label: row.get(3)?,
        custom_icon: row.get(4)?,
        favorite: favorite_int != 0,
        last_seen_at: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

pub fn find(
    conn: &Connection,
    widget_id: &str,
    item_key: &str,
) -> Result<Option<WidgetItemSettings>, AppError> {
    let sql = format!(
        "SELECT {SELECT_COLS} FROM widget_item_settings WHERE widget_id = ?1 AND item_key = ?2"
    );
    Ok(conn
        .query_row(&sql, params![widget_id, item_key], row_to_settings)
        .optional()?)
}

pub fn list_by_widget(
    conn: &Connection,
    widget_id: &str,
) -> Result<Vec<WidgetItemSettings>, AppError> {
    let sql = format!(
        "SELECT {SELECT_COLS} FROM widget_item_settings WHERE widget_id = ?1 ORDER BY item_key"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt
        .query_map(params![widget_id], row_to_settings)?
        .collect::<rusqlite::Result<Vec<WidgetItemSettings>>>()?;
    Ok(rows)
}

/// upsert: 既存があれば指定 field のみ更新、なければ insert。
/// 全 field None なら record だけ確保 (last_seen_at update 用途で活躍)。
pub fn upsert(
    conn: &Connection,
    input: &UpsertWidgetItemSettingsInput,
) -> Result<WidgetItemSettings, AppError> {
    let existing = find(conn, &input.widget_id, &input.item_key)?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    if let Some(existing) = existing {
        // partial update: 引数 None は既存値維持
        let opener = input.opener.clone().or(existing.opener);
        let custom_label = input.custom_label.clone().or(existing.custom_label);
        let custom_icon = input.custom_icon.clone().or(existing.custom_icon);
        let favorite = input.favorite.unwrap_or(existing.favorite);
        let last_seen_at = input.last_seen_at.or(existing.last_seen_at);
        conn.execute(
            "UPDATE widget_item_settings
             SET opener = ?1, custom_label = ?2, custom_icon = ?3, favorite = ?4,
                 last_seen_at = ?5, updated_at = ?6
             WHERE widget_id = ?7 AND item_key = ?8",
            params![
                opener,
                custom_label,
                custom_icon,
                if favorite { 1 } else { 0 },
                last_seen_at,
                now,
                input.widget_id,
                input.item_key,
            ],
        )?;
    } else {
        let favorite = input.favorite.unwrap_or(false);
        conn.execute(
            "INSERT INTO widget_item_settings (widget_id, item_key, opener, custom_label,
                 custom_icon, favorite, last_seen_at, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
            params![
                input.widget_id,
                input.item_key,
                input.opener,
                input.custom_label,
                input.custom_icon,
                if favorite { 1 } else { 0 },
                input.last_seen_at,
                now,
            ],
        )?;
    }
    let updated = find(conn, &input.widget_id, &input.item_key)?
        .ok_or_else(|| AppError::NotFound(format!("{}::{}", input.widget_id, input.item_key)))?;
    Ok(updated)
}

pub fn delete(conn: &Connection, widget_id: &str, item_key: &str) -> Result<(), AppError> {
    let n = conn.execute(
        "DELETE FROM widget_item_settings WHERE widget_id = ?1 AND item_key = ?2",
        params![widget_id, item_key],
    )?;
    if n == 0 {
        return Err(AppError::NotFound(format!("{widget_id}::{item_key}")));
    }
    Ok(())
}

pub fn delete_all_for_widget(conn: &Connection, widget_id: &str) -> Result<usize, AppError> {
    let n = conn.execute(
        "DELETE FROM widget_item_settings WHERE widget_id = ?1",
        params![widget_id],
    )?;
    Ok(n)
}

/// 指定 widget で `last_seen_at < cutoff` の orphan record を物理削除
pub fn prune_orphans(
    conn: &Connection,
    widget_id: &str,
    cutoff_secs: i64,
) -> Result<usize, AppError> {
    let n = conn.execute(
        "DELETE FROM widget_item_settings
         WHERE widget_id = ?1 AND (last_seen_at IS NULL OR last_seen_at < ?2)",
        params![widget_id, cutoff_secs],
    )?;
    Ok(n)
}

/// `last_seen_at` のみを bulk update (entries scan 後に呼ぶ)
pub fn touch_last_seen(
    conn: &Connection,
    widget_id: &str,
    item_keys: &[String],
    now_secs: i64,
) -> Result<(), AppError> {
    if item_keys.is_empty() {
        return Ok(());
    }
    let tx = conn.unchecked_transaction()?;
    {
        let mut stmt = tx.prepare(
            "UPDATE widget_item_settings
             SET last_seen_at = ?1, updated_at = ?1
             WHERE widget_id = ?2 AND item_key = ?3",
        )?;
        for key in item_keys {
            stmt.execute(params![now_secs, widget_id, key])?;
        }
    }
    tx.commit()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    fn input(widget: &str, key: &str) -> UpsertWidgetItemSettingsInput {
        UpsertWidgetItemSettingsInput {
            widget_id: widget.to_string(),
            item_key: key.to_string(),
            ..Default::default()
        }
    }

    #[test]
    fn upsert_inserts_new_row() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        let mut i = input("w1", "key1");
        i.favorite = Some(true);
        i.opener = Some("explorer".to_string());
        let s = upsert(&conn, &i).unwrap();
        assert_eq!(s.widget_id, "w1");
        assert_eq!(s.item_key, "key1");
        assert!(s.favorite);
        assert_eq!(s.opener.as_deref(), Some("explorer"));
    }

    #[test]
    fn upsert_updates_existing_partial() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        let mut first = input("w1", "key1");
        first.opener = Some("explorer".to_string());
        first.favorite = Some(true);
        upsert(&conn, &first).unwrap();
        // 2 回目: opener 変更なし、favorite を false に
        let mut second = input("w1", "key1");
        second.favorite = Some(false);
        let updated = upsert(&conn, &second).unwrap();
        assert!(!updated.favorite);
        // opener は維持される
        assert_eq!(updated.opener.as_deref(), Some("explorer"));
    }

    #[test]
    fn delete_removes_record() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        upsert(&conn, &input("w1", "key1")).unwrap();
        delete(&conn, "w1", "key1").unwrap();
        assert!(find(&conn, "w1", "key1").unwrap().is_none());
    }

    #[test]
    fn delete_nonexistent_returns_not_found() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        let result = delete(&conn, "w1", "missing");
        assert!(result.is_err());
    }

    #[test]
    fn delete_all_for_widget_removes_all() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        upsert(&conn, &input("w1", "a")).unwrap();
        upsert(&conn, &input("w1", "b")).unwrap();
        upsert(&conn, &input("w2", "c")).unwrap();
        let removed = delete_all_for_widget(&conn, "w1").unwrap();
        assert_eq!(removed, 2);
        // w2 の record は残る
        assert!(find(&conn, "w2", "c").unwrap().is_some());
    }

    #[test]
    fn list_by_widget_returns_sorted() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        upsert(&conn, &input("w1", "z")).unwrap();
        upsert(&conn, &input("w1", "a")).unwrap();
        upsert(&conn, &input("w1", "m")).unwrap();
        let list = list_by_widget(&conn, "w1").unwrap();
        let keys: Vec<String> = list.iter().map(|s| s.item_key.clone()).collect();
        assert_eq!(keys, vec!["a", "m", "z"]);
    }

    #[test]
    fn touch_last_seen_updates_timestamps() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        upsert(&conn, &input("w1", "a")).unwrap();
        upsert(&conn, &input("w1", "b")).unwrap();
        touch_last_seen(&conn, "w1", &["a".into(), "b".into()], 9_999).unwrap();
        let a = find(&conn, "w1", "a").unwrap().unwrap();
        let b = find(&conn, "w1", "b").unwrap().unwrap();
        assert_eq!(a.last_seen_at, Some(9_999));
        assert_eq!(b.last_seen_at, Some(9_999));
    }

    #[test]
    fn prune_orphans_drops_stale() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        upsert(&conn, &input("w1", "fresh")).unwrap();
        upsert(&conn, &input("w1", "stale")).unwrap();
        // fresh のみ touch
        touch_last_seen(&conn, "w1", &["fresh".into()], 10_000).unwrap();
        let removed = prune_orphans(&conn, "w1", 5_000).unwrap();
        assert_eq!(removed, 1);
        assert!(find(&conn, "w1", "fresh").unwrap().is_some());
        assert!(find(&conn, "w1", "stale").unwrap().is_none());
    }
}
