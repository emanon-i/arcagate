use rusqlite::{params, Connection};

use crate::models::item::{Item, ItemType, UpdateItemInput};
use crate::utils::error::AppError;

pub(crate) fn row_to_item(row: &rusqlite::Row) -> rusqlite::Result<Item> {
    let item_type_str: String = row.get(1)?;
    let item_type = ItemType::from_str(&item_type_str).unwrap_or(ItemType::Command);
    let aliases_json: Option<String> = row.get(8)?;
    let aliases: Vec<String> = aliases_json
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default();
    let is_enabled_int: i64 = row.get(10)?;
    Ok(Item {
        id: row.get(0)?,
        item_type,
        label: row.get(2)?,
        target: row.get(3)?,
        args: row.get(4)?,
        working_dir: row.get(5)?,
        icon_path: row.get(6)?,
        icon_type: row.get(7)?,
        aliases,
        sort_order: row.get(9)?,
        is_enabled: is_enabled_int != 0,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

pub fn insert(conn: &Connection, item: &Item) -> Result<(), AppError> {
    let aliases_json = serde_json::to_string(&item.aliases).unwrap_or_else(|_| "[]".to_string());
    conn.execute(
        "INSERT INTO items (id, item_type, label, target, args, working_dir, icon_path, icon_type, aliases, sort_order, is_enabled)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            item.id,
            item.item_type.as_str(),
            item.label,
            item.target,
            item.args,
            item.working_dir,
            item.icon_path,
            item.icon_type,
            aliases_json,
            item.sort_order,
            item.is_enabled as i64,
        ],
    )?;
    Ok(())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<Item, AppError> {
    let result = conn.query_row(
        "SELECT id, item_type, label, target, args, working_dir, icon_path, icon_type, aliases, sort_order, is_enabled, created_at, updated_at
         FROM items WHERE id = ?1",
        params![id],
        row_to_item,
    );
    match result {
        Ok(item) => Ok(item),
        Err(rusqlite::Error::QueryReturnedNoRows) => Err(AppError::NotFound(id.to_string())),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn find_all(conn: &Connection) -> Result<Vec<Item>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, item_type, label, target, args, working_dir, icon_path, icon_type, aliases, sort_order, is_enabled, created_at, updated_at
         FROM items ORDER BY sort_order, label",
    )?;
    let items = stmt
        .query_map([], row_to_item)?
        .collect::<rusqlite::Result<Vec<Item>>>()?;
    Ok(items)
}

pub fn search(conn: &Connection, query: &str) -> Result<Vec<Item>, AppError> {
    let pattern = format!("%{}%", query);
    let mut stmt = conn.prepare(
        "SELECT id, item_type, label, target, args, working_dir, icon_path, icon_type, aliases, sort_order, is_enabled, created_at, updated_at
         FROM items
         WHERE is_enabled = 1 AND (label LIKE ?1 OR aliases LIKE ?1)
         ORDER BY sort_order, label",
    )?;
    let items = stmt
        .query_map(params![pattern], row_to_item)?
        .collect::<rusqlite::Result<Vec<Item>>>()?;
    Ok(items)
}

pub fn search_in_category(
    conn: &Connection,
    category_id: &str,
    query: &str,
) -> Result<Vec<Item>, AppError> {
    let pattern = format!("%{}%", query);
    let mut stmt = conn.prepare(
        "SELECT i.id, i.item_type, i.label, i.target, i.args, i.working_dir, i.icon_path, i.icon_type, i.aliases, i.sort_order, i.is_enabled, i.created_at, i.updated_at
         FROM items i
         INNER JOIN item_categories ic ON ic.item_id = i.id
         WHERE ic.category_id = ?1
           AND i.is_enabled = 1
           AND (i.label LIKE ?2 OR i.aliases LIKE ?2)
         ORDER BY i.sort_order, i.label",
    )?;
    let items = stmt
        .query_map(params![category_id, pattern], row_to_item)?
        .collect::<rusqlite::Result<Vec<Item>>>()?;
    Ok(items)
}

pub fn update(conn: &Connection, id: &str, input: &UpdateItemInput) -> Result<(), AppError> {
    let mut sets: Vec<String> =
        vec!["updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')".to_string()];
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = vec![];

    if let Some(label) = &input.label {
        sets.push(format!("label = ?{}", values.len() + 1));
        values.push(Box::new(label.clone()));
    }
    if let Some(target) = &input.target {
        sets.push(format!("target = ?{}", values.len() + 1));
        values.push(Box::new(target.clone()));
    }
    if let Some(args) = &input.args {
        sets.push(format!("args = ?{}", values.len() + 1));
        values.push(Box::new(args.clone()));
    }
    if let Some(working_dir) = &input.working_dir {
        sets.push(format!("working_dir = ?{}", values.len() + 1));
        values.push(Box::new(working_dir.clone()));
    }
    if let Some(icon_path) = &input.icon_path {
        sets.push(format!("icon_path = ?{}", values.len() + 1));
        values.push(Box::new(icon_path.clone()));
    }
    if let Some(aliases) = &input.aliases {
        let json = serde_json::to_string(aliases).unwrap_or_else(|_| "[]".to_string());
        sets.push(format!("aliases = ?{}", values.len() + 1));
        values.push(Box::new(json));
    }
    if let Some(is_enabled) = input.is_enabled {
        sets.push(format!("is_enabled = ?{}", values.len() + 1));
        values.push(Box::new(is_enabled as i64));
    }

    let id_param_idx = values.len() + 1;
    let sql = format!(
        "UPDATE items SET {} WHERE id = ?{}",
        sets.join(", "),
        id_param_idx
    );
    values.push(Box::new(id.to_string()));

    let params_refs: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&sql, params_refs.as_slice())?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM items WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn update_target_by_path(
    conn: &Connection,
    old_path: &std::path::Path,
    new_path: &std::path::Path,
) -> Result<usize, AppError> {
    let old = old_path.to_string_lossy();
    let new = new_path.to_string_lossy();
    let rows = conn.execute(
        "UPDATE items SET target = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE target = ?2",
        params![new.as_ref(), old.as_ref()],
    )?;
    Ok(rows)
}

pub fn set_categories(
    conn: &Connection,
    item_id: &str,
    category_ids: &[String],
) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM item_categories WHERE item_id = ?1",
        params![item_id],
    )?;
    for cat_id in category_ids {
        conn.execute(
            "INSERT INTO item_categories (item_id, category_id) VALUES (?1, ?2)",
            params![item_id, cat_id],
        )?;
    }
    Ok(())
}

pub fn set_tags(conn: &Connection, item_id: &str, tag_ids: &[String]) -> Result<(), AppError> {
    conn.execute("DELETE FROM item_tags WHERE item_id = ?1", params![item_id])?;
    for tag_id in tag_ids {
        conn.execute(
            "INSERT INTO item_tags (item_id, tag_id) VALUES (?1, ?2)",
            params![item_id, tag_id],
        )?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;
    use crate::models::category::Category;
    use crate::models::item::ItemType;
    use crate::models::tag::Tag;
    use crate::repositories::category_repository;
    use crate::repositories::tag_repository;

    fn make_item(id: &str, label: &str, item_type: ItemType) -> Item {
        Item {
            id: id.to_string(),
            item_type,
            label: label.to_string(),
            target: "C:/test/app.exe".to_string(),
            args: None,
            working_dir: None,
            icon_path: None,
            icon_type: None,
            aliases: vec![],
            sort_order: 0,
            is_enabled: true,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn test_insert_find_by_id_roundtrip() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let mut item = make_item("id-001", "Test App", ItemType::Exe);
        item.aliases = vec!["app".to_string(), "testapp".to_string()];

        insert(&conn, &item).unwrap();
        let found = find_by_id(&conn, "id-001").unwrap();

        assert_eq!(found.id, "id-001");
        assert_eq!(found.label, "Test App");
        assert_eq!(found.item_type, ItemType::Exe);
        assert_eq!(found.aliases, vec!["app", "testapp"]);
        assert!(found.is_enabled);
    }

    #[test]
    fn test_search_by_label() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_item("id-001", "Blender", ItemType::Exe)).unwrap();
        insert(&conn, &make_item("id-002", "Chrome Browser", ItemType::Exe)).unwrap();
        insert(&conn, &make_item("id-003", "VS Code", ItemType::Exe)).unwrap();

        let results = search(&conn, "Blen").unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].label, "Blender");
    }

    #[test]
    fn test_search_by_alias() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let mut item = make_item("id-001", "Blender", ItemType::Exe);
        item.aliases = vec!["blen3".to_string(), "blender3".to_string()];
        insert(&conn, &item).unwrap();

        let results = search(&conn, "blen3").unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "id-001");
    }

    #[test]
    fn test_search_excludes_disabled() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let mut item = make_item("id-001", "Disabled App", ItemType::Exe);
        item.is_enabled = false;
        insert(&conn, &item).unwrap();

        let results = search(&conn, "Disabled").unwrap();
        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_delete_cascades() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let cat = Category {
            id: "cat-001".to_string(),
            name: "Games".to_string(),
            prefix: None,
            icon: None,
            sort_order: 0,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        category_repository::insert(&conn, &cat).unwrap();

        let tag = Tag {
            id: "tag-001".to_string(),
            name: "favorite".to_string(),
            is_hidden: false,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        tag_repository::insert(&conn, &tag).unwrap();

        let item = make_item("id-001", "Game", ItemType::Exe);
        insert(&conn, &item).unwrap();
        set_categories(&conn, "id-001", &["cat-001".to_string()]).unwrap();
        set_tags(&conn, "id-001", &["tag-001".to_string()]).unwrap();

        // Verify associations exist
        let cat_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM item_categories WHERE item_id = 'id-001'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(cat_count, 1);

        delete(&conn, "id-001").unwrap();

        // Verify CASCADE deleted associations
        let cat_count_after: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM item_categories WHERE item_id = 'id-001'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        let tag_count_after: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM item_tags WHERE item_id = 'id-001'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(cat_count_after, 0);
        assert_eq!(tag_count_after, 0);
    }

    #[test]
    fn test_search_in_category() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let cat1 = Category {
            id: "cat-001".to_string(),
            name: "Games".to_string(),
            prefix: Some("gm".to_string()),
            icon: None,
            sort_order: 0,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let cat2 = Category {
            id: "cat-002".to_string(),
            name: "Work".to_string(),
            prefix: None,
            icon: None,
            sort_order: 1,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        category_repository::insert(&conn, &cat1).unwrap();
        category_repository::insert(&conn, &cat2).unwrap();

        insert(&conn, &make_item("id-001", "Blender", ItemType::Exe)).unwrap();
        insert(&conn, &make_item("id-002", "Unity", ItemType::Exe)).unwrap();
        insert(&conn, &make_item("id-003", "VS Code", ItemType::Exe)).unwrap();

        set_categories(&conn, "id-001", &["cat-001".to_string()]).unwrap();
        set_categories(&conn, "id-002", &["cat-001".to_string()]).unwrap();
        set_categories(&conn, "id-003", &["cat-002".to_string()]).unwrap();

        let results = search_in_category(&conn, "cat-001", "").unwrap();
        assert_eq!(results.len(), 2);

        let filtered = search_in_category(&conn, "cat-001", "Blend").unwrap();
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].label, "Blender");

        let other = search_in_category(&conn, "cat-002", "").unwrap();
        assert_eq!(other.len(), 1);
        assert_eq!(other[0].label, "VS Code");
    }

    #[test]
    fn test_set_categories_replaces_existing() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let cat1 = Category {
            id: "cat-001".to_string(),
            name: "Work".to_string(),
            prefix: None,
            icon: None,
            sort_order: 0,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let cat2 = Category {
            id: "cat-002".to_string(),
            name: "Personal".to_string(),
            prefix: None,
            icon: None,
            sort_order: 1,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        category_repository::insert(&conn, &cat1).unwrap();
        category_repository::insert(&conn, &cat2).unwrap();

        let item = make_item("id-001", "App", ItemType::Exe);
        insert(&conn, &item).unwrap();

        set_categories(&conn, "id-001", &["cat-001".to_string()]).unwrap();
        let count1: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM item_categories WHERE item_id = 'id-001'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count1, 1);

        // Replace with different category
        set_categories(&conn, "id-001", &["cat-002".to_string()]).unwrap();
        let count2: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM item_categories WHERE item_id = 'id-001'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count2, 1);

        let cat_id: String = conn
            .query_row(
                "SELECT category_id FROM item_categories WHERE item_id = 'id-001'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(cat_id, "cat-002");
    }

    #[test]
    fn test_update_target_by_path_updates_matching() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let mut item = make_item("id-001", "App", ItemType::Exe);
        item.target = "C:/old/app.exe".to_string();
        insert(&conn, &item).unwrap();

        let old = std::path::Path::new("C:/old/app.exe");
        let new = std::path::Path::new("C:/new/app.exe");
        let count = update_target_by_path(&conn, old, new).unwrap();
        assert_eq!(count, 1);

        let updated = find_by_id(&conn, "id-001").unwrap();
        assert_eq!(updated.target, "C:/new/app.exe");
    }

    #[test]
    fn test_update_target_by_path_ignores_others() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let mut item = make_item("id-001", "App", ItemType::Exe);
        item.target = "C:/other/app.exe".to_string();
        insert(&conn, &item).unwrap();

        let old = std::path::Path::new("C:/old/app.exe");
        let new = std::path::Path::new("C:/new/app.exe");
        let count = update_target_by_path(&conn, old, new).unwrap();
        assert_eq!(count, 0);

        let unchanged = find_by_id(&conn, "id-001").unwrap();
        assert_eq!(unchanged.target, "C:/other/app.exe");
    }

    #[test]
    fn test_update_target_by_path_returns_count() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let mut item1 = make_item("id-001", "App1", ItemType::Exe);
        item1.target = "C:/shared/app.exe".to_string();
        let mut item2 = make_item("id-002", "App2", ItemType::Exe);
        item2.target = "C:/shared/app.exe".to_string();
        insert(&conn, &item1).unwrap();
        insert(&conn, &item2).unwrap();

        let old = std::path::Path::new("C:/shared/app.exe");
        let new = std::path::Path::new("C:/moved/app.exe");
        let count = update_target_by_path(&conn, old, new).unwrap();
        assert_eq!(count, 2);
    }
}
