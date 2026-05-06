use tauri::{AppHandle, Emitter, State};

use crate::models::theme::{CreateThemeInput, Theme, UpdateThemeInput};
use crate::services::AppServices;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_list_themes(services: State<AppServices>) -> Result<Vec<Theme>, AppError> {
    services.theme.list_themes()
}

#[tauri::command]
pub fn cmd_get_theme(services: State<AppServices>, id: String) -> Result<Theme, AppError> {
    services.theme.get_theme(&id)
}

#[tauri::command]
pub fn cmd_create_theme(
    services: State<AppServices>,
    name: String,
    base_theme: String,
    css_vars: String,
) -> Result<Theme, AppError> {
    services.theme.create_theme(CreateThemeInput {
        name,
        base_theme,
        css_vars,
    })
}

#[tauri::command]
pub fn cmd_update_theme(
    services: State<AppServices>,
    id: String,
    name: Option<String>,
    base_theme: Option<String>,
    css_vars: Option<String>,
) -> Result<Theme, AppError> {
    services.theme.update_theme(
        &id,
        UpdateThemeInput {
            name,
            base_theme,
            css_vars,
        },
    )
}

#[tauri::command]
pub fn cmd_delete_theme(services: State<AppServices>, id: String) -> Result<(), AppError> {
    services.theme.delete_theme(&id)
}

#[tauri::command]
pub fn cmd_get_active_theme_mode(services: State<AppServices>) -> Result<String, AppError> {
    services.theme.get_active_theme_mode()
}

#[tauri::command]
pub fn cmd_set_active_theme_mode(
    app: AppHandle,
    services: State<AppServices>,
    mode: String,
) -> Result<(), AppError> {
    services.theme.set_active_theme_mode(&mode)?;
    let _ = app.emit("theme-changed", &mode);
    Ok(())
}

#[tauri::command]
pub fn cmd_export_theme_json(services: State<AppServices>, id: String) -> Result<String, AppError> {
    services.theme.export_theme_json(&id)
}

#[tauri::command]
pub fn cmd_import_theme_json(
    services: State<AppServices>,
    json: String,
) -> Result<Theme, AppError> {
    services.theme.import_theme_json(&json)
}
