/// PH-issue-024 Opener registry IPC commands.
use tauri::{AppHandle, Manager, State};

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
///
/// audit F8 (2026-05-18): target は WebView から渡る raw path。 起動前に
/// `validate_existing_path` で制御文字拒否 + 実在検証を行い、 インジェクション目的の
/// 細工文字列 (実在パスにならない) を opener 実行に到達させない。
///
/// W-2 (2026-05-19): path 実在検証の stat + 外部 process spawn を worker thread に逃がす。
#[tauri::command]
pub async fn cmd_launch_with_opener(
    app: AppHandle,
    opener_id: String,
    target: String,
) -> Result<(), AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        crate::launcher::validate_existing_path(&target)?;
        let services = app.state::<AppServices>();
        let opener = services.opener.resolve(&opener_id)?;
        opener_service::launch_with(&opener, &target)
    })
    .await
    .map_err(AppError::from_join_error)?
}
