use rusqlite::{params, Connection};

use crate::models::watched_path::WatchedPath;
use crate::utils::error::AppError;

fn row_to_watched_path(row: &rusqlite::Row) -> rusqlite::Result<WatchedPath> {
    let is_active_int: i64 = row.get(3)?;
    Ok(WatchedPath {
        id: row.get(0)?,
        path: row.get(1)?,
        label: row.get(2)?,
        is_active: is_active_int != 0,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

pub fn insert(conn: &Connection, wp: &WatchedPath) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO watched_paths (id, path, label, is_active)
         VALUES (?1, ?2, ?3, ?4)",
        params![wp.id, wp.path, wp.label, wp.is_active as i64],
    )?;
    Ok(())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<WatchedPath, AppError> {
    let result = conn.query_row(
        "SELECT id, path, label, is_active, created_at, updated_at
         FROM watched_paths WHERE id = ?1",
        params![id],
        row_to_watched_path,
    );
    match result {
        Ok(wp) => Ok(wp),
        Err(rusqlite::Error::QueryReturnedNoRows) => Err(AppError::NotFound(id.to_string())),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn find_all(conn: &Connection) -> Result<Vec<WatchedPath>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, path, label, is_active, created_at, updated_at
         FROM watched_paths ORDER BY created_at",
    )?;
    let rows = stmt
        .query_map([], row_to_watched_path)?
        .collect::<rusqlite::Result<Vec<WatchedPath>>>()?;
    Ok(rows)
}

pub fn find_active(conn: &Connection) -> Result<Vec<WatchedPath>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, path, label, is_active, created_at, updated_at
         FROM watched_paths WHERE is_active = 1 ORDER BY created_at",
    )?;
    let rows = stmt
        .query_map([], row_to_watched_path)?
        .collect::<rusqlite::Result<Vec<WatchedPath>>>()?;
    Ok(rows)
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM watched_paths WHERE id = ?1", params![id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    fn make_wp(id: &str, path: &str) -> WatchedPath {
        WatchedPath {
            id: id.to_string(),
            path: path.to_string(),
            label: None,
            is_active: true,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }

    #[test]
    fn test_insert_find_all_roundtrip() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_wp("id-001", "C:/Users/test")).unwrap();
        insert(&conn, &make_wp("id-002", "C:/Program Files")).unwrap();

        let all = find_all(&conn).unwrap();
        assert_eq!(all.len(), 2);
        assert!(all.iter().any(|w| w.path == "C:/Users/test"));
    }

    #[test]
    fn test_find_by_id_not_found() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let result = find_by_id(&conn, "nonexistent");
        assert!(matches!(result, Err(AppError::NotFound(_))));
    }

    #[test]
    fn test_delete_removes_entry() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_wp("id-001", "C:/test")).unwrap();
        delete(&conn, "id-001").unwrap();

        let result = find_by_id(&conn, "id-001");
        assert!(matches!(result, Err(AppError::NotFound(_))));
    }

    #[test]
    fn test_path_uniqueness() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_wp("id-001", "C:/test")).unwrap();
        let result = insert(&conn, &make_wp("id-002", "C:/test"));
        assert!(result.is_err());
    }
}
