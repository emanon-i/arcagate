// PH-505: Opener registry — repository layer
use rusqlite::{params, Connection, OptionalExtension};

use crate::models::opener::{CreateOpenerInput, Opener, UpdateOpenerInput};
use crate::utils::error::AppError;

const SELECT_COLS: &str =
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

pub fn find_by_id(conn: &Connection, id: &str) -> Result<Option<Opener>, AppError> {
    let sql = format!("SELECT {SELECT_COLS} FROM openers WHERE id = ?1");
    Ok(conn
        .query_row(&sql, params![id], row_to_opener)
        .optional()?)
}

pub fn list_all(conn: &Connection) -> Result<Vec<Opener>, AppError> {
    let sql = format!("SELECT {SELECT_COLS} FROM openers ORDER BY sort_order, label");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt
        .query_map([], row_to_opener)?
        .collect::<rusqlite::Result<Vec<Opener>>>()?;
    Ok(rows)
}

pub fn create(conn: &Connection, id: &str, input: &CreateOpenerInput) -> Result<Opener, AppError> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let args = input
        .args_template
        .clone()
        .unwrap_or_else(|| "{path}".to_string());
    let sort_order = input.sort_order.unwrap_or(100);
    conn.execute(
        "INSERT INTO openers (id, label, command, args_template, icon, builtin, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?7)",
        params![id, input.label, input.command, args, input.icon, sort_order, now],
    )?;
    find_by_id(conn, id)?.ok_or_else(|| AppError::NotFound(id.to_string()))
}

pub fn update(conn: &Connection, id: &str, input: &UpdateOpenerInput) -> Result<Opener, AppError> {
    let existing = find_by_id(conn, id)?.ok_or_else(|| AppError::NotFound(id.to_string()))?;
    if existing.builtin {
        // builtin の label / command / args_template は変更可、icon / sort_order も可。
        // 削除のみ拒否する想定 (ID 固定で alias 等の用途)。
    }
    let label = input.label.clone().unwrap_or(existing.label);
    let command = input.command.clone().unwrap_or(existing.command);
    let args = input
        .args_template
        .clone()
        .unwrap_or(existing.args_template);
    let icon = input.icon.clone().or(existing.icon);
    let sort_order = input.sort_order.unwrap_or(existing.sort_order);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    conn.execute(
        "UPDATE openers SET label = ?1, command = ?2, args_template = ?3, icon = ?4,
            sort_order = ?5, updated_at = ?6 WHERE id = ?7",
        params![label, command, args, icon, sort_order, now, id],
    )?;
    find_by_id(conn, id)?.ok_or_else(|| AppError::NotFound(id.to_string()))
}

/// builtin の delete は拒否される。custom のみ delete 可。
pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    let existing = find_by_id(conn, id)?.ok_or_else(|| AppError::NotFound(id.to_string()))?;
    if existing.builtin {
        return Err(AppError::InvalidInput(format!(
            "builtin opener `{id}` cannot be deleted"
        )));
    }
    conn.execute("DELETE FROM openers WHERE id = ?1", params![id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    #[test]
    fn list_all_includes_builtin_seed() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        let all = list_all(&conn).unwrap();
        // migration 020 の builtin seed が入っている
        assert!(all
            .iter()
            .any(|o| o.id == "opener-builtin-explorer" && o.builtin));
        assert!(all
            .iter()
            .any(|o| o.id == "opener-builtin-cmd" && o.builtin));
        assert!(all
            .iter()
            .any(|o| o.id == "opener-builtin-notepad" && o.builtin));
    }

    #[test]
    fn create_inserts_custom_opener() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        let input = CreateOpenerInput {
            label: "MyEditor".to_string(),
            command: "myedit.exe".to_string(),
            args_template: Some("{path}".to_string()),
            icon: None,
            sort_order: Some(200),
        };
        let o = create(&conn, "opener-custom-1", &input).unwrap();
        assert_eq!(o.label, "MyEditor");
        assert_eq!(o.command, "myedit.exe");
        assert!(!o.builtin);
    }

    #[test]
    fn update_existing_opener() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        let input = CreateOpenerInput {
            label: "X".to_string(),
            command: "x.exe".to_string(),
            ..Default::default()
        };
        create(&conn, "x", &input).unwrap();
        let updated = update(
            &conn,
            "x",
            &UpdateOpenerInput {
                label: Some("Y".to_string()),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(updated.label, "Y");
        assert_eq!(updated.command, "x.exe");
    }

    #[test]
    fn delete_custom_opener_succeeds() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        create(
            &conn,
            "custom-1",
            &CreateOpenerInput {
                label: "C".to_string(),
                command: "c.exe".to_string(),
                ..Default::default()
            },
        )
        .unwrap();
        delete(&conn, "custom-1").unwrap();
        assert!(find_by_id(&conn, "custom-1").unwrap().is_none());
    }

    #[test]
    fn delete_builtin_opener_rejected() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        let result = delete(&conn, "opener-builtin-explorer");
        assert!(result.is_err());
        // builtin が DB に残っている
        assert!(find_by_id(&conn, "opener-builtin-explorer")
            .unwrap()
            .is_some());
    }

    #[test]
    fn delete_nonexistent_returns_not_found() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        let result = delete(&conn, "missing");
        assert!(result.is_err());
    }
}
