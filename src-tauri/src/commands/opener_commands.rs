// PH-505: Opener registry IPC commands
use tauri::State;

use crate::db::DbState;
use crate::models::opener::{CreateOpenerInput, Opener, UpdateOpenerInput};
use crate::services::opener_service;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_list_openers(db: State<DbState>) -> Result<Vec<Opener>, AppError> {
    opener_service::list_openers(&db)
}

#[tauri::command]
pub fn cmd_get_opener(db: State<DbState>, id: String) -> Result<Option<Opener>, AppError> {
    opener_service::get_opener(&db, &id)
}

#[tauri::command]
pub fn cmd_create_opener(db: State<DbState>, input: CreateOpenerInput) -> Result<Opener, AppError> {
    opener_service::create_opener(&db, input)
}

#[tauri::command]
pub fn cmd_update_opener(
    db: State<DbState>,
    id: String,
    input: UpdateOpenerInput,
) -> Result<Opener, AppError> {
    opener_service::update_opener(&db, &id, input)
}

#[tauri::command]
pub fn cmd_delete_opener(db: State<DbState>, id: String) -> Result<(), AppError> {
    opener_service::delete_opener(&db, &id)
}

#[tauri::command]
pub fn cmd_launch_with_opener(
    db: State<DbState>,
    opener_id: String,
    path: String,
) -> Result<(), AppError> {
    opener_service::launch_with_opener(&db, &opener_id, &path)
}
