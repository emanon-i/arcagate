use rusqlite::{params, Connection};

use crate::utils::error::AppError;

// PH-CF-900 A1-4: exe-folder scan 結果の KV cache (key → entries JSON)。
//
// key は frontend / IPC レイヤで合成した「<watch_path>|<scan_depth>|<extensions sorted>」 を
// 想定し、 backend は素朴な KV として扱う (key 同一 = 同じ scan 入力)。 invalidation も
// key 変化 (= 入力変化) で自然に切れる + 呼出側で `delete` を明示できる。

/// 同じ cache_key に紐づく entries JSON を取得する (なければ `None`)。
pub fn find(conn: &Connection, cache_key: &str) -> Result<Option<String>, AppError> {
    let result = conn.query_row(
        "SELECT entries_json FROM exe_scan_cache WHERE cache_key = ?1",
        params![cache_key],
        |row| row.get::<_, String>(0),
    );
    match result {
        Ok(s) => Ok(Some(s)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}

/// upsert: 同 key の row があれば上書き、 無ければ INSERT。 scanned_at は default で再 stamp。
pub fn upsert(conn: &Connection, cache_key: &str, entries_json: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO exe_scan_cache (cache_key, entries_json)
         VALUES (?1, ?2)
         ON CONFLICT(cache_key) DO UPDATE SET
             entries_json = excluded.entries_json,
             scanned_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')",
        params![cache_key, entries_json],
    )?;
    Ok(())
}

/// 指定 cache_key の row を削除 (force invalidate)。 無い key への delete は no-op。
pub fn delete(conn: &Connection, cache_key: &str) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM exe_scan_cache WHERE cache_key = ?1",
        params![cache_key],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    #[test]
    fn test_find_returns_none_for_unknown_key() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        assert_eq!(find(&conn, "any|2|exe").unwrap(), None);
    }

    #[test]
    fn test_upsert_round_trip() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        upsert(&conn, "C:/Games|3|exe,bat", "[]").unwrap();
        assert_eq!(
            find(&conn, "C:/Games|3|exe,bat").unwrap(),
            Some("[]".to_string())
        );
        // upsert で entries_json を上書きできる。
        upsert(&conn, "C:/Games|3|exe,bat", "[{\"folderPath\":\"x\"}]").unwrap();
        assert_eq!(
            find(&conn, "C:/Games|3|exe,bat").unwrap(),
            Some("[{\"folderPath\":\"x\"}]".to_string())
        );
    }

    #[test]
    fn test_delete_removes_row() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        upsert(&conn, "k1", "[]").unwrap();
        delete(&conn, "k1").unwrap();
        assert_eq!(find(&conn, "k1").unwrap(), None);
    }

    /// PH-CF-900 A1-4: cache key が変わると別 row として認識され、 古い row は hit しない。
    /// 「watch_path / scan_depth / extensions のいずれかが変わると cache invalidate」 を
    /// key の構造に押し込めるため、 backend は key 同一性だけを見れば良い。
    #[test]
    fn test_different_keys_do_not_collide() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        upsert(&conn, "C:/Games|2|exe", "[\"old\"]").unwrap();
        // depth が変わる → 別 key
        assert_eq!(find(&conn, "C:/Games|3|exe").unwrap(), None);
        // extensions が変わる → 別 key
        assert_eq!(find(&conn, "C:/Games|2|exe,bat").unwrap(), None);
        // watch_path が変わる → 別 key
        assert_eq!(find(&conn, "D:/Games|2|exe").unwrap(), None);
        // 元 key は依然 hit
        assert_eq!(
            find(&conn, "C:/Games|2|exe").unwrap(),
            Some("[\"old\"]".into())
        );
    }
}
