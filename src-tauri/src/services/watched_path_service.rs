use notify::Watcher;
use uuid::Uuid;

use crate::db::DbState;
use crate::models::watched_path::{CreateWatchedPathInput, WatchedPath};
use crate::repositories::{
    item_repository, watched_path_repository, widget_item_settings_repository, workspace_repository,
};
use crate::utils::error::AppError;
use crate::watcher::WatcherState;

pub fn add_watched_path(
    db: &DbState,
    watcher: &WatcherState,
    input: CreateWatchedPathInput,
) -> Result<WatchedPath, AppError> {
    if input.path.trim().is_empty() {
        return Err(AppError::InvalidInput("path must not be empty".into()));
    }
    let id = Uuid::now_v7().to_string();
    let path_str = input.path.clone();

    // PH-421 / Codex Rule C 最重要指摘: silent failure 解消。
    // watcher 登録を先に試み、失敗したら DB 書き込み前に Err 返却。
    {
        let mut w = watcher.0.lock().map_err(|_| AppError::DbLock)?;
        // 4/30 user 検収 #13: サブフォルダ監視壊れ → Recursive に変更。
        // 旧 NonRecursive ではユーザの「監視フォルダ配下のサブフォルダ追加 / 変更が反応しない」
        // を引き起こしていた。Recursive で path 配下全階層を監視。
        w.watch(
            std::path::Path::new(&path_str),
            notify::RecursiveMode::Recursive,
        )
        .map_err(|e| {
            log::warn!("watcher: failed to watch '{}': {}", path_str, e);
            AppError::WatchFailed(format!("{}: {}", path_str, e))
        })?;
    }

    let wp = WatchedPath {
        id: id.clone(),
        path: input.path,
        label: input.label,
        is_active: true,
        created_at: String::new(),
        updated_at: String::new(),
    };
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    watched_path_repository::insert(&conn, &wp)?;
    watched_path_repository::find_by_id(&conn, &id)
}

pub fn get_watched_paths(db: &DbState) -> Result<Vec<WatchedPath>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    watched_path_repository::find_all(&conn)
}

pub fn remove_watched_path(db: &DbState, watcher: &WatcherState, id: &str) -> Result<(), AppError> {
    let (path, cascade_count) = {
        let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
        let wp = watched_path_repository::find_by_id(&conn, id)?;
        // PH-issue-023: watched_path 削除前に、当該 path 配下の tracked items を Library から削除。
        // 各 item は workspace_widgets cascade (PH-issue-006) で widget config からも自動除去される。
        let tracked_ids = item_repository::find_tracked_ids_under_path(&conn, &wp.path)?;
        let cascade_count = tracked_ids.len();
        for item_id in &tracked_ids {
            // PH-issue-023 Phase B: 削除前に user 個別設定 (default_app / is_enabled) を
            // widget_item_settings に snapshot。再 watch で resurrect 用。
            let item = item_repository::find_by_id(&conn, item_id)?;
            let snapshot = serde_json::json!({
                "default_app": item.default_app,
                "is_enabled": item.is_enabled,
                "label": item.label,
            });
            let snapshot_str =
                serde_json::to_string(&snapshot).unwrap_or_else(|_| "{}".to_string());
            widget_item_settings_repository::upsert(&conn, &item.target, &snapshot_str)?;
            workspace_repository::cascade_remove_item_from_widgets(&conn, item_id)?;
            item_repository::delete(&conn, item_id)?;
        }
        watched_path_repository::delete(&conn, id)?;
        (wp.path, cascade_count)
    };
    log::info!(
        "watched_path removed: path='{}' cascade_items={}",
        path,
        cascade_count
    );
    if let Ok(mut w) = watcher.0.lock() {
        if let Err(e) = w.unwatch(std::path::Path::new(&path)) {
            log::warn!("watcher: failed to unwatch '{}': {}", path, e);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;
    use crate::watcher::WatcherState;

    fn make_watcher() -> WatcherState {
        WatcherState::new_noop()
    }

    fn make_temp_dir(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("arcagate-watched-path-{}", name));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn test_add_and_get_watched_paths() {
        let db = initialize_in_memory();
        let w = make_watcher();
        let dir = make_temp_dir("add");
        let path = dir.to_string_lossy().into_owned();
        let input = CreateWatchedPathInput {
            path: path.clone(),
            label: Some("Test".to_string()),
        };
        let wp = add_watched_path(&db, &w, input).unwrap();
        assert_eq!(wp.path, path);
        assert_eq!(wp.label, Some("Test".to_string()));

        let all = get_watched_paths(&db).unwrap();
        assert_eq!(all.len(), 1);

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn test_add_empty_path_fails() {
        let db = initialize_in_memory();
        let w = make_watcher();
        let result = add_watched_path(
            &db,
            &w,
            CreateWatchedPathInput {
                path: "   ".to_string(),
                label: None,
            },
        );
        assert!(matches!(result, Err(AppError::InvalidInput(_))));
    }

    #[test]
    fn test_remove_watched_path() {
        let db = initialize_in_memory();
        let w = make_watcher();
        let dir = make_temp_dir("remove");
        let path = dir.to_string_lossy().into_owned();
        let wp = add_watched_path(&db, &w, CreateWatchedPathInput { path, label: None }).unwrap();
        remove_watched_path(&db, &w, &wp.id).unwrap();
        let all = get_watched_paths(&db).unwrap();
        assert_eq!(all.len(), 0);

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn test_add_nonexistent_path_returns_watch_failed_no_db_write() {
        // PH-421 / Codex 最重要指摘: silent failure 解消検証。
        // 不在 path を watch 試行 → AppError::WatchFailed 返却 + DB に row なし。
        let db = initialize_in_memory();
        let w = make_watcher();
        let result = add_watched_path(
            &db,
            &w,
            CreateWatchedPathInput {
                path: "Z:/__arcagate_nonexistent_watch_target__".to_string(),
                label: None,
            },
        );
        assert!(matches!(result, Err(AppError::WatchFailed(_))));
        let all = get_watched_paths(&db).unwrap();
        assert_eq!(
            all.len(),
            0,
            "DB should not have any rows after silent failure fix"
        );
    }
}
