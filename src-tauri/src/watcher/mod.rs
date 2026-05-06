pub mod traits;

use std::sync::Mutex;

use notify::Watcher;
use tauri::{Emitter, Manager};

use crate::services::{watcher_service, AppServices};

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
    // (State<AppServices> の lifetime を watch loop より先に終わらせる、V3 解消で service 経由)
    let active_paths: Vec<String> = {
        let services = app.state::<AppServices>();
        watcher_service::list_active_paths(&services.db)
    };
    // 検収 #13: ウォッチフォルダのサブフォルダ監視を有効化 (Recursive)。
    // 旧 NonRecursive は「サブフォルダの追加が即時反映されない」問題の原因だった。
    for path in &active_paths {
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
            let services = app.state::<AppServices>();
            match watcher_service::rename_item_target(&services.db, old, new) {
                Ok(n) if n > 0 => {
                    log::info!("auto-tracked: {:?} → {:?}", old, new);
                }
                Ok(_) => {}
                Err(e) => log::warn!("rename_item_target failed: {}", e),
            }
        }
        Remove(_) => {
            // Codex High #3: RecursiveMode::Recursive で watch path 配下の **全削除** が
            // event 化される。フォルダ削除で 100s ファイルが連続削除イベントを生むため、
            // **DB に登録されている tracked item の target と一致する場合のみ emit** する
            // (toast 嵐 防止)。一致しないファイルは debug log のみ。
            let services = app.state::<AppServices>();
            for path in &event.paths {
                let path_str = path.to_string_lossy().to_string();
                if watcher_service::is_tracked_target(&services.db, &path_str) {
                    app.emit("item://path-not-found", &path_str).ok();
                    log::info!("path-not-found (tracked): {}", path_str);
                } else {
                    log::debug!("watch remove (untracked, suppressed): {}", path_str);
                }
            }
        }
        _ => {}
    }
}
