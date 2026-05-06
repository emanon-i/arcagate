/// PH-issue-024 Opener registry IPC commands.
use tauri::State;

use crate::models::opener::{Opener, SaveOpenerInput};
use crate::services::{opener_service, AppServices};
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_list_openers(services: State<AppServices>) -> Result<Vec<Opener>, AppError> {
    services.opener.list_all()
}

#[tauri::command]
pub fn cmd_save_opener(
    services: State<AppServices>,
    input: SaveOpenerInput,
) -> Result<Opener, AppError> {
    services.opener.save(input)
}

#[tauri::command]
pub fn cmd_delete_opener(services: State<AppServices>, id: String) -> Result<(), AppError> {
    services.opener.delete(&id)
}

/// 任意 path を任意 opener で起動 (右クリック「Open with…」用)。
/// item_id は不要 (path 直起動)、起動ログは記録しない (カジュアル起動扱い)。
#[tauri::command]
pub fn cmd_launch_with_opener(
    services: State<AppServices>,
    opener_id: String,
    target: String,
) -> Result<(), AppError> {
    let opener = services.opener.resolve(&opener_id)?;
    opener_service::launch_with(&opener, &target)
}
