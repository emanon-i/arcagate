/// PH-issue-024: Opener registry の DB 永続化。
/// 本 repository が扱うのは user-defined custom opener のみ。
/// builtin は `models::opener::builtin_openers()` (compiled-in)。
use rusqlite::{params, Connection};

use crate::models::opener::Opener;
use crate::utils::error::AppError;

fn row_to_opener(row: &rusqlite::Row) -> rusqlite::Result<Opener> {
    Ok(Opener {
        id: row.get(0)?,
        name: row.get(1)?,
        command_template: row.get(2)?,
        icon_path: row.get(3)?,
        sort_order: row.get(4)?,
        is_builtin: false,
    })
}

pub fn list(conn: &Connection) -> Result<Vec<Opener>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, command_template, icon_path, sort_order
         FROM openers
         ORDER BY sort_order ASC, name ASC",
    )?;
    let rows = stmt
        .query_map([], row_to_opener)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<Option<Opener>, AppError> {
    let result = conn.query_row(
        "SELECT id, name, command_template, icon_path, sort_order
         FROM openers WHERE id = ?1",
        params![id],
        row_to_opener,
    );
    match result {
        Ok(o) => Ok(Some(o)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn upsert(conn: &Connection, opener: &Opener) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO openers (id, name, command_template, icon_path, sort_order, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
         ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             command_template = excluded.command_template,
             icon_path = excluded.icon_path,
             sort_order = excluded.sort_order,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')",
        params![
            opener.id,
            opener.name,
            opener.command_template,
            opener.icon_path,
            opener.sort_order
        ],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    let n = conn.execute("DELETE FROM openers WHERE id = ?1", params![id])?;
    if n == 0 {
        return Err(AppError::NotFound(format!("opener: {id}")));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    fn sample(id: &str) -> Opener {
        Opener {
            id: id.to_string(),
            name: format!("Name {id}"),
            command_template: format!(r#"foo "<path>" --id={id}"#),
            icon_path: None,
            sort_order: 0,
            is_builtin: false,
        }
    }

    #[test]
    fn upsert_and_find_roundtrip() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        let o = sample("user:cursor");
        upsert(&conn, &o).unwrap();
        let got = find_by_id(&conn, "user:cursor").unwrap().unwrap();
        assert_eq!(got.name, "Name user:cursor");
        assert!(!got.is_builtin);
    }

    #[test]
    fn upsert_overwrites_existing() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        let mut o = sample("user:vim");
        upsert(&conn, &o).unwrap();
        o.name = "VIM Editor".to_string();
        upsert(&conn, &o).unwrap();
        assert_eq!(
            find_by_id(&conn, "user:vim").unwrap().unwrap().name,
            "VIM Editor"
        );
    }

    #[test]
    fn list_orders_by_sort_then_name() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        let mut a = sample("user:a");
        a.name = "Z".to_string();
        a.sort_order = 0;
        let mut b = sample("user:b");
        b.name = "A".to_string();
        b.sort_order = 0;
        let mut c = sample("user:c");
        c.name = "M".to_string();
        c.sort_order = -1; // 先頭
        upsert(&conn, &a).unwrap();
        upsert(&conn, &b).unwrap();
        upsert(&conn, &c).unwrap();
        let list = list(&conn).unwrap();
        assert_eq!(list[0].id, "user:c"); // sort_order = -1
        assert_eq!(list[1].id, "user:b"); // sort_order = 0、name "A"
        assert_eq!(list[2].id, "user:a"); // sort_order = 0、name "Z"
    }

    #[test]
    fn delete_missing_returns_not_found() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        assert!(matches!(
            delete(&conn, "user:nope"),
            Err(AppError::NotFound(_))
        ));
    }

    #[test]
    fn delete_existing_succeeds() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        upsert(&conn, &sample("user:x")).unwrap();
        assert!(delete(&conn, "user:x").is_ok());
        assert!(find_by_id(&conn, "user:x").unwrap().is_none());
    }
}
