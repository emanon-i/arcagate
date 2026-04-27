// PH-505 batch-109: Opener registry IPC commands

use tauri::State;

use crate::db::DbState;
use crate::models::opener::{CreateOpenerInput, Opener, UpdateOpenerInput};
use crate::services::opener_service as svc;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_list_openers(db: State<DbState>) -> Result<Vec<Opener>, AppError> {
    svc::list_openers(&db)
}

#[tauri::command]
pub fn cmd_get_opener(db: State<DbState>, id: String) -> Result<Option<Opener>, AppError> {
    svc::get_opener(&db, &id)
}

#[tauri::command]
pub fn cmd_create_opener(db: State<DbState>, input: CreateOpenerInput) -> Result<Opener, AppError> {
    svc::create_opener(&db, input)
}

#[tauri::command]
pub fn cmd_update_opener(
    db: State<DbState>,
    id: String,
    input: UpdateOpenerInput,
) -> Result<Opener, AppError> {
    svc::update_opener(&db, &id, input)
}

#[tauri::command]
pub fn cmd_delete_opener(db: State<DbState>, id: String) -> Result<(), AppError> {
    svc::delete_opener(&db, &id)
}

#[tauri::command]
pub fn cmd_launch_with_opener(
    db: State<DbState>,
    opener_id: String,
    path: String,
) -> Result<(), AppError> {
    svc::launch_with_opener(&db, &opener_id, &path)
}
