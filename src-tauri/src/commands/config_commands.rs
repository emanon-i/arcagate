use tauri::State;
use tauri_plugin_global_shortcut::GlobalShortcutExt;

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
pub fn cmd_set_hotkey(
    app: tauri::AppHandle,
    db: State<DbState>,
    hotkey: String,
) -> Result<(), AppError> {
    // Unregister old hotkey before saving (ignore failure — may not be registered)
    if let Ok(old) = config_service::get_hotkey(&db) {
        let _ = app.global_shortcut().unregister(old.as_str());
    }
    config_service::set_hotkey(&db, &hotkey)?;
    app.global_shortcut()
        .register(hotkey.as_str())
        .map_err(|e| AppError::InvalidInput(e.to_string()))?;
    Ok(())
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
pub fn cmd_is_onboarding_complete(db: State<DbState>) -> Result<bool, AppError> {
    config_service::is_onboarding_complete(&db)
}

#[tauri::command]
pub fn cmd_mark_onboarding_complete(db: State<DbState>) -> Result<(), AppError> {
    config_service::mark_onboarding_complete(&db)
}
