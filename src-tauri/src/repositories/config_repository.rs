use rusqlite::{params, Connection};

use crate::utils::error::AppError;

pub fn get(conn: &Connection, key: &str) -> Result<Option<String>, AppError> {
    let result = conn.query_row(
        "SELECT value FROM config WHERE key = ?1",
        params![key],
        |row| row.get(0),
    );
    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn set(conn: &Connection, key: &str, value: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))",
        params![key, value],
    )?;
    Ok(())
}

pub fn get_or_default(conn: &Connection, key: &str, default: &str) -> Result<String, AppError> {
    match get(conn, key)? {
        Some(value) => Ok(value),
        None => Ok(default.to_string()),
    }
}

pub fn find_all(conn: &Connection) -> Result<Vec<(String, String)>, AppError> {
    let mut stmt = conn.prepare("SELECT key, value FROM config")?;
    let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(AppError::Database)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    #[test]
    fn test_set_and_get() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        set(&conn, "hotkey", "CmdOrCtrl+Space").unwrap();
        let result = get(&conn, "hotkey").unwrap();
        assert_eq!(result, Some("CmdOrCtrl+Space".to_string()));
    }

    #[test]
    fn test_get_or_default_missing_key() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let result = get_or_default(&conn, "missing_key", "default").unwrap();
        assert_eq!(result, "default");
    }

    #[test]
    fn test_get_returns_none_for_missing_key() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let result = get(&conn, "nonexistent").unwrap();
        assert_eq!(result, None);
    }

    #[test]
    fn test_set_replace_existing() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        set(&conn, "hotkey", "CmdOrCtrl+Space").unwrap();
        set(&conn, "hotkey", "Alt+Space").unwrap();
        let result = get(&conn, "hotkey").unwrap();
        assert_eq!(result, Some("Alt+Space".to_string()));
    }
}
