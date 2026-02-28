use tauri::State;

use crate::db::DbState;
use crate::services::config_service;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_get_config(db: State<DbState>, key: String) -> Result<Option<String>, AppError> {
    config_service::get_config(&db, &key)
}

#[tauri::command]
pub fn cmd_set_config(db: State<DbState>, key: String, value: String) -> Result<(), AppError> {
    config_service::set_config(&db, &key, &value)
}

#[tauri::command]
pub fn cmd_get_hotkey(db: State<DbState>) -> Result<String, AppError> {
    config_service::get_hotkey(&db)
}

#[tauri::command]
pub fn cmd_set_hotkey(db: State<DbState>, hotkey: String) -> Result<(), AppError> {
    config_service::set_hotkey(&db, &hotkey)
}

#[tauri::command]
pub fn cmd_get_autostart(db: State<DbState>) -> Result<bool, AppError> {
    config_service::get_autostart(&db)
}

#[tauri::command]
pub fn cmd_set_autostart(db: State<DbState>, enabled: bool) -> Result<(), AppError> {
    config_service::set_autostart(&db, enabled)
}

#[tauri::command]
pub fn cmd_is_setup_complete(db: State<DbState>) -> Result<bool, AppError> {
    config_service::is_setup_complete(&db)
}

#[tauri::command]
pub fn cmd_mark_setup_complete(db: State<DbState>) -> Result<(), AppError> {
    config_service::mark_setup_complete(&db)
}

#[tauri::command]
pub fn cmd_set_hidden_password(db: State<DbState>, password: String) -> Result<(), AppError> {
    config_service::set_hidden_password(&db, &password)
}

#[tauri::command]
pub fn cmd_verify_hidden_password(
    db: State<DbState>,
    password: String,
) -> Result<Option<bool>, AppError> {
    config_service::verify_hidden_password(&db, &password)
}
