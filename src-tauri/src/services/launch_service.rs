use crate::db::DbState;
use crate::launcher;
use crate::models::item::ItemType;
use crate::models::launch::{ItemStats, LaunchLog};
use crate::repositories::{item_repository, launch_repository};
use crate::utils::error::AppError;

/// アイテム ID に基づいてアイテムを起動する
pub fn launch_item(db: &DbState, item_id: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let item = item_repository::find_by_id(&conn, item_id)?;

    let result = match item.item_type {
        ItemType::Exe => launcher::launch_exe(
            &item.target,
            item.args.as_deref(),
            item.working_dir.as_deref(),
        ),
        ItemType::Url => launcher::launch_url(&item.target),
        ItemType::Folder => launcher::launch_folder(&item.target),
        ItemType::Script => launcher::launch_script(
            &item.target,
            item.args.as_deref(),
            item.working_dir.as_deref(),
        ),
        ItemType::Command => launcher::launch_command(&item.target, item.working_dir.as_deref()),
    };

    // 起動後にログ記録（失敗しても起動成功を優先）
    if result.is_ok() {
        let _ = launch_repository::record_launch_and_update_stats(&conn, item_id, "palette");
    }

    result
}

pub fn list_recent(db: &DbState, limit: i64) -> Result<Vec<LaunchLog>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    launch_repository::list_recent(&conn, limit)
}

pub fn list_frequent(db: &DbState, limit: i64) -> Result<Vec<ItemStats>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    launch_repository::list_frequent(&conn, limit)
}
