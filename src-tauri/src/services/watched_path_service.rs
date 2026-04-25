use notify::Watcher;
use uuid::Uuid;

use crate::db::DbState;
use crate::models::watched_path::{CreateWatchedPathInput, WatchedPath};
use crate::repositories::watched_path_repository;
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

    // watcher 登録を先に試みる。失敗したら DB に書かない
    if let Ok(mut w) = watcher.0.lock() {
        if let Err(e) = w.watch(
            std::path::Path::new(&path_str),
            notify::RecursiveMode::NonRecursive,
        ) {
            log::warn!("watcher: failed to watch '{}': {}", path_str, e);
        }
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
    let path = {
        let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
        let wp = watched_path_repository::find_by_id(&conn, id)?;
        watched_path_repository::delete(&conn, id)?;
        wp.path
    };
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

    #[test]
    fn test_add_and_get_watched_paths() {
        let db = initialize_in_memory();
        let w = make_watcher();
        let input = CreateWatchedPathInput {
            path: "C:/test".to_string(),
            label: Some("Test".to_string()),
        };
        let wp = add_watched_path(&db, &w, input).unwrap();
        assert_eq!(wp.path, "C:/test");
        assert_eq!(wp.label, Some("Test".to_string()));

        let all = get_watched_paths(&db).unwrap();
        assert_eq!(all.len(), 1);
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
        let wp = add_watched_path(
            &db,
            &w,
            CreateWatchedPathInput {
                path: "C:/test".to_string(),
                label: None,
            },
        )
        .unwrap();
        remove_watched_path(&db, &w, &wp.id).unwrap();
        let all = get_watched_paths(&db).unwrap();
        assert_eq!(all.len(), 0);
    }
}
