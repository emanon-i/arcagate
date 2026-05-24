use notify::Watcher;
use uuid::Uuid;

use crate::db::DbState;
use crate::models::watched_path::{CreateWatchedPathInput, WatchedPath};
use crate::repositories::{item_repository, watched_path_repository};
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
    // 検収 #13: ウォッチパスはサブフォルダも再帰監視 (Recursive)。
    {
        let mut guard = watcher.0.lock().map_err(|_| AppError::DbLock)?;
        let w = guard.as_mut().ok_or_else(|| {
            log::warn!("watcher unavailable, cannot add '{}'", path_str);
            AppError::WatchFailed(format!("{}: filesystem watcher unavailable", path_str))
        })?;
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
        let mut conn = db.0.lock().map_err(|_| AppError::DbLock)?;
        // アイテムライフサイクル契約 (Bug 5 修正): 旧実装は raw `conn.execute` 連鎖で
        // 中途失敗時に inconsistent (items 削除済だが watched_paths は残る 等) になるリスクと、
        // 監視自動登録 item の `widget_item_hides` 記録漏れがあった。
        // 1 transaction でくくり、 各 item は共通 helper `delete_item_with_cleanup` 経由で
        // hide 記録 + widget config strip + delete を行う。
        let tx = conn.transaction()?;
        let wp = watched_path_repository::find_by_id(&tx, id)?;
        let tracked_ids = item_repository::find_tracked_ids_under_path(&tx, &wp.path)?;
        let cascade_count = tracked_ids.len();
        for item_id in &tracked_ids {
            crate::services::item_service::delete_item_with_cleanup(&tx, item_id)?;
        }
        watched_path_repository::delete(&tx, id)?;
        let path = wp.path.clone();
        tx.commit()?;
        (path, cascade_count)
    };
    log::info!(
        "watched_path removed: path='{}' cascade_items={}",
        path,
        cascade_count
    );
    if let Ok(mut guard) = watcher.0.lock() {
        if let Some(w) = guard.as_mut() {
            if let Err(e) = w.unwatch(std::path::Path::new(&path)) {
                log::warn!("watcher: failed to unwatch '{}': {}", path, e);
            }
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

/// V1 解消 (A3 PR-A): AppServices 集約パターン用の service struct。
/// 各 method は同 module の free function に delegate (scope 限定のため既存実装は維持)。
/// 注: WatcherState は db と同等の "external dependency" として method 引数で受ける
/// (AppServices struct には WatcherState を保持しない方針)。
pub struct WatchedPathService {
    db: std::sync::Arc<crate::db::DbState>,
}

impl WatchedPathService {
    pub fn new(db: std::sync::Arc<crate::db::DbState>) -> Self {
        Self { db }
    }

    pub fn add_watched_path(
        &self,
        watcher: &WatcherState,
        input: CreateWatchedPathInput,
    ) -> Result<WatchedPath, AppError> {
        add_watched_path(&self.db, watcher, input)
    }

    pub fn get_watched_paths(&self) -> Result<Vec<WatchedPath>, AppError> {
        get_watched_paths(&self.db)
    }

    pub fn remove_watched_path(&self, watcher: &WatcherState, id: &str) -> Result<(), AppError> {
        remove_watched_path(&self.db, watcher, id)
    }
}
