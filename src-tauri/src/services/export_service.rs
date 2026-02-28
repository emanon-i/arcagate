use std::fs;

use serde::{Deserialize, Serialize};

use crate::db::DbState;
use crate::models::category::Category;
use crate::models::item::Item;
use crate::models::tag::Tag;
use crate::repositories::{
    category_repository, config_repository, item_repository, tag_repository,
};
use crate::utils::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
struct ItemCategoryLink {
    item_id: String,
    category_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ItemTagLink {
    item_id: String,
    tag_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExportData {
    version: u32,
    exported_at: String,
    items: Vec<Item>,
    categories: Vec<Category>,
    tags: Vec<Tag>,
    item_categories: Vec<ItemCategoryLink>,
    item_tags: Vec<ItemTagLink>,
    config: Vec<(String, String)>,
}

/// アイテム・設定を JSON でエクスポート（起動ログは含まない）
pub fn export_json(db: &DbState, output_path: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;

    let items = item_repository::find_all(&conn)?;
    let categories = category_repository::find_all(&conn)?;
    let tags = tag_repository::find_all(&conn)?;
    let config = config_repository::find_all(&conn)?;

    let item_categories = {
        let mut stmt = conn.prepare("SELECT item_id, category_id FROM item_categories")?;
        let rows = stmt.query_map([], |row| {
            Ok(ItemCategoryLink {
                item_id: row.get(0)?,
                category_id: row.get(1)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(AppError::Database)?
    };

    let item_tags = {
        let mut stmt = conn.prepare("SELECT item_id, tag_id FROM item_tags")?;
        let rows = stmt.query_map([], |row| {
            Ok(ItemTagLink {
                item_id: row.get(0)?,
                tag_id: row.get(1)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(AppError::Database)?
    };

    let exported_at: String = conn
        .query_row("SELECT strftime('%Y-%m-%dT%H:%M:%SZ', 'now')", [], |row| {
            row.get(0)
        })
        .unwrap_or_else(|_| "unknown".to_string());
    let data = ExportData {
        version: 1,
        exported_at,
        items,
        categories,
        tags,
        item_categories,
        item_tags,
        config,
    };

    let json =
        serde_json::to_string_pretty(&data).map_err(|e| AppError::InvalidInput(e.to_string()))?;
    fs::write(output_path, json)?;

    Ok(())
}

/// JSON からアイテム・設定をインポート（マージ方式、再起動不要）
pub fn import_json(db: &DbState, input_path: &str) -> Result<(), AppError> {
    let json = fs::read_to_string(input_path)?;
    let data: ExportData = serde_json::from_str(&json)
        .map_err(|e| AppError::InvalidInput(format!("JSONの解析に失敗しました: {}", e)))?;

    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;

    conn.execute_batch("BEGIN")?;

    for cat in &data.categories {
        conn.execute(
            "INSERT OR REPLACE INTO categories (id, name, prefix, icon, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![cat.id, cat.name, cat.prefix, cat.icon, cat.sort_order, cat.created_at],
        )?;
    }

    for tag in &data.tags {
        conn.execute(
            "INSERT OR REPLACE INTO tags (id, name, is_hidden, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![tag.id, tag.name, tag.is_hidden as i64, tag.created_at],
        )?;
    }

    for item in &data.items {
        let aliases_json =
            serde_json::to_string(&item.aliases).unwrap_or_else(|_| "[]".to_string());
        conn.execute(
            "INSERT OR REPLACE INTO items (id, item_type, label, target, args, working_dir, icon_path, icon_type, aliases, sort_order, is_enabled, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            rusqlite::params![
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
                item.created_at,
                item.updated_at,
            ],
        )?;
    }

    for link in &data.item_categories {
        conn.execute(
            "INSERT OR REPLACE INTO item_categories (item_id, category_id) VALUES (?1, ?2)",
            rusqlite::params![link.item_id, link.category_id],
        )?;
    }

    for link in &data.item_tags {
        conn.execute(
            "INSERT OR REPLACE INTO item_tags (item_id, tag_id) VALUES (?1, ?2)",
            rusqlite::params![link.item_id, link.tag_id],
        )?;
    }

    for (key, value) in &data.config {
        config_repository::set(&conn, key, value)?;
    }

    conn.execute_batch("COMMIT")?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    #[test]
    fn test_export_json_creates_file() {
        let db = initialize_in_memory();
        let output = std::env::temp_dir().join("test_export.json");
        export_json(&db, output.to_str().unwrap()).unwrap();
        assert!(output.exists());
        let content = fs::read_to_string(&output).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(parsed["version"], 1);
        let _ = fs::remove_file(&output);
    }

    #[test]
    fn test_import_json_fails_on_missing_file() {
        let db = initialize_in_memory();
        let result = import_json(&db, "/nonexistent/backup.json");
        assert!(result.is_err());
    }

    #[test]
    fn test_import_json_fails_on_invalid_json() {
        let db = initialize_in_memory();
        let path = std::env::temp_dir().join("test_invalid.json");
        fs::write(&path, b"not valid json").unwrap();
        let result = import_json(&db, path.to_str().unwrap());
        assert!(result.is_err());
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn test_export_import_roundtrip() {
        let db = initialize_in_memory();
        let path = std::env::temp_dir().join("test_roundtrip.json");
        export_json(&db, path.to_str().unwrap()).unwrap();
        let result = import_json(&db, path.to_str().unwrap());
        assert!(result.is_ok());
        let _ = fs::remove_file(&path);
    }
}
