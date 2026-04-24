use tauri::{AppHandle, Emitter, State};

use crate::db::DbState;
use crate::models::theme::{CreateThemeInput, Theme, UpdateThemeInput};
use crate::services::theme_service;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_list_themes(db: State<DbState>) -> Result<Vec<Theme>, AppError> {
    theme_service::list_themes(&db)
}

#[tauri::command]
pub fn cmd_get_theme(db: State<DbState>, id: String) -> Result<Theme, AppError> {
    theme_service::get_theme(&db, &id)
}

#[tauri::command]
pub fn cmd_create_theme(
    db: State<DbState>,
    name: String,
    base_theme: String,
    css_vars: String,
) -> Result<Theme, AppError> {
    theme_service::create_theme(
        &db,
        CreateThemeInput {
            name,
            base_theme,
            css_vars,
        },
    )
}

#[tauri::command]
pub fn cmd_update_theme(
    db: State<DbState>,
    id: String,
    name: Option<String>,
    base_theme: Option<String>,
    css_vars: Option<String>,
) -> Result<Theme, AppError> {
    theme_service::update_theme(
        &db,
        &id,
        UpdateThemeInput {
            name,
            base_theme,
            css_vars,
        },
    )
}

#[tauri::command]
pub fn cmd_delete_theme(db: State<DbState>, id: String) -> Result<(), AppError> {
    theme_service::delete_theme(&db, &id)
}

#[tauri::command]
pub fn cmd_get_active_theme_mode(db: State<DbState>) -> Result<String, AppError> {
    theme_service::get_active_theme_mode(&db)
}

#[tauri::command]
pub fn cmd_set_active_theme_mode(
    app: AppHandle,
    db: State<DbState>,
    mode: String,
) -> Result<(), AppError> {
    theme_service::set_active_theme_mode(&db, &mode)?;
    let _ = app.emit("theme-changed", &mode);
    Ok(())
}

#[tauri::command]
pub fn cmd_export_theme_json(db: State<DbState>, id: String) -> Result<String, AppError> {
    theme_service::export_theme_json(&db, &id)
}

#[tauri::command]
pub fn cmd_import_theme_json(db: State<DbState>, json: String) -> Result<Theme, AppError> {
    theme_service::import_theme_json(&db, &json)
}
