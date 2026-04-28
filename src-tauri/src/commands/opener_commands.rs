/// PH-issue-024 Opener registry IPC commands.
use tauri::State;

use crate::db::DbState;
use crate::models::opener::{Opener, SaveOpenerInput};
use crate::services::opener_service;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_list_openers(db: State<DbState>) -> Result<Vec<Opener>, AppError> {
    opener_service::list_all(&db)
}

#[tauri::command]
pub fn cmd_save_opener(db: State<DbState>, input: SaveOpenerInput) -> Result<Opener, AppError> {
    opener_service::save(&db, input)
}

#[tauri::command]
pub fn cmd_delete_opener(db: State<DbState>, id: String) -> Result<(), AppError> {
    opener_service::delete(&db, &id)
}

/// 任意 path を任意 opener で起動 (右クリック「Open with…」用)。
/// item_id は不要 (path 直起動)、起動ログは記録しない (カジュアル起動扱い)。
#[tauri::command]
pub fn cmd_launch_with_opener(
    db: State<DbState>,
    opener_id: String,
    target: String,
) -> Result<(), AppError> {
    let opener = opener_service::resolve(&db, &opener_id)?;
    opener_service::launch_with(&opener, &target)
}
