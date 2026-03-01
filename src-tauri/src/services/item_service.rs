use uuid::Uuid;

use crate::db::DbState;
use crate::models::category::{Category, CreateCategoryInput};
use crate::models::item::{CreateItemInput, Item, UpdateItemInput};
use crate::models::tag::{CreateTagInput, Tag};
use crate::repositories::{category_repository, item_repository, tag_repository};
use crate::utils::error::AppError;
use crate::utils::icon;

pub fn create_item(db: &DbState, input: CreateItemInput) -> Result<Item, AppError> {
    if input.label.trim().is_empty() {
        return Err(AppError::InvalidInput(
            "label must not be empty".to_string(),
        ));
    }

    let id = Uuid::now_v7().to_string();

    let item = Item {
        id: id.clone(),
        item_type: input.item_type,
        label: input.label,
        target: input.target,
        args: input.args,
        working_dir: input.working_dir,
        icon_path: input.icon_path,
        icon_type: None,
        aliases: input.aliases,
        sort_order: 0,
        is_enabled: true,
        created_at: String::new(), // set by DB DEFAULT on insert
        updated_at: String::new(),
    };

    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::insert(&conn, &item)?;
    item_repository::set_categories(&conn, &id, &input.category_ids)?;
    item_repository::set_tags(&conn, &id, &input.tag_ids)?;
    log::info!("item created: id={} label={}", id, item.label);
    item_repository::find_by_id(&conn, &id)
}

pub fn list_items(db: &DbState) -> Result<Vec<Item>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::find_all(&conn)
}

pub fn search_items(db: &DbState, query: &str) -> Result<Vec<Item>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::search(&conn, query)
}

/// `exclude_hidden` が true のとき is_hidden タグを持つアイテムを除外する。
/// 現時点では find_tags_for_item が未実装のため、フィルタリングは行わず search_items に委譲する。
#[allow(dead_code)]
pub fn search_items_filtered(
    db: &DbState,
    query: &str,
    _exclude_hidden: bool,
) -> Result<Vec<Item>, AppError> {
    search_items(db, query)
}

pub fn update_item(db: &DbState, id: &str, input: UpdateItemInput) -> Result<Item, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::update(&conn, id, &input)?;
    if let Some(category_ids) = &input.category_ids {
        item_repository::set_categories(&conn, id, category_ids)?;
    }
    if let Some(tag_ids) = &input.tag_ids {
        item_repository::set_tags(&conn, id, tag_ids)?;
    }
    item_repository::find_by_id(&conn, id)
}

pub fn delete_item(db: &DbState, id: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::delete(&conn, id)?;
    log::info!("item deleted: id={}", id);
    Ok(())
}

pub fn get_categories(db: &DbState) -> Result<Vec<Category>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    category_repository::find_all(&conn)
}

pub fn create_category(db: &DbState, input: CreateCategoryInput) -> Result<Category, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::InvalidInput(
            "category name must not be empty".to_string(),
        ));
    }
    let id = Uuid::now_v7().to_string();
    let cat = Category {
        id: id.clone(),
        name: input.name,
        prefix: input.prefix,
        icon: input.icon,
        sort_order: 0,
        created_at: String::new(), // set by DB DEFAULT on insert
    };
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    category_repository::insert(&conn, &cat)?;
    category_repository::find_by_id(&conn, &id)
}

pub fn update_category(
    db: &DbState,
    id: &str,
    name: &str,
    prefix: Option<&str>,
) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    category_repository::update(&conn, id, name, prefix)
}

pub fn search_items_in_category(
    db: &DbState,
    category_id: &str,
    query: &str,
) -> Result<Vec<Item>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::search_in_category(&conn, category_id, query)
}

pub fn delete_category(db: &DbState, id: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    category_repository::delete(&conn, id)
}

pub fn get_tags(db: &DbState) -> Result<Vec<Tag>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    tag_repository::find_all(&conn)
}

pub fn create_tag(db: &DbState, input: CreateTagInput) -> Result<Tag, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::InvalidInput(
            "tag name must not be empty".to_string(),
        ));
    }
    let id = Uuid::now_v7().to_string();
    let tag = Tag {
        id: id.clone(),
        name: input.name,
        is_hidden: input.is_hidden,
        created_at: String::new(), // set by DB DEFAULT on insert
    };
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    tag_repository::insert(&conn, &tag)?;
    tag_repository::find_by_id(&conn, &id)
}

pub fn update_tag(db: &DbState, id: &str, name: &str, is_hidden: bool) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    tag_repository::update(&conn, id, name, is_hidden)
}

pub fn delete_tag(db: &DbState, id: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    tag_repository::delete(&conn, id)
}

pub fn extract_item_icon(exe_path: &str, output_path: &str) -> Result<(), AppError> {
    icon::extract_icon_from_exe(exe_path, output_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;
    use crate::models::item::ItemType;

    fn make_input(item_type: ItemType, label: &str) -> CreateItemInput {
        CreateItemInput {
            item_type,
            label: label.to_string(),
            target: "C:/app.exe".to_string(),
            args: None,
            working_dir: None,
            icon_path: None,
            aliases: vec![],
            category_ids: vec![],
            tag_ids: vec![],
        }
    }

    #[test]
    fn test_create_item_all_types() {
        let db = initialize_in_memory();

        let types = [
            ItemType::Exe,
            ItemType::Url,
            ItemType::Folder,
            ItemType::Script,
            ItemType::Command,
        ];
        for item_type in types {
            let label = format!("{:?} App", item_type);
            let result = create_item(&db, make_input(item_type.clone(), &label));
            assert!(result.is_ok(), "create_item failed for {:?}", item_type);
            let item = result.unwrap();
            assert_eq!(item.item_type, item_type);
            assert_eq!(item.label, label);
        }
    }

    #[test]
    fn test_create_item_empty_label_returns_error() {
        let db = initialize_in_memory();
        let result = create_item(&db, make_input(ItemType::Exe, ""));
        assert!(matches!(result, Err(AppError::InvalidInput(_))));
    }

    #[test]
    fn test_create_item_whitespace_label_returns_error() {
        let db = initialize_in_memory();
        let result = create_item(&db, make_input(ItemType::Exe, "   "));
        assert!(matches!(result, Err(AppError::InvalidInput(_))));
    }

    #[test]
    fn test_list_items() {
        let db = initialize_in_memory();
        create_item(&db, make_input(ItemType::Exe, "App1")).unwrap();
        create_item(&db, make_input(ItemType::Url, "Site")).unwrap();

        let items = list_items(&db).unwrap();
        assert_eq!(items.len(), 2);
    }

    #[test]
    fn test_delete_item() {
        let db = initialize_in_memory();
        let item = create_item(&db, make_input(ItemType::Exe, "App")).unwrap();
        delete_item(&db, &item.id).unwrap();

        let items = list_items(&db).unwrap();
        assert_eq!(items.len(), 0);
    }
}
