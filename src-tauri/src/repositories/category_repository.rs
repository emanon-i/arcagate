use rusqlite::{params, Connection};

use crate::models::category::{Category, CategoryWithCount};
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
        "INSERT INTO categories (id, name, prefix, icon, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![cat.id, cat.name, cat.prefix, cat.icon, cat.sort_order],
    )?;
    Ok(())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<Category, AppError> {
    let result = conn.query_row(
        "SELECT id, name, prefix, icon, sort_order, created_at FROM categories WHERE id = ?1",
        params![id],
        row_to_category,
    );
    match result {
        Ok(cat) => Ok(cat),
        Err(rusqlite::Error::QueryReturnedNoRows) => Err(AppError::NotFound(id.to_string())),
        Err(e) => Err(AppError::Database(e)),
    }
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

pub fn find_all_with_counts(conn: &Connection) -> Result<Vec<CategoryWithCount>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.prefix,
                (SELECT COUNT(*) FROM item_categories ic
                 INNER JOIN items i ON i.id = ic.item_id
                 WHERE ic.category_id = c.id AND i.is_enabled = 1) AS item_count
         FROM categories c ORDER BY c.sort_order, c.name",
    )?;
    let categories = stmt
        .query_map([], |row| {
            Ok(CategoryWithCount {
                id: row.get(0)?,
                name: row.get(1)?,
                prefix: row.get(2)?,
                item_count: row.get(3)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<CategoryWithCount>>>()?;
    Ok(categories)
}

pub fn find_by_item_id(conn: &Connection, item_id: &str) -> Result<Vec<Category>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.prefix, c.icon, c.sort_order, c.created_at
         FROM categories c
         INNER JOIN item_categories ic ON ic.category_id = c.id
         WHERE ic.item_id = ?1
         ORDER BY c.sort_order, c.name",
    )?;
    let categories = stmt
        .query_map(params![item_id], row_to_category)?
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
    fn test_find_all_with_counts_empty() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let cats = find_all_with_counts(&conn).unwrap();
        assert_eq!(cats.len(), 0);
    }

    #[test]
    fn test_find_all_with_counts_with_items() {
        use crate::models::item::ItemType;
        use crate::repositories::item_repository;

        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_category("cat-001", "Games")).unwrap();
        insert(&conn, &make_category("cat-002", "Work")).unwrap();

        let item = crate::models::item::Item {
            id: "id-001".to_string(),
            item_type: ItemType::Exe,
            label: "Game1".to_string(),
            target: "C:/game.exe".to_string(),
            args: None,
            working_dir: None,
            icon_path: None,
            icon_type: None,
            aliases: vec![],
            sort_order: 0,
            is_enabled: true,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };
        item_repository::insert(&conn, &item).unwrap();
        item_repository::set_categories(&conn, "id-001", &["cat-001".to_string()]).unwrap();

        let cats = find_all_with_counts(&conn).unwrap();
        assert_eq!(cats.len(), 2);
        let games = cats.iter().find(|c| c.name == "Games").unwrap();
        assert_eq!(games.item_count, 1);
        let work = cats.iter().find(|c| c.name == "Work").unwrap();
        assert_eq!(work.item_count, 0);
    }

    #[test]
    fn test_find_by_item_id() {
        use crate::models::item::ItemType;
        use crate::repositories::item_repository;

        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_category("cat-001", "Games")).unwrap();
        insert(&conn, &make_category("cat-002", "Work")).unwrap();

        let item = crate::models::item::Item {
            id: "id-001".to_string(),
            item_type: ItemType::Exe,
            label: "App".to_string(),
            target: "C:/app.exe".to_string(),
            args: None,
            working_dir: None,
            icon_path: None,
            icon_type: None,
            aliases: vec![],
            sort_order: 0,
            is_enabled: true,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };
        item_repository::insert(&conn, &item).unwrap();
        item_repository::set_categories(
            &conn,
            "id-001",
            &["cat-001".to_string(), "cat-002".to_string()],
        )
        .unwrap();

        let cats = find_by_item_id(&conn, "id-001").unwrap();
        assert_eq!(cats.len(), 2);
    }

    #[test]
    fn test_find_by_item_id_empty() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let cats = find_by_item_id(&conn, "nonexistent").unwrap();
        assert_eq!(cats.len(), 0);
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
