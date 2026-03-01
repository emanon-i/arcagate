use rusqlite::{params, Connection};

use crate::models::category::Category;
use crate::utils::error::AppError;

fn row_to_category(row: &rusqlite::Row) -> rusqlite::Result<Category> {
    Ok(Category {
        id: row.get(0)?,
        name: row.get(1)?,
        prefix: row.get(2)?,
        icon: row.get(3)?,
        sort_order: row.get(4)?,
        created_at: row.get(5)?,
    })
}

pub fn insert(conn: &Connection, cat: &Category) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO categories (id, name, prefix, icon, sort_order, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            cat.id,
            cat.name,
            cat.prefix,
            cat.icon,
            cat.sort_order,
            cat.created_at
        ],
    )?;
    Ok(())
}

pub fn find_all(conn: &Connection) -> Result<Vec<Category>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, prefix, icon, sort_order, created_at
         FROM categories ORDER BY sort_order, name",
    )?;
    let categories = stmt
        .query_map([], row_to_category)?
        .collect::<rusqlite::Result<Vec<Category>>>()?;
    Ok(categories)
}

pub fn update(
    conn: &Connection,
    id: &str,
    name: &str,
    prefix: Option<&str>,
) -> Result<(), AppError> {
    conn.execute(
        "UPDATE categories SET name = ?1, prefix = ?2 WHERE id = ?3",
        params![name, prefix, id],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    fn make_category(id: &str, name: &str) -> Category {
        Category {
            id: id.to_string(),
            name: name.to_string(),
            prefix: None,
            icon: None,
            sort_order: 0,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn test_insert_find_all() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_category("cat-001", "Games")).unwrap();
        insert(&conn, &make_category("cat-002", "Work")).unwrap();

        let cats = find_all(&conn).unwrap();
        assert_eq!(cats.len(), 2);
    }

    #[test]
    fn test_update() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_category("cat-001", "Games")).unwrap();
        update(&conn, "cat-001", "Entertainment", None).unwrap();

        let cats = find_all(&conn).unwrap();
        assert_eq!(cats[0].name, "Entertainment");
        assert_eq!(cats[0].prefix, None);
    }

    #[test]
    fn test_update_with_prefix() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_category("cat-001", "Games")).unwrap();
        update(&conn, "cat-001", "Games", Some("gm")).unwrap();

        let cats = find_all(&conn).unwrap();
        assert_eq!(cats[0].prefix, Some("gm".to_string()));
    }

    #[test]
    fn test_delete() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_category("cat-001", "Games")).unwrap();
        delete(&conn, "cat-001").unwrap();

        let cats = find_all(&conn).unwrap();
        assert_eq!(cats.len(), 0);
    }
}
