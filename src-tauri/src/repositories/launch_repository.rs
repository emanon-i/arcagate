use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::models::launch::{ItemStats, LaunchLog};
use crate::utils::error::AppError;

/// 起動ログを記録し、item_stats を単一トランザクションで更新
pub fn record_launch_and_update_stats(
    conn: &Connection,
    item_id: &str,
    launch_source: &str,
) -> Result<(), AppError> {
    let log_id = Uuid::now_v7().to_string();

    conn.execute(
        "INSERT INTO launch_log (id, item_id, launch_source)
         VALUES (?1, ?2, ?3)",
        params![log_id, item_id, launch_source],
    )?;

    conn.execute(
        "INSERT INTO item_stats (item_id, launch_count, last_launched_at)
         VALUES (?1, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
         ON CONFLICT(item_id) DO UPDATE SET
             launch_count = launch_count + 1,
             last_launched_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')",
        params![item_id],
    )?;

    Ok(())
}

pub fn find_stats_by_item(conn: &Connection, item_id: &str) -> Result<Option<ItemStats>, AppError> {
    let result = conn.query_row(
        "SELECT item_id, launch_count, last_launched_at
         FROM item_stats WHERE item_id = ?1",
        params![item_id],
        |row| {
            Ok(ItemStats {
                item_id: row.get(0)?,
                launch_count: row.get(1)?,
                last_launched_at: row.get(2)?,
            })
        },
    );

    match result {
        Ok(stats) => Ok(Some(stats)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}

/// launched_at DESC 順で最近の起動ログを返す
pub fn list_recent(conn: &Connection, limit: i64) -> Result<Vec<LaunchLog>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, item_id, launched_at, launch_source
         FROM launch_log
         ORDER BY launched_at DESC, id DESC
         LIMIT ?1",
    )?;
    let logs = stmt
        .query_map(params![limit], |row| {
            Ok(LaunchLog {
                id: row.get(0)?,
                item_id: row.get(1)?,
                launched_at: row.get(2)?,
                launch_source: row.get(3)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<LaunchLog>>>()?;
    Ok(logs)
}

/// launch_count DESC 順で頻度の高いアイテムの統計を返す
pub fn list_frequent(conn: &Connection, limit: i64) -> Result<Vec<ItemStats>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT item_id, launch_count, last_launched_at
         FROM item_stats
         ORDER BY launch_count DESC
         LIMIT ?1",
    )?;
    let stats = stmt
        .query_map(params![limit], |row| {
            Ok(ItemStats {
                item_id: row.get(0)?,
                launch_count: row.get(1)?,
                last_launched_at: row.get(2)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<ItemStats>>>()?;
    Ok(stats)
}

/// audit F15 (2026-05-18): Command / Script アイテムが起動確認済みか判定する。
pub fn is_item_confirmed(conn: &Connection, item_id: &str) -> Result<bool, AppError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM confirmed_items WHERE item_id = ?1",
        params![item_id],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}

/// audit F15 (2026-05-18): アイテムを起動確認済みとして記録する (べき等)。
pub fn confirm_item(conn: &Connection, item_id: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO confirmed_items (item_id) VALUES (?1)",
        params![item_id],
    )?;
    Ok(())
}

/// audit F15 (2026-05-18): #11 script widget のスクリプト (canonical path) が
/// 実行確認済みか判定する。
pub fn is_script_confirmed(conn: &Connection, script_path: &str) -> Result<bool, AppError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM confirmed_scripts WHERE script_path = ?1",
        params![script_path],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}

/// audit F15 (2026-05-18): スクリプト (canonical path) を実行確認済みとして記録する (べき等)。
pub fn confirm_script(conn: &Connection, script_path: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO confirmed_scripts (script_path) VALUES (?1)",
        params![script_path],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;
    use crate::models::item::{Item, ItemType};
    use crate::repositories::item_repository;

    fn make_item(id: &str, label: &str) -> Item {
        Item {
            id: id.to_string(),
            item_type: ItemType::Exe,
            label: label.to_string(),
            target: "C:/test/app.exe".to_string(),
            args: None,
            working_dir: None,
            icon_path: None,
            icon_type: None,
            aliases: vec![],
            sort_order: 0,
            is_enabled: true,
            is_tracked: true,
            default_app: None,
            card_override_json: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn test_record_launch_increments_count() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        item_repository::insert(&conn, &make_item("item-001", "App A")).unwrap();

        record_launch_and_update_stats(&conn, "item-001", "palette").unwrap();

        let stats = find_stats_by_item(&conn, "item-001").unwrap().unwrap();
        assert_eq!(stats.item_id, "item-001");
        assert_eq!(stats.launch_count, 1);
        assert!(stats.last_launched_at.is_some());
    }

    #[test]
    fn test_record_launch_twice_gives_count_two() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        item_repository::insert(&conn, &make_item("item-001", "App A")).unwrap();

        record_launch_and_update_stats(&conn, "item-001", "palette").unwrap();
        record_launch_and_update_stats(&conn, "item-001", "palette").unwrap();

        let stats = find_stats_by_item(&conn, "item-001").unwrap().unwrap();
        assert_eq!(stats.launch_count, 2);
    }

    #[test]
    fn test_list_recent_returns_newest_first() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        item_repository::insert(&conn, &make_item("item-001", "App A")).unwrap();
        item_repository::insert(&conn, &make_item("item-002", "App B")).unwrap();

        record_launch_and_update_stats(&conn, "item-001", "palette").unwrap();
        record_launch_and_update_stats(&conn, "item-002", "palette").unwrap();

        let logs = list_recent(&conn, 10).unwrap();
        assert_eq!(logs.len(), 2);
        // 最新の item-002 が先頭
        assert_eq!(logs[0].item_id, "item-002");
        assert_eq!(logs[1].item_id, "item-001");
    }

    #[test]
    fn test_list_frequent_returns_most_launched_first() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        item_repository::insert(&conn, &make_item("item-001", "App A")).unwrap();
        item_repository::insert(&conn, &make_item("item-002", "App B")).unwrap();

        // item-002 を 3 回、item-001 を 1 回起動
        record_launch_and_update_stats(&conn, "item-002", "palette").unwrap();
        record_launch_and_update_stats(&conn, "item-002", "palette").unwrap();
        record_launch_and_update_stats(&conn, "item-002", "palette").unwrap();
        record_launch_and_update_stats(&conn, "item-001", "palette").unwrap();

        let stats = list_frequent(&conn, 10).unwrap();
        assert_eq!(stats.len(), 2);
        assert_eq!(stats[0].item_id, "item-002");
        assert_eq!(stats[0].launch_count, 3);
        assert_eq!(stats[1].item_id, "item-001");
        assert_eq!(stats[1].launch_count, 1);
    }

    // --- audit F15: 起動確認状態 ---

    #[test]
    fn test_item_not_confirmed_by_default() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        item_repository::insert(&conn, &make_item("item-001", "Script")).unwrap();

        assert!(!is_item_confirmed(&conn, "item-001").unwrap());
    }

    #[test]
    fn test_confirm_item_marks_confirmed() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        item_repository::insert(&conn, &make_item("item-001", "Script")).unwrap();

        confirm_item(&conn, "item-001").unwrap();
        assert!(is_item_confirmed(&conn, "item-001").unwrap());
    }

    #[test]
    fn test_confirm_item_is_idempotent() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        item_repository::insert(&conn, &make_item("item-001", "Script")).unwrap();

        confirm_item(&conn, "item-001").unwrap();
        confirm_item(&conn, "item-001").unwrap();
        assert!(is_item_confirmed(&conn, "item-001").unwrap());
    }

    #[test]
    fn test_confirm_state_cascade_deleted_with_item() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        item_repository::insert(&conn, &make_item("item-001", "Script")).unwrap();
        confirm_item(&conn, "item-001").unwrap();

        item_repository::delete(&conn, "item-001").unwrap();
        // item 削除で confirmed_items も CASCADE 消去される
        assert!(!is_item_confirmed(&conn, "item-001").unwrap());
    }

    #[test]
    fn test_script_not_confirmed_by_default() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        assert!(!is_script_confirmed(&conn, "C:/scripts/build.ps1").unwrap());
    }

    #[test]
    fn test_confirm_script_marks_and_is_idempotent() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        confirm_script(&conn, "C:/scripts/build.ps1").unwrap();
        confirm_script(&conn, "C:/scripts/build.ps1").unwrap();
        assert!(is_script_confirmed(&conn, "C:/scripts/build.ps1").unwrap());
        // 別パスは未確認のまま
        assert!(!is_script_confirmed(&conn, "C:/scripts/other.ps1").unwrap());
    }
}
