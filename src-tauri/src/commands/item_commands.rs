use tauri::{AppHandle, Manager, State};

use crate::db::DbState;
use crate::models::item::{CreateItemInput, Item, LibraryStats, UpdateItemInput};
use crate::models::tag::{CreateTagInput, Tag, TagWithCount};
use crate::services::item_service;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_create_item(db: State<DbState>, input: CreateItemInput) -> Result<Item, AppError> {
    item_service::create_item(&db, input)
}

#[tauri::command]
pub fn cmd_list_items(db: State<DbState>) -> Result<Vec<Item>, AppError> {
    item_service::list_items(&db)
}

#[tauri::command]
pub fn cmd_search_items(db: State<DbState>, query: String) -> Result<Vec<Item>, AppError> {
    item_service::search_items(&db, &query)
}

#[tauri::command]
pub fn cmd_update_item(
    db: State<DbState>,
    id: String,
    input: UpdateItemInput,
) -> Result<Item, AppError> {
    item_service::update_item(&db, &id, input)
}

#[tauri::command]
pub fn cmd_delete_item(db: State<DbState>, id: String) -> Result<(), AppError> {
    item_service::delete_item(&db, &id)
}

/// PH-issue-006: 削除確認 dialog 用 — 該当 item を参照する widget 数。
#[tauri::command]
pub fn cmd_count_item_references(db: State<DbState>, id: String) -> Result<usize, AppError> {
    item_service::count_item_references(&db, &id)
}

// PH-436 / Nielsen H7: 一括操作 (transaction、最大 1000 件)
#[tauri::command]
pub fn cmd_bulk_add_tag(
    db: State<DbState>,
    item_ids: Vec<String>,
    tag_id: String,
) -> Result<usize, AppError> {
    item_service::bulk_add_tag(&db, item_ids, tag_id)
}

#[tauri::command]
pub fn cmd_bulk_remove_tag(
    db: State<DbState>,
    item_ids: Vec<String>,
    tag_id: String,
) -> Result<usize, AppError> {
    item_service::bulk_remove_tag(&db, item_ids, tag_id)
}

#[tauri::command]
pub fn cmd_bulk_delete_items(db: State<DbState>, item_ids: Vec<String>) -> Result<usize, AppError> {
    item_service::bulk_delete_items(&db, item_ids)
}

#[tauri::command]
pub fn cmd_get_tags(db: State<DbState>) -> Result<Vec<Tag>, AppError> {
    item_service::get_tags(&db)
}

#[tauri::command]
pub fn cmd_create_tag(db: State<DbState>, input: CreateTagInput) -> Result<Tag, AppError> {
    item_service::create_tag(&db, input)
}

#[tauri::command]
pub fn cmd_update_tag(
    db: State<DbState>,
    id: String,
    name: String,
    is_hidden: bool,
) -> Result<(), AppError> {
    item_service::update_tag(&db, &id, &name, is_hidden)
}

#[tauri::command]
pub fn cmd_update_tag_prefix(
    db: State<DbState>,
    id: String,
    prefix: Option<String>,
) -> Result<(), AppError> {
    item_service::update_tag_prefix(&db, &id, prefix.as_deref())
}

#[tauri::command]
pub fn cmd_delete_tag(db: State<DbState>, id: String) -> Result<(), AppError> {
    item_service::delete_tag(&db, &id)
}

#[tauri::command]
pub fn cmd_get_library_stats(db: State<DbState>) -> Result<LibraryStats, AppError> {
    item_service::get_library_stats(&db)
}

#[tauri::command]
pub fn cmd_get_tag_counts(db: State<DbState>) -> Result<Vec<TagWithCount>, AppError> {
    item_service::get_tag_counts(&db)
}

#[tauri::command]
pub fn cmd_get_item_tags(db: State<DbState>, item_id: String) -> Result<Vec<Tag>, AppError> {
    item_service::get_item_tags(&db, &item_id)
}

#[tauri::command]
pub fn cmd_search_items_in_tag(
    db: State<DbState>,
    tag_id: String,
    query: String,
) -> Result<Vec<Item>, AppError> {
    item_service::search_items_in_tag(&db, &tag_id, &query)
}

#[tauri::command]
pub fn cmd_count_hidden_items(db: State<DbState>) -> Result<i64, AppError> {
    item_service::count_hidden_items(&db)
}

#[tauri::command]
pub fn cmd_toggle_star(
    db: State<DbState>,
    item_id: String,
    starred: bool,
) -> Result<Item, AppError> {
    item_service::toggle_star(&db, &item_id, starred)
}

#[tauri::command]
pub fn cmd_auto_register_folder_items(
    db: State<DbState>,
    root_path: String,
) -> Result<Vec<Item>, AppError> {
    item_service::auto_register_folder_items(&db, &root_path)
}

#[tauri::command]
pub fn cmd_check_is_directory(path: String) -> bool {
    std::path::Path::new(&path).is_dir()
}

#[tauri::command]
pub fn cmd_extract_item_icon(app: AppHandle, exe_path: String) -> Result<String, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Io(std::io::Error::other(e.to_string())))?;
    item_service::extract_item_icon(&app_data_dir, &exe_path)
}
