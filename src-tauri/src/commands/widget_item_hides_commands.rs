// Phase 2 (2026-05-12): per-widget hide IPC。

use crate::repositories::widget_item_hides_repository;
use crate::services::AppServices;
use crate::utils::error::AppError;
use tauri::State;

#[tauri::command]
pub fn cmd_add_widget_item_hide(
    services: State<AppServices>,
    widget_id: String,
    item_target: String,
) -> Result<(), AppError> {
    let conn = services.db.0.lock().map_err(|_| AppError::DbLock)?;
    widget_item_hides_repository::add(&conn, &widget_id, &item_target)
}

#[tauri::command]
pub fn cmd_remove_widget_item_hide(
    services: State<AppServices>,
    widget_id: String,
    item_target: String,
) -> Result<(), AppError> {
    let conn = services.db.0.lock().map_err(|_| AppError::DbLock)?;
    widget_item_hides_repository::remove(&conn, &widget_id, &item_target)
}

#[tauri::command]
pub fn cmd_list_widget_item_hides(
    services: State<AppServices>,
    widget_id: String,
) -> Result<Vec<String>, AppError> {
    let conn = services.db.0.lock().map_err(|_| AppError::DbLock)?;
    widget_item_hides_repository::list_by_widget(&conn, &widget_id)
}
