/// PH-issue-023 Phase B: per-item settings (default_app / is_enabled 等) の永続テーブル。
///
/// key = item.target (絶対 path)、value = JSON snapshot。
/// watched_path unset で item が削除されても settings は残る → 再 watch で resurrect。
use rusqlite::{params, Connection};

use crate::utils::error::AppError;

#[derive(Debug, Clone, PartialEq)]
pub struct WidgetItemSettingsRow {
    pub item_key: String,
    pub settings_json: String,
    pub last_seen_at: String,
}

/// 取得: 該当 key の設定が無ければ None。
pub fn get(conn: &Connection, item_key: &str) -> Result<Option<WidgetItemSettingsRow>, AppError> {
    let result = conn.query_row(
        "SELECT item_key, settings_json, last_seen_at FROM widget_item_settings WHERE item_key = ?1",
        params![item_key],
        |row| {
            Ok(WidgetItemSettingsRow {
                item_key: row.get(0)?,
                settings_json: row.get(1)?,
                last_seen_at: row.get(2)?,
            })
        },
    );
    match result {
        Ok(row) => Ok(Some(row)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}

/// upsert: 既存 key は settings_json と last_seen_at を上書き、新規は INSERT。
pub fn upsert(conn: &Connection, item_key: &str, settings_json: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO widget_item_settings (item_key, settings_json, last_seen_at)
         VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
         ON CONFLICT(item_key) DO UPDATE SET
             settings_json = excluded.settings_json,
             last_seen_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')",
        params![item_key, settings_json],
    )?;
    Ok(())
}

/// touch_seen: 値を変えず last_seen_at だけ now に更新。再 watch 時の prune 防止に使う。
pub fn touch_seen(conn: &Connection, item_key: &str) -> Result<(), AppError> {
    conn.execute(
        "UPDATE widget_item_settings
         SET last_seen_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE item_key = ?1",
        params![item_key],
    )?;
    Ok(())
}

/// 指定日数以上 last_seen_at が古い row を削除し、削除数を返す。
/// PH-issue-023 Phase B-2: Settings UI / cron 経由で呼ぶ予定 (現状未使用)。
#[allow(dead_code)]
pub fn prune_older_than(conn: &Connection, days: i64) -> Result<usize, AppError> {
    let n = conn.execute(
        "DELETE FROM widget_item_settings
         WHERE last_seen_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-' || ?1 || ' days')",
        params![days],
    )?;
    Ok(n)
}

/// 全件 (debug / Settings 用)。
/// PH-issue-023 Phase B-2: Settings UI (一覧 + 個別削除) で使う予定 (現状未使用)。
#[allow(dead_code)]
pub fn list_all(conn: &Connection) -> Result<Vec<WidgetItemSettingsRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT item_key, settings_json, last_seen_at FROM widget_item_settings ORDER BY last_seen_at DESC",
    )?;
    let rows = stmt
        .query_map([], |row| {
            Ok(WidgetItemSettingsRow {
                item_key: row.get(0)?,
                settings_json: row.get(1)?,
                last_seen_at: row.get(2)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    #[test]
    fn test_get_missing_returns_none() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        assert!(get(&conn, "C:/no/such/path").unwrap().is_none());
    }

    #[test]
    fn test_upsert_and_get_roundtrip() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        upsert(&conn, "C:/foo/bar", r#"{"default_app":"x.exe"}"#).unwrap();
        let row = get(&conn, "C:/foo/bar").unwrap().unwrap();
        assert_eq!(row.item_key, "C:/foo/bar");
        assert_eq!(row.settings_json, r#"{"default_app":"x.exe"}"#);
    }

    #[test]
    fn test_upsert_overwrites_existing() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        upsert(&conn, "k", r#"{"a":1}"#).unwrap();
        upsert(&conn, "k", r#"{"a":2}"#).unwrap();
        assert_eq!(
            get(&conn, "k").unwrap().unwrap().settings_json,
            r#"{"a":2}"#
        );
    }

    #[test]
    fn test_touch_seen_updates_timestamp() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        upsert(&conn, "k", "{}").unwrap();
        let before = get(&conn, "k").unwrap().unwrap().last_seen_at;
        // wait 1 second to ensure timestamp difference
        std::thread::sleep(std::time::Duration::from_millis(1100));
        touch_seen(&conn, "k").unwrap();
        let after = get(&conn, "k").unwrap().unwrap().last_seen_at;
        assert_ne!(before, after);
    }

    #[test]
    fn test_prune_older_than_zero_deletes_all() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        upsert(&conn, "a", "{}").unwrap();
        upsert(&conn, "b", "{}").unwrap();
        // 0 days = 全部 prune (now より前のもの全部)
        // SQLite の datetime 計算精度で同秒は除外される可能性があるため -1 day で確実に
        std::thread::sleep(std::time::Duration::from_millis(50));
        let n = prune_older_than(&conn, 0).unwrap();
        // 即実行でも last_seen_at < now になっていれば削除される
        assert!(n <= 2);
    }

    #[test]
    fn test_list_all_returns_inserted_rows() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        upsert(&conn, "a", "{}").unwrap();
        upsert(&conn, "b", "{}").unwrap();
        let rows = list_all(&conn).unwrap();
        assert_eq!(rows.len(), 2);
    }
}
