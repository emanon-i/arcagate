// PH-504: Per-item settings persistence — IPC commands
use tauri::State;

use crate::db::DbState;
use crate::models::widget_item_settings::{UpsertWidgetItemSettingsInput, WidgetItemSettings};
use crate::services::widget_item_settings_service;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_get_widget_item_settings(
    db: State<DbState>,
    widget_id: String,
    item_key: String,
) -> Result<Option<WidgetItemSettings>, AppError> {
    widget_item_settings_service::get_settings(&db, &widget_id, &item_key)
}

#[tauri::command]
pub fn cmd_list_widget_item_settings(
    db: State<DbState>,
    widget_id: String,
) -> Result<Vec<WidgetItemSettings>, AppError> {
    widget_item_settings_service::list_settings_by_widget(&db, &widget_id)
}

#[tauri::command]
pub fn cmd_upsert_widget_item_settings(
    db: State<DbState>,
    input: UpsertWidgetItemSettingsInput,
) -> Result<WidgetItemSettings, AppError> {
    widget_item_settings_service::upsert_settings(&db, input)
}

#[tauri::command]
pub fn cmd_delete_widget_item_settings(
    db: State<DbState>,
    widget_id: String,
    item_key: String,
) -> Result<(), AppError> {
    widget_item_settings_service::delete_settings(&db, &widget_id, &item_key)
}

#[tauri::command]
pub fn cmd_clear_widget_item_settings(
    db: State<DbState>,
    widget_id: String,
) -> Result<usize, AppError> {
    widget_item_settings_service::delete_all_for_widget(&db, &widget_id)
}

#[tauri::command]
pub fn cmd_prune_widget_item_settings(
    db: State<DbState>,
    widget_id: String,
    expiry_days: i64,
) -> Result<usize, AppError> {
    widget_item_settings_service::prune_orphans(&db, &widget_id, expiry_days)
}

#[tauri::command]
pub fn cmd_touch_widget_item_settings(
    db: State<DbState>,
    widget_id: String,
    item_keys: Vec<String>,
) -> Result<(), AppError> {
    widget_item_settings_service::touch_last_seen(&db, &widget_id, item_keys)
}
