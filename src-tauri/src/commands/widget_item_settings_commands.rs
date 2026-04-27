// PH-504 batch-109: Per-item settings persistence IPC commands

use tauri::State;

use crate::db::DbState;
use crate::models::widget_item_settings::{WidgetItemSettings, WidgetItemSettingsPatch};
use crate::services::widget_item_settings_service as svc;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_get_widget_item_settings(
    db: State<DbState>,
    widget_id: String,
    item_key: String,
) -> Result<Option<WidgetItemSettings>, AppError> {
    svc::get(&db, &widget_id, &item_key)
}

#[tauri::command]
pub fn cmd_list_widget_item_settings(
    db: State<DbState>,
    widget_id: String,
) -> Result<Vec<WidgetItemSettings>, AppError> {
    svc::list(&db, &widget_id)
}

#[tauri::command]
pub fn cmd_patch_widget_item_settings(
    db: State<DbState>,
    widget_id: String,
    item_key: String,
    patch: WidgetItemSettingsPatch,
    last_seen_at: Option<i64>,
) -> Result<WidgetItemSettings, AppError> {
    svc::patch(&db, &widget_id, &item_key, patch, last_seen_at)
}

#[tauri::command]
pub fn cmd_touch_widget_item_settings(
    db: State<DbState>,
    widget_id: String,
    item_keys: Vec<String>,
    timestamp: i64,
) -> Result<usize, AppError> {
    svc::touch_seen(&db, &widget_id, item_keys, timestamp)
}

#[tauri::command]
pub fn cmd_delete_widget_item_settings(
    db: State<DbState>,
    widget_id: String,
    item_key: String,
) -> Result<bool, AppError> {
    svc::delete(&db, &widget_id, &item_key)
}

#[tauri::command]
pub fn cmd_delete_all_widget_item_settings(
    db: State<DbState>,
    widget_id: String,
) -> Result<usize, AppError> {
    svc::delete_all(&db, &widget_id)
}

#[tauri::command]
pub fn cmd_prune_orphan_widget_item_settings(
    db: State<DbState>,
    widget_id: String,
    cutoff_unix: i64,
) -> Result<usize, AppError> {
    svc::prune_orphans(&db, &widget_id, cutoff_unix)
}
