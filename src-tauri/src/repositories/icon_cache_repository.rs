use rusqlite::{params, Connection};

use crate::utils::error::AppError;

/// R9-B: icon_cache テーブルへの read / write helper。
///
/// exe_path をキーにした dedup cache。同じ exe_path で extract_icon_from_exe を再実行する
/// 代わりに、初回抽出した icon_path を返すことで PowerShell 起動コストを削減する。
///
/// canonicalize は呼び出し側 (icon_cache_service) で実施。本 repository は素朴な KV のみ提供。
pub fn find_by_exe_path(conn: &Connection, exe_path: &str) -> Result<Option<String>, AppError> {
    let result = conn.query_row(
        "SELECT icon_path FROM icon_cache WHERE exe_path = ?1",
        params![exe_path],
        |row| row.get::<_, String>(0),
    );
    match result {
        Ok(p) => Ok(Some(p)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}

/// upsert: 既に entry があれば icon_path を上書き、無ければ新規 INSERT。
/// extracted_at は default 値 (current timestamp) で再 stamp される。
pub fn upsert(conn: &Connection, exe_path: &str, icon_path: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO icon_cache (exe_path, icon_path)
         VALUES (?1, ?2)
         ON CONFLICT(exe_path) DO UPDATE SET
             icon_path = excluded.icon_path,
             extracted_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')",
        params![exe_path, icon_path],
    )?;
    Ok(())
}

/// 指定 exe_path の cache entry を削除する。icon_path 側のファイル GC は呼び出し側責務。
pub fn delete(conn: &Connection, exe_path: &str) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM icon_cache WHERE exe_path = ?1",
        params![exe_path],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    #[test]
    fn test_upsert_and_find() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        assert_eq!(find_by_exe_path(&conn, "C:\\foo.exe").unwrap(), None);

        upsert(&conn, "C:\\foo.exe", "C:\\icons\\a.png").unwrap();
        assert_eq!(
            find_by_exe_path(&conn, "C:\\foo.exe").unwrap(),
            Some("C:\\icons\\a.png".to_string())
        );

        // upsert: icon_path を上書き
        upsert(&conn, "C:\\foo.exe", "C:\\icons\\b.png").unwrap();
        assert_eq!(
            find_by_exe_path(&conn, "C:\\foo.exe").unwrap(),
            Some("C:\\icons\\b.png".to_string())
        );
    }

    #[test]
    fn test_delete() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        upsert(&conn, "C:\\foo.exe", "C:\\icons\\a.png").unwrap();
        delete(&conn, "C:\\foo.exe").unwrap();
        assert_eq!(find_by_exe_path(&conn, "C:\\foo.exe").unwrap(), None);
    }

    #[test]
    fn test_find_unknown_returns_none() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        assert_eq!(
            find_by_exe_path(&conn, "C:\\nonexistent.exe").unwrap(),
            None
        );
    }
}
