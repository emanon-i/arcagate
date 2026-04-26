use std::path::Path;

use crate::db::DbState;
use crate::launcher;
use crate::models::item::ItemType;
use crate::models::launch::{ItemStats, LaunchLog};
use crate::repositories::{item_repository, launch_repository};
use crate::utils::error::AppError;

/// path / 拡張子の事前検証 (Nielsen H9: launch 失敗の原因分類)
///
/// - URL は事前検証スキップ (空文字のみ拒否)
/// - Exe / Folder / Script は path 存在を確認、不在なら LaunchFileNotFound
/// - Exe + Script は拡張子検証 (空拡張子は LaunchNotExecutable)
fn preflight_check(item_type: ItemType, target: &str) -> Result<(), AppError> {
    if target.trim().is_empty() {
        return Err(AppError::LaunchNotExecutable("target is empty".into()));
    }

    if matches!(item_type, ItemType::Url | ItemType::Command) {
        return Ok(());
    }

    let path = Path::new(target);
    if !path.exists() {
        return Err(AppError::LaunchFileNotFound(target.into()));
    }

    if matches!(item_type, ItemType::Exe | ItemType::Script) {
        let has_ext = path.extension().is_some_and(|e| !e.is_empty());
        if !has_ext {
            return Err(AppError::LaunchNotExecutable(target.into()));
        }
    }

    Ok(())
}

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

    preflight_check(item.item_type, &item.target)?;

    let result = match item.item_type {
        ItemType::Exe => launcher::launch_exe(
            &item.target,
            item.args.as_deref(),
            item.working_dir.as_deref(),
        ),
        ItemType::Url => launcher::launch_url(&item.target),
        ItemType::Folder => launch_folder_with_app(&item.target, item.default_app.as_deref()),
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

fn launch_folder_with_app(path: &str, default_app: Option<&str>) -> Result<(), AppError> {
    match default_app {
        Some("vscode") => launcher::launch_exe_args("code", &[path], None),
        Some("terminal") => launcher::launch_exe_args("wt", &["-d", path], None),
        Some(custom) => launcher::launch_exe_args(custom, &[path], None),
        None => launcher::launch_folder(path),
    }
}

pub fn get_item_stats(db: &DbState, item_id: &str) -> Result<Option<ItemStats>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    launch_repository::find_stats_by_item(&conn, item_id)
}

pub fn list_recent(db: &DbState, limit: i64) -> Result<Vec<LaunchLog>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    launch_repository::list_recent(&conn, limit)
}

pub fn list_frequent(db: &DbState, limit: i64) -> Result<Vec<ItemStats>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    launch_repository::list_frequent(&conn, limit)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preflight_check_url_passes_with_any_value() {
        assert!(preflight_check(ItemType::Url, "https://example.com").is_ok());
        assert!(preflight_check(ItemType::Url, "x").is_ok());
    }

    #[test]
    fn preflight_check_url_rejects_empty() {
        let err = preflight_check(ItemType::Url, "").unwrap_err();
        assert!(matches!(err, AppError::LaunchNotExecutable(_)));
    }

    #[test]
    fn preflight_check_command_passes_without_path_check() {
        assert!(preflight_check(ItemType::Command, "echo hello").is_ok());
    }

    #[test]
    fn preflight_check_exe_missing_path_returns_file_not_found() {
        let bogus = "C:/__arcagate_test_nonexistent__/missing.exe";
        let err = preflight_check(ItemType::Exe, bogus).unwrap_err();
        assert!(matches!(err, AppError::LaunchFileNotFound(_)));
    }

    #[test]
    fn preflight_check_folder_missing_path_returns_file_not_found() {
        let bogus = "C:/__arcagate_test_nonexistent_folder__";
        let err = preflight_check(ItemType::Folder, bogus).unwrap_err();
        assert!(matches!(err, AppError::LaunchFileNotFound(_)));
    }

    #[test]
    fn preflight_check_exe_existing_dir_without_extension_is_not_executable() {
        // 自分自身の crate dir を渡す → exists だが拡張子なし
        let manifest_dir = env!("CARGO_MANIFEST_DIR");
        let err = preflight_check(ItemType::Exe, manifest_dir).unwrap_err();
        assert!(matches!(err, AppError::LaunchNotExecutable(_)));
    }
}
