pub mod traits;

use std::sync::Mutex;

use notify::Watcher;
use tauri::{Emitter, Manager};

use crate::db::DbState;
use crate::repositories::{item_repository, watched_path_repository};

pub struct WatcherState(pub Mutex<notify::RecommendedWatcher>);

impl WatcherState {
    #[cfg(test)]
    pub fn new_noop() -> Self {
        let w = notify::recommended_watcher(|_: notify::Result<notify::Event>| {})
            .expect("failed to create noop watcher");
        WatcherState(Mutex::new(w))
    }
}

pub fn start_watcher(app: &tauri::AppHandle) -> WatcherState {
    let app_cb = app.clone();
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if let Ok(event) = res {
            handle_event(&event, &app_cb);
        }
    })
    .expect("failed to create watcher");

    // DB に登録済みのアクティブパスを先に収集してから監視開始
    // (State<DbState> の lifetime を watch loop より先に終わらせる)
    let active_paths: Vec<String> = {
        let db = app.state::<DbState>();
        db.0.lock()
            .ok()
            .map(|conn| {
                watched_path_repository::find_active(&conn)
                    .unwrap_or_default()
                    .into_iter()
                    .map(|wp| wp.path)
                    .collect()
            })
            .unwrap_or_default()
    };
    for path in &active_paths {
        // 4/30 user 検収 #13: サブフォルダ監視壊れ → Recursive に変更。
        // 旧 NonRecursive はトップレベルのみ検出で、ネストされた path 配下の
        // 追加 / 削除 / 変更を捕捉できていなかった (user fb 「サブフォルダが反応しない」)。
        if let Err(e) = watcher.watch(std::path::Path::new(path), notify::RecursiveMode::Recursive)
        {
            log::warn!("watcher: failed to watch '{}': {:?}", path, e);
        }
    }

    WatcherState(Mutex::new(watcher))
}

fn handle_event(event: &notify::Event, app: &tauri::AppHandle) {
    use notify::event::{ModifyKind, RenameMode};
    use notify::EventKind::*;

    match &event.kind {
        Create(_) => {
            for path in &event.paths {
                if path.is_dir() {
                    let path_str = path.to_string_lossy().to_string();
                    if let Err(e) = app.emit("folder://new-directory", &path_str) {
                        log::warn!("failed to emit folder://new-directory: {:?}", e);
                    } else {
                        log::info!("new-directory detected: {}", path_str);
                    }
                }
            }
        }
        Modify(ModifyKind::Name(RenameMode::Both)) if event.paths.len() == 2 => {
            let old = &event.paths[0];
            let new = &event.paths[1];
            let db = app.state::<DbState>();
            if let Ok(conn) = db.0.lock() {
                match item_repository::update_target_by_path(&conn, old, new) {
                    Ok(n) if n > 0 => {
                        log::info!("auto-tracked: {:?} → {:?}", old, new);
                    }
                    Ok(_) => {}
                    Err(e) => log::warn!("update_target_by_path failed: {}", e),
                }
            };
        }
        Remove(_) => {
            for path in &event.paths {
                let path_str = path.to_string_lossy().to_string();
                app.emit("item://path-not-found", &path_str).ok();
                log::info!("path-not-found: {}", path_str);
            }
        }
        _ => {}
    }
}
