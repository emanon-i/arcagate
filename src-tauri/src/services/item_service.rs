use uuid::Uuid;

use crate::db::DbState;
use crate::models::item::{CreateItemInput, Item, LibraryStats, UpdateItemInput};
use crate::models::tag::{self, CreateTagInput, Tag, TagWithCount};
use crate::repositories::{item_repository, tag_repository};
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
        item_type: input.item_type.clone(),
        label: input.label,
        target: input.target,
        args: input.args,
        working_dir: input.working_dir,
        icon_path: input.icon_path,
        icon_type: None,
        aliases: input.aliases,
        sort_order: 0,
        is_enabled: true,
        is_tracked: input.is_tracked,
        default_app: None,
        created_at: String::new(), // set by DB DEFAULT on insert
        updated_at: String::new(),
    };

    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;

    conn.execute_batch("BEGIN")?;
    let result = (|| -> Result<Item, AppError> {
        item_repository::insert(&conn, &item)?;

        // システムタグ自動付与（item_type別）
        let sys_tag_id = tag::sys_type_tag_id(&input.item_type);
        item_repository::add_system_tag(&conn, &id, &sys_tag_id)?;

        // ユーザー指定タグ
        item_repository::set_tags(&conn, &id, &input.tag_ids)?;

        item_repository::find_by_id(&conn, &id)
    })();

    match &result {
        Ok(_) => {
            conn.execute_batch("COMMIT")?;
            log::info!("item created: id={} label={}", id, item.label);
        }
        Err(_) => {
            let _ = conn.execute_batch("ROLLBACK");
        }
    }

    result
}

pub fn list_items(db: &DbState) -> Result<Vec<Item>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::find_all(&conn)
}

pub fn search_items(db: &DbState, query: &str) -> Result<Vec<Item>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::search(&conn, query)
}

pub fn update_item(db: &DbState, id: &str, input: UpdateItemInput) -> Result<Item, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::update(&conn, id, &input)?;
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
        is_system: false,
        prefix: None,
        icon: None,
        sort_order: 0,
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

pub fn update_tag_prefix(db: &DbState, id: &str, prefix: Option<&str>) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    tag_repository::update_prefix(&conn, id, prefix)
}

pub fn delete_tag(db: &DbState, id: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    tag_repository::delete(&conn, id)
}

pub fn get_library_stats(db: &DbState) -> Result<LibraryStats, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::get_library_stats(&conn)
}

pub fn get_tag_counts(db: &DbState) -> Result<Vec<TagWithCount>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    tag_repository::find_all_with_counts(&conn)
}

pub fn get_item_tags(db: &DbState, item_id: &str) -> Result<Vec<Tag>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    tag_repository::find_by_item_id(&conn, item_id)
}

pub fn search_items_in_tag(db: &DbState, tag_id: &str, query: &str) -> Result<Vec<Item>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::search_in_tag(&conn, tag_id, query)
}

pub fn count_hidden_items(db: &DbState) -> Result<i64, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::count_hidden_items(&conn)
}

pub fn auto_register_folder_items(db: &DbState, root_path: &str) -> Result<Vec<Item>, AppError> {
    let root = std::path::Path::new(root_path);
    if !root.is_dir() {
        return Err(AppError::InvalidInput(format!(
            "Not a directory: {}",
            root_path
        )));
    }
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let mut registered = Vec::new();
    let entries = std::fs::read_dir(root).map_err(AppError::Io)?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let target = path.to_string_lossy().to_string();
        if item_repository::find_by_target(&conn, &target)?.is_some() {
            continue;
        }
        let label = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| target.clone());
        let id = Uuid::now_v7().to_string();
        let item = Item {
            id: id.clone(),
            item_type: crate::models::item::ItemType::Folder,
            label,
            target,
            args: None,
            working_dir: None,
            icon_path: None,
            icon_type: None,
            aliases: vec![],
            sort_order: 0,
            is_enabled: true,
            is_tracked: true,
            default_app: None,
            created_at: String::new(),
            updated_at: String::new(),
        };
        item_repository::insert(&conn, &item)?;
        let sys_tag_id =
            crate::models::tag::sys_type_tag_id(&crate::models::item::ItemType::Folder);
        item_repository::add_system_tag(&conn, &id, &sys_tag_id)?;
        registered.push(item_repository::find_by_id(&conn, &id)?);
    }
    Ok(registered)
}

/// 起動時に必須システムタグを upsert する（べき等）。
pub fn ensure_system_tags(db: &DbState) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let starred = Tag {
        id: "sys-starred".to_string(),
        name: "Starred".to_string(),
        is_hidden: false,
        is_system: true,
        prefix: Some("★".to_string()),
        icon: None,
        sort_order: 90,
        created_at: String::new(),
    };
    tag_repository::upsert_system_tag(&conn, &starred)
}

pub fn extract_item_icon(
    app_data_dir: &std::path::Path,
    exe_path: &str,
) -> Result<String, AppError> {
    let icons_dir = app_data_dir.join("icons");
    std::fs::create_dir_all(&icons_dir)?;
    let output_path = icon::build_icon_output_path(&icons_dir);
    icon::extract_icon_from_exe(exe_path, &output_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;
    use crate::models::item::ItemType;
    use crate::utils::icon::build_icon_output_path;

    fn make_input(item_type: ItemType, label: &str) -> CreateItemInput {
        CreateItemInput {
            item_type,
            label: label.to_string(),
            target: "C:/app.exe".to_string(),
            args: None,
            working_dir: None,
            icon_path: None,
            aliases: vec![],
            tag_ids: vec![],
            is_tracked: true,
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
    fn test_create_item_assigns_system_tag() {
        let db = initialize_in_memory();
        let item = create_item(&db, make_input(ItemType::Exe, "TestApp")).unwrap();

        let tags = get_item_tags(&db, &item.id).unwrap();
        assert!(
            tags.iter().any(|t| t.id == "sys-type-exe"),
            "system tag sys-type-exe should be assigned"
        );
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
    fn test_get_library_stats() {
        let db = initialize_in_memory();
        create_item(&db, make_input(ItemType::Exe, "App1")).unwrap();
        create_item(&db, make_input(ItemType::Url, "Site")).unwrap();

        let stats = get_library_stats(&db).unwrap();
        assert_eq!(stats.total_items, 2);
        assert_eq!(stats.recent_launch_count, 0);
    }

    #[test]
    fn test_get_tag_counts() {
        let db = initialize_in_memory();

        let tag = create_tag(
            &db,
            CreateTagInput {
                name: "games".to_string(),
                is_hidden: false,
            },
        )
        .unwrap();

        let mut input = make_input(ItemType::Exe, "Game");
        input.tag_ids = vec![tag.id.clone()];
        create_item(&db, input).unwrap();

        let counts = get_tag_counts(&db).unwrap();
        let games = counts.iter().find(|t| t.name == "games");
        assert!(games.is_some());
        assert_eq!(games.unwrap().item_count, 1);
    }

    #[test]
    fn test_search_items_in_tag() {
        let db = initialize_in_memory();

        // Search by system tag
        create_item(&db, make_input(ItemType::Exe, "App1")).unwrap();
        create_item(&db, make_input(ItemType::Url, "Site1")).unwrap();

        let exe_items = search_items_in_tag(&db, "sys-type-exe", "").unwrap();
        assert_eq!(exe_items.len(), 1);
        assert_eq!(exe_items[0].label, "App1");
    }

    #[test]
    fn test_delete_item() {
        let db = initialize_in_memory();
        let item = create_item(&db, make_input(ItemType::Exe, "App")).unwrap();
        delete_item(&db, &item.id).unwrap();

        let items = list_items(&db).unwrap();
        assert_eq!(items.len(), 0);
    }

    #[test]
    fn test_build_icon_output_path_has_png_extension() {
        let dir = std::path::Path::new("C:/data/icons");
        let path = build_icon_output_path(dir);
        assert!(
            path.ends_with(".png"),
            "path should end with .png: {}",
            path
        );
        assert!(
            path.starts_with("C:") || path.starts_with("C:\\"),
            "path should start with icons dir: {}",
            path
        );
    }

    #[test]
    fn test_build_icon_output_path_unique() {
        let dir = std::path::Path::new("/tmp/icons");
        let path1 = build_icon_output_path(dir);
        let path2 = build_icon_output_path(dir);
        assert_ne!(path1, path2, "each call should produce unique filename");
    }

    #[test]
    fn test_create_item_transaction_commits_item_and_tags() {
        let db = initialize_in_memory();

        // ユーザータグを先に作成
        let tag = create_tag(
            &db,
            CreateTagInput {
                name: "dev-tools".to_string(),
                is_hidden: false,
            },
        )
        .unwrap();

        let mut input = make_input(ItemType::Exe, "Transactional App");
        input.tag_ids = vec![tag.id.clone()];
        let item = create_item(&db, input).unwrap();

        // トランザクション内でアイテムとタグの両方がコミットされていること
        let tags = get_item_tags(&db, &item.id).unwrap();
        let has_user_tag = tags.iter().any(|t| t.id == tag.id);
        let has_sys_tag = tags.iter().any(|t| t.id == "sys-type-exe");
        assert!(has_user_tag, "user tag should be committed");
        assert!(has_sys_tag, "system tag should be committed");
    }

    #[test]
    fn test_create_item_invalid_tag_rolls_back() {
        let db = initialize_in_memory();

        // 存在しない tag_id を指定 → FK制約違反でトランザクションがロールバックされる
        let mut input = make_input(ItemType::Exe, "Ghost Tag App");
        input.tag_ids = vec!["nonexistent-tag-id".to_string()];
        let result = create_item(&db, input);

        assert!(result.is_err(), "should fail with FK constraint");

        // ロールバックにより items テーブルにレコードが残っていないこと
        let items = list_items(&db).unwrap();
        assert_eq!(items.len(), 0, "item should be rolled back");
    }

    #[test]
    fn test_extract_item_icon_creates_icons_dir() {
        let tmp = std::env::temp_dir().join(format!("arcagate_test_{}", uuid::Uuid::now_v7()));
        let icons_dir = tmp.join("icons");
        assert!(!icons_dir.exists());

        // extract_item_icon will create icons/ dir even if PowerShell fails
        // (because dir creation happens before PowerShell call)
        let _ = extract_item_icon(&tmp, "nonexistent.exe");
        assert!(icons_dir.exists(), "icons dir should be created");

        // cleanup
        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_auto_register_folder_items() {
        let db = initialize_in_memory();

        // Create temp dir with subdirectories
        let tmp = std::env::temp_dir().join(format!("arcagate_auto_reg_{}", uuid::Uuid::now_v7()));
        std::fs::create_dir_all(tmp.join("project-a")).unwrap();
        std::fs::create_dir_all(tmp.join("project-b")).unwrap();
        // Also create a file (should be skipped)
        std::fs::write(tmp.join("readme.txt"), "hello").unwrap();

        let root_path = tmp.to_string_lossy().to_string();
        let result = auto_register_folder_items(&db, &root_path).unwrap();
        assert_eq!(result.len(), 2, "should register 2 subdirectories");

        // Verify items are in the database
        let items = list_items(&db).unwrap();
        assert_eq!(items.len(), 2);
        let labels: Vec<&str> = items.iter().map(|i| i.label.as_str()).collect();
        assert!(labels.contains(&"project-a"));
        assert!(labels.contains(&"project-b"));

        // Verify system tag is assigned
        for item in &items {
            let tags = get_item_tags(&db, &item.id).unwrap();
            assert!(
                tags.iter().any(|t| t.id == "sys-type-folder"),
                "system tag sys-type-folder should be assigned"
            );
        }

        // Running again should not create duplicates
        let result2 = auto_register_folder_items(&db, &root_path).unwrap();
        assert_eq!(result2.len(), 0, "should skip already registered items");

        // cleanup
        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_auto_register_folder_items_invalid_path() {
        let db = initialize_in_memory();
        let result = auto_register_folder_items(&db, "C:/nonexistent/path/xyz");
        assert!(
            matches!(result, Err(AppError::InvalidInput(_))),
            "should return InvalidInput for non-directory"
        );
    }
}
