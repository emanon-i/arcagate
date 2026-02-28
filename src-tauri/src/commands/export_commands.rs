use tauri::State;

use crate::db::DbState;
use crate::services::export_service;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_export_json(db: State<DbState>, output_path: String) -> Result<(), AppError> {
    export_service::export_json(&db, &output_path)
}

#[tauri::command]
pub fn cmd_import_json(db: State<DbState>, input_path: String) -> Result<(), AppError> {
    export_service::import_json(&db, &input_path)
}
