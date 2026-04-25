use std::fs;

use serde::{Deserialize, Serialize};

use crate::db::DbState;
use crate::models::item::Item;
use crate::models::tag::Tag;
use crate::repositories::{config_repository, item_repository, tag_repository};
use crate::utils::error::AppError;

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
    tags: Vec<Tag>,
    item_tags: Vec<ItemTagLink>,
    config: Vec<(String, String)>,
}

/// アイテム・設定を JSON でエクスポート（起動ログは含まない）
pub fn export_json(db: &DbState, output_path: &str) -> Result<(), AppError> {
    log::info!("exporting data to: {}", output_path);
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;

    let items = item_repository::find_all(&conn)?;
    let tags = tag_repository::find_all(&conn)?;
    let config = config_repository::find_all(&conn)?;

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
        version: 2,
        exported_at,
        items,
        tags,
        item_tags,
        config,
    };

    let json =
        serde_json::to_string_pretty(&data).map_err(|e| AppError::InvalidInput(e.to_string()))?;
    fs::write(output_path, json)?;
    log::info!(
        "export complete: {} items, {} tags",
        data.items.len(),
        data.tags.len()
    );

    Ok(())
}

/// JSON からアイテム・設定をインポート（マージ方式、再起動不要）
pub fn import_json(db: &DbState, input_path: &str) -> Result<(), AppError> {
    log::info!("importing data from: {}", input_path);
    let json = fs::read_to_string(input_path)?;
    let data: ExportData = serde_json::from_str(&json)
        .map_err(|e| AppError::InvalidInput(format!("JSONの解析に失敗しました: {}", e)))?;

    let mut conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let tx = conn.transaction()?;

    for tag in &data.tags {
        tx.execute(
            "INSERT OR REPLACE INTO tags (id, name, is_hidden, is_system, prefix, icon, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![tag.id, tag.name, tag.is_hidden as i64, tag.is_system as i64, tag.prefix, tag.icon, tag.sort_order, tag.created_at],
        )?;
    }

    for item in &data.items {
        let aliases_json =
            serde_json::to_string(&item.aliases).unwrap_or_else(|_| "[]".to_string());
        tx.execute(
            "INSERT OR REPLACE INTO items (id, item_type, label, target, args, working_dir, icon_path, icon_type, aliases, sort_order, is_enabled, is_tracked, default_app, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
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
                item.is_tracked as i64,
                item.default_app,
                item.created_at,
                item.updated_at,
            ],
        )?;
    }

    for link in &data.item_tags {
        tx.execute(
            "INSERT OR REPLACE INTO item_tags (item_id, tag_id) VALUES (?1, ?2)",
            rusqlite::params![link.item_id, link.tag_id],
        )?;
    }

    for (key, value) in &data.config {
        config_repository::set(&tx, key, value)?;
    }

    tx.commit()?;
    log::info!(
        "import complete: {} items, {} tags",
        data.items.len(),
        data.tags.len()
    );

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
        assert_eq!(parsed["version"], 2);
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
