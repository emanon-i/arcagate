use crate::db::DbState;
use crate::launcher;
use crate::models::item::ItemType;
use crate::models::launch::{ItemStats, LaunchLog};
use crate::repositories::{item_repository, launch_repository};
use crate::utils::error::AppError;

/// アイテム ID に基づいてアイテムを起動する
///
/// `source`: 起動元を示す文字列。"palette" | "tray" | "cli" | "mcp"
pub fn launch_item(db: &DbState, item_id: &str, source: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let item = item_repository::find_by_id(&conn, item_id)?;

    log::info!(
        "launching item: id={} type={:?} label={} source={}",
        item_id,
        item.item_type,
        item.label,
        source
    );

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

    match &result {
        Ok(_) => {
            log::info!("launch success: id={}", item_id);
            let _ = launch_repository::record_launch_and_update_stats(&conn, item_id, source);
        }
        Err(e) => {
            log::error!("launch failed: id={} error={}", item_id, e);
        }
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
