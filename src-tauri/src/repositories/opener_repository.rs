// PH-505 batch-109: Opener registry repository

use rusqlite::{params, Connection};

use crate::models::opener::Opener;
use crate::utils::error::AppError;

const SELECT_COLUMNS: &str =
    "id, label, command, args_template, icon, builtin, sort_order, created_at, updated_at";

fn row_to_opener(row: &rusqlite::Row) -> rusqlite::Result<Opener> {
    let builtin_int: i64 = row.get(5)?;
    Ok(Opener {
        id: row.get(0)?,
        label: row.get(1)?,
        command: row.get(2)?,
        args_template: row.get(3)?,
        icon: row.get(4)?,
        builtin: builtin_int != 0,
        sort_order: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

pub fn list(conn: &Connection) -> Result<Vec<Opener>, AppError> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {SELECT_COLUMNS} FROM openers ORDER BY sort_order, label"
    ))?;
    let rows = stmt
        .query_map([], row_to_opener)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn find(conn: &Connection, id: &str) -> Result<Option<Opener>, AppError> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {SELECT_COLUMNS} FROM openers WHERE id = ?1"
    ))?;
    Ok(stmt.query_row(params![id], row_to_opener).ok())
}

pub fn insert(
    conn: &Connection,
    id: &str,
    label: &str,
    command: &str,
    args_template: &str,
    icon: Option<&str>,
    sort_order: i64,
) -> Result<Opener, AppError> {
    conn.execute(
        "INSERT INTO openers (id, label, command, args_template, icon, builtin, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
        params![id, label, command, args_template, icon, sort_order],
    )?;
    find(conn, id)?.ok_or_else(|| AppError::NotFound(format!("opener({id})")))
}

#[allow(clippy::too_many_arguments)]
pub fn update(
    conn: &Connection,
    id: &str,
    label: &str,
    command: &str,
    args_template: &str,
    icon: Option<&str>,
    sort_order: i64,
) -> Result<Opener, AppError> {
    let n = conn.execute(
        "UPDATE openers
            SET label = ?1,
                command = ?2,
                args_template = ?3,
                icon = ?4,
                sort_order = ?5,
                updated_at = strftime('%s', 'now')
          WHERE id = ?6",
        params![label, command, args_template, icon, sort_order, id],
    )?;
    if n == 0 {
        return Err(AppError::NotFound(format!("opener({id})")));
    }
    find(conn, id)?.ok_or_else(|| AppError::NotFound(format!("opener({id})")))
}

/// Builtin opener は削除不可 (caller 側で確認)。
pub fn delete(conn: &Connection, id: &str) -> Result<bool, AppError> {
    let n = conn.execute(
        "DELETE FROM openers WHERE id = ?1 AND builtin = 0",
        params![id],
    )?;
    Ok(n > 0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrations::{apply_pragmas, migrations};

    fn open_test_db() -> rusqlite::Connection {
        let mut conn = rusqlite::Connection::open_in_memory().unwrap();
        apply_pragmas(&conn).unwrap();
        migrations().to_latest(&mut conn).unwrap();
        conn
    }

    #[test]
    fn builtin_openers_seeded() {
        let conn = open_test_db();
        let all = list(&conn).unwrap();
        // migration 020 で 6 件 seeded (Explorer / VS Code / Terminal / PowerShell / cmd / Notepad)
        assert!(all.iter().all(|o| o.builtin));
        assert!(all.iter().any(|o| o.id == "builtin-explorer"));
        assert!(all.iter().any(|o| o.id == "builtin-cmd"));
        assert_eq!(all.len(), 6);
    }

    #[test]
    fn delete_builtin_is_rejected() {
        let conn = open_test_db();
        let removed = delete(&conn, "builtin-explorer").unwrap();
        assert!(!removed);
        assert!(find(&conn, "builtin-explorer").unwrap().is_some());
    }

    #[test]
    fn insert_update_delete_custom_opener() {
        let conn = open_test_db();
        let created = insert(
            &conn, "custom-1", "My Tool", "tool.exe", "{path}", None, 100,
        )
        .unwrap();
        assert_eq!(created.label, "My Tool");
        assert!(!created.builtin);

        let updated = update(
            &conn,
            "custom-1",
            "My Tool 2",
            "tool2.exe",
            "-x {path}",
            Some("wrench"),
            50,
        )
        .unwrap();
        assert_eq!(updated.label, "My Tool 2");
        assert_eq!(updated.icon.as_deref(), Some("wrench"));

        let removed = delete(&conn, "custom-1").unwrap();
        assert!(removed);
        assert!(find(&conn, "custom-1").unwrap().is_none());
    }

    #[test]
    fn find_returns_none_for_missing() {
        let conn = open_test_db();
        assert!(find(&conn, "no-such").unwrap().is_none());
    }
}
