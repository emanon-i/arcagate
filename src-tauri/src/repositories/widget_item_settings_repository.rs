// PH-504 batch-109: Per-item settings persistence repository
//
// (widget_id, item_key) → settings の CRUD + bulk lookup + last_seen_at update。

use rusqlite::{params, Connection};

use crate::models::widget_item_settings::WidgetItemSettings;
use crate::utils::error::AppError;

const SELECT_COLUMNS: &str = "widget_id, item_key, opener, custom_label, custom_icon, favorite, last_seen_at, created_at, updated_at";

fn row_to_settings(row: &rusqlite::Row) -> rusqlite::Result<WidgetItemSettings> {
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
    let mut stmt = conn.prepare(&format!(
        "SELECT {SELECT_COLUMNS} FROM widget_item_settings WHERE widget_id = ?1 AND item_key = ?2"
    ))?;
    let result = stmt
        .query_row(params![widget_id, item_key], row_to_settings)
        .ok();
    Ok(result)
}

pub fn list_for_widget(
    conn: &Connection,
    widget_id: &str,
) -> Result<Vec<WidgetItemSettings>, AppError> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {SELECT_COLUMNS} FROM widget_item_settings WHERE widget_id = ?1 ORDER BY item_key"
    ))?;
    let rows = stmt
        .query_map(params![widget_id], row_to_settings)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

/// Upsert with explicit fields (callers responsible for merging with existing values when patching).
#[allow(clippy::too_many_arguments)]
pub fn upsert(
    conn: &Connection,
    widget_id: &str,
    item_key: &str,
    opener: Option<&str>,
    custom_label: Option<&str>,
    custom_icon: Option<&str>,
    favorite: bool,
    last_seen_at: Option<i64>,
) -> Result<WidgetItemSettings, AppError> {
    conn.execute(
        "INSERT INTO widget_item_settings
            (widget_id, item_key, opener, custom_label, custom_icon, favorite, last_seen_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT (widget_id, item_key) DO UPDATE SET
            opener = excluded.opener,
            custom_label = excluded.custom_label,
            custom_icon = excluded.custom_icon,
            favorite = excluded.favorite,
            last_seen_at = COALESCE(excluded.last_seen_at, widget_item_settings.last_seen_at),
            updated_at = strftime('%s', 'now')",
        params![
            widget_id,
            item_key,
            opener,
            custom_label,
            custom_icon,
            i64::from(favorite),
            last_seen_at,
        ],
    )?;
    find(conn, widget_id, item_key)?
        .ok_or_else(|| AppError::NotFound(format!("widget_item_settings({widget_id}, {item_key})")))
}

/// last_seen_at だけを更新 (entries scan 中の active item を mark)。
/// 行が無ければ何もしない (settings が無い item は記録しない、orphan tracking 用)。
pub fn touch_last_seen(
    conn: &Connection,
    widget_id: &str,
    item_keys: &[String],
    timestamp: i64,
) -> Result<usize, AppError> {
    if item_keys.is_empty() {
        return Ok(0);
    }
    let placeholders = item_keys
        .iter()
        .enumerate()
        .map(|(i, _)| format!("?{}", i + 3))
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!(
        "UPDATE widget_item_settings
         SET last_seen_at = ?1, updated_at = strftime('%s', 'now')
         WHERE widget_id = ?2 AND item_key IN ({placeholders})"
    );
    let mut params_vec: Vec<&dyn rusqlite::ToSql> = Vec::with_capacity(2 + item_keys.len());
    params_vec.push(&timestamp);
    params_vec.push(&widget_id);
    for k in item_keys {
        params_vec.push(k);
    }
    let n = conn.execute(&sql, params_vec.as_slice())?;
    Ok(n)
}

pub fn delete_one(conn: &Connection, widget_id: &str, item_key: &str) -> Result<bool, AppError> {
    let n = conn.execute(
        "DELETE FROM widget_item_settings WHERE widget_id = ?1 AND item_key = ?2",
        params![widget_id, item_key],
    )?;
    Ok(n > 0)
}

pub fn delete_all_for_widget(conn: &Connection, widget_id: &str) -> Result<usize, AppError> {
    let n = conn.execute(
        "DELETE FROM widget_item_settings WHERE widget_id = ?1",
        params![widget_id],
    )?;
    Ok(n)
}

/// `last_seen_at < cutoff` の行を削除。
pub fn delete_orphans(
    conn: &Connection,
    widget_id: &str,
    cutoff_unix: i64,
) -> Result<usize, AppError> {
    let n = conn.execute(
        "DELETE FROM widget_item_settings
         WHERE widget_id = ?1
           AND (last_seen_at IS NULL OR last_seen_at < ?2)",
        params![widget_id, cutoff_unix],
    )?;
    Ok(n)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrations::{apply_pragmas, migrations};

    fn open_test_db() -> rusqlite::Connection {
        let mut conn = rusqlite::Connection::open_in_memory().unwrap();
        apply_pragmas(&conn).unwrap();
        migrations().to_latest(&mut conn).unwrap();
        // FK 用の workspace + widget を準備
        conn.execute(
            "INSERT INTO workspaces (id, name) VALUES ('ws1', 'Test')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO workspace_widgets
                (id, workspace_id, widget_type, position_x, position_y, width, height, config)
             VALUES ('w1', 'ws1', 'exe_folder', 0, 0, 2, 2, NULL)",
            [],
        )
        .unwrap();
        conn
    }

    #[test]
    fn upsert_inserts_then_updates() {
        let conn = open_test_db();
        let s = upsert(
            &conn,
            "w1",
            "item-a",
            Some("vscode"),
            None,
            None,
            true,
            Some(1234),
        )
        .unwrap();
        assert_eq!(s.opener.as_deref(), Some("vscode"));
        assert!(s.favorite);
        // 上書き
        let s2 = upsert(
            &conn,
            "w1",
            "item-a",
            None,
            Some("custom"),
            None,
            false,
            Some(2345),
        )
        .unwrap();
        assert_eq!(s2.opener, None);
        assert_eq!(s2.custom_label.as_deref(), Some("custom"));
        assert!(!s2.favorite);
        assert_eq!(s2.last_seen_at, Some(2345));
    }

    #[test]
    fn find_returns_none_for_missing_key() {
        let conn = open_test_db();
        assert!(find(&conn, "w1", "missing").unwrap().is_none());
    }

    #[test]
    fn touch_last_seen_updates_only_existing_rows() {
        let conn = open_test_db();
        upsert(&conn, "w1", "item-a", None, None, None, false, Some(100)).unwrap();
        upsert(&conn, "w1", "item-b", None, None, None, false, Some(100)).unwrap();
        let n = touch_last_seen(&conn, "w1", &["item-a".into(), "item-c".into()], 555).unwrap();
        assert_eq!(n, 1);
        assert_eq!(
            find(&conn, "w1", "item-a").unwrap().unwrap().last_seen_at,
            Some(555)
        );
        assert_eq!(
            find(&conn, "w1", "item-b").unwrap().unwrap().last_seen_at,
            Some(100)
        );
    }

    #[test]
    fn delete_orphans_removes_old_or_null_rows() {
        let conn = open_test_db();
        upsert(&conn, "w1", "fresh", None, None, None, false, Some(1000)).unwrap();
        upsert(&conn, "w1", "stale", None, None, None, false, Some(100)).unwrap();
        upsert(&conn, "w1", "never", None, None, None, false, None).unwrap();
        let n = delete_orphans(&conn, "w1", 500).unwrap();
        assert_eq!(n, 2);
        assert!(find(&conn, "w1", "fresh").unwrap().is_some());
        assert!(find(&conn, "w1", "stale").unwrap().is_none());
        assert!(find(&conn, "w1", "never").unwrap().is_none());
    }

    #[test]
    fn delete_all_for_widget_clears_widget_settings() {
        let conn = open_test_db();
        upsert(&conn, "w1", "a", None, None, None, false, None).unwrap();
        upsert(&conn, "w1", "b", None, None, None, false, None).unwrap();
        let n = delete_all_for_widget(&conn, "w1").unwrap();
        assert_eq!(n, 2);
        assert!(list_for_widget(&conn, "w1").unwrap().is_empty());
    }
}
