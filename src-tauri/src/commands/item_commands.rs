use tauri::State;

use crate::db::DbState;
use crate::models::category::{Category, CreateCategoryInput};
use crate::models::item::{CreateItemInput, Item, UpdateItemInput};
use crate::models::tag::{CreateTagInput, Tag};
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

#[tauri::command]
pub fn cmd_get_categories(db: State<DbState>) -> Result<Vec<Category>, AppError> {
    item_service::get_categories(&db)
}

#[tauri::command]
pub fn cmd_create_category(
    db: State<DbState>,
    input: CreateCategoryInput,
) -> Result<Category, AppError> {
    item_service::create_category(&db, input)
}

#[tauri::command]
pub fn cmd_update_category(db: State<DbState>, id: String, name: String) -> Result<(), AppError> {
    item_service::update_category(&db, &id, &name)
}

#[tauri::command]
pub fn cmd_delete_category(db: State<DbState>, id: String) -> Result<(), AppError> {
    item_service::delete_category(&db, &id)
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
pub fn cmd_delete_tag(db: State<DbState>, id: String) -> Result<(), AppError> {
    item_service::delete_tag(&db, &id)
}

#[tauri::command]
pub fn cmd_extract_item_icon(exe_path: String, output_path: String) -> Result<(), AppError> {
    item_service::extract_item_icon(&exe_path, &output_path)
}
