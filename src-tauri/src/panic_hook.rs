//! PH-PQ-100 T2: panic_hook + user-visible dialog (release-criteria E1)。
//!
//! silent crash を禁止する。 panic が起きたら:
//!   1. panic 情報を log file (`tauri-plugin-log` 経路) に必ず書く
//!   2. DB の WAL を best-effort で checkpoint (TRUNCATE) してデータ損失を最小化
//!   3. Tauri が起動済みなら modal dialog で user に通知 (「予期しないエラー、 再起動」)
//!
//! 参照: Aptabase「Catching Panics on Tauri Apps」の log + checkpoint + dialog 3 段パターン。
//!
//! 注意: panic hook は任意の thread で発火しうるため、 dialog は別 thread に逃がして
//! `join` する (`blocking_show` を main thread で呼ぶと event loop 依存で deadlock しうる)。
//! WAL checkpoint は `try_lock` で取得し、 panic が DB lock 保持中でも deadlock しない。

use std::any::Any;
use std::panic;
use std::sync::{Arc, OnceLock};

use crate::db::DbState;

static APP_HANDLE: OnceLock<tauri::AppHandle> = OnceLock::new();
static DB_STATE: OnceLock<Arc<DbState>> = OnceLock::new();

/// setup 完了後に AppHandle を登録する。 これ以降の panic は dialog 通知される。
pub fn register_app_handle(handle: tauri::AppHandle) {
    let _ = APP_HANDLE.set(handle);
}

/// DB 初期化後に DbState を登録する。 panic 時に WAL checkpoint に使う。
pub fn register_db(db: Arc<DbState>) {
    let _ = DB_STATE.set(db);
}

/// panic payload (`&str` / `String`) を可能な限り文字列化する。
fn payload_to_string(payload: &(dyn Any + Send)) -> String {
    if let Some(s) = payload.downcast_ref::<&str>() {
        (*s).to_string()
    } else if let Some(s) = payload.downcast_ref::<String>() {
        s.clone()
    } else {
        "<non-string panic payload>".to_string()
    }
}

/// `tauri::Builder` 構築前に呼ぶ。 既存 hook を chain しつつ独自処理を足す。
pub fn install() {
    let default_hook = panic::take_hook();
    panic::set_hook(Box::new(move |info| {
        // (0) 既定 hook (stderr / backtrace) も維持
        default_hook(info);

        // (1) log file へ必ず記録
        let location = info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "<unknown location>".to_string());
        let message = payload_to_string(info.payload());
        log::error!("PANIC at {location}: {message}");

        // (2) WAL checkpoint を best-effort (try_lock で deadlock 回避)
        if let Some(db) = DB_STATE.get() {
            match db.0.try_lock() {
                Ok(conn) => {
                    if let Err(e) = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);") {
                        log::warn!("panic_hook: WAL checkpoint failed: {e}");
                    } else {
                        log::info!("panic_hook: WAL checkpoint(TRUNCATE) done");
                    }
                }
                Err(_) => {
                    log::warn!("panic_hook: DB lock busy, skipped WAL checkpoint");
                }
            }
        }

        // (3) user-visible dialog (AppHandle 登録済みのときのみ)
        if let Some(handle) = APP_HANDLE.get() {
            show_crash_dialog(handle, &location, &message);
        }
    }));
}

/// crash dialog を別 thread で blocking 表示する。
fn show_crash_dialog(handle: &tauri::AppHandle, location: &str, message: &str) {
    use tauri::Manager;

    let log_hint = handle
        .path()
        .app_log_dir()
        .map(|d| d.display().to_string())
        .unwrap_or_else(|_| "アプリのログフォルダ".to_string());

    let body = format!(
        "予期しないエラーが発生しました。\n\
         お手数ですが Arcagate を再起動してください。\n\n\
         発生箇所: {location}\n\
         詳細: {message}\n\n\
         ログ: {log_hint}"
    );

    let handle = handle.clone();
    // dialog は別 thread で blocking 表示 (main thread の event loop deadlock を回避)。
    let dialog_thread = std::thread::spawn(move || {
        use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
        handle
            .dialog()
            .message(body)
            .title("Arcagate — 予期しないエラー")
            .kind(MessageDialogKind::Error)
            .blocking_show();
    });
    // user が dialog を閉じるまで待つ (panic 経路を即 abort させない)。
    let _ = dialog_thread.join();
}

/// PH-PQ-100 T2 受け入れ検証用: debug build かつ `ARCAGATE_PANIC_TEST` 環境変数が
/// セットされているとき、 起動 3 秒後に意図的 panic を発生させ dialog 表示を確認する。
/// release build では何もしない。
#[cfg(debug_assertions)]
pub fn arm_test_trigger() {
    if std::env::var("ARCAGATE_PANIC_TEST").is_err() {
        return;
    }
    std::thread::spawn(|| {
        std::thread::sleep(std::time::Duration::from_secs(3));
        trigger_intentional_panic();
    });
}

#[cfg(debug_assertions)]
#[allow(clippy::panic)]
fn trigger_intentional_panic() {
    panic!("ARCAGATE_PANIC_TEST: intentional panic for panic_hook verification");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn payload_extracts_str_slice() {
        let payload: Box<dyn Any + Send> = Box::new("boom");
        assert_eq!(payload_to_string(&*payload), "boom");
    }

    #[test]
    fn payload_extracts_owned_string() {
        let payload: Box<dyn Any + Send> = Box::new(String::from("kaboom"));
        assert_eq!(payload_to_string(&*payload), "kaboom");
    }

    #[test]
    fn payload_handles_non_string() {
        let payload: Box<dyn Any + Send> = Box::new(42_u32);
        assert_eq!(payload_to_string(&*payload), "<non-string panic payload>");
    }
}
