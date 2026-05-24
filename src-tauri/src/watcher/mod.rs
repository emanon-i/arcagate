pub mod traits;

use std::sync::Mutex;

use notify::Watcher;
use tauri::{Emitter, Manager};

use crate::services::{watcher_service, AppServices};

/// PH-PQ-100 T1: watcher 生成失敗時の panic を排除するため `Option` 化。
/// `None` の場合は file-watch 機能のみ縮退し、 起動全体を継続する。
/// watch / unwatch 呼び出し側は `Option` を確認して、 None なら `WatchFailed` を返すか
/// 何もしない (best-effort 系)。
pub struct WatcherState(pub Mutex<Option<notify::RecommendedWatcher>>);

impl WatcherState {
    pub fn unavailable() -> Self {
        WatcherState(Mutex::new(None))
    }

    #[cfg(test)]
    pub fn new_noop() -> Self {
        match notify::recommended_watcher(|_: notify::Result<notify::Event>| {}) {
            Ok(w) => WatcherState(Mutex::new(Some(w))),
            Err(e) => {
                log::warn!("test noop watcher unavailable: {}", e);
                WatcherState::unavailable()
            }
        }
    }
}

/// 起動時の watcher 生成。 失敗しても panic せず `WatcherState::unavailable` を返し、
/// file-watch 機能のみ縮退する (release-criteria E1 / PH-PQ-100 T1)。
pub fn start_watcher(app: &tauri::AppHandle) -> WatcherState {
    let app_cb = app.clone();
    let watcher_result = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if let Ok(event) = res {
            handle_event(&event, &app_cb);
        }
    });

    let mut watcher = match watcher_result {
        Ok(w) => w,
        Err(e) => {
            log::error!(
                "filesystem watcher init failed, file-watch features disabled: {}",
                e
            );
            return WatcherState::unavailable();
        }
    };

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

    WatcherState(Mutex::new(Some(watcher)))
}

fn handle_event(event: &notify::Event, app: &tauri::AppHandle) {
    use notify::event::{ModifyKind, RenameMode};
    use notify::EventKind::*;

    match &event.kind {
        Create(_) => {
            // アイテムライフサイクル契約 (U-4 / D15): 旧 `folder://new-directory` emit は
            // PH-CF-500 D2 で auto_add 機構を撤廃した時点から frontend に listener が無く
            // dead path 化していた。 backend 計算節約のため emit を完全撤廃 (確定方針 U-4 (a))。
            // 必要なら debug log のみ残す。
            log::debug!("watch create event (no-op per item-lifecycle contract U-4)");
        }
        Modify(ModifyKind::Name(RenameMode::Both)) if event.paths.len() == 2 => {
            let old = &event.paths[0];
            let new = &event.paths[1];
            let services = app.state::<AppServices>();
            // Bug 7 / D14 rename: target / source_entry_key / widget_item_hides の 3 経路を
            // 1 transaction で同期更新する (watcher_service::rename_item_target が helper 経由)。
            match watcher_service::rename_item_target(&services.db, old, new) {
                Ok(n) if n > 0 => {
                    log::info!("auto-tracked rename: {:?} → {:?} (items={})", old, new, n);
                }
                Ok(_) => {}
                Err(e) => log::warn!("rename_item_target failed: {}", e),
            }
        }
        Remove(_) => {
            // Codex High #3: RecursiveMode::Recursive で watch path 配下の **全削除** が
            // event 化される。フォルダ削除で 100s ファイルが連続削除イベントを生むため、
            // **DB に登録されている tracked item の target と一致する場合のみ処理** する
            // (toast 嵐 防止)。一致しないファイルは debug log のみ。
            //
            // アイテムライフサイクル契約 (U-3 / D13): item は削除せず `is_enabled=false` で
            // グレーアウト化し、 toast にアクションを提示する (確定方針 U-3 (b))。
            // payload は path 文字列 (旧仕様互換) + item id を含む JSON。
            let services = app.state::<AppServices>();
            for path in &event.paths {
                let path_str = path.to_string_lossy().to_string();
                if let Some(item_id) =
                    watcher_service::disable_tracked_target(&services.db, &path_str)
                {
                    let payload = serde_json::json!({
                        "path": &path_str,
                        "item_id": item_id,
                    });
                    app.emit("item://path-not-found", payload).ok();
                    log::info!("path-not-found → disabled (tracked): {}", path_str);
                } else {
                    log::debug!("watch remove (untracked or already disabled): {}", path_str);
                }
            }
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unavailable_returns_state_with_none_inner() {
        // PH-PQ-100 T1: watcher 失敗 path が panic ではなく縮退状態を返すことを pin。
        let state = WatcherState::unavailable();
        let guard = state.0.lock().expect("test lock");
        assert!(guard.is_none());
    }
}
