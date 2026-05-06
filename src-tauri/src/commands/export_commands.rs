use tauri::State;

use crate::services::AppServices;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_export_json(services: State<AppServices>, output_path: String) -> Result<(), AppError> {
    services.export.export_json(&output_path)
}

#[tauri::command]
pub fn cmd_import_json(services: State<AppServices>, input_path: String) -> Result<(), AppError> {
    services.export.import_json(&input_path)
}
